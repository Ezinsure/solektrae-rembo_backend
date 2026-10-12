import { UserRole } from "../entities/User";

export const LOCKED_BASE_ROLES = [UserRole.ADMIN, UserRole.DEV];

// Access levels a custom role can use (dev is system-wide, not per company)
export const ASSIGNABLE_BASE_ROLES = [
  UserRole.ADMIN,
  UserRole.HR,
  UserRole.STAFF,
  UserRole.USER,
];

export const SYSTEM_ROLES = [
  {
    name: "Admin",
    baseRole: UserRole.ADMIN,
    description: "Oversees system operations, user access, and administrative settings.",
  },
  {
    name: "Dev",
    baseRole: UserRole.DEV,
    description: "Manages system maintenance, technical configurations, and platform integrity.",
  },
  {
    name: "HR",
    baseRole: UserRole.HR,
    description: "Manages employee records, staff administration, and human resource operations.",
  },
  {
    name: "Staff",
    baseRole: UserRole.STAFF,
    description: "Handles day-to-day operational tasks and customer service activities.",
  },
  {
    name: "User",
    baseRole: UserRole.USER,
    description: "Accesses authorized features and services based on assigned permissions.",
  },
];
