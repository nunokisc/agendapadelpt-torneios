-- Migration: match scheduling, public directory, player registration

-- Match: court assignment and scheduled time
ALTER TABLE "Match" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "Match" ADD COLUMN "court" TEXT;

-- Tournament: public listing, registration toggle, court count
ALTER TABLE "Tournament" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN "courtCount" INTEGER;

-- Registration: player self-registration requests
CREATE TABLE "Registration" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "player1Name"  TEXT NOT NULL,
  "player2Name"  TEXT NOT NULL,
  "teamName"     TEXT,
  "contact"      TEXT,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Registration_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE
);

CREATE INDEX "Registration_tournamentId_idx" ON "Registration"("tournamentId");
