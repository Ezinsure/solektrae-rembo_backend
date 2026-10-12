import { z } from "zod";
import { FIELD_KEYS } from "../../constants/serviceFields";
import { CustomerStatus } from "../../entities/Customer";

// Catalog fields arrive as text (numbers are turned into text)
const textField = z.preprocess(
  (v) => (v === null || v === undefined ? v : String(v)),
  z.string().trim().max(150).nullable().optional(),
);

const catalogShape = Object.fromEntries(FIELD_KEYS.map((k) => [k, textField]));

// Same body for applying (public) and editing
export const customerFormSchema = z.object({
  names: z.string().trim().min(2, "Enter full names").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(150),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+\d{8,15}$/, "Enter a valid phone number"),
  serviceId: z.string().uuid("Please choose a service"),
  customServiceName: z.string().trim().max(150).nullable().optional(),
  ...catalogShape,
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  serviceId: z.string().uuid().optional(),
  updatedById: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const customerExportSchema = customerQuerySchema.omit({
  page: true,
  limit: true,
});

export const customerStatusSchema = z.object({
  status: z
    .nativeEnum(CustomerStatus)
    .refine((s) => s !== CustomerStatus.PENDING, {
      message: "A customer can't be set back to pending",
    }),
});

export const uuidParam = z.string().uuid("Invalid id");
export const slugParam = z.string().trim().min(1).max(80);
