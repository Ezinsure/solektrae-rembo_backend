import type { Request } from "express";
import { ApiError } from "./apiError";

export type AuditContext = {
  actorId: string | null;
  actorName: string | null;
  companyId: string | null;
  actorRole: string | null;
  ip: string | null;
  userAgent: string | null;
};

export function auditContext(req: Request): AuditContext {
  const ip =
    (req.ip ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, "") || null;

  return {
    actorId: req.user?.id ?? null,
    actorName: req.user?.names ?? null,
    companyId: req.user?.companyId ?? null,
    actorRole: req.user?.role ?? null,
    ip,
    userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
  };
}

/** The company the request works in. Every company-scoped endpoint should use this. */
export function requireCompanyId(req: Request): string {
  const companyId = req.user?.companyId;
  if (!companyId)
    throw new ApiError(403, "No company selected. Please sign in again.");
  return companyId;
}
