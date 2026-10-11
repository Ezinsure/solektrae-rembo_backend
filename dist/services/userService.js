"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const userdto_1 = require("../dtos/users/userdto");
const password_1 = require("../utils/password");
const apiError_1 = require("../utils/apiError");
const RefreshToken_1 = require("../entities/RefreshToken");
const ActivityLog_1 = require("../entities/ActivityLog");
const diff_1 = require("../utils/diff");
const activityLog_1 = require("./activityLog");
const CompanyMember_1 = require("../entities/CompanyMember");
const Roles_1 = require("../entities/Roles");
const roleService_1 = require("./roleService");
const imageService_1 = require("./imageService");
// Readable names shown in the log's "Changes" list
const USER_LABELS = {
    names: "Name",
    email: "Email",
    phoneNumber: "Phone",
    profileImage: "Photo",
};
const USER_TRACKED = ["names", "email", "phoneNumber", "profileImage"];
class UserService {
    repo = database_1.AppDataSource.getRepository(User_1.User);
    memberRepo = database_1.AppDataSource.getRepository(CompanyMember_1.CompanyMember);
    async findAll(query, companyId) {
        const qb = this.repo
            .createQueryBuilder("user")
            .innerJoin(CompanyMember_1.CompanyMember, "member", "member.userId = user.id AND member.companyId = :companyId", { companyId })
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
            qb.andWhere(active
                ? "(member.isActive = true AND user.isActive = true)"
                : "(member.isActive = false OR user.isActive = false)");
        }
        qb.orderBy("user.createdAt", "DESC")
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [users, total] = await qb.getManyAndCount();
        // Load each user's membership in this company (role, roleId, active)
        const members = users.length
            ? await this.memberRepo.find({
                where: { companyId, userId: (0, typeorm_1.In)(users.map((u) => u.id)) },
                relations: { assignedRole: true },
            })
            : [];
        const byUser = new Map(members.map((m) => [m.userId, m]));
        return {
            data: users.map((u) => userdto_1.UserResponseDto.fromEntity(u, byUser.get(u.id))),
            total,
            page: query.page,
            limit: query.limit,
        };
    }
    // companyId given → only if the user is in that company (and shows their company role)
    // no companyId → plain profile (used by GET /auth/me)
    async findById(id, companyId) {
        const user = await this.repo
            .createQueryBuilder("user")
            .leftJoin("user.createdBy", "createdBy")
            .addSelect(["createdBy.id", "createdBy.names"])
            .leftJoin("user.updatedBy", "updatedBy")
            .addSelect(["updatedBy.id", "updatedBy.names"])
            .where("user.id = :id", { id })
            .getOne();
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        if (!companyId)
            return userdto_1.UserResponseDto.fromEntity(user);
        const member = await this.findMember(id, companyId);
        return userdto_1.UserResponseDto.fromEntity(user, member);
    }
    async findEntityByEmailWithPassword(email) {
        return this.repo
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.email = :email", { email: email.trim().toLowerCase() })
            .getOne();
    }
    async findEntityById(id) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        return user;
    }
    async create(dto, ctx) {
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
                throw new apiError_1.ApiError(409, "This user was deleted. Restore them instead.");
            }
            throw new apiError_1.ApiError(409, "A user with this email already exists");
        }
        const author = ctx.actorId ? { id: ctx.actorId } : null;
        const passwordHash = await (0, password_1.hashPassword)(dto.password);
        const saved = await this.repo.manager.transaction(async (manager) => {
            const role = await this.resolveRole(manager, ctx, companyId, dto.roleId, dto.role);
            const user = await manager.save(manager.create(User_1.User, {
                names: dto.names,
                email,
                password: passwordHash,
                role: role.baseRole,
                phoneNumber: dto.phoneNumber,
                profileImage: dto.profileImage ?? null,
                mustChangePassword: true,
                createdBy: author,
                updatedBy: author,
            }));
            await manager.save(manager.create(CompanyMember_1.CompanyMember, {
                companyId,
                userId: user.id,
                role: role.baseRole,
                roleId: role.id,
            }));
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.CREATE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: user.id,
                summary: `Created user ${user.names} (${role.name})`,
            }, manager);
            return user;
        });
        return this.findById(saved.id, companyId);
    }
    async update(id, dto, ctx) {
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
                throw new apiError_1.ApiError(409, "A user with this email already exists");
        }
        // Profile fields (shared by every company the user belongs to)
        if (dto.names !== undefined)
            user.names = dto.names;
        if (email !== undefined)
            user.email = email;
        if (dto.phoneNumber !== undefined)
            user.phoneNumber = dto.phoneNumber;
        if (dto.profileImage !== undefined)
            user.profileImage = dto.profileImage;
        const changes = (0, diff_1.diff)(before, user, {
            only: [...USER_TRACKED],
            labels: USER_LABELS,
        });
        if (changes.length > 0) {
            user.updatedById = ctx.actorId;
            user.updatedBy = ctx.actorId ? { id: ctx.actorId } : null;
            await this.repo.save(user);
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: user.id,
                summary: `Updated user ${user.names}`,
                changes,
            });
        }
        // Company-level changes go through their own methods (with their own checks and logs)
        if (dto.roleId !== undefined && dto.roleId !== member.roleId) {
            await roleService_1.roleService.assignToUser(companyId, id, dto.roleId, ctx);
        }
        if (dto.isActive !== undefined) {
            await this.setActive(id, dto.isActive, ctx);
        }
        return this.findById(id, companyId);
    }
    async softDelete(id, ctx) {
        const companyId = this.companyOf(ctx);
        if (ctx.actorId === id)
            throw new apiError_1.ApiError(400, "You cannot delete your own account");
        const member = await this.findMember(id, companyId);
        const user = await this.findEntityById(id);
        if (member.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(companyId, id);
        }
        const otherCompanies = await this.memberRepo.count({
            where: { userId: id, companyId: (0, typeorm_1.Not)(companyId) },
        });
        await this.repo.manager.transaction(async (manager) => {
            if (otherCompanies > 0) {
                // Still used by other companies → only remove them from this one
                await manager.delete(CompanyMember_1.CompanyMember, { id: member.id });
                await manager.update(RefreshToken_1.RefreshToken, { userId: id, companyId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
                await activityLog_1.activityLogService.log(ctx, {
                    action: ActivityLog_1.LogAction.DELETE,
                    entity: ActivityLog_1.LogEntity.USER,
                    entityId: id,
                    summary: `Removed ${user.names} from this account`,
                }, manager);
                return;
            }
            // Only in this company → soft delete the account
            await manager.update(User_1.User, id, { deletedById: ctx.actorId });
            await manager.softDelete(User_1.User, id);
            await manager.update(RefreshToken_1.RefreshToken, { userId: id, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.DELETE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `Deleted user ${user.names}`,
            }, manager);
        });
    }
    async restore(id, ctx) {
        const companyId = this.companyOf(ctx);
        const user = await this.repo.findOne({ where: { id }, withDeleted: true });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        await this.findMember(id, companyId);
        if (!user.deletedAt)
            throw new apiError_1.ApiError(400, "This user is not deleted");
        await this.repo.manager.transaction(async (manager) => {
            await manager.restore(User_1.User, id);
            await manager.update(User_1.User, id, {
                deletedById: null,
                updatedById: ctx.actorId,
            });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.RESTORE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `Restored user ${user.names}`,
            }, manager);
        });
        return this.findById(id, companyId);
    }
    async changeOwnPassword(ctx, dto) {
        if (!ctx.actorId)
            throw new apiError_1.ApiError(401, "Authentication required");
        const user = await this.repo
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.id = :id", { id: ctx.actorId })
            .getOne();
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        const matches = await (0, password_1.comparePassword)(dto.currentPassword, user.password);
        if (!matches)
            throw new apiError_1.ApiError(400, "Current password is incorrect");
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = false;
        user.updatedById = ctx.actorId;
        await this.repo.save(user);
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.PASSWORD_CHANGE,
            entity: ActivityLog_1.LogEntity.USER,
            entityId: user.id,
            summary: "Changed own password",
        });
    }
    async adminResetPassword(id, dto, ctx) {
        const companyId = this.companyOf(ctx);
        await this.findMember(id, companyId);
        const user = await this.findEntityById(id);
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = true;
        user.updatedById = ctx.actorId;
        user.updatedBy = ctx.actorId ? { id: ctx.actorId } : null;
        await this.repo.manager.transaction(async (manager) => {
            await manager.save(user);
            // Log the user out on every device
            await manager.update(RefreshToken_1.RefreshToken, { userId: id, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.PASSWORD_RESET,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `Reset password for ${user.names}`,
            }, manager);
        });
    }
    // Activates / deactivates the user in THIS company only
    async setActive(id, isActive, ctx) {
        const companyId = this.companyOf(ctx);
        if (ctx.actorId === id && !isActive) {
            throw new apiError_1.ApiError(400, "You cannot deactivate your own account");
        }
        const member = await this.findMember(id, companyId);
        const user = await this.findEntityById(id);
        const currentlyActive = member.isActive && user.isActive;
        if (currentlyActive === isActive)
            return this.findById(id, companyId);
        if (!isActive && member.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(companyId, id);
        }
        await this.repo.manager.transaction(async (manager) => {
            await manager.update(CompanyMember_1.CompanyMember, { id: member.id }, { isActive });
            // Users deactivated before companies existed have users.isActive = false
            if (isActive && !user.isActive) {
                await manager.update(User_1.User, id, {
                    isActive: true,
                    updatedById: ctx.actorId,
                });
            }
            // Sign them out of this company
            if (!isActive) {
                await manager.update(RefreshToken_1.RefreshToken, { userId: id, companyId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            }
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `${isActive ? "Activated" : "Deactivated"} user ${user.names}`,
                changes: [{ field: "Active", from: !isActive, to: isActive }],
            }, manager);
        });
        return this.findById(id, companyId);
    }
    async setAvatar(userId, file, ctx) {
        const user = await this.findEntityById(userId);
        const result = await (0, imageService_1.uploadImage)(file.buffer, (0, imageService_1.imagePath)("users", userId, "avatar"));
        user.profileImage = result.secure_url;
        user.updatedById = ctx.actorId;
        await this.repo.save(user);
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.UPDATE,
            entity: ActivityLog_1.LogEntity.USER,
            entityId: userId,
            summary: "Updated profile photo",
        });
        return { profileImage: user.profileImage };
    }
    async removeAvatar(userId, ctx) {
        const user = await this.findEntityById(userId);
        if (!user.profileImage)
            return { profileImage: null };
        await (0, imageService_1.deleteImage)((0, imageService_1.imagePath)("users", userId, "avatar"));
        user.profileImage = null;
        user.updatedById = ctx.actorId;
        await this.repo.save(user);
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.UPDATE,
            entity: ActivityLog_1.LogEntity.USER,
            entityId: userId,
            summary: "Removed profile photo",
        });
        return { profileImage: null };
    }
    // ── helpers ────────────────────────────────────────────
    companyOf(ctx) {
        if (!ctx.companyId)
            throw new apiError_1.ApiError(403, "No company selected. Please sign in again.");
        return ctx.companyId;
    }
    // 404 (not 403) so nobody can tell whether a user exists in another company
    async findMember(userId, companyId) {
        const member = await this.memberRepo.findOne({
            where: { userId, companyId },
            relations: { assignedRole: true },
        });
        if (!member)
            throw new apiError_1.ApiError(404, "User not found");
        return member;
    }
    async resolveRole(manager, ctx, companyId, roleId, base) {
        const role = roleId
            ? await manager.findOneBy(Roles_1.Role, { id: roleId, companyId })
            : await manager.findOneBy(Roles_1.Role, {
                companyId,
                isSystem: true,
                baseRole: base ?? User_1.UserRole.STAFF,
            });
        if (!role)
            throw new apiError_1.ApiError(400, "Role not found");
        if (role.baseRole === User_1.UserRole.DEV && ctx.actorRole !== User_1.UserRole.DEV) {
            throw new apiError_1.ApiError(403, "Only a developer can assign the Dev role");
        }
        return role;
    }
    // Keeps at least one active admin in this company
    async assertNotLastActiveAdmin(companyId, excludingUserId) {
        const others = await this.memberRepo
            .createQueryBuilder("m")
            .innerJoin(User_1.User, "u", "u.id = m.userId AND u.deletedAt IS NULL AND u.isActive = true")
            .where("m.companyId = :companyId", { companyId })
            .andWhere("m.role = :admin", { admin: User_1.UserRole.ADMIN })
            .andWhere("m.isActive = true")
            .andWhere("m.userId != :uid", { uid: excludingUserId })
            .getCount();
        if (others < 1) {
            throw new apiError_1.ApiError(409, "Cannot proceed: this is the last active admin of this account. Give another user the Admin role first.");
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=userService.js.map