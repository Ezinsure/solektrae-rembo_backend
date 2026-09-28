"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const RefreshToken_1 = require("../entities/RefreshToken");
const userdto_1 = require("../dtos/users/userdto");
const userService_1 = require("./userService");
const password_1 = require("../utils/password");
const token_1 = require("../utils/token");
const apiError_1 = require("../utils/apiError");
class AuthService {
    refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
    async login(dto, meta) {
        const user = await userService_1.userService.findEntityByEmailWithPassword(dto.email);
        const invalidCredentials = () => new apiError_1.ApiError(401, "Invalid email or password");
        if (!user)
            throw invalidCredentials();
        if (!user.isActive) {
            throw new apiError_1.ApiError(403, "This account has been deactivated. Contact an administrator.");
        }
        const passwordMatches = await (0, password_1.comparePassword)(dto.password, user.password);
        if (!passwordMatches)
            throw invalidCredentials();
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
            userAgent: meta.userAgent ?? null,
            ipAddress: meta.ip ?? null,
        }));
        return {
            accessToken,
            refreshToken: raw,
            user: userdto_1.UserResponseDto.fromEntity(user),
        };
    }
    async refresh(rawToken, meta) {
        const hash = (0, token_1.hashRefreshToken)(rawToken);
        const existing = await this.refreshRepo.findOne({
            where: { tokenHash: hash },
        });
        if (!existing) {
            throw new apiError_1.ApiError(401, "Invalid refresh token");
        }
        if (existing.revokedAt) {
            await this.refreshRepo.update({ userId: existing.userId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
            throw new apiError_1.ApiError(401, "Session invalidated for security reasons. Please log in again.");
        }
        if (existing.expiresAt < new Date()) {
            throw new apiError_1.ApiError(401, "Refresh token expired. Please log in again.");
        }
        const user = await userService_1.userService.findEntityById(existing.userId);
        if (!user.isActive) {
            throw new apiError_1.ApiError(403, "This account has been deactivated. Contact an administrator.");
        }
        existing.revokedAt = new Date();
        await this.refreshRepo.save(existing);
        const { raw, hash: newHash, expiresAt } = (0, token_1.generateRefreshToken)();
        await this.refreshRepo.save(this.refreshRepo.create({
            userId: user.id,
            tokenHash: newHash,
            expiresAt,
            userAgent: meta.userAgent ?? null,
            ipAddress: meta.ip ?? null,
        }));
        const accessToken = (0, token_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return { accessToken, refreshToken: raw };
    }
    async logout(rawToken) {
        const hash = (0, token_1.hashRefreshToken)(rawToken);
        await this.refreshRepo.update({ tokenHash: hash, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
    }
    async logoutAll(userId) {
        await this.refreshRepo.update({ userId, revokedAt: (0, typeorm_1.IsNull)() }, { revokedAt: new Date() });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map