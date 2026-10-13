"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = exports.CustomerService = void 0;
const database_1 = require("../config/database");
const Customer_1 = require("../entities/Customer");
const Company_1 = require("../entities/Company");
const Service_1 = require("../entities/Service");
const ActivityLog_1 = require("../entities/ActivityLog");
const apiError_1 = require("../utils/apiError");
const diff_1 = require("../utils/diff");
const csv_1 = require("../utils/csv");
const activityLog_1 = require("./activityLog");
const serviceFields_1 = require("../constants/serviceFields");
const TZ = "Africa/Kigali";
const EXPORT_LIMIT = 10000;
const CUSTOMER_LABELS = {
    names: "Name",
    email: "Email",
    phoneNumber: "Phone",
    service: "Service",
    ...Object.fromEntries(serviceFields_1.FIELD_CATALOG.map((f) => [f.key, f.label.en])),
};
const STATUS_LABELS = {
    [Customer_1.CustomerStatus.PENDING]: "Pending",
    [Customer_1.CustomerStatus.COMPLETED]: "Completed",
    [Customer_1.CustomerStatus.CANCELLED]: "Cancelled",
};
const statusLabel = (s) => STATUS_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
class CustomerService {
    repo = database_1.AppDataSource.getRepository(Customer_1.Customer);
    serviceRepo = database_1.AppDataSource.getRepository(Service_1.Service);
    // Customer applies from the public form
    async submitPublic(companySlug, dto) {
        const company = await database_1.AppDataSource.getRepository(Company_1.Company).findOne({
            where: { slug: companySlug, isActive: true },
        });
        if (!company)
            throw new apiError_1.ApiError(404, "Company not found");
        const service = await this.findService(company.id, dto.serviceId, true);
        // Same person, same service, still pending, in the last 10 minutes → don't create a second one
        // Only blocks an exact repeat (double-click / resubmit within 10 minutes)
        const serviceName = service.allowCustomName
            ? (dto.customServiceName ?? "").trim()
            : service.name;
        const recent = await this.repo
            .createQueryBuilder("c")
            .where("c.companyId = :companyId", { companyId: company.id })
            .andWhere("c.serviceId = :serviceId", { serviceId: service.id })
            .andWhere("LOWER(TRIM(c.service)) = LOWER(TRIM(:serviceName))", {
            serviceName,
        })
            .andWhere("LOWER(TRIM(c.names)) = LOWER(TRIM(:names))", {
            names: dto.names,
        })
            .andWhere("LOWER(c.email) = LOWER(:email)", { email: dto.email })
            .andWhere("c.phoneNumber = :phone", { phone: dto.phoneNumber })
            .andWhere("c.status = :pending", { pending: Customer_1.CustomerStatus.PENDING })
            .andWhere("c.createdAt > NOW() - INTERVAL '10 minutes'")
            .getOne();
        if (recent) {
            throw new apiError_1.ApiError(409, "You already applied for this service. We'll contact you soon.");
        }
        const customer = this.repo.create({
            companyId: company.id,
            names: dto.names,
            email: dto.email,
            phoneNumber: dto.phoneNumber,
            ...this.serviceData(service, dto),
            status: Customer_1.CustomerStatus.PENDING,
        });
        const saved = await this.repo.save(customer);
        return {
            id: saved.id,
            service: saved.service,
            status: saved.status,
            createdAt: saved.createdAt,
        };
    }
    async findAll(companyId, query) {
        const qb = this.filtered(companyId, query)
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: query.page, limit: query.limit };
    }
    async findById(companyId, id) {
        const customer = await this.withRelations()
            .where("customer.id = :id", { id })
            .andWhere("customer.companyId = :companyId", { companyId })
            .getOne();
        if (!customer)
            throw new apiError_1.ApiError(404, "Customer not found");
        return customer;
    }
    async exportCsv(companyId, filters) {
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
            "Note",
            ...serviceFields_1.FIELD_CATALOG.map((f) => f.label.en),
            "Updated by",
        ];
        const data = list.map((c) => [
            (0, csv_1.kigaliDate)(c.createdAt),
            c.names,
            c.email,
            c.phoneNumber,
            c.service,
            STATUS_LABELS[c.status] ?? c.status,
            c.statusNote ?? "",
            ...serviceFields_1.FIELD_CATALOG.map((f) => c[f.key] ?? ""),
            c.updatedBy?.names ?? "", // who changed the status (empty while pending)
        ]);
        return { csv: (0, csv_1.toCsv)(headers, data), total: list.length, truncated };
    }
    // Edit details:
    async update(companyId, id, dto, ctx) {
        const customer = await this.findEntity(companyId, id);
        const service = await this.findService(companyId, dto.serviceId, false);
        const before = { ...customer };
        Object.assign(customer, {
            names: dto.names,
            email: dto.email,
            phoneNumber: dto.phoneNumber,
            ...this.serviceData(service, dto),
        });
        const changes = (0, diff_1.diff)(before, customer, {
            labels: CUSTOMER_LABELS,
            only: Object.keys(CUSTOMER_LABELS),
        });
        if (changes.length === 0)
            return this.findById(companyId, id);
        await database_1.AppDataSource.transaction(async (manager) => {
            await manager.save(customer);
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.CUSTOMER,
                entityId: id,
                summary: `Updated customer ${customer.names}`,
                changes,
            }, manager);
        });
        return this.findById(companyId, id);
    }
    // update status
    async updateStatus(companyId, id, status, note, ctx) {
        if (status === Customer_1.CustomerStatus.PENDING) {
            throw new apiError_1.ApiError(400, "A customer can't be set back to pending");
        }
        const reason = note?.trim() || null;
        const customer = await this.findEntity(companyId, id);
        if (customer.status === status && customer.statusNote === reason) {
            return this.findById(companyId, id);
        }
        const from = customer.status;
        customer.status = status;
        customer.statusNote = reason;
        customer.updatedBy = this.actor(ctx);
        const changes = [];
        if (from !== status)
            changes.push({
                field: "Status",
                from: statusLabel(from),
                to: statusLabel(status),
            });
        if (reason)
            changes.push({ field: "Reason", from: null, to: reason });
        await database_1.AppDataSource.transaction(async (manager) => {
            await manager.save(customer);
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.CUSTOMER,
                entityId: id,
                summary: `Marked ${customer.names} as ${statusLabel(status).toLowerCase()}`,
                changes,
            }, manager);
        });
        return this.findById(companyId, id);
    }
    async softDelete(companyId, id, ctx) {
        const customer = await this.findEntity(companyId, id);
        await database_1.AppDataSource.transaction(async (manager) => {
            await manager.softDelete(Customer_1.Customer, { id });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.DELETE,
                entity: ActivityLog_1.LogEntity.CUSTOMER,
                entityId: id,
                summary: `Deleted customer ${customer.names} (${customer.service})`,
            }, manager);
        });
    }
    // Counts per status for the header cards (same company, date and service filters as the list)
    async stats(companyId, f) {
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
            qb.andWhere("customer.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)", { from: f.from, tz: TZ });
        }
        if (f.updatedById)
            qb.andWhere("updatedBy.id = :updatedById", {
                updatedById: f.updatedById,
            });
        if (f.to) {
            qb.andWhere("customer.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)", { to: f.to, tz: TZ });
        }
        const rows = await qb.groupBy("customer.status").getRawMany();
        const byStatus = Object.fromEntries(Object.values(Customer_1.CustomerStatus).map((s) => [s, 0]));
        for (const r of rows)
            byStatus[r.status] = Number(r.count);
        return {
            total: Object.values(byStatus).reduce((a, b) => a + b, 0),
            byStatus,
        };
    }
    // ── helpers ────────────────────────────────────────────
    actor = (ctx) => ctx.actorId ? { id: ctx.actorId } : null;
    // A customer of THIS company only
    async findEntity(companyId, id) {
        const customer = await this.repo.findOneBy({ id, companyId });
        if (!customer)
            throw new apiError_1.ApiError(404, "Customer not found");
        return customer;
    }
    // A service of THIS company
    async findService(companyId, serviceId, activeOnly) {
        const service = await this.serviceRepo.findOneBy({
            id: serviceId,
            companyId,
        });
        if (!service || (activeOnly && !service.active)) {
            throw new apiError_1.ApiError(400, "Please choose a valid service");
        }
        return service;
    }
    // Keeps only the chosen service's fields, checks required ones, sets the service name
    serviceData(service, dto) {
        const wanted = new Map(service.fields.map((f) => [f.key, f.required]));
        const data = { serviceId: service.id };
        const missing = [];
        for (const f of serviceFields_1.FIELD_CATALOG) {
            if (!wanted.has(f.key)) {
                data[f.key] = null;
                continue;
            }
            const value = (dto[f.key] ?? "").toString().trim();
            if (!value && wanted.get(f.key))
                missing.push(f.label.en);
            if (value &&
                f.type === "number" &&
                (isNaN(Number(value)) || Number(value) <= 0)) {
                throw new apiError_1.ApiError(400, `${f.label.en} must be a valid number`);
            }
            data[f.key] = value || null;
        }
        if (missing.length)
            throw new apiError_1.ApiError(400, `Please fill in: ${missing.join(", ")}`);
        if (service.allowCustomName) {
            const custom = (dto.customServiceName ?? "").trim();
            if (!custom)
                throw new apiError_1.ApiError(400, "Please type the service name");
            data.service = custom;
        }
        else {
            data.service = service.name;
        }
        return data;
    }
    withRelations() {
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
    filtered(companyId, f) {
        const qb = this.withRelations().where("customer.companyId = :companyId", {
            companyId,
        });
        if (f.search) {
            const search = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
            qb.andWhere("(customer.names ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search OR customer.service ILIKE :search)", { search });
        }
        if (f.status)
            qb.andWhere("customer.status = :status", { status: f.status });
        if (f.serviceId)
            qb.andWhere("customer.serviceId = :serviceId", {
                serviceId: f.serviceId,
            });
        // Whole days in Kigali time
        if (f.from) {
            qb.andWhere("customer.createdAt >= (CAST(:from AS date)::timestamp AT TIME ZONE :tz)", { from: f.from, tz: TZ });
        }
        if (f.to) {
            qb.andWhere("customer.createdAt < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE :tz)", { to: f.to, tz: TZ });
        }
        return qb
            .orderBy("customer.createdAt", "DESC")
            .addOrderBy("customer.id", "DESC");
    }
}
exports.CustomerService = CustomerService;
exports.customerService = new CustomerService();
//# sourceMappingURL=customerService.js.map