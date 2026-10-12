import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Customer, CustomerStatus } from "../entities/Customer";
import { User } from "../entities/User";
import { Company } from "../entities/Company";
import { Service } from "../entities/Service";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { ApiError } from "../utils/apiError";
import { AuditContext } from "../utils/auditContext";
import { diff } from "../utils/diff";
import { kigaliDate, toCsv } from "../utils/csv";
import { activityLogService } from "./activityLog";
import { FIELD_CATALOG } from "../constants/serviceFields";

const TZ = "Africa/Kigali";
const EXPORT_LIMIT = 10000;

const CUSTOMER_LABELS: any = {
  names: "Name",
  email: "Email",
  phoneNumber: "Phone",
  service: "Service",
  ...Object.fromEntries(FIELD_CATALOG.map((f) => [f.key, f.label.en])),
};

const STATUS_LABELS: any = {
  [CustomerStatus.PENDING]: "Pending",
  [CustomerStatus.COMPLETED]: "Completed",
  [CustomerStatus.CANCELLED]: "Cancelled",
};

const statusLabel = (s: string) =>
  STATUS_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

export class CustomerService {
  private repo: Repository<Customer> = AppDataSource.getRepository(Customer);
  private serviceRepo: Repository<Service> =
    AppDataSource.getRepository(Service);

  // Customer applies from the public form
  async submitPublic(companySlug: string, dto: any) {
    const company = await AppDataSource.getRepository(Company).findOne({
      where: { slug: companySlug, isActive: true },
    });
    if (!company) throw new ApiError(404, "Company not found");

    const service = await this.findService(company.id, dto.serviceId, true);
    // Same person, same service, still pending, in the last 10 minutes → don't create a second one
    const recent = await this.repo
      .createQueryBuilder("c")
      .where("c.companyId = :companyId", { companyId: company.id })
      .andWhere("c.serviceId = :serviceId", { serviceId: service.id })
      .andWhere("(LOWER(c.email) = LOWER(:email) OR c.phoneNumber = :phone)", {
        email: dto.email,
        phone: dto.phoneNumber,
      })
      .andWhere("c.status = :pending", { pending: CustomerStatus.PENDING })
      .andWhere("c.createdAt > NOW() - INTERVAL '10 minutes'")
      .getOne();

    if (recent) {
      throw new ApiError(
        409,
        "You already applied for this service. We'll contact you soon.",
      );
    }

    const customer = this.repo.create({
      companyId: company.id,
      names: dto.names,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      ...this.serviceData(service, dto),
      status: CustomerStatus.PENDING,
    });
    const saved = await this.repo.save(customer);

    return {
      id: saved.id,
      service: saved.service,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  async findAll(companyId: string, query: any) {
    const qb = this.filtered(companyId, query)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(companyId: string, id: string) {
    const customer = await this.withRelations()
      .where("customer.id = :id", { id })
      .andWhere("customer.companyId = :companyId", { companyId })
      .getOne();
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
  }

  async exportCsv(companyId: string, filters: any) {
    const rows = await this.filtered(companyId, filters)
      .take(EXPORT_LIMIT + 1)
      .getMany();
    const truncated = rows.length > EXPORT_LIMIT;
    const list = rows.slice(0, EXPORT_LIMIT);
    const headers = [
      "Applied at",
      "Names",
      "Email",
      "Phone",
      "Service",
      "Status",
      ...FIELD_CATALOG.map((f) => f.label.en),
      "Updated by",
    ];

    const data = list.map((c: any) => [
      kigaliDate(c.createdAt),
      c.names,
      c.email,
      c.phoneNumber,
      c.service,
      STATUS_LABELS[c.status] ?? c.status,
      ...FIELD_CATALOG.map((f) => c[f.key] ?? ""),
      c.updatedBy?.names ?? "", // who changed the status (empty while pending)
    ]);

    return { csv: toCsv(headers, data), total: list.length, truncated };
  }

  // Edit details:
  async update(companyId: string, id: string, dto: any, ctx: AuditContext) {
    const customer = await this.findEntity(companyId, id);
    const service = await this.findService(companyId, dto.serviceId, false);
    const before: any = { ...customer };

    Object.assign(customer, {
      names: dto.names,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      ...this.serviceData(service, dto),
    });

    const changes = diff(before, customer, {
      labels: CUSTOMER_LABELS,
      only: Object.keys(CUSTOMER_LABELS),
    });
    if (changes.length === 0) return this.findById(companyId, id);

    await AppDataSource.transaction(async (manager) => {
      await manager.save(customer);
      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.CUSTOMER,
          entityId: id,
          summary: `Updated customer ${customer.names}`,
          changes,
        },
        manager,
      );
    });

    return this.findById(companyId, id);
  }

  // update status
  async updateStatus(
    companyId: string,
    id: string,
    status: CustomerStatus,
    ctx: AuditContext,
  ) {
    if (status === CustomerStatus.PENDING) {
      throw new ApiError(400, "A customer can't be set back to pending");
    }

    const customer = await this.findEntity(companyId, id);
    if (customer.status === status) return this.findById(companyId, id);

    const from = customer.status;
    customer.status = status;
    customer.updatedBy = this.actor(ctx);

    await AppDataSource.transaction(async (manager) => {
      await manager.save(customer);
      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.CUSTOMER,
          entityId: id,
          summary: `Marked ${customer.names} as ${statusLabel(status).toLowerCase()}`,
          changes: [
            {
              field: "Status",
              from: statusLabel(from),
              to: statusLabel(status),
            },
          ],
        },
        manager,
      );
    });

