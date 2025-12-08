import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765211346110 implements MigrationInterface {
  name = 'Migration1765211346110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operator-inbox-subscriptions" ADD CONSTRAINT "FK_25e5d011c410fb2892846e8e634" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator-inbox-subscriptions" ADD CONSTRAINT "FK_5040be8ffaa26857a74c32bd7a8" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operator-inbox-subscriptions" DROP CONSTRAINT "FK_5040be8ffaa26857a74c32bd7a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator-inbox-subscriptions" DROP CONSTRAINT "FK_25e5d011c410fb2892846e8e634"`,
    );
  }
}
