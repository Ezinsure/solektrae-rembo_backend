import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSystemRoles1760140000000 implements MigrationInterface {
  name = "UpdateSystemRoles1760140000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Companies that have no built-in roles yet get them
    await queryRunner.query(`
      INSERT INTO "roles" ("companyId", "name", "description", "baseRole", "isSystem")
      SELECT c."id", v.name, v.description, v.base::"roles_baserole_enum", true
      FROM "companies" c
      CROSS JOIN (VALUES
        ('Admin', 'Oversees system operations, user access, and administrative settings.', 'admin'),
        ('Dev',   'Manages system maintenance, technical configurations, and platform integrity.', 'dev'),
        ('HR',    'Manages employee records, staff administration, and human resource operations.', 'hr'),
        ('Staff', 'Handles day-to-day operational tasks and customer service activities.', 'staff'),
        ('User',  'Accesses authorized features and services based on assigned permissions.', 'user')
      ) AS v(name, description, base)
      WHERE NOT EXISTS (
        SELECT 1 FROM "roles" r WHERE r."companyId" = c."id" AND r."isSystem" = true
      )
    `);

    // Existing built-in roles get the new names and descriptions
    await queryRunner.query(`
      UPDATE "roles" r
      SET "name" = v.name, "description" = v.description
      FROM (VALUES
        ('admin', 'Admin', 'Oversees system operations, user access, and administrative settings.'),
        ('dev',   'Dev',   'Manages system maintenance, technical configurations, and platform integrity.'),
        ('hr',    'HR',    'Manages employee records, staff administration, and human resource operations.'),
        ('staff', 'Staff', 'Handles day-to-day operational tasks and customer service activities.'),
        ('user',  'User',  'Accesses authorized features and services based on assigned permissions.')
      ) AS v(base, name, description)
      WHERE r."isSystem" = true AND r."baseRole"::text = v.base
    `);

    // Members with no role get the built-in role matching their access level
    await queryRunner.query(`
      UPDATE "company_members" m
      SET "roleId" = r."id"
      FROM "roles" r
      WHERE m."roleId" IS NULL
        AND r."companyId" = m."companyId"
        AND r."isSystem" = true
        AND r."baseRole"::text = m."role"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Text changes only, nothing to undo safely
  }
}
