"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugParam = exports.uuidParam = exports.serviceListQuerySchema = exports.reorderServicesSchema = exports.updateServiceSchema = exports.createServiceSchema = void 0;
const zod_1 = require("zod");
const serviceFields_1 = require("../../constants/serviceFields");
const fieldSchema = zod_1.z
    .object({
    key: zod_1.z.enum(serviceFields_1.FIELD_KEYS),
    required: zod_1.z.boolean(),
})
    .strict();
const fieldsSchema = zod_1.z
    .array(fieldSchema)
    .max(serviceFields_1.FIELD_KEYS.length)
    .refine((list) => new Set(list.map((f) => f.key)).size === list.length, {
    message: "Each field can only be added once",
});
const tagsSchema = zod_1.z
    .array(zod_1.z.string().trim().min(1).max(30))
    .max(20)
    .transform((tags) => [...new Set(tags)])
    .optional();
exports.createServiceSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, "Name is too short").max(120),
    description: zod_1.z.string().trim().max(1000).nullable().optional(),
    tags: tagsSchema.optional(),
    active: zod_1.z.boolean().optional(),
    allowCustomName: zod_1.z.boolean().optional(),
    fields: fieldsSchema.optional(),
})
    .strict();
exports.updateServiceSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, "Name is too short").max(120).optional(),
    description: zod_1.z.string().trim().max(1000).nullable().optional(),
    tags: tagsSchema.optional(),
    active: zod_1.z.boolean().optional(),
    allowCustomName: zod_1.z.boolean().optional(),
    fields: fieldsSchema.optional(),
    sortOrder: zod_1.z.number().int().min(0).max(10000).optional(),
})
    .strict();
exports.reorderServicesSchema = zod_1.z
    .object({ ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(200) })
    .strict();
exports.serviceListQuerySchema = zod_1.z.object({
    includeInactive: zod_1.z.enum(["true", "false"]).optional(),
    search: zod_1.z.string().trim().max(100).optional(),
});
exports.uuidParam = zod_1.z.string().uuid("Invalid id");
exports.slugParam = zod_1.z.string().trim().min(1).max(80);
//# sourceMappingURL=servicedto.js.map