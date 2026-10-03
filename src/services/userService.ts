import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entities/User";
import { CreateUserDto } from "../dtos/users/userdto";
import { UpdateUserDto } from "../dtos/users/userdto";
import { ChangePasswordDto } from "../dtos/users/chnagePasswddto";
import { AdminResetPasswordDto } from "../dtos/users/resetPsswddto";
import { UserQueryDto } from "../dtos/users/userdto";
import { UserResponseDto } from "../dtos/users/userdto";
import { hashPassword, comparePassword } from "../utils/password";
import { ApiError } from "../utils/apiError";
import { RefreshToken } from "../entities/RefreshToken";

export class UserService {
  private repo: Repository<User> = AppDataSource.getRepository(User);

  async findAll(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.repo
      .createQueryBuilder("user")
      .leftJoin("user.createdBy", "createdBy")
      .addSelect(["createdBy.id", "createdBy.names"])
      .leftJoin("user.updatedBy", "updatedBy")
      .addSelect(["updatedBy.id", "updatedBy.names"]);

    if (query.search) {
      qb.andWhere("(user.names ILIKE :search OR user.email ILIKE :search)", {
        search: `%${query.search}%`,
      });
    }
    if (query.role) {
      qb.andWhere("user.role = :role", { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere("user.isActive = :isActive", { isActive: query.isActive });
    }

    qb.orderBy("user.createdAt", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: UserResponseDto.fromEntities(users),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.repo
      .createQueryBuilder("user")
      .leftJoin("user.createdBy", "createdBy")
      .addSelect(["createdBy.id", "createdBy.names"])
      .leftJoin("user.updatedBy", "updatedBy")
      .addSelect(["updatedBy.id", "updatedBy.names"])
      .where("user.id = :id", { id })
      .getOne();

    if (!user) throw new ApiError(404, "User not found");
    return UserResponseDto.fromEntity(user);
  }
  // Used internally by auth.service — needs the password hash, so it
  // deliberately returns the raw entity, not the response DTO.
  async findEntityByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email })
      .getOne();
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  async create(
    dto: CreateUserDto,
    createdById: string,
  ): Promise<UserResponseDto> {
    const existing = await this.repo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (existing) {
      throw new ApiError(409, "A user with this email already exists");
    }
    const user = this.repo.create({
      names: dto.names,
      email: dto.email,
      password: await hashPassword(dto.password),
      role: dto.role,
      phoneNumber: dto.phoneNumber,
      profileImage: dto.profileImage ?? null,
      mustChangePassword: true,
      createdBy: { id: createdById } as User,
      updatedBy: { id: createdById } as User,
    });
    const saved = await this.repo.save(user);

    const full = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { createdBy: true, updatedBy: true },
    });
    return UserResponseDto.fromEntity(full);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);

    const email = dto.email?.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.repo.findOne({
        where: { email },
        withDeleted: true,
      });
      if (existing)
        throw new ApiError(409, "A user with this email already exists");
    }

    // Guard: don't let the last remaining admin be demoted or deactivated.
    const demoting =
      dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN;
    const deactivating = dto.isActive === false && user.role === UserRole.ADMIN;
    if (demoting || deactivating) {
      await this.assertNotLastActiveAdmin(user.id);
    }

    // Apply the changes (only fields that were sent)
    if (dto.names !== undefined) user.names = dto.names;
    if (email !== undefined) user.email = email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.profileImage !== undefined) user.profileImage = dto.profileImage;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    user.updatedById = userId;
    user.updatedBy = { id: userId } as User;

    await this.repo.save(user);
    return this.findById(user.id);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const user = await this.findEntityById(id);
    if (user.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(user.id);
    }

    await this.repo.manager.transaction(async (manager) => {
      await manager.update(User, id, { deletedById: userId });
      await manager.softDelete(User, id);
    });
  }

  async restore(id: string, userId: string): Promise<UserResponseDto> {
    const user = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!user) throw new ApiError(404, "User not found");

    await this.repo.manager.transaction(async (manager) => {
      await manager.restore(User, id);
      await manager.update(User, id, {
        deletedById: null,
        updatedById: userId,
      });
    });

    return this.findById(id);
  }

  async changeOwnPassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.id = :id", { id: userId })
      .getOne();

    if (!user) throw new ApiError(404, "User not found");

    const matches = await comparePassword(dto.currentPassword, user.password);
    if (!matches) throw new ApiError(401, "Current password is incorrect");

    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = false;
    await this.repo.save(user);
  }

  async adminResetPassword(
    id: string,
    dto: AdminResetPasswordDto,
    userId: string,
  ): Promise<void> {
    const user = await this.findEntityById(id);
    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = true;
    user.updatedById = userId;
    user.updatedBy = { id: userId } as User;

    await this.repo.manager.transaction(async (manager) => {
      await manager.save(user);

      // Log the user out on every device: revoke all their active refresh tokens
      await manager.update(
        RefreshToken,
        { userId: id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });
  }

  async setActive(id: string, isActive: boolean): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    if (!isActive && user.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(user.id);
    }
    user.isActive = isActive;
    const saved = await this.repo.save(user);
    return UserResponseDto.fromEntity(saved);
  }

  // Prevents a scenario where every admin gets deactivated/demoted/deleted
  private async assertNotLastActiveAdmin(
    excludingUserId: string,
  ): Promise<void> {
    const remainingAdmins = await this.repo.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    const targetIsCountedAdmin = await this.repo.findOne({
      where: { id: excludingUserId, role: UserRole.ADMIN, isActive: true },
    });
    const countExcludingTarget = targetIsCountedAdmin
      ? remainingAdmins - 1
      : remainingAdmins;

    if (countExcludingTarget < 1) {
      throw new ApiError(
        409,
        "Cannot proceed: this is the last active admin account. Promote another user to admin first.",
      );
    }
  }
}
export const userService = new UserService();
