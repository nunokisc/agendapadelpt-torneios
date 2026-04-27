-- Add tournamentMode to Tournament
ALTER TABLE "Tournament" ADD COLUMN "tournamentMode" TEXT NOT NULL DEFAULT 'manual';

-- Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "matchFormat"  TEXT,
  "starPoint"    BOOLEAN NOT NULL DEFAULT false,
  "status"       TEXT NOT NULL DEFAULT 'draft',
  "order"        INTEGER NOT NULL DEFAULT 0,
  "groupCount"   INTEGER,
  "advanceCount" INTEGER,
  "format"       TEXT,
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_tournamentId_code_key" ON "Category"("tournamentId", "code");

-- Add categoryId to Player (nullable — populated by data migration below)
ALTER TABLE "Player" ADD COLUMN "categoryId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL;

-- Add categoryId to Match
ALTER TABLE "Match" ADD COLUMN "categoryId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL;

-- Add categoryId to Registration
ALTER TABLE "Registration" ADD COLUMN "categoryId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL;

-- Data migration: create OPEN category for each existing tournament
INSERT INTO "Category" ("id", "tournamentId", "code", "name", "matchFormat", "starPoint", "status", "order", "format", "groupCount", "advanceCount", "createdAt", "updatedAt")
SELECT
  'cat-open-' || t."id",
  t."id",
  'OPEN',
  'Open',
  t."matchFormat",
  0,
  t."status",
  0,
  t."format",
  t."groupCount",
  t."advanceCount",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tournament" t
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" c WHERE c."tournamentId" = t."id" AND c."code" = 'OPEN'
);

-- Associate existing Players with their tournament's OPEN category
UPDATE "Player" SET "categoryId" = (
  SELECT "id" FROM "Category"
  WHERE "tournamentId" = "Player"."tournamentId" AND "code" = 'OPEN'
) WHERE "categoryId" IS NULL;

-- Associate existing Matches with their tournament's OPEN category
UPDATE "Match" SET "categoryId" = (
  SELECT "id" FROM "Category"
  WHERE "tournamentId" = "Match"."tournamentId" AND "code" = 'OPEN'
) WHERE "categoryId" IS NULL;
