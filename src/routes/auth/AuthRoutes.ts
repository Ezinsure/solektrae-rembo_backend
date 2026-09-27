import { Router } from "express";
import {
  login,
  refresh,
  logout,
  logoutAll,
  me,
  changeMyPassword,
} from "../../controllers/auth.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { validateDto } from "../../middleware/validateDto";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { LoginDto } from "../../dtos/auth/logindto";
import { ChangePasswordDto } from "../../dtos/users/chnagePasswddto";

const AuthRouter = Router();

AuthRouter.post("/login", authRateLimiter, validateDto(LoginDto), login);
AuthRouter.post("/refresh", refresh);
AuthRouter.post("/logout", logout);

// Requires auth: these act on the currently logged-in user.
AuthRouter.post("/logout-all", authenticate, logoutAll);
AuthRouter.get("/me", authenticate, me);
AuthRouter.patch(
  "/change-password",
  authenticate,
  validateDto(ChangePasswordDto),
  changeMyPassword,
);

export default AuthRouter;
