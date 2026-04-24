import Database from "better-sqlite3";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isMySQL =
  DATABASE_URL.startsWith("mysql://") ||
  DATABASE_URL.startsWith("mariadb://");

// ── Schema patching ───────────────────────────────────────────────────────────

const SQLITE_DATASOURCE = `\
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}`;

const MYSQL_DATASOURCE = `\
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}`;

function patchSchema(datasource) {
  const schemaPath = resolve(root, "prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");
  const modelsStart = schema.indexOf("\nmodel ");
  const models = modelsStart !== -1 ? schema.slice(modelsStart) : schema;
  writeFileSync(schemaPath, `${datasource}\n${models}`);
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

// ── MySQL / MariaDB setup ─────────────────────────────────────────────────────
if (isMySQL) {
  console.log("MySQL/MariaDB detected — configuring Prisma schema...");
  patchSchema(MYSQL_DATASOURCE);
  run("npx prisma generate");
  run("npx prisma migrate deploy");
  console.log("MySQL database ready.");

// ── SQLite setup ─────────────────────────────────────────────────────────────
} else {
  console.log("SQLite detected — applying migrations...");
  patchSchema(SQLITE_DATASOURCE);
  run("npx prisma generate");

  const dbPath = resolve(root, "prisma/dev.db");

  const migrations = [
    { id: "setup-init",     name: "20260423195815_init" },
    { id: "setup-scoring",  name: "20260423_scoring" },
    { id: "setup-doubles",  name: "20260424_doubles" },
    { id: "setup-features", name: "20260424_features" },
  ];

  const db = new Database(dbPath);

  for (const m of migrations) {
    const sqlPath = resolve(root, `prisma/migrations-sqlite/${m.name}/migration.sql`);
    db.exec(readFileSync(sqlPath, "utf8"));
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                  TEXT NOT NULL PRIMARY KEY,
      "checksum"            TEXT NOT NULL,
      "finished_at"         DATETIME,
      "migration_name"      TEXT NOT NULL,
      "logs"                TEXT,
      "rolled_back_at"      DATETIME,
      "started_at"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "applied_steps_count")
    VALUES (?, ?, datetime('now'), ?, NULL, NULL, 1)
  `);
  for (const m of migrations) insert.run(m.id, "manual-setup", m.name);

  db.close();
  console.log("SQLite database created at", dbPath);
}
