import { Router } from "express";
import { getDashboard } from "../controllers/dashController";
import { authenticate } from "../middleware/authMiddleware";

const DashboardRoutes = Router();

DashboardRoutes.use(authenticate);
DashboardRoutes.get("/", getDashboard);

export default DashboardRoutes;
