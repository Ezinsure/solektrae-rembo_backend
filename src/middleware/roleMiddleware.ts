import { RequestHandler } from "express";
import { UserRole } from "../entities/User";
import { ApiError } from "../utils/apiError";

// Usage: router.post("/", authenticate, authorize(userRole.ADMIN), createUser)
// Must run *after* authenticate — it relies on req.user already being set.
export const authorize =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action")
      );
    }
    next();
  };