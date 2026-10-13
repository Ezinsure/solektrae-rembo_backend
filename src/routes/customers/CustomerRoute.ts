import { Router } from "express";
import {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  updateCustomerStatus,
  exportCustomers,
  getCustomerStats,
} from "../../controllers/customer.controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/roleMiddleware";
import { UserRole } from "../../entities/User";

const CustomeRoutes = Router();

CustomeRoutes.use(authenticate);

CustomeRoutes.get("/all", authenticate, getCustomers);
CustomeRoutes.get("/stats", getCustomerStats);
CustomeRoutes.get("/export", exportCustomers);
CustomeRoutes.get("/one/:id", getCustomerById);
CustomeRoutes.patch("/:id", updateCustomer);
CustomeRoutes.patch("/:id/status", updateCustomerStatus);
CustomeRoutes.delete(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.DEV),
  deleteCustomer,
);
export default CustomeRoutes;
