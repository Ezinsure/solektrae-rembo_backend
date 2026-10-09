import type { LogChange } from "../entities/ActivityLog";


const SECRET_FIELDS = new Set([
  "password", "resetPasswordTokenHash", "tokenHash", "refreshToken", "accessToken",
]);


const IGNORED_FIELDS = new Set([
  "updatedAt", "createdAt", "deletedAt", "updatedById", "createdById", "deletedById",
  "updatedBy", "createdBy", "deletedBy",
]);

const normalize = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

export function diff<T extends object>(
  before: T,
  after: T,
  { labels = {}, only }: { labels?: Record<string, string>; only?: (keyof T)[] } = {},
): LogChange[] {
  const keys = (only as string[] | undefined) ?? Object.keys({ ...before, ...after });

  return keys
    .filter((k) => !SECRET_FIELDS.has(k) && !IGNORED_FIELDS.has(k))
    .filter((k) => {
      const a = normalize((before as Record<string, unknown>)[k]);
      const b = normalize((after as Record<string, unknown>)[k]);
      if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) !== JSON.stringify(b);
      return a !== b;
    })
    .map((k) => ({
      field: labels[k] ?? k,
      from: normalize((before as Record<string, unknown>)[k]),
      to: normalize((after as Record<string, unknown>)[k]),
    }));
}