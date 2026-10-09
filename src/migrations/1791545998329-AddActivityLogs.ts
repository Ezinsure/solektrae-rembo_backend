import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivityLogs1791545998329 implements MigrationInterface {
    name = 'AddActivityLogs1791545998329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."activity_logs_action_enum" AS ENUM('create', 'update', 'delete', 'restore', 'login', 'logout', 'login_failed', 'password_reset', 'password_change')`);
        await queryRunner.query(`CREATE TYPE "public"."activity_logs_entity_enum" AS ENUM('customer', 'user', 'role', 'service', 'company', 'auth')`);
        await queryRunner.query(`CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actorId" uuid, "actorName" character varying(150), "action" "public"."activity_logs_action_enum" NOT NULL, "entity" "public"."activity_logs_entity_enum" NOT NULL, "entityId" character varying(64), "summary" character varying(255) NOT NULL, "changes" jsonb, "ip" character varying(64), "userAgent" character varying(255), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b3c7e8182c439d25de0998f8a5" ON "activity_logs"  ("actorId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_f0047f495923090bdd554b219c" ON "activity_logs"  ("entity", "entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_95355d75c728050aae956cf016" ON "activity_logs"  ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_110bb0d32b7f65be46be37e2577" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_110bb0d32b7f65be46be37e2577"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95355d75c728050aae956cf016"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0047f495923090bdd554b219c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3c7e8182c439d25de0998f8a5"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
        await queryRunner.query(`DROP TYPE "public"."activity_logs_entity_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activity_logs_action_enum"`);
    }

}
