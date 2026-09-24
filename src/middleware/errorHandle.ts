import { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/apiError";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res
      .status(err.statusCode)
      .json({ success: false, message: err.message, errors: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
};
