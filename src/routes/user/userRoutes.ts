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
  removeMyAvatar,
  restoreUser,
  toggleUserActive,
  updateUser,
  uploadMyAvatar,
} from "../../controllers/user.controller";
import { authorize } from "../../middleware/roleMiddleware";
import { authenticate } from "../../middleware/authMiddleware";
import { AdminResetPasswordDto } from "../../dtos/users/resetPsswddto";
import { singleImage } from "../../middleware/uploadImage";
import { assignUserRole } from "../../controllers/rolesControllers";

const UserRouter = Router();

UserRouter.use(authenticate);

UserRouter.post(
  "/",
  authorize(UserRole.ADMIN, UserRole.DEV),
  validateDto(CreateUserDto),
  createUser,
);
UserRouter.get("/", authenticate, getUsers);
UserRouter.post(
  "/me/avatar",
  authenticate,
  singleImage("image"),
  uploadMyAvatar,
);
UserRouter.delete("/me/avatar", authenticate, removeMyAvatar);
UserRouter.get("/:id", getUserById);
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
UserRouter.patch(
  "/:id/role",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.DEV),
  assignUserRole,
);

export default UserRouter;
