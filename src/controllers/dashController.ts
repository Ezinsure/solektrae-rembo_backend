import { Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandle";
import { requireCompanyId } from "../utils/auditContext";
import { ApiError } from "../utils/apiError";
import { dashboardService, kigaliToday } from "../services/dashboardService";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const dashboardQuerySchema = z.object({
  from: day.optional(),
  to: day.optional(),
  trendFrom: day.optional(),
});

export const getDashboard = asyncHandler(async (req, res: Response) => {
  const q = dashboardQuerySchema.parse(req.query);

  // No dates sent -> today (Kigali)
  const today = kigaliToday();
  const to = q.to ?? today;
  const from = q.from ?? to;
  if (from > to) throw new ApiError(400, "'from' must be before 'to'");

  // The chart may start earlier than `from`, never later
  const trendFrom = q.trendFrom && q.trendFrom <= from ? q.trendFrom : from;

  const data = await dashboardService.summary(requireCompanyId(req), from, to, trendFrom);
  res.status(200).json({ success: true, data });
});