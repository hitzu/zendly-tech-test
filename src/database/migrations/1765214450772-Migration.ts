import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765214450772 implements MigrationInterface {
  name = 'Migration1765214450772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" text NOT NULL, CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operators" ADD CONSTRAINT "FK_66f8e82456430824f371a1c9b1f" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operators" DROP CONSTRAINT "FK_66f8e82456430824f371a1c9b1f"`,
    );
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
