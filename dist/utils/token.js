"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
const REFRESH_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
if (!ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is not set");
}
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
// Refresh tokens are NOT JWTs — they're high-entropy random strings. A JWT's
// self-contained/statelessness is exactly what we don't want here: we need
// to be able to look one up and revoke it. sha256 (not bcrypt) is
// deliberate: bcrypt's slowness defends against brute-forcing *low-entropy*
// human-chosen secrets (passwords). A 64-byte random token already has far
// more entropy than bcrypt could ever add value against — sha256 is fast
// and sufficient for hashing high-entropy secrets.
function generateRefreshToken() {
    const raw = crypto_1.default.randomBytes(64).toString("hex");
    const hash = hashRefreshToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    return { raw, hash, expiresAt };
}
function hashRefreshToken(raw) {
    return crypto_1.default.createHash("sha256").update(raw).digest("hex");
}
//# sourceMappingURL=token.js.map