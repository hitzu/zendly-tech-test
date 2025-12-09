import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765254510721 implements MigrationInterface {
  name = 'Migration1765254510721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "labels" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "inbox_id" integer NOT NULL, "name" text NOT NULL, "color" text, "created_by_operator_id" integer NOT NULL, CONSTRAINT "label_tenant_inbox_name_unique" UNIQUE ("tenant_id", "inbox_id", "name"), CONSTRAINT "PK_c0c4e97f76f1f3a268c7a70b925" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_labels" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "conversation_id" integer NOT NULL, "label_id" integer NOT NULL, CONSTRAINT "conversation_label_unique" UNIQUE ("conversation_id", "label_id"), CONSTRAINT "PK_370d2f73386d0a384cbd530a224" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "labels" ADD CONSTRAINT "FK_de34c1ac7c8077fd40689f309d4" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "labels" ADD CONSTRAINT "FK_c4a66d1b62e5676dccc4675cc69" FOREIGN KEY ("created_by_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_labels" ADD CONSTRAINT "FK_424ee9eb097bdc47eaa1164ed9c" FOREIGN KEY ("conversation_id") REFERENCES "conversation_refs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_labels" ADD CONSTRAINT "FK_5b4b5eb678eeb2ae0e76700f284" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_labels" DROP CONSTRAINT "FK_5b4b5eb678eeb2ae0e76700f284"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_labels" DROP CONSTRAINT "FK_424ee9eb097bdc47eaa1164ed9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "labels" DROP CONSTRAINT "FK_c4a66d1b62e5676dccc4675cc69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "labels" DROP CONSTRAINT "FK_de34c1ac7c8077fd40689f309d4"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_labels"`);
    await queryRunner.query(`DROP TABLE "labels"`);
  }
}
