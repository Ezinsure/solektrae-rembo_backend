import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoles1791669632696 implements MigrationInterface {
    name = 'AddRoles1791669632696'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366"`);
        await queryRunner.query(`CREATE TYPE "public"."roles_baserole_enum" AS ENUM('admin', 'hr', 'dev', 'user', 'staff')`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "baseRole" "public"."roles_baserole_enum" NOT NULL DEFAULT 'staff', "isSystem" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdById" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedById" uuid, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0385fdf771296e383c90c8a201" ON "roles"  ("companyId", "name") `);
        await queryRunner.query(`ALTER TABLE "company_members" ADD "roleId" uuid`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_5ff67a53e3777f7ab6186db44ba" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_cec119ce18936c7b6c24142be3e" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_5de46381983d514c100aaceb542" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_c7ff9dcce547f4b5330888c1950" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_c7ff9dcce547f4b5330888c1950"`);
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_5de46381983d514c100aaceb542"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_cec119ce18936c7b6c24142be3e"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_5ff67a53e3777f7ab6186db44ba"`);
        await queryRunner.query(`ALTER TABLE "company_members" DROP COLUMN "roleId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0385fdf771296e383c90c8a201"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TYPE "public"."roles_baserole_enum"`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
