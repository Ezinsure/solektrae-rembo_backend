import { Response } from "express";
import { setupService } from "../services/setupService";
import { asyncHandler } from "../utils/asyncHandle";

export const bootstrapAdmin = asyncHandler(async (req, res: Response) => {
  const user = await setupService.bootstrapAdmin(req.body);
  res.status(201).json({
    success: true,
    message: "Admin account created. You can now log in.",
    data: user,
  });
});