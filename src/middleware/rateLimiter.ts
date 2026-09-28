import rateLimit from "express-rate-limit";

// Deliberately stricter than a general API rate limit: login/refresh are
// the endpoints an attacker would hammer to brute-force credentials or
// guess/replay tokens. 10 attempts per 15 minutes per IP is generous for a
// real user who mistypes a password a couple of times, punishing for a
// script trying thousands of combinations.
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
