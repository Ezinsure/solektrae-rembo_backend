import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateServices1791796502876 implements MigrationInterface {
    name = 'UpdateServices1791796502876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "descr"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "isOther"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "companyId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "services" ADD "key" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "services" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "services" ADD "tags" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "services" ADD "active" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "services" ADD "allowCustomName" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "services" ADD "fields" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "services" ADD "sortOrder" integer DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "services" ADD "deletedById" uuid`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "UQ_019d74f7abcdcb5a0113010cb03"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "name" character varying(120) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_b72f2c086959056002385fe876" ON "services"  ("companyId", "active", "sortOrder") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f033956121a34e4bfd95c16fae" ON "services"  ("companyId", "key") `);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_25334fffe4ce341dd1da38acbd9" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_25334fffe4ce341dd1da38acbd9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f033956121a34e4bfd95c16fae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b72f2c086959056002385fe876"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "UQ_019d74f7abcdcb5a0113010cb03" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "sortOrder"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "fields"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "allowCustomName"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "active"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "key"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "companyId"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "services" ADD "isOther" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "services" ADD "descr" text NOT NULL`);
    }

}
