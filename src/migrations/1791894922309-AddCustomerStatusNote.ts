import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerStatusNote1791894922309 implements MigrationInterface {
    name = 'AddCustomerStatusNote1791894922309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD "statusNote" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "statusNote"`);
    }

}
