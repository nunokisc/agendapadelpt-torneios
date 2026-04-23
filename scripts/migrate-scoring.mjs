import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../prisma/dev.db");

const db = new Database(dbPath);

// Enable WAL for safety
db.pragma("journal_mode = WAL");

console.log("Migrating Tournament table: removing setsToWin/pointsPerSet, adding matchFormat...");

// SQLite table rename approach (works on all SQLite versions)
db.exec(`
  -- Step 1: Create new Tournament table with updated schema
  CREATE TABLE "Tournament_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "matchFormat" TEXT NOT NULL DEFAULT 'B1',
    "thirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "groupCount" INTEGER,
    "advanceCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );

  -- Step 2: Copy data from old table (dropping setsToWin and pointsPerSet)
  INSERT INTO "Tournament_new" (
    "id", "slug", "adminToken", "name", "description",
    "format", "status", "matchFormat", "thirdPlace",
    "groupCount", "advanceCount", "createdAt", "updatedAt"
  )
  SELECT
    "id", "slug", "adminToken", "name", "description",
    "format", "status", 'B1', "thirdPlace",
    "groupCount", "advanceCount", "createdAt", "updatedAt"
  FROM "Tournament";

  -- Step 3: Drop old table
  DROP TABLE "Tournament";

  -- Step 4: Rename new table
  ALTER TABLE "Tournament_new" RENAME TO "Tournament";

  -- Step 5: Recreate indexes
  CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");
  CREATE UNIQUE INDEX "Tournament_adminToken_key" ON "Tournament"("adminToken");
`);

console.log("Migration complete.");

// Record migration in _prisma_migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );
`);

db.prepare(`
  INSERT OR IGNORE INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","applied_steps_count")
  VALUES (?,?,datetime('now'),?,NULL,NULL,1)
`).run("scoring-migration", "manual-scoring-migration", "20260423_scoring");

db.close();

// Write migration SQL file for reference
const migDir = resolve(__dirname, "../prisma/migrations/20260423_scoring");
mkdirSync(migDir, { recursive: true });
writeFileSync(
  resolve(migDir, "migration.sql"),
  `-- Migration: replace setsToWin/pointsPerSet with matchFormat
-- Applied: ${new Date().toISOString()}

CREATE TABLE "Tournament_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "matchFormat" TEXT NOT NULL DEFAULT 'B1',
    "thirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "groupCount" INTEGER,
    "advanceCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Tournament_new" (
    "id", "slug", "adminToken", "name", "description",
    "format", "status", "matchFormat", "thirdPlace",
    "groupCount", "advanceCount", "createdAt", "updatedAt"
)
SELECT
    "id", "slug", "adminToken", "name", "description",
    "format", "status", 'B1', "thirdPlace",
    "groupCount", "advanceCount", "createdAt", "updatedAt"
FROM "Tournament";

DROP TABLE "Tournament";

ALTER TABLE "Tournament_new" RENAME TO "Tournament";

CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");
CREATE UNIQUE INDEX "Tournament_adminToken_key" ON "Tournament"("adminToken");
`
);

console.log("Migration SQL file written to prisma/migrations/20260423_scoring/migration.sql");
