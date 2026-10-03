import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserTable1791055085660 implements MigrationInterface {
    name = 'UpdateUserTable1791055085660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "updatedById" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "deletedById" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_51d635f1d983d505fb5a2f44c52" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_52e97c477859f8019f3705abd21" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_e9d50c91bd84f566ce0ac1acf44" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_e9d50c91bd84f566ce0ac1acf44"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_52e97c477859f8019f3705abd21"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_51d635f1d983d505fb5a2f44c52"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedById"`);
    }

}
