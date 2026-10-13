import { z } from "zod";
import { FIELD_KEYS } from "../../constants/serviceFields";

const fieldSchema = z
  .object({
    key: z.enum(FIELD_KEYS),
    required: z.boolean(),
  })
  .strict();

const fieldsSchema = z
  .array(fieldSchema)
  .max(FIELD_KEYS.length)
  .refine((list) => new Set(list.map((f) => f.key)).size === list.length, {
    message: "Each field can only be added once",
  });

const tagsSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(20)
  .transform((tags) => [...new Set(tags)])
  .optional();

export const createServiceSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120),
    description: z.string().trim().max(1000).nullable().optional(),
    tags: tagsSchema.optional(),
    active: z.boolean().optional(),
    allowCustomName: z.boolean().optional(),
    fields: fieldsSchema.optional(),
  })
  .strict();

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    tags: tagsSchema.optional(),
    active: z.boolean().optional(),
    allowCustomName: z.boolean().optional(),
    fields: fieldsSchema.optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export const reorderServicesSchema = z
  .object({ ids: z.array(z.string().uuid()).min(1).max(200) })
  .strict();

export const serviceListQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
  search: z.string().trim().max(100).optional(),
});

export const uuidParam = z.string().uuid("Invalid id");
export const slugParam = z.string().trim().min(1).max(80);