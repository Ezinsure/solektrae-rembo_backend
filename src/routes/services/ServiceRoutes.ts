import { Router } from "express";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
} from "../../controllers/service.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/roleMiddleware";
import { validateDto } from "../../middleware/validateDto";
import {
  CreateServiceDto,
  UpdateServiceDto,
} from "../../dtos/services/servicedto";
import { UserRole } from "../../entities/User";

const ServiceRoutes = Router();

ServiceRoutes.get(
  "/",
  //  authenticate,
  getServices,
);

ServiceRoutes.get("/:id", getServiceById);

ServiceRoutes.post(
  "/",
  authenticate,
  validateDto(CreateServiceDto),
  createService,
);
ServiceRoutes.patch(
  "/:id",
  authenticate,
  //   authorize(UserRole.ADMIN),
  validateDto(UpdateServiceDto),
  updateService,
);
// ServiceRoutes.delete(
//   "/:id",
//   authenticate,
//    authorize(UserRole.ADMIN),
//   deleteService,
// );

export default ServiceRoutes;
