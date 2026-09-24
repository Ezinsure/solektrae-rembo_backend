import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { RefreshToken } from "../entities/RefreshToken";
import { LoginDto } from "../dtos/auth/logindto";
import { UserResponseDto } from "../dtos/users/userdto";
import { userService } from "./userService";
import { comparePassword } from "../utils/password";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/token";
import { ApiError } from "../utils/apiError";

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private refreshRepo: Repository<RefreshToken> =
    AppDataSource.getRepository(RefreshToken);

  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<TokenPair & { user: UserResponseDto }> {
    const user = await userService.findEntityByEmailWithPassword(dto.email);

    const invalidCredentials = () =>
      new ApiError(401, "Invalid email or password");

    if (!user) throw invalidCredentials();
    if (!user.isActive) {
      throw new ApiError(
        403,
        "This account has been deactivated. Contact an administrator.",
      );
    }

    const passwordMatches = await comparePassword(dto.password, user.password);
    if (!passwordMatches) throw invalidCredentials();

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { raw, hash, expiresAt } = generateRefreshToken();
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip ?? null,
      }),
    );

    return {
      accessToken,
      refreshToken: raw,
      user: UserResponseDto.fromEntity(user),
    };
  }

  async refresh(rawToken: string, meta: RequestMeta): Promise<TokenPair> {
    const hash = hashRefreshToken(rawToken);
    const existing = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
    });

    if (!existing) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (existing.revokedAt) {
      await this.refreshRepo.update(
        { userId: existing.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new ApiError(
        401,
        "Session invalidated for security reasons. Please log in again.",
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new ApiError(401, "Refresh token expired. Please log in again.");
    }

    const user = await userService.findEntityById(existing.userId);
    if (!user.isActive) {
      throw new ApiError(
        403,
        "This account has been deactivated. Contact an administrator.",
      );
    }
    existing.revokedAt = new Date();
    await this.refreshRepo.save(existing);

    const { raw, hash: newHash, expiresAt } = generateRefreshToken();
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: newHash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip ?? null,
      }),
    );

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken: raw };
  }

  async logout(rawToken: string): Promise<void> {
    const hash = hashRefreshToken(rawToken);
    await this.refreshRepo.update(
      { tokenHash: hash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
export const authService = new AuthService();
