import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware";
import {
  exportActivityLogs,
  listActivityLogs,
} from "../../controllers/activityLogController";

const LogsRoutes = Router();

LogsRoutes.get("/", authenticate, listActivityLogs);
LogsRoutes.get("/export", authenticate, exportActivityLogs);

export default LogsRoutes;
