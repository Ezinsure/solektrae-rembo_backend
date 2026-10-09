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
import { AuditContext } from "../utils/auditContext";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { diff } from "../utils/diff";
import { activityLogService } from "./activityLog";

// Readable names shown in the log's "Changes" list
const USER_LABELS = {
  names: "Name",
  email: "Email",
  phoneNumber: "Phone",
  role: "Role",
  isActive: "Active",
  profileImage: "Photo",
};
const USER_TRACKED = [
  "names",
  "email",
  "phoneNumber",
  "role",
  "isActive",
  "profileImage",
] as const;

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

  async findEntityByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email: email.trim().toLowerCase() })
      .getOne();
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  async create(dto: CreateUserDto, ctx: AuditContext): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.repo.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existing) {
      throw new ApiError(409, "A user with this email already exists");
    }

    const author = ctx.actorId ? ({ id: ctx.actorId } as User) : null;
    const user = this.repo.create({
      names: dto.names,
      email,
      password: await hashPassword(dto.password),
      role: dto.role,
      phoneNumber: dto.phoneNumber,
      profileImage: dto.profileImage ?? null,
      mustChangePassword: true,
      createdBy: author,
      updatedBy: author,
    });
    const saved = await this.repo.save(user);

    await activityLogService.log(ctx, {
      action: LogAction.CREATE,
      entity: LogEntity.USER,
      entityId: saved.id,
      summary: `Created user ${saved.names} (${saved.role})`,
    });

    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, ctx: AuditContext): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    const before = { ...user }; // snapshot for the log's "Changes"

    const email = dto.email?.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.repo.findOne({
        where: { email },
        withDeleted: true,
      });
      if (existing) throw new ApiError(409, "A user with this email already exists");
    }

    // Guard: don't let the last remaining admin be demoted or deactivated.
    const demoting = dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN;
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

    const changes = diff(before, user, { only: [...USER_TRACKED], labels: USER_LABELS });
    if (changes.length === 0) return this.findById(user.id); // nothing changed: no save, no log

    user.updatedById = ctx.actorId;
    user.updatedBy = ctx.actorId ? ({ id: ctx.actorId } as User) : null;
    await this.repo.save(user);

    await activityLogService.log(ctx, {
      action: LogAction.UPDATE,
      entity: LogEntity.USER,
      entityId: user.id,
      summary: `Updated user ${user.names}`,
      changes,
    });

    return this.findById(user.id);
  }

  async softDelete(id: string, ctx: AuditContext): Promise<void> {
    const user = await this.findEntityById(id);
    if (ctx.actorId === id) {
      throw new ApiError(400, "You cannot delete your own account");
    }
    if (user.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(user.id);
    }

    await this.repo.manager.transaction(async (manager) => {
      await manager.update(User, id, { deletedById: ctx.actorId });
      await manager.softDelete(User, id);
      // Log the user out everywhere
      await manager.update(RefreshToken, { userId: id, revokedAt: IsNull() }, { revokedAt: new Date() });
      await activityLogService.log(
        ctx,
        {
          action: LogAction.DELETE,
          entity: LogEntity.USER,
          entityId: id,
          summary: `Deleted user ${user.names}`,
        },
        manager,
      );
    });
  }

  async restore(id: string, ctx: AuditContext): Promise<UserResponseDto> {
    const user = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!user) throw new ApiError(404, "User not found");
    if (!user.deletedAt) throw new ApiError(400, "This user is not deleted");

    await this.repo.manager.transaction(async (manager) => {
      await manager.restore(User, id);
      await manager.update(User, id, {
        deletedById: null,
        updatedById: ctx.actorId,
      });
      await activityLogService.log(
        ctx,
        {
          action: LogAction.RESTORE,
          entity: LogEntity.USER,
          entityId: id,
          summary: `Restored user ${user.names}`,
        },
        manager,
      );
    });

    return this.findById(id);
  }

  async changeOwnPassword(ctx: AuditContext, dto: ChangePasswordDto): Promise<void> {
    if (!ctx.actorId) throw new ApiError(401, "Authentication required");

    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.id = :id", { id: ctx.actorId })
      .getOne();

    if (!user) throw new ApiError(404, "User not found");

    const matches = await comparePassword(dto.currentPassword, user.password);
    // 400, not 401: a 401 makes the frontend think the session expired and logs the user out
    if (!matches) throw new ApiError(400, "Current password is incorrect");

    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = false;
    user.updatedById = ctx.actorId;
    await this.repo.save(user);

    // Never the password itself, only that it changed
    await activityLogService.log(ctx, {
      action: LogAction.PASSWORD_CHANGE,
      entity: LogEntity.USER,
      entityId: user.id,
      summary: "Changed own password",
    });
  }

  async adminResetPassword(id: string, dto: AdminResetPasswordDto, ctx: AuditContext): Promise<void> {
    const user = await this.findEntityById(id);
    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = true;
    user.updatedById = ctx.actorId;
    user.updatedBy = ctx.actorId ? ({ id: ctx.actorId } as User) : null;

    await this.repo.manager.transaction(async (manager) => {
      await manager.save(user);

      // Log the user out on every device: revoke all their active refresh tokens
      await manager.update(
        RefreshToken,
        { userId: id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );

      await activityLogService.log(
        ctx,
        {
          action: LogAction.PASSWORD_RESET,
          entity: LogEntity.USER,
          entityId: id,
          summary: `Reset password for ${user.names}`,
        },
        manager,
      );
    });
  }

  async setActive(id: string, isActive: boolean, ctx: AuditContext): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    if (user.isActive === isActive) return this.findById(id); // already in that state

    if (!isActive && user.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(user.id);
    }

    user.isActive = isActive;
    user.updatedById = ctx.actorId;
    user.updatedBy = ctx.actorId ? ({ id: ctx.actorId } as User) : null;

    await this.repo.manager.transaction(async (manager) => {
      await manager.save(user);
      // A deactivated user shouldn't stay signed in
      if (!isActive) {
        await manager.update(RefreshToken, { userId: id, revokedAt: IsNull() }, { revokedAt: new Date() });
      }
      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.USER,
          entityId: id,
          summary: `${isActive ? "Activated" : "Deactivated"} user ${user.names}`,
          changes: [{ field: "Active", from: !isActive, to: isActive }],
        },
        manager,
      );
    });

    return this.findById(id);
  }

  // Prevents a scenario where every admin gets deactivated/demoted/deleted
  private async assertNotLastActiveAdmin(excludingUserId: string): Promise<void> {
    const remainingAdmins = await this.repo.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    const targetIsCountedAdmin = await this.repo.findOne({
      where: { id: excludingUserId, role: UserRole.ADMIN, isActive: true },
    });
    const countExcludingTarget = targetIsCountedAdmin ? remainingAdmins - 1 : remainingAdmins;

    if (countExcludingTarget < 1) {
      throw new ApiError(
        409,
        "Cannot proceed: this is the last active admin account. Promote another user to admin first.",
      );
    }
  }
}
export const userService = new UserService();