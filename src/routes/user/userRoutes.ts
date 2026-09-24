import { Router } from "express";
// import {
//   createUser,
//   getUsers,
//   getUserById,
//   updateUser,
//   deleteUser,
//   restoreUser,
//   toggleUserActive,
//   adminResetPassword,
// } from "../controllers/user.controller";
// import { authenticate } from "../middlewares/auth.middleware";
// import { authorize } from "../middlewares/role.middleware";
// import { validateDto } from "../middlewares/validate.middleware";
// import { CreateUserDto } from "../dtos/user/create-user.dto";
// import { UpdateUserDto } from "../dtos/user/update-user.dto";
// import { AdminResetPasswordDto } from "../dtos/user/admin-reset-password.dto";
import { UserRole } from "../../entities/User";
import { validateDto } from "../../middleware/validateDto";
import { CreateUserDto } from "../../dtos/users/userdto";
import {
  createUser,
  getUserById,
  getUsers,
} from "../../controllers/user.controller";
import { authorize } from "../../middleware/roleMiddleware";
import { authenticate } from "../../middleware/authMiddleware";

const UserRouter = Router();

// Every route below requires a valid access token.
// UserRouter.use(authenticate);

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

UserRouter.post(
  "/",
  // authorize(UserRole.ADMIN, UserRole.DEV),
  validateDto(CreateUserDto),
  createUser,
);
UserRouter.get(
  "/",
  // authenticate,
  // authorize(userRole.ADMIN, userRole.HR),
  getUsers,
);
UserRouter.get(
  "/:id",
  // authorize(userRole.ADMIN, userRole.HR),
  getUserById,
);
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
export default UserRouter;
