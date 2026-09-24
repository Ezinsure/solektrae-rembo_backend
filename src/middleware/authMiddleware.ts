import { RequestHandler } from "express";
import { verifyAccessToken } from "../utils/token";
import { ApiError } from "../utils/apiError";
import jwt from "jsonwebtoken";

// Expects: Authorization: Bearer <accessToken>
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid authorization header"));
  }

  const token = header.slice(7).trim();

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return next(
        new ApiError(401, "Access token expired", { code: "TOKEN_EXPIRED" }),
      );
    }
    next(new ApiError(401, "Invalid  access token"));
  }
};
