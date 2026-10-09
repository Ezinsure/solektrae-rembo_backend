import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
});
