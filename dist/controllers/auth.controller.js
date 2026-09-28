"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMyPassword = exports.me = exports.logoutAll = exports.logout = exports.refresh = exports.login = void 0;
const authService_1 = require("../services/authService");
const userService_1 = require("../services/userService");
const asyncHandle_1 = require("../utils/asyncHandle");
const apiError_1 = require("../utils/apiError");
const REFRESH_COOKIE_NAME = "refreshToken";
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000,
};
exports.login = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const result = await authService_1.authService.login(req.body, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, user: result.user },
    });
});
exports.refresh = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new apiError_1.ApiError(401, "No refresh token provided");
    }
    try {
        const result = await authService_1.authService.refresh(token, {
            userAgent: req.headers["user-agent"],
            ip: req.ip,
        });
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
        return res
            .status(200)
            .json({ success: true, data: { accessToken: result.accessToken } });
    }
    catch (err) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw err;
    }
});
exports.logout = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token)
        await authService_1.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.status(204).send();
});
exports.logoutAll = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await authService_1.authService.logoutAll(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.status(204).send();
});
exports.me = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});
exports.changeMyPassword = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await userService_1.userService.changeOwnPassword(req.user.id, req.body);
    res
        .status(200)
        .json({ success: true, message: "Password updated successfully" });
});
//# sourceMappingURL=auth.controller.js.map