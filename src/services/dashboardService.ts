import { AppDataSource } from "../config/database";
import { Customer, CustomerStatus } from "../entities/Customer";
import { Service } from "../entities/Service";

const TZ = "Africa/Kigali";

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
};
const daysBetween = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000);

class DashboardService {
  private repo = AppDataSource.getRepository(Customer);

  // Customers of this company created between two Kigali days (inclusive)
  private inRange(companyId: string, from: string, to: string) {
    return this.repo
      .createQueryBuilder("c")
      .where("c.companyId = :companyId", { companyId })
      .andWhere("c.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)", { from, tz: TZ })
      .andWhere("c.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)", { to, tz: TZ });
  }

  async summary(companyId: string, from: string, to: string) {
    const days = daysBetween(from, to);
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -days);

    const [statusRows, previousTotal, serviceRows, trendRows, staffRows] = await Promise.all([
      // Count per status
      this.inRange(companyId, from, to)
        .select("c.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.status")
        .getRawMany(),

      // Same-length period just before
      this.inRange(companyId, prevFrom, prevTo).getCount(),

      // Count per service
      this.inRange(companyId, from, to)
        .leftJoin(Service, "s", "s.id = c.serviceId")
        .select("c.serviceId", "serviceId")
        .addSelect("COALESCE(MAX(s.name), MAX(c.service))", "name")
        .addSelect("COUNT(*)", "count")
        .groupBy("c.serviceId")
        .orderBy("COUNT(*)", "DESC")
        .getRawMany(),

      // Count per Kigali day
      this.inRange(companyId, from, to)
        .select(`to_char((c."createdAt" AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD')`, "day")
        .addSelect("COUNT(*)", "count")
        .groupBy("day")
        .orderBy("day", "ASC")
        .getRawMany(),

      // Who handled customers (changed their status), per status
      this.inRange(companyId, from, to)
        .innerJoin("c.updatedBy", "u")
        .select("u.id", "id")
        .addSelect("u.names", "names")
        .addSelect("u.email", "email")
        .addSelect("c.status", "status")
        .addSelect("COUNT(*)", "count")
        .andWhere("c.status != :pending", { pending: CustomerStatus.PENDING })
        .groupBy("u.id")
        .addGroupBy("u.names")
        .addGroupBy("u.email")
        .addGroupBy("c.status")
        .getRawMany(),
    ]);

    const statusCounts: Record<string, number> = Object.fromEntries(
      Object.values(CustomerStatus).map((s) => [s, 0]),
    );
    for (const r of statusRows) statusCounts[r.status] = Number(r.count);
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // Fold staff rows (one per user + status) into one row per user
    const staffMap = new Map<string, any>();
    for (const r of staffRows) {
      const s = staffMap.get(r.id) ?? {
        id: r.id,
        name: r.names,
        email: r.email,
        total: 0,
        counts: Object.fromEntries(Object.values(CustomerStatus).map((st) => [st, 0])),
      };
      s.counts[r.status] = Number(r.count);
      s.total += Number(r.count);
      staffMap.set(r.id, s);
    }

    return {
      from,
      to,
      total,
      previousTotal,
      statusCounts,
      services: serviceRows.map((r) => ({ id: r.serviceId, name: r.name, count: Number(r.count) })),
      trend: trendRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      staff: [...staffMap.values()].sort((a, b) => b.total - a.total),
    };
  }
}

export const dashboardService = new DashboardService();