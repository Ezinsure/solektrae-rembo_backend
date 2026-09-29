"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = exports.CustomerService = void 0;
const Customer_1 = require("../entities/Customer");
const database_1 = require("../config/database");
const apiError_1 = require("../utils/apiError");
class CustomerService {
    repo = database_1.AppDataSource.getRepository(Customer_1.Customer);
    // async findAll(
    //   query: CustomerQueryDto,
    // ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    //   const qb = this.repo.createQueryBuilder("customer");
    //   if (query.search) {
    //     qb.andWhere(
    //       "(customer.names ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search)",
    //       { search: `%${query.search}%` },
    //     );
    //   }
    //   if (query.status) {
    //     qb.andWhere("customer.status = :status", { status: query.status });
    //   }
    //   qb.orderBy("customer.createdAt", "DESC")
    //     .skip((query.page - 1) * query.limit)
    //     .take(query.limit);
    //   const [data, total] = await qb.getManyAndCount();
    //   return { data, total, page: query.page, limit: query.limit };
    // }
    async findAll(query) {
        const qb = this.repo.createQueryBuilder("customer");
        qb.leftJoin("customer.updatedBy", "updatedBy").addSelect([
            "updatedBy.id",
            "updatedBy.names",
            "updatedBy.phoneNumber",
            "updatedBy.role",
        ]);
        if (query.search) {
            qb.andWhere("(customer.names ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search)", { search: `%${query.search}%` });
        }
        if (query.status) {
            qb.andWhere("customer.status = :status", { status: query.status });
        }
        qb.orderBy("customer.createdAt", "DESC")
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: query.page, limit: query.limit };
    }
    async findById(id) {
        const customer = await this.repo.findOne({ where: { id } });
        if (!customer)
            throw new apiError_1.ApiError(404, "Customer not found");
        return customer;
    }
    async create(dto) {
        const customer = this.repo.create({
            ...dto,
            status: Customer_1.CustomerStatus.PENDING,
        });
        return this.repo.save(customer);
    }
    async update(id, dto) {
        const customer = await this.findById(id);
        Object.assign(customer, dto);
        return this.repo.save(customer);
    }
    async updateStatus(id, status, updatedById) {
        const customer = await this.findById(id);
        customer.status = status;
        customer.updatedBy = { id: updatedById };
        await this.repo.save(customer);
        const updatedCustomer = await this.repo
            .createQueryBuilder("customer")
            .leftJoinAndSelect("customer.updatedBy", "updatedBy")
            .addSelect([
            "updatedBy.id",
            "updatedBy.names",
            "updatedBy.phoneNumber",
            "updatedBy.role",
        ])
            .where("customer.id = :id", { id })
            .getOne();
        if (!updatedCustomer) {
            throw new Error("Customer not found");
        }
        return updatedCustomer;
    }
    async softDelete(id) {
        await this.findById(id);
        await this.repo.softDelete(id);
    }
}
exports.CustomerService = CustomerService;
exports.customerService = new CustomerService();
//# sourceMappingURL=customerService.js.map