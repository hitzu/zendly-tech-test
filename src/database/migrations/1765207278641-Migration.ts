import { MigrationInterface, QueryRunner } from 'typeorm';

const schema = process.env.DB_SCHEMA || 'public';

export class Migration1765207278641 implements MigrationInterface {
  name = 'Migration1765207278641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await queryRunner.query(`SET search_path TO "${schema}", public`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'OPERATOR_ROLES' AND n.nspname = '${schema}'
        ) THEN
          CREATE TYPE "${schema}"."OPERATOR_ROLES" AS ENUM('OPERATOR', 'MANAGER', 'ADMIN');
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'TOKEN_TYPE' AND n.nspname = '${schema}'
        ) THEN
          CREATE TYPE "${schema}"."TOKEN_TYPE" AS ENUM('access', 'refresh');
        END IF;
      END$$;
    `);
    await queryRunner.query(
      `CREATE TABLE "operators" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "name" text NOT NULL, "role" "${schema}"."OPERATOR_ROLES" NOT NULL, CONSTRAINT "PK_3d02b3692836893720335a79d1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "token" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "token" text NOT NULL, "type" "${schema}"."TOKEN_TYPE" NOT NULL, "operator_id" integer, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operator-inbox-subscriptions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "operator_id" integer NOT NULL, "inbox_id" integer NOT NULL, CONSTRAINT "PK_d816c27ecc527d244ef61c0d247" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inboxes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "phone_number" text NOT NULL, "display_name" text NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_902c6fe5be554398e6833bb099c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_eff0cf21ca2ebb82368e479cadd" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT "FK_eff0cf21ca2ebb82368e479cadd"`,
    );
    await queryRunner.query(`DROP TABLE "inboxes"`);
    await queryRunner.query(`DROP TABLE "operator-inbox-subscriptions"`);
    await queryRunner.query(`DROP TABLE "token"`);
    await queryRunner.query(`DROP TABLE "operators"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "${schema}"."TOKEN_TYPE"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "${schema}"."OPERATOR_ROLES"`);
  }
}
