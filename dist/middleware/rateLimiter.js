"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Deliberately stricter than a general API rate limit: login/refresh are
// the endpoints an attacker would hammer to brute-force credentials or
// guess/replay tokens. 10 attempts per 15 minutes per IP is generous for a
// real user who mistypes a password a couple of times, punishing for a
// script trying thousands of combinations.
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 30 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please try again in a few minutes.",
    },
});
//# sourceMappingURL=rateLimiter.js.map