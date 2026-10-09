import { Brackets, type EntityManager, type SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../config/database";
import { ActivityLog, LogAction, LogEntity, type LogChange } from "../entities/ActivityLog";
import { User } from "../entities/User";
import type { AuditContext } from "../utils/auditContext";
import { LogFilters, LogQuery } from "../dtos/logQueryDto";

type LogInput = {
  action: LogAction;
  entity: LogEntity;
  entityId?: string | null;
  summary: string;
  changes?: LogChange[] | null;
};

const TIME_ZONE = "Africa/Kigali"; 
export const EXPORT_LIMIT = 10_000;

class ActivityLogService {
  private repo = AppDataSource.getRepository(ActivityLog);

  /**
   * Records an activity. Never throws: a logging problem must not break the real action.
   * Pass `manager` to save the log inside the same transaction as the change.
   */
  async log(ctx: AuditContext, input: LogInput, manager?: EntityManager): Promise<void> {
    if (input.action === LogAction.UPDATE && input.changes && input.changes.length === 0) return;

    try {
      const em = manager ?? this.repo.manager;

      // The access token may not carry the name, so look it up when missing
      let actorName = ctx.actorName;
      if (ctx.actorId && !actorName) {
        const actor = await em.findOne(User, {
          where: { id: ctx.actorId },
          select: { id: true, names: true },
          withDeleted: true,
        });
        actorName = actor?.names ?? null;
      }

      await em.getRepository(ActivityLog).insert({
        actorId: ctx.actorId,
        actorName,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 255),
        changes: input.changes?.length ? (input.changes as any) : null,
      });
    } catch (err) {
      if (manager) throw err; 
      console.error("Failed to write activity log:", err);
    }
  }

  async list(query: LogQuery) {
    const qb = this.filtered(query)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit };
  }

  async exportCsv(filters: LogFilters): Promise<{ csv: string; total: number; truncated: boolean }> {
    const qb = this.filtered(filters);
    const total = await qb.getCount();
    const rows = await qb.take(EXPORT_LIMIT).getMany();

    const header = ["Time (Kigali)", "User", "Action", "Area", "Record ID", "Description", "Changes", "IP address", "Device"];
    const lines = rows.map((l) => [
      formatTime(l.createdAt),
      l.actorName ?? "System",
      l.action,
      l.entity,
      l.entityId ?? "",
      l.summary,
      (l.changes ?? []).map((c) => `${c.field}: ${show(c.from)} → ${show(c.to)}`).join("; "),
      l.ip ?? "",
      l.userAgent ?? "",
    ]);

    // ﻿ (BOM) makes Excel open the file as UTF-8, so names with accents display correctly
    const csv = "﻿" + [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");
    return { csv, total, truncated: total > EXPORT_LIMIT };
  }

  private filtered(q: LogFilters): SelectQueryBuilder<ActivityLog> {
    const qb = this.repo.createQueryBuilder("log");

    if (q.action) qb.andWhere("log.action = :action", { action: q.action });
    if (q.entity) qb.andWhere("log.entity = :entity", { entity: q.entity });
    if (q.entityId) qb.andWhere("log.entityId = :entityId", { entityId: q.entityId });
    if (q.actorId) qb.andWhere("log.actorId = :actorId", { actorId: q.actorId });

    if (q.from) {
      qb.andWhere(`log.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)`, { from: q.from, tz: TIME_ZONE });
    }
    if (q.to) {
      qb.andWhere(`log.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)`, { to: q.to, tz: TIME_ZONE });
    }

    if (q.search) {
      const search = `%${q.search.replace(/[%_\\]/g, "\\$&")}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where("log.summary ILIKE :search", { search })
            .orWhere("log.actorName ILIKE :search", { search })
            .orWhere("log.ip ILIKE :search", { search });
        }),
      );
    }

    return qb.orderBy("log.createdAt", "DESC").addOrderBy("log.id", "DESC");
  }
}


const formatTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(d);

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "empty" : String(v));

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export const activityLogService = new ActivityLogService();