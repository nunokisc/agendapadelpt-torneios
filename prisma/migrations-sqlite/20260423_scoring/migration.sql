-- Migration: replace setsToWin/pointsPerSet with matchFormat
-- Applied: 2026-04-23T20:28:31.307Z

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
