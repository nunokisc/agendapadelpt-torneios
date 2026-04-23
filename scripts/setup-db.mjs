import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../prisma/dev.db");
const sqlPath = resolve(__dirname, "../prisma/migrations/20260423195815_init/migration.sql");

const db = new Database(dbPath);
const sql = readFileSync(sqlPath, "utf8");

db.exec(sql);

// Create _prisma_migrations table and record
db.exec(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );
`);

db.prepare(`
  INSERT OR IGNORE INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","applied_steps_count")
  VALUES (?,?,datetime('now'),?,NULL,NULL,1)
`).run("setup-init", "manual-setup", "20260423195815_init");

db.close();
console.log("Database created at", dbPath);
