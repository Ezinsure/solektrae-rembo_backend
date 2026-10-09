import { z } from "zod";
import { LogAction, LogEntity } from "../entities/ActivityLog";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const filters = z.object({
  search: z.string().trim().optional(),
  action: z.nativeEnum(LogAction).optional(),
  entity: z.nativeEnum(LogEntity).optional(),
  entityId: z.string().max(64).optional(),
  actorId: z.string().uuid().optional(),
  from: day.optional(),
  to: day.optional(),
});

const validRange = (q: { from?: string; to?: string }) => !q.from || !q.to || q.from <= q.to;
const rangeError = { message: "'from' must be before 'to'", path: ["from"] };

export const logQuerySchema = filters
  .extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10000).default(20),
  })
  .refine(validRange, rangeError);

export const logExportSchema = filters.refine(validRange, rangeError);

export type LogFilters = z.infer<typeof logExportSchema>;
export type LogQuery = z.infer<typeof logQuerySchema>;