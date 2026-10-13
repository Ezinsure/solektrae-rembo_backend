import { Response } from "express";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { asyncHandler } from "../utils/asyncHandle";
import { ApiError } from "../utils/apiError";
import { auditContext } from "../utils/auditContext";
import { switchCompanySchema } from "../dtos/company/companyDto";

const REFRESH_COOKIE_NAME = "refreshToken";

const isProduction = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge:
    Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req, res: Response) => {
  const { accessToken, refreshToken, user, company } = await authService.login(
    req.body,
    auditContext(req),
  );

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({
    success: true,
    data: { accessToken, user, company },
  });
});

export const refresh = asyncHandler(async (req, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw new ApiError(401, "No refresh token provided");
  }
  try {
    const result = await authService.refresh(token, auditContext(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    return res
      .status(200)
      .json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw err;
  }
});

export const logout = asyncHandler(async (req, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) await authService.logout(token, auditContext(req));
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res: Response) => {
  await authService.logoutAll(auditContext(req));
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res: Response) => {
  const user = await userService.findById(req.user!.id, req.user?.companyId);
  res.status(200).json({ success: true, data: user });
});

export const changeMyPassword = asyncHandler(async (req, res: Response) => {
  await userService.changeOwnPassword(auditContext(req), req.body);
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
});

// POST /auth/switch-company  { companyId }
export const switchCompany = asyncHandler(async (req, res: Response) => {
  const parsed = switchCompanySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "A valid companyId is required");

  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) throw new ApiError(401, "Please sign in again");

  const result = await authService.switchCompany(
    raw,
    parsed.data.companyId,
    auditContext(req),
  );

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(200).json({
    success: true,
    data: { accessToken: result.accessToken, company: result.company },
  });
});
