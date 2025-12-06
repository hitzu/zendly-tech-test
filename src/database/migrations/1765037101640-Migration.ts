import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765037101640 implements MigrationInterface {
  name = 'Migration1765037101640';
  schema = process.env.DB_SCHEMA || 'public';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if it doesn't exist
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);

    await queryRunner.query(
      `DO $$
       BEGIN
         CREATE TYPE "${this.schema}"."TOKEN_TYPE" AS ENUM('access', 'refresh');
       EXCEPTION
         WHEN duplicate_object THEN NULL;
       END$$;`,
    );
    await queryRunner.query(
      `CREATE TABLE "${this.schema}"."token" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "token" text NOT NULL, "type" "${this.schema}"."TOKEN_TYPE" NOT NULL, "operator_id" uuid, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `DO $$
       BEGIN
         CREATE TYPE "${this.schema}"."OPERATOR_ROLES" AS ENUM('OPERATOR', 'MANAGER', 'ADMIN');
       EXCEPTION
         WHEN duplicate_object THEN NULL;
       END$$;`,
    );
    await queryRunner.query(
      `CREATE TABLE "${this.schema}"."operators" ("id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" text NOT NULL, "name" text NOT NULL, "role" "${this.schema}"."OPERATOR_ROLES" NOT NULL, CONSTRAINT "PK_operators_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "${this.schema}"."token" ADD CONSTRAINT "FK_token_operator" FOREIGN KEY ("operator_id") REFERENCES "${this.schema}"."operators"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${this.schema}"."token" DROP CONSTRAINT "FK_token_operator"`,
    );
    await queryRunner.query(`DROP TABLE "${this.schema}"."operators"`);
    await queryRunner.query(`DROP TYPE "${this.schema}"."OPERATOR_ROLES"`);
    await queryRunner.query(`DROP TABLE "${this.schema}"."token"`);
    await queryRunner.query(`DROP TYPE "${this.schema}"."TOKEN_TYPE"`);
  }
}
