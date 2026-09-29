import { Repository } from "typeorm";
import { Customer, CustomerStatus } from "../entities/Customer";
import { User } from "../entities/User";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from "../dtos/customers/customerdto";
import { AppDataSource } from "../config/database";
import { ApiError } from "../utils/apiError";

export class CustomerService {
  private repo: Repository<Customer> = AppDataSource.getRepository(Customer);

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
  async findAll(
    query: CustomerQueryDto,
  ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder("customer");

    qb.leftJoin("customer.updatedBy", "updatedBy").addSelect([
      "updatedBy.id",
      "updatedBy.names",
      "updatedBy.phoneNumber",
      "updatedBy.role",
    ]);

    if (query.search) {
      qb.andWhere(
        "(customer.names ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search)",
        { search: `%${query.search}%` },
      );
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

  async findById(id: string): Promise<Customer> {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.repo.create({
      ...dto,
      status: CustomerStatus.PENDING,
    });
    return this.repo.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findById(id);
    Object.assign(customer, dto);
    return this.repo.save(customer);
  }

  async updateStatus(
    id: string,
    status: CustomerStatus,
    updatedById: string,
  ): Promise<Customer> {
    const customer = await this.findById(id);

    customer.status = status;
    customer.updatedBy = { id: updatedById } as User;

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

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }
}

export const customerService = new CustomerService();
