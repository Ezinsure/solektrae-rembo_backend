"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugParam = exports.uuidParam = exports.customerStatusSchema = exports.customerExportSchema = exports.customerQuerySchema = exports.customerFormSchema = void 0;
const zod_1 = require("zod");
const serviceFields_1 = require("../../constants/serviceFields");
const Customer_1 = require("../../entities/Customer");
// Catalog fields arrive as text (numbers are turned into text)
const textField = zod_1.z.preprocess((v) => (v === null || v === undefined ? v : String(v)), zod_1.z.string().trim().max(150).nullable().optional());
const catalogShape = Object.fromEntries(serviceFields_1.FIELD_KEYS.map((k) => [k, textField]));
// Same body for applying (public) and editing
exports.customerFormSchema = zod_1.z.object({
    names: zod_1.z.string().trim().min(2, "Enter full names").max(150),
    email: zod_1.z.string().trim().toLowerCase().email("Enter a valid email").max(150),
    phoneNumber: zod_1.z
        .string()
        .trim()
        .regex(/^\+\d{8,15}$/, "Enter a valid phone number"),
    serviceId: zod_1.z.string().uuid("Please choose a service"),
    customServiceName: zod_1.z.string().trim().max(150).nullable().optional(),
    ...catalogShape,
});
exports.customerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    search: zod_1.z.string().trim().max(100).optional(),
    status: zod_1.z.nativeEnum(Customer_1.CustomerStatus).optional(),
    serviceId: zod_1.z.string().uuid().optional(),
    updatedById: zod_1.z.string().uuid().optional(),
    from: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    to: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});
exports.customerExportSchema = exports.customerQuerySchema.omit({
    page: true,
    limit: true,
});
exports.customerStatusSchema = zod_1.z.object({
    status: zod_1.z
        .nativeEnum(Customer_1.CustomerStatus)
        .refine((s) => s !== Customer_1.CustomerStatus.PENDING, {
        message: "A customer can't be set back to pending",
    }),
    note: zod_1.z.string().trim().optional(),
});
exports.uuidParam = zod_1.z.string().uuid("Invalid id");
exports.slugParam = zod_1.z.string().trim().min(1).max(80);
//# sourceMappingURL=customerdto.js.map