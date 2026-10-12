import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

export const updateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().or(z.literal("")).transform((v) => v || null).nullable().optional(),
    phoneNumber: optionalText(20),
    about: optionalText(1000),
  })
  .strict(); 

export const createCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().optional(),
    phoneNumber: z.string().trim().max(20).optional(),
  })
  .strict();

export const switchCompanySchema = z.object({ companyId: z.string().uuid() }).strict();

export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
export type CreateCompanyDto = z.infer<typeof createCompanySchema>;