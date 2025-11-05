import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitMigration001 implements MigrationInterface {
  name = 'InitMigration001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "name" varchar(120) NOT NULL,
      "email" varchar(160) NOT NULL,
      "hashed_password" varchar(255) NOT NULL,
      "role" varchar NOT NULL DEFAULT ('user'),
      "is_active" boolean NOT NULL DEFAULT (1)
    )`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "plugins" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "name" varchar(120) NOT NULL,
      "description" varchar(240) NOT NULL,
      "version" varchar(32) NOT NULL,
      "author" varchar(160),
      "is_enabled" boolean NOT NULL DEFAULT (1),
      "config_schema" text
    )`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_plugins_name" ON "plugins" ("name")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "workflows" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "name" varchar(160) NOT NULL,
      "description" text,
      "nodes" text,
      "connections" text,
      "settings" text,
      "status" varchar NOT NULL DEFAULT ('draft'),
      "ownerId" integer NOT NULL,
      CONSTRAINT "FK_workflows_owner" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workflows_name_owner" ON "workflows" ("name", "ownerId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sessions" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "token" varchar(255) NOT NULL,
      "user_agent" varchar(255),
      "ip_address" varchar(64),
      "expires_at" bigint NOT NULL,
      "userId" integer NOT NULL,
      CONSTRAINT "FK_sessions_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sessions_token" ON "sessions" ("token")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "logs" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "level" varchar(16) NOT NULL,
      "message" text NOT NULL,
      "metadata" text,
      "workflowId" integer NOT NULL,
      CONSTRAINT "FK_logs_workflow" FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_logs_workflow_created" ON "logs" ("workflowId", "created_at")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "workflow_plugins" (
      "workflow_id" integer NOT NULL,
      "plugin_id" integer NOT NULL,
      PRIMARY KEY ("workflow_id", "plugin_id"),
      CONSTRAINT "FK_wp_workflow" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON DELETE CASCADE,
      CONSTRAINT "FK_wp_plugin" FOREIGN KEY ("plugin_id") REFERENCES "plugins" ("id") ON DELETE CASCADE
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "workflow_plugins"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_logs_workflow_created"');
    await queryRunner.query('DROP TABLE IF EXISTS "logs"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_sessions_token"');
    await queryRunner.query('DROP TABLE IF EXISTS "sessions"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_workflows_name_owner"');
    await queryRunner.query('DROP TABLE IF EXISTS "workflows"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_plugins_name"');
    await queryRunner.query('DROP TABLE IF EXISTS "plugins"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_email"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
