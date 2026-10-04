import { MigrationInterface, QueryRunner } from "typeorm";

// Timezone your existing values were saved in.
// Cloud-hosted backend: usually "UTC". Data created by a backend running on a PC in Rwanda: "Africa/Kigali".
const SOURCE_TIMEZONE = "UTC";

const findColumns = (dataType: string) => `
  SELECT c.table_name, c.column_name
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.data_type = '${dataType}'
`;

export class ConvertTimestampsToTimestamptz1791052578529 implements MigrationInterface {
    name = "ConvertTimestampsToTimestamptz1791052578529";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const columns: { table_name: string; column_name: string }[] =
            await queryRunner.query(findColumns("timestamp without time zone"));

        for (const { table_name, column_name } of columns) {
            await queryRunner.query(
                `ALTER TABLE "${table_name}" ALTER COLUMN "${column_name}" TYPE TIMESTAMP WITH TIME ZONE USING "${column_name}" AT TIME ZONE '${SOURCE_TIMEZONE}'`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const columns: { table_name: string; column_name: string }[] =
            await queryRunner.query(findColumns("timestamp with time zone"));

        for (const { table_name, column_name } of columns) {
            await queryRunner.query(
                `ALTER TABLE "${table_name}" ALTER COLUMN "${column_name}" TYPE TIMESTAMP WITHOUT TIME ZONE USING "${column_name}" AT TIME ZONE '${SOURCE_TIMEZONE}'`,
            );
        }
    }
}