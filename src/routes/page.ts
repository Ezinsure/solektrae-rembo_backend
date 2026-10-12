import { Router } from "express";
import UserRouter from "./user/userRoutes";
import BoostrapRouter from "./setup/SetUpRoutes";
import ServiceRoutes from "./services/ServiceRoutes";
import CustomeRoutes from "./customers/CustomerRoute";
import AuthRouter from "./auth/AuthRoutes";
import LogsRoutes from "./logs/activityLogRouter";
import CompanyRoutes from "./company/CompanyRoutes";
import RolesRoutes from "./roles/rolesRoutes";
import PublicRoutes from "./publicRoutes";

const routes = Router();

routes.use("/public", PublicRoutes); 
routes.use("/admin", BoostrapRouter);
routes.use("/auth", AuthRouter);
routes.use("/users", UserRouter);
routes.use("/services", ServiceRoutes);
routes.use("/customers", CustomeRoutes);
routes.use("/logs", LogsRoutes);
routes.use("/companies", CompanyRoutes);
routes.use("/roles", RolesRoutes);

export default routes;
