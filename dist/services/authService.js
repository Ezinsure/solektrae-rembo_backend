"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const RefreshToken_1 = require("../entities/RefreshToken");
const userdto_1 = require("../dtos/users/userdto");
const userService_1 = require("./userService");
const ActivityLog_1 = require("../entities/ActivityLog");
const password_1 = require("../utils/password");
const token_1 = require("../utils/token");
const apiError_1 = require("../utils/apiError");
const activityLog_1 = require("./activityLog");
const asUser = (ctx, user) => ({
    ...ctx,
    actorId: user.id,
    actorName: user.names,
});
class AuthService {
    refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
    async login(dto, ctx) {
        const email = dto.email.trim().toLowerCase();
        const user = await userService_1.userService.findEntityByEmailWithPassword(email);
        const failed = async (reason) => {
            await activityLog_1.activityLogService.log(ctx, {
                action: ActivityLog_1.LogAction.LOGIN_FAILED,
                entity: ActivityLog_1.LogEntity.AUTH,
                entityId: user?.id ?? null,
                summary: `Failed sign-in for ${email.slice(0, 100)} (${reason})`,
            });
            return new apiError_1.ApiError(401, "Invalid email or password");
        };
        if (!user)
            throw await failed("unknown email");
        const passwordMatches = await (0, password_1.comparePassword)(dto.password, user.password);
        if (!passwordMatches)
            throw await failed("wrong password");
        if (!user.isActive) {
            await activityLog_1.activityLogService.log(asUser(ctx, user), {
                action: ActivityLog_1.LogAction.LOGIN_FAILED,
                entity: ActivityLog_1.LogEntity.AUTH,
                entityId: user.id,
                summary: "Sign-in blocked: account deactivated",
            });
            throw new apiError_1.ApiError(403, "This account has been deactivated. Contact an administrator.");
        }
        const accessToken = (0, token_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        const { raw, hash, expiresAt } = (0, token_1.generateRefreshToken)();
        await this.refreshRepo.save(this.refreshRepo.create({
            userId: user.id,
            tokenHash: hash,
            expiresAt,
            userAgent: ctx.userAgent,
            ipAddress: ctx.ip,
        }));
        await activityLog_1.activityLogService.log(asUser(ctx, user), {
            action: ActivityLog_1.LogAction.LOGIN,
            entity: ActivityLog_1.LogEntity.AUTH,
            entityId: user.id,
            summary: "Signed in",
        });
        return {
            accessToken,
            refreshToken: raw,
            user: userdto_1.UserResponseDto.fromEntity(user),
        };
    }
    async refresh(rawToken, ctx) {
        const hash = (0, token_1.hashRefreshToken)(rawToken);
        const existing = await this.refreshRepo.findOne({
            where: { tokenHash: hash },
            relations: { user: true },
        });
        if (!existing) {
            throw new apiError_1.ApiError(401, "Invalid refresh token");
        }
        if (existing.revokedAt) {
            await this.refreshRepo.update({ userId: existing.userId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            await activityLog_1.activityLogService.log(existing.user ? asUser(ctx, existing.user) : ctx, {
                action: ActivityLog_1.LogAction.LOGOUT,
                entity: ActivityLog_1.LogEntity.AUTH,
                entityId: existing.userId,
                summary: "All sessions ended: an old sign-in token was reused (possible theft)",
            });
            throw new apiError_1.ApiError(401, "Session invalidated for security reasons. Please log in again.");
        }
        if (existing.expiresAt < new Date()) {
            throw new apiError_1.ApiError(401, "Refresh token expired. Please log in again.");
        }
        const user = await userService_1.userService.findEntityById(existing.userId);
        if (!user.isActive) {
            throw new apiError_1.ApiError(403, "This account has been deactivated. Contact an administrator.");
        }
        const { raw, hash: newHash, expiresAt } = (0, token_1.generateRefreshToken)();
        await this.refreshRepo.manager.transaction(async (manager) => {
            await manager.update(RefreshToken_1.RefreshToken, { id: existing.id }, { revokedAt: new Date() });
            await manager.save(manager.create(RefreshToken_1.RefreshToken, {
                userId: user.id,
                tokenHash: newHash,
                expiresAt,
                userAgent: ctx.userAgent,
                ipAddress: ctx.ip,
            }));
        });
        const accessToken = (0, token_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return { accessToken, refreshToken: raw };
    }
    async logout(rawToken, ctx) {
        const hash = (0, token_1.hashRefreshToken)(rawToken);
        const token = await this.refreshRepo.findOne({
            where: { tokenHash: hash, revokedAt: (0, typeorm_1.IsNull)() },
            relations: { user: true },
        });
        if (!token)
            return;
        await this.refreshRepo.update({ id: token.id }, { revokedAt: new Date() });
        // The access token may have expired, so take the user from the refresh token
        await activityLog_1.activityLogService.log(token.user ? asUser(ctx, token.user) : ctx, {
            action: ActivityLog_1.LogAction.LOGOUT,
            entity: ActivityLog_1.LogEntity.AUTH,
            entityId: token.userId,
            summary: "Signed out",
        });
    }
    async logoutAll(ctx) {
        if (!ctx.actorId)
            throw new apiError_1.ApiError(401, "Authentication required");
        const result = await this.refreshRepo.update({ userId: ctx.actorId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
        await activityLog_1.activityLogService.log(ctx, {
            action: ActivityLog_1.LogAction.LOGOUT,
            entity: ActivityLog_1.LogEntity.AUTH,
            entityId: ctx.actorId,
            summary: `Signed out of all devices (${result.affected ?? 0} sessions)`,
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map