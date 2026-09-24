import { Repository } from "typeorm";
import { Service } from "../entities/Service";
import { Customer } from "../entities/Customer";
import { AppDataSource } from "../config/database";
import { ApiError } from "../utils/apiError";
import {
  CreateServiceDto,
  UpdateServiceDto,
} from "../dtos/services/servicedto";

export class ServiceService {
  private repo: Repository<Service> = AppDataSource.getRepository(Service);
  private customerRepo: Repository<Customer> =
    AppDataSource.getRepository(Customer);

  // `includeInactive` is only meant to be honored for authenticated admins —
  // the controller decides whether to pass true, not the raw query string,
  // so a member of the public can't request hidden/retired services.
  async findAll(includeInactive = false): Promise<Service[]> {
    return this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: "ASC" },
    });
  }

  async findById(id: string): Promise<Service> {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new ApiError(404, "Service not found");
    return service;
  }

  async create(dto: CreateServiceDto): Promise<Service> {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing)
      throw new ApiError(409, "A service with this name already exists");

    const service = this.repo.create({
      ...dto,
      isOther: dto.isOther ?? false,
      // createdById: userId,
      // updatedById: userId,
    });
    return this.repo.save(service);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findById(id);

    if (dto.name && dto.name !== service.name) {
      const existing = await this.repo.findOne({ where: { name: dto.name } });
      if (existing)
        throw new ApiError(409, "A service with this name already exists");
    }

    Object.assign(service, dto);
    return this.repo.save(service);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id); // 404s if it doesn't exist

    const inUseCount = await this.customerRepo.count({
      where: { serviceId: id },
    });
    if (inUseCount > 0) {
      throw new ApiError(
        409,
        `Cannot delete: ${inUseCount} customer(s) currently reference this service. Deactivate it instead (PATCH isActive: false) to hide it from new registrations without breaking existing records.`,
      );
    }

    await this.repo.softDelete(id);
  }
}

export const serviceService = new ServiceService();
