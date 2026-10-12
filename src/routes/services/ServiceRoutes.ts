import { Router } from "express";
import {
  createService,
  deleteService,
  getService,
  getServiceFields,
  getServices,
  reorderServices,
  updateService,
} from "../../controllers/service.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/roleMiddleware";
import { UserRole } from "../../entities/User";

const ServiceRoutes = Router();

const MANAGE = [UserRole.ADMIN, UserRole.DEV, UserRole.HR];

ServiceRoutes.use(authenticate);
ServiceRoutes.get("/fields", getServiceFields);               
ServiceRoutes.get("/", getServices);                         
ServiceRoutes.patch("/reorder", authorize(...MANAGE), reorderServices);
ServiceRoutes.get("/:id", getService);
ServiceRoutes.post("/", authorize(...MANAGE), createService);
ServiceRoutes.patch("/:id", authorize(...MANAGE), updateService);
ServiceRoutes.delete("/:id", authorize(...MANAGE), deleteService);

export default ServiceRoutes;
