import { Router } from "express";
import UserRouter from "./user/userRoutes";
import BoostrapRouter from "./setup/SetUpRoutes";
import ServiceRoutes from "./services/ServiceRoutes";
import CustomeRoutes from "./customers/CustomerRoute";
import AuthRouter from "./auth/AuthRoutes";

const routes = Router();

routes.use("/admin", BoostrapRouter);
routes.use("/auth", AuthRouter);
routes.use("/users", UserRouter);
routes.use("/services", ServiceRoutes);
routes.use("/customers", CustomeRoutes);

export default routes;
