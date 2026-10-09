import type { Response } from "express";
import { ApiError } from "../utils/apiError";
import { logExportSchema, logQuerySchema } from "../dtos/logQueryDto";
import { asyncHandler } from "../utils/asyncHandle";
import { activityLogService } from "../services/activityLog";

export const listActivityLogs = asyncHandler(async (req, res: Response) => {
  const parsed = logQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid filters");

  const result = await activityLogService.list(parsed.data);
  res.status(200).json({ success: true, ...result });
});

export const exportActivityLogs = asyncHandler(async (req, res: Response) => {
  const parsed = logExportSchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid filters");

  const { csv, total, truncated } = await activityLogService.exportCsv(parsed.data);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="activity-logs-${today}.csv"`);
  res.setHeader("X-Total-Count", String(total));
  res.setHeader("X-Truncated", String(truncated));
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Total-Count, X-Truncated");
  res.status(200).send(csv);
});