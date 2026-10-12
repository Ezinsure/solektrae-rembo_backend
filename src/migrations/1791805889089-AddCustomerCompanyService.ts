import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerCompanyService1791805889089 implements MigrationInterface {
    name = 'AddCustomerCompanyService1791805889089'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" ADD "companyId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "serviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "service" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_0986813e8a32bcb2457caecdc9" ON "customers"  ("companyId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_809a6e573d3e4482d468298e38" ON "customers"  ("companyId", "serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e17083749783ef9d3aea15dc89" ON "customers"  ("companyId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_568c2136b0779d63539cf84fafc" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_08362ea23f7b87fa529809b3230" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_08362ea23f7b87fa529809b3230"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_568c2136b0779d63539cf84fafc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e17083749783ef9d3aea15dc89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_809a6e573d3e4482d468298e38"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0986813e8a32bcb2457caecdc9"`);
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "service" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "serviceId"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "companyId"`);
    }

}
