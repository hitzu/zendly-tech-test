import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765226971268 implements MigrationInterface {
  name = 'Migration1765226971268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "zendly"."CONVERSATION_STATE" AS ENUM('QUEUED', 'ALLOCATED', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_refs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "inbox_id" integer NOT NULL, "external_conversation_id" text NOT NULL, "customer_phone_number" text NOT NULL, "state" "zendly"."CONVERSATION_STATE" NOT NULL DEFAULT 'QUEUED', "assigned_operator_id" integer, "last_message_at" TIMESTAMP WITH TIME ZONE, "message_count" integer NOT NULL DEFAULT '0', "priority_score" integer NOT NULL DEFAULT '0', "resolved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "conversation_ref_tenant_external_unique" UNIQUE ("tenant_id", "external_conversation_id"), CONSTRAINT "PK_266c86d40b8de8bc2898dd6aadc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "inboxes" ADD CONSTRAINT "inbox_tenant_phone_unique" UNIQUE ("tenant_id", "phone_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" ADD CONSTRAINT "FK_481ee2556d89018d0609abdf5fb" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" ADD CONSTRAINT "FK_c1599b6bdd320ef943df672557b" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" ADD CONSTRAINT "FK_5de2cb14f3480a557fa11b10c4b" FOREIGN KEY ("assigned_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" DROP CONSTRAINT "FK_5de2cb14f3480a557fa11b10c4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" DROP CONSTRAINT "FK_c1599b6bdd320ef943df672557b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_refs" DROP CONSTRAINT "FK_481ee2556d89018d0609abdf5fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inboxes" DROP CONSTRAINT "inbox_tenant_phone_unique"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_refs"`);
    await queryRunner.query(`DROP TYPE "zendly"."CONVERSATION_STATE"`);
  }
}
