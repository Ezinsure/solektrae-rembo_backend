import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Service } from "../entities/Service";
import { Company } from "../entities/Company";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { ApiError } from "../utils/apiError";
import { AuditContext } from "../utils/auditContext";
import { activityLogService } from "./activityLog";
import { FIELD_CATALOG, FIELD_GROUPS } from "../constants/serviceFields";

const SERVICE_LABELS: any = {
  name: "Name",
  description: "Description",
  tags: "Tags",
  active: "Active",
  allowCustomName: "Customer types the name",
  fields: "Fields",
  sortOrder: "Order",
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "service";

// Compare values by content (arrays/objects included)
const same = (a: any, b: any) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

class ServiceService {
  private repo = AppDataSource.getRepository(Service);

  fieldCatalog = () => ({ groups: FIELD_GROUPS, fields: FIELD_CATALOG });

  async list(
    companyId: string,
    opts: { includeInactive?: boolean; search?: string } = {},
  ) {
    const qb = this.repo
      .createQueryBuilder("s")
      .where("s.companyId = :companyId", { companyId });

    if (!opts.includeInactive) qb.andWhere("s.active = true");

    if (opts.search) {
      const term = `%${opts.search.replace(/[\\%_]/g, "\\$&")}%`;
      qb.andWhere(
        "(s.name ILIKE :term OR s.description ILIKE :term OR s.tags::text ILIKE :term)",
        { term },
      );
    }

    const rows = await qb
      .orderBy("s.sortOrder", "ASC")
      .addOrderBy("s.name", "ASC")
      .getMany();
    return rows.map(this.toResponse);
  }

  async getOne(companyId: string, id: string) {
    return this.toResponse(await this.findOrFail(companyId, id));
  }

  // Public customer form: active services of a company, with field labels
  async listPublic(companySlug: string) {
    const company = await AppDataSource.getRepository(Company).findOne({
      where: { slug: companySlug, isActive: true },
    });
    if (!company) throw new ApiError(404, "Company not found");

    const rows = await this.repo.find({
      where: { companyId: company.id, active: true },
      order: { sortOrder: "ASC", name: "ASC" },
    });

    const catalog = new Map(FIELD_CATALOG.map((f) => [f.key, f]));

    return {
      company: { id: company.id, name: company.name, logoUrl: company.logoUrl },
      services: rows.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        description: s.description,
        allowCustomName: s.allowCustomName,
        fields: s.fields
          .filter((f) => catalog.has(f.key as any)) // skip fields removed from the catalog
          .map((f) => ({ ...catalog.get(f.key as any), required: f.required })),
      })),
    };
  }

  async create(companyId: string, dto: any, ctx: AuditContext) {
    await this.assertNameFree(companyId, dto.name);
    const key = await this.uniqueKey(companyId, dto.name);
    const maxOrder = (await this.repo.maximum("sortOrder", { companyId })) ?? 0;

    return AppDataSource.transaction(async (manager) => {
      const service = manager.create(Service, {
        companyId,
        key,
        name: dto.name,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        active: dto.active ?? true,
        allowCustomName: dto.allowCustomName ?? false,
        fields: dto.fields ?? [],
        sortOrder: maxOrder + 1,
        createdById: ctx.actorId,
        updatedById: ctx.actorId,
      });
      await manager.save(service);

      await activityLogService.log(
        ctx,
        {
          action: LogAction.CREATE,
          entity: LogEntity.SERVICE,
          entityId: service.id,
          summary: `Created service "${service.name}"`,
        },
        manager,
      );

      return this.toResponse(service);
    });
  }

  async update(companyId: string, id: string, dto: any, ctx: AuditContext) {
    const service = await this.findOrFail(companyId, id);

    if (dto.name !== undefined && dto.name !== service.name) {
      await this.assertNameFree(companyId, dto.name, service.id);
    }
    const changes: any[] = [];
    for (const field of Object.keys(SERVICE_LABELS)) {
      if (dto[field] === undefined) continue;
      if (same((service as any)[field], dto[field])) continue;
      changes.push({
        field: SERVICE_LABELS[field],
        from: (service as any)[field],
        to: dto[field],
      });
      (service as any)[field] = dto[field];
    }
    if (changes.length === 0) return this.toResponse(service);
    service.updatedById = ctx.actorId;
    return AppDataSource.transaction(async (manager) => {
      await manager.save(service);
      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.SERVICE,
          entityId: service.id,
          summary: `Updated service "${service.name}"`,
          changes,
        },
        manager,
      );
      return this.toResponse(service);
    });
  }

  // Sets the order on the customer form: ids in the wanted order
  async reorder(companyId: string, ids: string[], ctx: AuditContext) {
    const found = await this.repo.find({
      where: { companyId, id: In(ids) },
      select: { id: true },
    });
    if (found.length !== ids.length)
      throw new ApiError(400, "Some services were not found");

    await AppDataSource.transaction(async (manager) => {
      for (const [index, id] of ids.entries()) {
        await manager.update(
          Service,
          { id, companyId },
          { sortOrder: index + 1, updatedById: ctx.actorId },
        );
      }
      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.SERVICE,
          entityId: null,
          summary: "Reordered services",
        },
        manager,
      );
    });

    return this.list(companyId, { includeInactive: true });
  }

  // Soft delete: past customers keep their link to it
  async remove(companyId: string, id: string, ctx: AuditContext) {
    const service = await this.findOrFail(companyId, id);

    await AppDataSource.transaction(async (manager) => {
      await manager.update(
        Service,
        { id },
        { deletedById: ctx.actorId, active: false },
      );
      await manager.softDelete(Service, { id });
      await activityLogService.log(
        ctx,
        {
          action: LogAction.DELETE,
          entity: LogEntity.SERVICE,
          entityId: id,
          summary: `Deleted service "${service.name}"`,
        },
        manager,
      );
    });
  }

  // ── helpers ────────────────────────────────────────────

  private async findOrFail(companyId: string, id: string) {
    const service = await this.repo.findOneBy({ id, companyId });
    if (!service) throw new ApiError(404, "Service not found");
    return service;
  }

  private async assertNameFree(
    companyId: string,
    name: string,
    exceptId?: string,
  ) {
    const wanted = slugify(name);
    const others = await this.repo.find({
      where: { companyId },
      select: { id: true, name: true, key: true },
    });
    const clash = others.find(
      (s) =>
        s.id !== exceptId && (slugify(s.name) === wanted || s.key === wanted),
    );

    if (clash) {
      throw new ApiError(
        409,
        `A service with a similar name already exists: "${clash.name}"`,
      );
    }
  }

  // Unique per company, including deleted services (so old stats never mix)
  private async uniqueKey(companyId: string, name: string) {
    const base = slugify(name);
    let key = base;
    let n = 2;
    while (
      await this.repo.exists({ where: { companyId, key }, withDeleted: true })
    ) {
      key = `${base}-${n++}`;
    }
    return key;
  }

  private toResponse = (s: Service) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    description: s.description,
    tags: s.tags,
    active: s.active,
    allowCustomName: s.allowCustomName,
    fields: s.fields,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}
export const serviceService = new ServiceService();
