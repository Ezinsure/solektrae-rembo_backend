"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateDto_1 = require("../../middleware/validateDto");
const userdto_1 = require("../../dtos/users/userdto");
const user_controller_1 = require("../../controllers/user.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const UserRouter = (0, express_1.Router)();
// Every route below requires a valid access token.
UserRouter.use(authMiddleware_1.authenticate);
/**
 * Authorization policy for this system (adjust to your actual needs):
 *  - ADMIN: full control — create, read, update, deactivate, delete, restore,
 *           reset anyone's password, manage roles.
 *  - HR:    can view the user directory (read-only) — e.g. to look up an
 *           employee's phone number or role — but cannot create, edit,
 *           deactivate, or delete accounts.
 *  - DEV:   no access to the user directory at all. A DEV user manages only
 *           their own account via /api/auth/me and /api/auth/change-password.
 */
UserRouter.post("/", 
// authorize(UserRole.ADMIN, UserRole.DEV),
(0, validateDto_1.validateDto)(userdto_1.CreateUserDto), user_controller_1.createUser);
UserRouter.get("/", authMiddleware_1.authenticate, 
// authorize(userRole.ADMIN, userRole.HR),
user_controller_1.getUsers);
UserRouter.get("/:id", 
// authorize(userRole.ADMIN, userRole.HR),
user_controller_1.getUserById);
// UserRouter.patch(
//   "/:id",
//   authorize(userRole.ADMIN),
//   validateDto(UpdateUserDto),
//   updateUser,
// );
// UserRouter.delete("/:id", authorize(userRole.ADMIN), deleteUser);
// UserRouter.patch("/:id/restore", authorize(userRole.ADMIN), restoreUser);
// UserRouter.patch("/:id/active", authorize(userRole.ADMIN), toggleUserActive);
// UserRouter.patch(
//   "/:id/reset-password",
//   authorize(userRole.ADMIN),
//   validateDto(AdminResetPasswordDto),
//   adminResetPassword,
// );
exports.default = UserRouter;
//# sourceMappingURL=userRoutes.js.map