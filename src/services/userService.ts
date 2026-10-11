import { In, IsNull, Not, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../entities/User";
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
} from "../dtos/users/userdto";
import { ChangePasswordDto } from "../dtos/users/chnagePasswddto";
import { AdminResetPasswordDto } from "../dtos/users/resetPsswddto";
import { hashPassword, comparePassword } from "../utils/password";
import { ApiError } from "../utils/apiError";
import { RefreshToken } from "../entities/RefreshToken";
import { AuditContext } from "../utils/auditContext";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { diff } from "../utils/diff";
import { activityLogService } from "./activityLog";
import { CompanyMember } from "../entities/CompanyMember";
import { Role } from "../entities/Roles";
import { roleService } from "./roleService";
import { deleteImage, imagePath, uploadImage } from "./imageService";

// Readable names shown in the log's "Changes" list
const USER_LABELS = {
  names: "Name",
  email: "Email",
  phoneNumber: "Phone",
  profileImage: "Photo",
};
const USER_TRACKED = ["names", "email", "phoneNumber", "profileImage"] as const;

export class UserService {
  private repo: Repository<User> = AppDataSource.getRepository(User);
  private memberRepo: Repository<CompanyMember> =
    AppDataSource.getRepository(CompanyMember);

  async findAll(
    query: UserQueryDto,
    companyId: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.repo
      .createQueryBuilder("user")
      .innerJoin(
        CompanyMember,
        "member",
        "member.userId = user.id AND member.companyId = :companyId",
        { companyId },
      )
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
      qb.andWhere("member.role = :role", { role: query.role });
    }
    if (query.roleId) {
      qb.andWhere("member.roleId = :roleId", { roleId: query.roleId });
    }
    if (query.isActive !== undefined) {
      const active = String(query.isActive) === "true";
      qb.andWhere(
        active
          ? "(member.isActive = true AND user.isActive = true)"
          : "(member.isActive = false OR user.isActive = false)",
      );
    }

    qb.orderBy("user.createdAt", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [users, total] = await qb.getManyAndCount();

    // Load each user's membership in this company (role, roleId, active)
    const members = users.length
      ? await this.memberRepo.find({
          where: { companyId, userId: In(users.map((u) => u.id)) },
          relations: { assignedRole: true },
        })
      : [];
    const byUser = new Map(members.map((m) => [m.userId, m]));

    return {
      data: users.map((u) => UserResponseDto.fromEntity(u, byUser.get(u.id))),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  // companyId given → only if the user is in that company (and shows their company role)
  // no companyId → plain profile (used by GET /auth/me)
  async findById(id: string, companyId?: string): Promise<any> {
    const user = await this.repo
      .createQueryBuilder("user")
      .leftJoin("user.createdBy", "createdBy")
      .addSelect(["createdBy.id", "createdBy.names"])
      .leftJoin("user.updatedBy", "updatedBy")
      .addSelect(["updatedBy.id", "updatedBy.names"])
      .where("user.id = :id", { id })
      .getOne();

    if (!user) throw new ApiError(404, "User not found");
    if (!companyId) return UserResponseDto.fromEntity(user);

    const member = await this.findMember(id, companyId);
    return UserResponseDto.fromEntity(user, member);
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

  async create(dto: CreateUserDto, ctx: AuditContext): Promise<any> {
    const companyId = this.companyOf(ctx);
    const email = dto.email.trim().toLowerCase();

    const existing = await this.repo.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existing) {
      const inCompany = await this.memberRepo.findOne({
        where: { userId: existing.id, companyId },
      });
      if (inCompany && existing.deletedAt) {
        throw new ApiError(409, "This user was deleted. Restore them instead.");
      }
      throw new ApiError(409, "A user with this email already exists");
    }

    const author = ctx.actorId ? ({ id: ctx.actorId } as User) : null;
    const passwordHash = await hashPassword(dto.password);

    const saved = await this.repo.manager.transaction(async (manager) => {
      const role = await this.resolveRole(
        manager,
        ctx,
        companyId,
        dto.roleId,
        dto.role,
      );

      const user = await manager.save(
        manager.create(User, {
          names: dto.names,
          email,
          password: passwordHash,
          role: role.baseRole,
          phoneNumber: dto.phoneNumber,
          profileImage: dto.profileImage ?? null,
          mustChangePassword: true,
          createdBy: author,
          updatedBy: author,
        }),
      );

      await manager.save(
        manager.create(CompanyMember, {
          companyId,
          userId: user.id,
          role: role.baseRole,
          roleId: role.id,
        }),
      );

      await activityLogService.log(
        ctx,
        {
          action: LogAction.CREATE,
          entity: LogEntity.USER,
          entityId: user.id,
          summary: `Created user ${user.names} (${role.name})`,
        },
        manager,
      );

      return user;
    });

    return this.findById(saved.id, companyId);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    ctx: AuditContext,
  ): Promise<any> {
    const companyId = this.companyOf(ctx);
    const member = await this.findMember(id, companyId);
    const user = await this.findEntityById(id);
    const before = { ...user };

    const email = dto.email?.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.repo.findOne({
        where: { email },
        withDeleted: true,
      });
      if (existing)
        throw new ApiError(409, "A user with this email already exists");
    }

    // Profile fields (shared by every company the user belongs to)
    if (dto.names !== undefined) user.names = dto.names;
    if (email !== undefined) user.email = email;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.profileImage !== undefined) user.profileImage = dto.profileImage;

    const changes = diff(before, user, {
      only: [...USER_TRACKED],
      labels: USER_LABELS,
    });
    if (changes.length > 0) {
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
    }

    // Company-level changes go through their own methods (with their own checks and logs)
    if (dto.roleId !== undefined && dto.roleId !== member.roleId) {
      await roleService.assignToUser(companyId, id, dto.roleId, ctx);
    }
    if (dto.isActive !== undefined) {
      await this.setActive(id, dto.isActive, ctx);
    }

    return this.findById(id, companyId);
  }

