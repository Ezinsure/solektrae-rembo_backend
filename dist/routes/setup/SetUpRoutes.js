"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const setUp_controller_1 = require("../../controllers/setUp.controller");
const validateDto_1 = require("../../middleware/validateDto");
const logindto_1 = require("../../dtos/auth/logindto");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const BoostrapRouter = (0, express_1.Router)();
// No `authenticate` / `authorize` here on purpose — there is no admin yet
// to authorize this request. The safety check (only works on an empty
// users table) lives in setup.service.ts instead. Rate-limited anyway,
// since it's a public, unauthenticated endpoint.
BoostrapRouter.post("/bootstrap-admin", rateLimiter_1.authRateLimiter, (0, validateDto_1.validateDto)(logindto_1.BootstrapAdminDto), setUp_controller_1.bootstrapAdmin);
exports.default = BoostrapRouter;
//# sourceMappingURL=SetUpRoutes.js.map