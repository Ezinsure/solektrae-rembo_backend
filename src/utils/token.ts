import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { UserRole } from "../entities/User";

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

type ExpiresIn = SignOptions["expiresIn"];

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const ACCESS_EXPIRES_IN: ExpiresIn =
  (process.env.JWT_ACCESS_EXPIRES_IN as ExpiresIn) ?? "15m";
const REFRESH_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7,
);

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not set");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

// Refresh tokens are NOT JWTs — they're high-entropy random strings. A JWT's
// self-contained/statelessness is exactly what we don't want here: we need
// to be able to look one up and revoke it. sha256 (not bcrypt) is
// deliberate: bcrypt's slowness defends against brute-forcing *low-entropy*
// human-chosen secrets (passwords). A 64-byte random token already has far
// more entropy than bcrypt could ever add value against — sha256 is fast
// and sufficient for hashing high-entropy secrets.
export function generateRefreshToken(): {
  raw: string;
  hash: string;
  expiresAt: Date;
} {
  const raw = crypto.randomBytes(64).toString("hex");
  const hash = hashRefreshToken(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );
  return { raw, hash, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