    return this.findById(companyId, id);
  }

  async softDelete(companyId: string, id: string, ctx: AuditContext) {
    const customer = await this.findEntity(companyId, id);
    await AppDataSource.transaction(async (manager) => {
      await manager.softDelete(Customer, { id });
      await activityLogService.log(
        ctx,
        {
          action: LogAction.DELETE,
          entity: LogEntity.CUSTOMER,
          entityId: id,
          summary: `Deleted customer ${customer.names} (${customer.service})`,
        },
        manager,
      );
    });
  }

  // Counts per status for the header cards (same company, date and service filters as the list)
  async stats(companyId: string, f: any) {
    const qb = this.repo
      .createQueryBuilder("customer")
      .select("customer.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("customer.companyId = :companyId", { companyId });

    if (f.serviceId)
      qb.andWhere("customer.serviceId = :serviceId", {
        serviceId: f.serviceId,
      });
    if (f.from) {
      qb.andWhere(
        "customer.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)",
        { from: f.from, tz: TZ },
      );
    }
    if (f.updatedById)
      qb.andWhere("updatedBy.id = :updatedById", {
        updatedById: f.updatedById,
      });
    if (f.to) {
      qb.andWhere(
        "customer.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)",
        { to: f.to, tz: TZ },
      );
    }

    const rows = await qb.groupBy("customer.status").getRawMany();

    const byStatus: Record<string, number> = Object.fromEntries(
      Object.values(CustomerStatus).map((s) => [s, 0]),
    );
    for (const r of rows) byStatus[r.status] = Number(r.count);

    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
    };
  }

  // ── helpers ────────────────────────────────────────────

  private actor = (ctx: AuditContext) =>
    ctx.actorId ? ({ id: ctx.actorId } as User) : null;

  // A customer of THIS company only
  private async findEntity(companyId: string, id: string) {
    const customer = await this.repo.findOneBy({ id, companyId });
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
  }

  // A service of THIS company
  private async findService(
    companyId: string,
    serviceId: string,
    activeOnly: boolean,
  ) {
    const service = await this.serviceRepo.findOneBy({
      id: serviceId,
      companyId,
    });
    if (!service || (activeOnly && !service.active)) {
      throw new ApiError(400, "Please choose a valid service");
    }
    return service;
  }

  // Keeps only the chosen service's fields, checks required ones, sets the service name
  private serviceData(service: Service, dto: any): Partial<Customer> {
    const wanted = new Map(service.fields.map((f) => [f.key, f.required]));
    const data: Record<string, any> = { serviceId: service.id };
    const missing: string[] = [];

    for (const f of FIELD_CATALOG) {
      if (!wanted.has(f.key)) {
        data[f.key] = null;
        continue;
      }
      const value = (dto[f.key] ?? "").toString().trim();
      if (!value && wanted.get(f.key)) missing.push(f.label.en);
      if (
        value &&
        f.type === "number" &&
        (isNaN(Number(value)) || Number(value) <= 0)
      ) {
        throw new ApiError(400, `${f.label.en} must be a valid number`);
      }
      data[f.key] = value || null;
    }

    if (missing.length)
      throw new ApiError(400, `Please fill in: ${missing.join(", ")}`);

    if (service.allowCustomName) {
      const custom = (dto.customServiceName ?? "").trim();
      if (!custom) throw new ApiError(400, "Please type the service name");
      data.service = custom;
    } else {
      data.service = service.name;
    }

    return data as Partial<Customer>;
  }

  private withRelations() {
    return this.repo
      .createQueryBuilder("customer")
      .leftJoin("customer.serviceRef", "serviceRef")
      .addSelect(["serviceRef.id", "serviceRef.name", "serviceRef.key"])
      .leftJoin("customer.updatedBy", "updatedBy")
      .addSelect([
        "updatedBy.id",
        "updatedBy.names",
        "updatedBy.phoneNumber",
        "updatedBy.role",
      ]);
  }

  // Shared by the list and the CSV export
  private filtered(companyId: string, f: any) {
    const qb = this.withRelations().where("customer.companyId = :companyId", {
      companyId,
    });

    if (f.search) {
      const search = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
      qb.andWhere(
        "(customer.names ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search OR customer.service ILIKE :search)",
        { search },
      );
    }
    if (f.status)
      qb.andWhere("customer.status = :status", { status: f.status });
    if (f.serviceId)
      qb.andWhere("customer.serviceId = :serviceId", {
        serviceId: f.serviceId,
      });

    // Whole days in Kigali time
    if (f.from) {
      qb.andWhere(
        "customer.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)",
        { from: f.from, tz: TZ },
      );
    }
    if (f.to) {
      qb.andWhere(
        "customer.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)",
        { to: f.to, tz: TZ },
      );
    }

    return qb
      .orderBy("customer.createdAt", "DESC")
      .addOrderBy("customer.id", "DESC");
  }
}

export const customerService = new CustomerService();
