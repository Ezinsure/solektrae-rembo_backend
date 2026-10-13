"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchCompany = exports.changeMyPassword = exports.me = exports.logoutAll = exports.logout = exports.refresh = exports.login = void 0;
const authService_1 = require("../services/authService");
const userService_1 = require("../services/userService");
const asyncHandle_1 = require("../utils/asyncHandle");
const apiError_1 = require("../utils/apiError");
const auditContext_1 = require("../utils/auditContext");
const companyDto_1 = require("../dtos/company/companyDto");
const REFRESH_COOKIE_NAME = "refreshToken";
const isProduction = process.env.NODE_ENV === "production";
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000,
};
exports.login = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const { accessToken, refreshToken, user, company } = await authService_1.authService.login(req.body, (0, auditContext_1.auditContext)(req));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.status(200).json({
        success: true,
        data: { accessToken, user, company },
    });
});
exports.refresh = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new apiError_1.ApiError(401, "No refresh token provided");
    }
    try {
        const result = await authService_1.authService.refresh(token, (0, auditContext_1.auditContext)(req));
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
        await authService_1.authService.logout(token, (0, auditContext_1.auditContext)(req));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.status(204).send();
});
exports.logoutAll = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await authService_1.authService.logoutAll((0, auditContext_1.auditContext)(req));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.status(204).send();
});
exports.me = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.findById(req.user.id, req.user?.companyId);
    res.status(200).json({ success: true, data: user });
});
exports.changeMyPassword = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await userService_1.userService.changeOwnPassword((0, auditContext_1.auditContext)(req), req.body);
    res
        .status(200)
        .json({ success: true, message: "Password updated successfully" });
});
// POST /auth/switch-company  { companyId }
exports.switchCompany = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const parsed = companyDto_1.switchCompanySchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "A valid companyId is required");
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw)
        throw new apiError_1.ApiError(401, "Please sign in again");
    const result = await authService_1.authService.switchCompany(raw, parsed.data.companyId, (0, auditContext_1.auditContext)(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, company: result.company },
    });
});
//# sourceMappingURL=auth.controller.js.map