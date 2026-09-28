import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCustomerTable1790424999392 implements MigrationInterface {
    name = 'UpdateCustomerTable1790424999392'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD "fatherName" character varying`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "motherName" character varying`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "spouseName" character varying`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "street" character varying`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "height" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "hovName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "hovNumber" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "district" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "sector" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "cell" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "village" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "village" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "cell" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "sector" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "district" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "hovNumber" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "hovName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "height" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "street"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "spouseName"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "motherName"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "fatherName"`);
    }

}
