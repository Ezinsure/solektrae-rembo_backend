import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { RefreshToken } from "../entities/RefreshToken";
import { User } from "../entities/User";
import { LoginDto } from "../dtos/auth/logindto";
import { UserResponseDto } from "../dtos/users/userdto";
import { userService } from "./userService";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { comparePassword } from "../utils/password";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/token";
import { ApiError } from "../utils/apiError";
import { AuditContext } from "../utils/auditContext";
import { activityLogService } from "./activityLog";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const asUser = (ctx: AuditContext, user: Pick<User, "id" | "names">): AuditContext => ({
  ...ctx,
  actorId: user.id,
  actorName: user.names,
});

export class AuthService {
  private refreshRepo: Repository<RefreshToken> =
    AppDataSource.getRepository(RefreshToken);

  async login(
    dto: LoginDto,
    ctx: AuditContext,
  ): Promise<TokenPair & { user: UserResponseDto }> {
    const email = dto.email.trim().toLowerCase();
    const user = await userService.findEntityByEmailWithPassword(email);

    const failed = async (reason: string) => {
      await activityLogService.log(ctx, {
        action: LogAction.LOGIN_FAILED,
        entity: LogEntity.AUTH,
        entityId: user?.id ?? null,
        summary: `Failed sign-in for ${email.slice(0, 100)} (${reason})`,
      });
      return new ApiError(401, "Invalid email or password");
    };

    if (!user) throw await failed("unknown email");

    const passwordMatches = await comparePassword(dto.password, user.password);
    if (!passwordMatches) throw await failed("wrong password");

    if (!user.isActive) {
      await activityLogService.log(asUser(ctx, user), {
        action: LogAction.LOGIN_FAILED,
        entity: LogEntity.AUTH,
        entityId: user.id,
        summary: "Sign-in blocked: account deactivated",
      });
      throw new ApiError(403, "This account has been deactivated. Contact an administrator.");
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { raw, hash, expiresAt } = generateRefreshToken();
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      }),
    );

    await activityLogService.log(asUser(ctx, user), {
      action: LogAction.LOGIN,
      entity: LogEntity.AUTH,
      entityId: user.id,
      summary: "Signed in",
    });

    return {
      accessToken,
      refreshToken: raw,
      user: UserResponseDto.fromEntity(user),
    };
  }

  async refresh(rawToken: string, ctx: AuditContext): Promise<TokenPair> {
    const hash = hashRefreshToken(rawToken);
    const existing = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: { user: true },
    });

    if (!existing) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (existing.revokedAt) {
      await this.refreshRepo.update(
        { userId: existing.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await activityLogService.log(
        existing.user ? asUser(ctx, existing.user) : ctx,
        {
          action: LogAction.LOGOUT,
          entity: LogEntity.AUTH,
          entityId: existing.userId,
          summary: "All sessions ended: an old sign-in token was reused (possible theft)",
        },
      );
      throw new ApiError(401, "Session invalidated for security reasons. Please log in again.");
    }

    if (existing.expiresAt < new Date()) {
      throw new ApiError(401, "Refresh token expired. Please log in again.");
    }

    const user = await userService.findEntityById(existing.userId);
    if (!user.isActive) {
      throw new ApiError(403, "This account has been deactivated. Contact an administrator.");
    }

    const { raw, hash: newHash, expiresAt } = generateRefreshToken();
    await this.refreshRepo.manager.transaction(async (manager) => {
      await manager.update(RefreshToken, { id: existing.id }, { revokedAt: new Date() });
      await manager.save(
        manager.create(RefreshToken, {
          userId: user.id,
          tokenHash: newHash,
          expiresAt,
          userAgent: ctx.userAgent,
          ipAddress: ctx.ip,
        }),
      );
    });

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken: raw };
  }

  async logout(rawToken: string, ctx: AuditContext): Promise<void> {
    const hash = hashRefreshToken(rawToken);
    const token = await this.refreshRepo.findOne({
      where: { tokenHash: hash, revokedAt: IsNull() },
      relations: { user: true },
    });
    if (!token) return; 

    await this.refreshRepo.update({ id: token.id }, { revokedAt: new Date() });

    // The access token may have expired, so take the user from the refresh token
    await activityLogService.log(token.user ? asUser(ctx, token.user) : ctx, {
      action: LogAction.LOGOUT,
      entity: LogEntity.AUTH,
      entityId: token.userId,
      summary: "Signed out",
    });
  }

  async logoutAll(ctx: AuditContext): Promise<void> {
    if (!ctx.actorId) throw new ApiError(401, "Authentication required");

    const result = await this.refreshRepo.update(
      { userId: ctx.actorId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    await activityLogService.log(ctx, {
      action: LogAction.LOGOUT,
      entity: LogEntity.AUTH,
      entityId: ctx.actorId,
      summary: `Signed out of all devices (${result.affected ?? 0} sessions)`,
    });
  }
}
export const authService = new AuthService();