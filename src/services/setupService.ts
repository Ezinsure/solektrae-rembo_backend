import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entities/User";
import { BootstrapAdminDto } from "../dtos/auth/logindto";
import { UserResponseDto } from "../dtos/users/userdto";
import { hashPassword } from "../utils/password";
import { ApiError } from "../utils/apiError";

export class SetupService {
  private repo: Repository<User> = AppDataSource.getRepository(User);

  async bootstrapAdmin(dto: BootstrapAdminDto): Promise<UserResponseDto> {
    const existingUserCount = await this.repo.count({ withDeleted: true });

    if (existingUserCount > 0) {
      throw new ApiError(
        403,
        "System already initialized. Ask an existing admin to create your account."
      );
    }

    const admin = this.repo.create({
      names: dto.names,
      email: dto.email,
      password: await hashPassword(dto.password),
      role: UserRole.ADMIN,
      phoneNumber: dto.phoneNumber,
      isActive: true,
      mustChangePassword: true,
    });

    const saved = await this.repo.save(admin);
    return UserResponseDto.fromEntity(saved);
  }
}

export const setupService = new SetupService();