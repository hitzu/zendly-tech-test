import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765297599908 implements MigrationInterface {
  name = 'Migration1765297599908';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "zendly"."OPERATOR_AVAILABILITY" AS ENUM('AVAILABLE', 'OFFLINE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operator_statuses" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "operator_id" integer NOT NULL, "tenant_id" integer NOT NULL, "status" "zendly"."OPERATOR_AVAILABILITY" NOT NULL DEFAULT 'OFFLINE', "last_status_change_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_bb5a025f5560e3998f2fe78f62e" PRIMARY KEY ("id", "operator_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "zendly"."GRACE_PERIOD_REASON" AS ENUM('OFFLINE', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "grace_period_assignments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "conversation_id" integer NOT NULL, "operator_id" integer NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "reason" "zendly"."GRACE_PERIOD_REASON" NOT NULL, CONSTRAINT "grace_period_conversation_operator_unique" UNIQUE ("conversation_id", "operator_id"), CONSTRAINT "PK_07cbf4d0738e3c5c2754b064efe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "grace_period_expires_at_idx" ON "grace_period_assignments" ("expires_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_statuses" ADD CONSTRAINT "FK_a537c8e1889d9c02e28ca946041" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grace_period_assignments" ADD CONSTRAINT "FK_1929c74cc8a739bb14824d1386d" FOREIGN KEY ("conversation_id") REFERENCES "conversation_refs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grace_period_assignments" ADD CONSTRAINT "FK_a4d1f30d0edf4eafb70a6006270" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grace_period_assignments" DROP CONSTRAINT "FK_a4d1f30d0edf4eafb70a6006270"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grace_period_assignments" DROP CONSTRAINT "FK_1929c74cc8a739bb14824d1386d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_statuses" DROP CONSTRAINT "FK_a537c8e1889d9c02e28ca946041"`,
    );
    await queryRunner.query(
      `DROP INDEX "zendly"."grace_period_expires_at_idx"`,
    );
    await queryRunner.query(`DROP TABLE "grace_period_assignments"`);
    await queryRunner.query(`DROP TYPE "zendly"."GRACE_PERIOD_REASON"`);
    await queryRunner.query(`DROP TABLE "operator_statuses"`);
    await queryRunner.query(`DROP TYPE "zendly"."OPERATOR_AVAILABILITY"`);
  }
}
