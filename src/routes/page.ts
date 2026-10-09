import { Router } from "express";
import UserRouter from "./user/userRoutes";
import BoostrapRouter from "./setup/SetUpRoutes";
import ServiceRoutes from "./services/ServiceRoutes";
import CustomeRoutes from "./customers/CustomerRoute";
import AuthRouter from "./auth/AuthRoutes";
import LogsRoutes from "./logs/activityLogRouter";

const routes = Router();

routes.use("/admin", BoostrapRouter);
routes.use("/auth", AuthRouter);
routes.use("/users", UserRouter);
routes.use("/services", ServiceRoutes);
routes.use("/customers", CustomeRoutes);
routes.use("/logs", LogsRoutes);

export default routes;
