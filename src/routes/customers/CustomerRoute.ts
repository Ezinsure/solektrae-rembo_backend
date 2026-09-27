import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  updateCustomerStatus,
} from "../../controllers/customer.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/roleMiddleware";
import { validateDto } from "../../middleware/validateDto";
import {
  CreateCustomerDto,
  UpdateCustomerStatusDto,
} from "../../dtos/customers/customerdto";
import { UpdateCustomerDto } from "../../dtos/customers/customerdto";
import { UserRole } from "../../entities/User";

const CustomeRoutes = Router();

CustomeRoutes.post("/", validateDto(CreateCustomerDto), createCustomer);
CustomeRoutes.get("/all", authenticate, getCustomers);
CustomeRoutes.get("/one/:id", authenticate, getCustomerById);
CustomeRoutes.patch(
  "/:id",
  authenticate,
  validateDto(UpdateCustomerDto),
  updateCustomer,
);

CustomeRoutes.patch(
  "/:id/status",
  authenticate,
  validateDto(UpdateCustomerStatusDto),
  updateCustomerStatus,
);
CustomeRoutes.delete(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.HR, UserRole.DEV),
  authorize(UserRole.ADMIN, UserRole.DEV),
  deleteCustomer,
);
export default CustomeRoutes;
