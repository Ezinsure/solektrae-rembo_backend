import { Response } from "express";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { asyncHandler } from "../utils/asyncHandle";
import { ApiError } from "../utils/apiError";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge:
    Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req, res: Response) => {
  const result = await authService.login(req.body, {
    userAgent: req.headers["user-agent"],
    ip: req.ip,
  });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(200).json({
    success: true,
    data: { accessToken: result.accessToken, user: result.user },
  });
});

export const refresh = asyncHandler(async (req, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw new ApiError(401, "No refresh token provided");
  }
  try {
    const result = await authService.refresh(token, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
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
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res: Response) => {
  await authService.logoutAll(req.user!.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res: Response) => {
  const user = await userService.findById(req.user!.id);
  res.status(200).json({ success: true, data: user });
});

export const changeMyPassword = asyncHandler(async (req, res: Response) => {
  await userService.changeOwnPassword(req.user!.id, req.body);
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
});
