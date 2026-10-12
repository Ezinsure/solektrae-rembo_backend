import { Router } from "express";
import { UserRole } from "../../entities/User";
import {
  createRole,
  deleteRole,
  getRole,
  getRoles,
  updateRole,
} from "../../controllers/rolesControllers";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/roleMiddleware";

const RolesRoutes = Router();

const MANAGE = [UserRole.ADMIN, UserRole.DEV];

RolesRoutes.use(authenticate);
RolesRoutes.get("/", getRoles);
RolesRoutes.get("/:id", getRole);
RolesRoutes.post("/", authorize(...MANAGE, UserRole.HR), createRole);
RolesRoutes.patch("/:id", authorize(...MANAGE, UserRole.HR), updateRole);
RolesRoutes.delete("/:id", authorize(...MANAGE, UserRole.HR), deleteRole);

export default RolesRoutes;
