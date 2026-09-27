import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedByToCustomer1790434001694 implements MigrationInterface {
    name = 'AddUpdatedByToCustomer1790434001694'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD "updatedBy" uuid`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_2ba4b3cf26d82265a4e271f10ba" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_2ba4b3cf26d82265a4e271f10ba"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "updatedBy"`);
    }

}
