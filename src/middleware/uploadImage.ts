import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

const MAX_SIZE_MB = 2;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"]; 

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, "Only JPG, PNG or WEBP images are allowed")),
});

export const singleImage = (field = "image") => (req: Request, res: Response, next: NextFunction) =>
  upload.single(field)(req, res, (err: any) => {
    if (!err) {
      if (!req.file) return next(new ApiError(400, "Please choose an image"));
      return next();
    }
    if (err instanceof multer.MulterError) {
      return next(
        new ApiError(400, err.code === "LIMIT_FILE_SIZE" ? `Image must be ${MAX_SIZE_MB} MB or smaller` : err.message),
      );
    }
    next(err);
  });