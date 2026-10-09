import type { Request } from "express";

export type AuditContext = {
  actorId: string | null;
  actorName: string | null;
  ip: string | null;
  userAgent: string | null;
};

export function auditContext(req: Request): AuditContext {
  // Requires app.set("trust proxy", 1)
  const ip =
    (req.ip ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, "") || null;
  const user = req.user as { id: string; names?: string } | undefined;

  return {
    actorId: user?.id ?? null,
    actorName: user?.names ?? null,
    ip,
    userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
  };
}
