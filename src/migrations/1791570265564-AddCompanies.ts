import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanies1791570265564 implements MigrationInterface {
    name = 'AddCompanies1791570265564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "slug" character varying(80) NOT NULL, "email" character varying(150), "phoneNumber" character varying(20), "about" text, "logoUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdById" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedById" uuid, CONSTRAINT "UQ_b28b07d25e4324eee577de5496d" UNIQUE ("slug"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."company_members_role_enum" AS ENUM('admin', 'hr', 'dev', 'user', 'staff')`);
        await queryRunner.query(`CREATE TABLE "company_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."company_members_role_enum" NOT NULL DEFAULT 'staff', "isActive" boolean NOT NULL DEFAULT true, "lastUsedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b159163d9222448886158bc5385" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_32cfc84ca28ef5a0eae635214a" ON "company_members"  ("companyId", "userId") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "companyId" uuid`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_ff7919ef0e4b04801188c4aa591" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_fed8091b15f02e38562d8165686" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_b90cba2c7d2186fa520ee5e39a9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        // It puts all existing users into one default company with their current role, so nobody loses access when this is deployed.
        await queryRunner.query(`INSERT INTO "companies" ("id", "name", "slug") VALUES (uuid_generate_v4(), 'Irembo Solektra', 'irembo-solektra')`);
 
await queryRunner.query(`
  INSERT INTO "company_members" ("companyId", "userId", "role", "isActive")
  SELECT c."id", u."id", u."role"::text::"company_members_role_enum", u."isActive"
  FROM "users" u
  CROSS JOIN (SELECT "id" FROM "companies" WHERE "slug" = 'irembo-solektra') c
  WHERE u."deletedAt" IS NULL
`);
 
await queryRunner.query(`
  UPDATE "refresh_tokens" SET "companyId" = (SELECT "id" FROM "companies" WHERE "slug" = 'irembo-solektra')
  WHERE "companyId" IS NULL
`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_b90cba2c7d2186fa520ee5e39a9"`);
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_fed8091b15f02e38562d8165686"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_ff7919ef0e4b04801188c4aa591"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "companyId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32cfc84ca28ef5a0eae635214a"`);
        await queryRunner.query(`DROP TABLE "company_members"`);
        await queryRunner.query(`DROP TYPE "public"."company_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "companies"`);
    }

}
