"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const Service_1 = require("../entities/Service");
const Company_1 = require("../entities/Company");
const ActivityLog_1 = require("../entities/ActivityLog");
const apiError_1 = require("../utils/apiError");
const activityLog_1 = require("./activityLog");
const serviceFields_1 = require("../constants/serviceFields");
const SERVICE_LABELS = {
    name: "Name",
    description: "Description",
    tags: "Tags",
    active: "Active",
    allowCustomName: "Customer types the name",
    fields: "Fields",
    sortOrder: "Order",
};
const slugify = (text) => text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "service";
// Compare values by content (arrays/objects included)
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
class ServiceService {
    repo = database_1.AppDataSource.getRepository(Service_1.Service);
    fieldCatalog = () => ({ groups: serviceFields_1.FIELD_GROUPS, fields: serviceFields_1.FIELD_CATALOG });
    async list(companyId, opts = {}) {
        const qb = this.repo
            .createQueryBuilder("s")
            .where("s.companyId = :companyId", { companyId });
        if (!opts.includeInactive)
            qb.andWhere("s.active = true");
        if (opts.search) {
            const term = `%${opts.search.replace(/[\\%_]/g, "\\$&")}%`;
            qb.andWhere("(s.name ILIKE :term OR s.description ILIKE :term OR s.tags::text ILIKE :term)", { term });
        }
        const rows = await qb
            .orderBy("s.sortOrder", "ASC")
            .addOrderBy("s.name", "ASC")
            .getMany();
        return rows.map(this.toResponse);
    }
    async getOne(companyId, id) {
        return this.toResponse(await this.findOrFail(companyId, id));
    }
    // Public customer form: active services of a company, with field labels
    async listPublic(companySlug) {
        const company = await database_1.AppDataSource.getRepository(Company_1.Company).findOne({
            where: { slug: companySlug, isActive: true },
        });
        if (!company)
            throw new apiError_1.ApiError(404, "Company not found");
        const rows = await this.repo.find({
            where: { companyId: company.id, active: true },
            order: { sortOrder: "ASC", name: "ASC" },
        });
        const catalog = new Map(serviceFields_1.FIELD_CATALOG.map((f) => [f.key, f]));
        return {
            company: { id: company.id, name: company.name, logoUrl: company.logoUrl },
            services: rows.map((s) => ({
                id: s.id,
                key: s.key,
                name: s.name,
                description: s.description,
                allowCustomName: s.allowCustomName,
                fields: s.fields
                    .filter((f) => catalog.has(f.key)) // skip fields removed from the catalog
                    .map((f) => ({ ...catalog.get(f.key), required: f.required })),
            })),
        };
    }
    async create(companyId, dto, ctx) {
        await this.assertNameFree(companyId, dto.name);
        const key = await this.uniqueKey(companyId, dto.name);
        const maxOrder = (await this.repo.maximum("sortOrder", { companyId })) ?? 0;
        return database_1.AppDataSource.transaction(async (manager) => {
            const service = manager.create(Service_1.Service, {
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
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.CREATE,
                entity: ActivityLog_1.LogEntity.SERVICE,
                entityId: service.id,
                summary: `Created service "${service.name}"`,
            }, manager);
            return this.toResponse(service);
        });
    }
    async update(companyId, id, dto, ctx) {
        const service = await this.findOrFail(companyId, id);
        if (dto.name !== undefined && dto.name !== service.name) {
            await this.assertNameFree(companyId, dto.name, service.id);
        }
        const changes = [];
        for (const field of Object.keys(SERVICE_LABELS)) {
            if (dto[field] === undefined)
                continue;
            if (same(service[field], dto[field]))
                continue;
            changes.push({
                field: SERVICE_LABELS[field],
                from: service[field],
                to: dto[field],
            });
            service[field] = dto[field];
        }
        if (changes.length === 0)
            return this.toResponse(service);
        service.updatedById = ctx.actorId;
        return database_1.AppDataSource.transaction(async (manager) => {
            await manager.save(service);
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.SERVICE,
                entityId: service.id,
                summary: `Updated service "${service.name}"`,
                changes,
            }, manager);
            return this.toResponse(service);
        });
    }
    // Sets the order on the customer form: ids in the wanted order
    async reorder(companyId, ids, ctx) {
        const found = await this.repo.find({
            where: { companyId, id: (0, typeorm_1.In)(ids) },
            select: { id: true },
        });
        if (found.length !== ids.length)
            throw new apiError_1.ApiError(400, "Some services were not found");
        await database_1.AppDataSource.transaction(async (manager) => {
            for (const [index, id] of ids.entries()) {
                await manager.update(Service_1.Service, { id, companyId }, { sortOrder: index + 1, updatedById: ctx.actorId });
            }
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.SERVICE,
                entityId: null,
                summary: "Reordered services",
            }, manager);
        });
        return this.list(companyId, { includeInactive: true });
    }
    // Soft delete: past customers keep their link to it
    async remove(companyId, id, ctx) {
        const service = await this.findOrFail(companyId, id);
        await database_1.AppDataSource.transaction(async (manager) => {
            await manager.update(Service_1.Service, { id }, { deletedById: ctx.actorId, active: false });
            await manager.softDelete(Service_1.Service, { id });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.DELETE,
                entity: ActivityLog_1.LogEntity.SERVICE,
                entityId: id,
                summary: `Deleted service "${service.name}"`,
            }, manager);
        });
    }
    // ── helpers ────────────────────────────────────────────
    async findOrFail(companyId, id) {
        const service = await this.repo.findOneBy({ id, companyId });
        if (!service)
            throw new apiError_1.ApiError(404, "Service not found");
        return service;
    }
    async assertNameFree(companyId, name, exceptId) {
        const wanted = slugify(name);
        const others = await this.repo.find({
            where: { companyId },
            select: { id: true, name: true, key: true },
        });
        const clash = others.find((s) => s.id !== exceptId && (slugify(s.name) === wanted || s.key === wanted));
        if (clash) {
            throw new apiError_1.ApiError(409, `A service with a similar name already exists: "${clash.name}"`);
        }
    }
    // Unique per company, including deleted services (so old stats never mix)
    async uniqueKey(companyId, name) {
        const base = slugify(name);
        let key = base;
        let n = 2;
        while (await this.repo.exists({ where: { companyId, key }, withDeleted: true })) {
            key = `${base}-${n++}`;
        }
        return key;
    }
    toResponse = (s) => ({
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
exports.serviceService = new ServiceService();
//# sourceMappingURL=serviceServices.js.map