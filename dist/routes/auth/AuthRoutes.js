"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../../controllers/auth.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const validateDto_1 = require("../../middleware/validateDto");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const logindto_1 = require("../../dtos/auth/logindto");
const chnagePasswddto_1 = require("../../dtos/users/chnagePasswddto");
const AuthRouter = (0, express_1.Router)();
AuthRouter.post("/login", rateLimiter_1.authRateLimiter, (0, validateDto_1.validateDto)(logindto_1.LoginDto), auth_controller_1.login);
AuthRouter.post("/refresh", auth_controller_1.refresh);
AuthRouter.post("/logout", auth_controller_1.logout);
// Requires auth
AuthRouter.post("/logout-all", authMiddleware_1.authenticate, auth_controller_1.logoutAll);
AuthRouter.get("/me", authMiddleware_1.authenticate, auth_controller_1.me);
AuthRouter.patch("/change-password", authMiddleware_1.authenticate, (0, validateDto_1.validateDto)(chnagePasswddto_1.ChangePasswordDto), auth_controller_1.changeMyPassword);
exports.default = AuthRouter;
//# sourceMappingURL=AuthRoutes.js.map