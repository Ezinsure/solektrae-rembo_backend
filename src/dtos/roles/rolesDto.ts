import { z } from "zod";
import { ASSIGNABLE_BASE_ROLES } from "../../constants/roles";

const nameField = z.string().trim().min(2, "Name is too short").max(60);
const descriptionField = z.string().trim().max(255).nullable().optional();
const baseRoleField = z.enum(ASSIGNABLE_BASE_ROLES as [string, ...string[]]);

export const createRoleSchema = z
  .object({
    name: nameField,
    description: descriptionField,
    baseRole: baseRoleField.default("staff"),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField,
    baseRole: baseRoleField.optional(),
  })
  .strict();
export const assignRoleSchema = z
  .object({ roleId: z.string().uuid() })
  .strict();
export const uuidParam = z.string().uuid("Invalid id");
