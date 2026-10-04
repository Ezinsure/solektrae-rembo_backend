import { Router } from "express";
import { UserRole } from "../../entities/User";
import { validateDto } from "../../middleware/validateDto";
import { CreateUserDto, UpdateUserDto } from "../../dtos/users/userdto";
import {
  adminResetPassword,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  restoreUser,
  toggleUserActive,
  updateUser,
} from "../../controllers/user.controller";
import { authorize } from "../../middleware/roleMiddleware";
import { authenticate } from "../../middleware/authMiddleware";
import { AdminResetPasswordDto } from "../../dtos/users/resetPsswddto";

const UserRouter = Router();

// Every route below requires a valid access token.
UserRouter.use(authenticate);

UserRouter.post(
  "/",
  authorize(UserRole.ADMIN, UserRole.DEV),
  validateDto(CreateUserDto),
  createUser,
);
UserRouter.get("/", authenticate, getUsers);
// UserRouter.get("/:id", getUserById);
UserRouter.patch(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.DEV),
  validateDto(UpdateUserDto),
  updateUser,
);
UserRouter.delete("/:id", authorize(UserRole.ADMIN, UserRole.DEV), deleteUser);
UserRouter.patch(
  "/:id/restore",
  authorize(UserRole.ADMIN, UserRole.DEV),
  restoreUser,
);
UserRouter.patch(
  "/:id/active",
  authorize(UserRole.ADMIN, UserRole.DEV),
  toggleUserActive,
);
UserRouter.patch(
  "/:id/reset-password",
  validateDto(AdminResetPasswordDto),
  adminResetPassword,
);
export default UserRouter;
