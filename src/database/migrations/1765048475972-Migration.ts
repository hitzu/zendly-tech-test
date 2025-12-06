import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765048475972 implements MigrationInterface {
  name = 'Migration1765048475972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "zendly"."OPERATOR_ROLES" AS ENUM('OPERATOR', 'MANAGER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "operators" ("id" uuid NOT NULL, "tenant_id" text NOT NULL, "name" text NOT NULL, "role" "zendly"."OPERATOR_ROLES" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_3d02b3692836893720335a79d1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "token" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "token" text NOT NULL, "type" "zendly"."TOKEN_TYPE" NOT NULL, "operator_id" uuid, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_eff0cf21ca2ebb82368e479cadd" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT "FK_eff0cf21ca2ebb82368e479cadd"`,
    );
    await queryRunner.query(`DROP TABLE "token"`);
    await queryRunner.query(`DROP TABLE "operators"`);
    await queryRunner.query(`DROP TYPE "zendly"."OPERATOR_ROLES"`);
  }
}
