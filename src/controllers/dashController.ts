import { Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandle";
import { requireCompanyId } from "../utils/auditContext";
import { ApiError } from "../utils/apiError";
import { dashboardService } from "../services/dashboardService";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const dashboardQuerySchema = z.object({ from: day, to: day });

export const getDashboard = asyncHandler(async (req, res: Response) => {
  const { from, to } = dashboardQuerySchema.parse(req.query);
  if (from > to) throw new ApiError(400, "'from' must be before 'to'");

  const data = await dashboardService.summary(requireCompanyId(req), from, to);
  res.status(200).json({ success: true, data });
});