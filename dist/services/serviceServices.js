"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceService = exports.ServiceService = void 0;
const Service_1 = require("../entities/Service");
const Customer_1 = require("../entities/Customer");
const database_1 = require("../config/database");
const apiError_1 = require("../utils/apiError");
class ServiceService {
    repo = database_1.AppDataSource.getRepository(Service_1.Service);
    customerRepo = database_1.AppDataSource.getRepository(Customer_1.Customer);
    // `includeInactive` is only meant to be honored for authenticated admins —
    // the controller decides whether to pass true, not the raw query string,
    // so a member of the public can't request hidden/retired services.
    async findAll(includeInactive = false) {
        return this.repo.find({
            where: includeInactive ? {} : { isActive: true },
            order: { name: "ASC" },
        });
    }
    async findById(id) {
        const service = await this.repo.findOne({ where: { id } });
        if (!service)
            throw new apiError_1.ApiError(404, "Service not found");
        return service;
    }
    async create(dto) {
        const existing = await this.repo.findOne({ where: { name: dto.name } });
        if (existing)
            throw new apiError_1.ApiError(409, "A service with this name already exists");
        const service = this.repo.create({
            ...dto,
            isOther: dto.isOther ?? false,
            // createdById: userId,
            // updatedById: userId,
        });
        return this.repo.save(service);
    }
    async update(id, dto) {
        const service = await this.findById(id);
        if (dto.name && dto.name !== service.name) {
            const existing = await this.repo.findOne({ where: { name: dto.name } });
            if (existing)
                throw new apiError_1.ApiError(409, "A service with this name already exists");
        }
        Object.assign(service, dto);
        return this.repo.save(service);
    }
}
exports.ServiceService = ServiceService;
exports.serviceService = new ServiceService();
//# sourceMappingURL=serviceServices.js.map