  async softDelete(id: string, ctx: AuditContext): Promise<void> {
    const companyId = this.companyOf(ctx);
    if (ctx.actorId === id)
      throw new ApiError(400, "You cannot delete your own account");

    const member = await this.findMember(id, companyId);
    const user = await this.findEntityById(id);

    if (member.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(companyId, id);
    }

    const otherCompanies = await this.memberRepo.count({
      where: { userId: id, companyId: Not(companyId) },
    });

    await this.repo.manager.transaction(async (manager) => {
      if (otherCompanies > 0) {
        // Still used by other companies → only remove them from this one
        await manager.delete(CompanyMember, { id: member.id });
        await manager.update(
          RefreshToken,
          { userId: id, companyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        await activityLogService.log(
          ctx,
          {
            action: LogAction.DELETE,
            entity: LogEntity.USER,
            entityId: id,
            summary: `Removed ${user.names} from this account`,
          },
          manager,
        );
        return;
      }

      // Only in this company → soft delete the account
      await manager.update(User, id, { deletedById: ctx.actorId });
      await manager.softDelete(User, id);
      await manager.update(
        RefreshToken,
        { userId: id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
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

  async restore(id: string, ctx: AuditContext): Promise<any> {
    const companyId = this.companyOf(ctx);

    const user = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!user) throw new ApiError(404, "User not found");
    await this.findMember(id, companyId);
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

    return this.findById(id, companyId);
  }

  async changeOwnPassword(
    ctx: AuditContext,
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (!ctx.actorId) throw new ApiError(401, "Authentication required");

    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.id = :id", { id: ctx.actorId })
      .getOne();

    if (!user) throw new ApiError(404, "User not found");

    const matches = await comparePassword(dto.currentPassword, user.password);
    if (!matches) throw new ApiError(400, "Current password is incorrect");

    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = false;
    user.updatedById = ctx.actorId;
    await this.repo.save(user);

    await activityLogService.log(ctx, {
      action: LogAction.PASSWORD_CHANGE,
      entity: LogEntity.USER,
      entityId: user.id,
      summary: "Changed own password",
    });
  }

  async adminResetPassword(
    id: string,
    dto: AdminResetPasswordDto,
    ctx: AuditContext,
  ): Promise<void> {
    const companyId = this.companyOf(ctx);
    await this.findMember(id, companyId);

    const user = await this.findEntityById(id);
    user.password = await hashPassword(dto.newPassword);
    user.mustChangePassword = true;
    user.updatedById = ctx.actorId;
    user.updatedBy = ctx.actorId ? ({ id: ctx.actorId } as User) : null;

    await this.repo.manager.transaction(async (manager) => {
      await manager.save(user);

      // Log the user out on every device
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

  // Activates / deactivates the user in THIS company only
  async setActive(
    id: string,
    isActive: boolean,
    ctx: AuditContext,
  ): Promise<any> {
    const companyId = this.companyOf(ctx);
    if (ctx.actorId === id && !isActive) {
      throw new ApiError(400, "You cannot deactivate your own account");
    }

    const member = await this.findMember(id, companyId);
    const user = await this.findEntityById(id);

    const currentlyActive = member.isActive && user.isActive;
    if (currentlyActive === isActive) return this.findById(id, companyId);

    if (!isActive && member.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(companyId, id);
    }

    await this.repo.manager.transaction(async (manager) => {
      await manager.update(CompanyMember, { id: member.id }, { isActive });

      // Users deactivated before companies existed have users.isActive = false
      if (isActive && !user.isActive) {
        await manager.update(User, id, {
          isActive: true,
          updatedById: ctx.actorId,
        });
      }

      // Sign them out of this company
      if (!isActive) {
        await manager.update(
          RefreshToken,
          { userId: id, companyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
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

    return this.findById(id, companyId);
  }

  async setAvatar(userId: string, file: any, ctx: AuditContext) {
    const user = await this.findEntityById(userId);
    const result = await uploadImage(
      file.buffer,
      imagePath("users", userId, "avatar"),
    );

    user.profileImage = result.secure_url;
    user.updatedById = ctx.actorId;
    await this.repo.save(user);

    await activityLogService.log(ctx, {
      action: LogAction.UPDATE,
      entity: LogEntity.USER,
      entityId: userId,
      summary: "Updated profile photo",
    });

    return { profileImage: user.profileImage };
  }

  async removeAvatar(userId: string, ctx: AuditContext) {
    const user = await this.findEntityById(userId);
    if (!user.profileImage) return { profileImage: null };

    await deleteImage(imagePath("users", userId, "avatar"));
    user.profileImage = null;
    user.updatedById = ctx.actorId;
    await this.repo.save(user);

    await activityLogService.log(ctx, {
      action: LogAction.UPDATE,
      entity: LogEntity.USER,
      entityId: userId,
      summary: "Removed profile photo",
    });

    return { profileImage: null };
  }

  // ── helpers ────────────────────────────────────────────

  private companyOf(ctx: AuditContext): string {
    if (!ctx.companyId)
      throw new ApiError(403, "No company selected. Please sign in again.");
    return ctx.companyId;
  }

  // 404 (not 403) so nobody can tell whether a user exists in another company
  private async findMember(
    userId: string,
    companyId: string,
  ): Promise<CompanyMember> {
    const member = await this.memberRepo.findOne({
      where: { userId, companyId },
      relations: { assignedRole: true },
    });
    if (!member) throw new ApiError(404, "User not found");
    return member;
  }

  private async resolveRole(
    manager: any,
    ctx: AuditContext,
    companyId: string,
    roleId?: string,
    base?: UserRole,
  ): Promise<Role> {
    const role = roleId
      ? await manager.findOneBy(Role, { id: roleId, companyId })
      : await manager.findOneBy(Role, {
          companyId,
          isSystem: true,
          baseRole: base ?? UserRole.STAFF,
        });

    if (!role) throw new ApiError(400, "Role not found");
    if (role.baseRole === UserRole.DEV && ctx.actorRole !== UserRole.DEV) {
      throw new ApiError(403, "Only a developer can assign the Dev role");
    }
    return role;
  }

  // Keeps at least one active admin in this company
  private async assertNotLastActiveAdmin(
    companyId: string,
    excludingUserId: string,
  ): Promise<void> {
    const others = await this.memberRepo
      .createQueryBuilder("m")
      .innerJoin(
        User,
        "u",
        "u.id = m.userId AND u.deletedAt IS NULL AND u.isActive = true",
      )
      .where("m.companyId = :companyId", { companyId })
      .andWhere("m.role = :admin", { admin: UserRole.ADMIN })
      .andWhere("m.isActive = true")
      .andWhere("m.userId != :uid", { uid: excludingUserId })
      .getCount();

    if (others < 1) {
      throw new ApiError(
        409,
        "Cannot proceed: this is the last active admin of this account. Give another user the Admin role first.",
      );
    }
  }
}

export const userService = new UserService();
