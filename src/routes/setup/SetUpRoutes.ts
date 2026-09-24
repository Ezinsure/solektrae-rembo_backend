import { Router } from "express";
import { bootstrapAdmin } from "../../controllers/setUp.controller";
import { validateDto } from "../../middleware/validateDto";
import { BootstrapAdminDto } from "../../dtos/auth/logindto";
import { authRateLimiter } from "../../middleware/rateLimiter";

const BoostrapRouter = Router();

// No `authenticate` / `authorize` here on purpose — there is no admin yet
// to authorize this request. The safety check (only works on an empty
// users table) lives in setup.service.ts instead. Rate-limited anyway,
// since it's a public, unauthenticated endpoint.
BoostrapRouter.post("/bootstrap-admin", authRateLimiter, validateDto(BootstrapAdminDto), bootstrapAdmin);

export default BoostrapRouter;