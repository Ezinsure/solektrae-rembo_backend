import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RequestHandler } from "express";
import { ApiError } from "../utils/apiError";

export function validateDto<T extends object>(
  DtoClass: new () => T,
): RequestHandler {
  return async (req, res, next) => {
    const instance = plainToInstance(DtoClass, req.body);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const details = errors.map((e) => ({
        field: e.property,
        constraints: e.constraints,
      }));
      return next(new ApiError(400, "Validation failed", details));
    }

    req.body = instance;
    next();
  };
}
