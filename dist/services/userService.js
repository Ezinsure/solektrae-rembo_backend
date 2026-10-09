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
];
class UserService {
    repo = database_1.AppDataSource.getRepository(User_1.User);
    async findAll(query) {
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
            data: userdto_1.UserResponseDto.fromEntities(users),
            total,
            page: query.page,
            limit: query.limit,
        };
    }
    async findById(id) {
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
        return userdto_1.UserResponseDto.fromEntity(user);
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
        const email = dto.email.trim().toLowerCase();
        const existing = await this.repo.findOne({
            where: { email },
            withDeleted: true,
        });
        if (existing) {
            throw new apiError_1.ApiError(409, "A user with this email already exists");
        }
        const author = ctx.actorId ? { id: ctx.actorId } : null;
        const user = this.repo.create({
            names: dto.names,
            email,
            password: await (0, password_1.hashPassword)(dto.password),
            role: dto.role,
            phoneNumber: dto.phoneNumber,
            profileImage: dto.profileImage ?? null,
            mustChangePassword: true,
            createdBy: author,
            updatedBy: author,
        });
        const saved = await this.repo.save(user);
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.CREATE,
            entity: ActivityLog_1.LogEntity.USER,
            entityId: saved.id,
            summary: `Created user ${saved.names} (${saved.role})`,
        });
        return this.findById(saved.id);
    }
    async update(id, dto, ctx) {
        const user = await this.findEntityById(id);
        const before = { ...user }; // snapshot for the log's "Changes"
        const email = dto.email?.trim().toLowerCase();
        if (email && email !== user.email) {
            const existing = await this.repo.findOne({
                where: { email },
                withDeleted: true,
            });
            if (existing)
                throw new apiError_1.ApiError(409, "A user with this email already exists");
        }
        // Guard: don't let the last remaining admin be demoted or deactivated.
        const demoting = dto.role && dto.role !== User_1.UserRole.ADMIN && user.role === User_1.UserRole.ADMIN;
        const deactivating = dto.isActive === false && user.role === User_1.UserRole.ADMIN;
        if (demoting || deactivating) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        // Apply the changes (only fields that were sent)
        if (dto.names !== undefined)
            user.names = dto.names;
        if (email !== undefined)
            user.email = email;
        if (dto.role !== undefined)
            user.role = dto.role;
        if (dto.phoneNumber !== undefined)
            user.phoneNumber = dto.phoneNumber;
        if (dto.profileImage !== undefined)
            user.profileImage = dto.profileImage;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        const changes = (0, diff_1.diff)(before, user, { only: [...USER_TRACKED], labels: USER_LABELS });
        if (changes.length === 0)
            return this.findById(user.id); // nothing changed: no save, no log
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
        return this.findById(user.id);
    }
    async softDelete(id, ctx) {
        const user = await this.findEntityById(id);
        if (ctx.actorId === id) {
            throw new apiError_1.ApiError(400, "You cannot delete your own account");
        }
        if (user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        await this.repo.manager.transaction(async (manager) => {
            await manager.update(User_1.User, id, { deletedById: ctx.actorId });
            await manager.softDelete(User_1.User, id);
            // Log the user out everywhere
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
        const user = await this.repo.findOne({ where: { id }, withDeleted: true });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
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
        return this.findById(id);
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
        // 400, not 401: a 401 makes the frontend think the session expired and logs the user out
        if (!matches)
            throw new apiError_1.ApiError(400, "Current password is incorrect");
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = false;
        user.updatedById = ctx.actorId;
        await this.repo.save(user);
        // Never the password itself, only that it changed
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.PASSWORD_CHANGE,
            entity: ActivityLog_1.LogEntity.USER,
            entityId: user.id,
            summary: "Changed own password",
        });
    }
    async adminResetPassword(id, dto, ctx) {
        const user = await this.findEntityById(id);
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = true;
        user.updatedById = ctx.actorId;
        user.updatedBy = ctx.actorId ? { id: ctx.actorId } : null;
        await this.repo.manager.transaction(async (manager) => {
            await manager.save(user);
            // Log the user out on every device: revoke all their active refresh tokens
            await manager.update(RefreshToken_1.RefreshToken, { userId: id, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.PASSWORD_RESET,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `Reset password for ${user.names}`,
            }, manager);
        });
    }
    async setActive(id, isActive, ctx) {
        const user = await this.findEntityById(id);
        if (user.isActive === isActive)
            return this.findById(id); // already in that state
        if (!isActive && user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        user.isActive = isActive;
        user.updatedById = ctx.actorId;
        user.updatedBy = ctx.actorId ? { id: ctx.actorId } : null;
        await this.repo.manager.transaction(async (manager) => {
            await manager.save(user);
            // A deactivated user shouldn't stay signed in
            if (!isActive) {
                await manager.update(RefreshToken_1.RefreshToken, { userId: id, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            }
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.UPDATE,
                entity: ActivityLog_1.LogEntity.USER,
                entityId: id,
                summary: `${isActive ? "Activated" : "Deactivated"} user ${user.names}`,
                changes: [{ field: "Active", from: !isActive, to: isActive }],
            }, manager);
        });
        return this.findById(id);
    }
    // Prevents a scenario where every admin gets deactivated/demoted/deleted
    async assertNotLastActiveAdmin(excludingUserId) {
        const remainingAdmins = await this.repo.count({
            where: { role: User_1.UserRole.ADMIN, isActive: true },
        });
        const targetIsCountedAdmin = await this.repo.findOne({
            where: { id: excludingUserId, role: User_1.UserRole.ADMIN, isActive: true },
        });
        const countExcludingTarget = targetIsCountedAdmin ? remainingAdmins - 1 : remainingAdmins;
        if (countExcludingTarget < 1) {
            throw new apiError_1.ApiError(409, "Cannot proceed: this is the last active admin account. Promote another user to admin first.");
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=userService.js.map