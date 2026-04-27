-- Add auto-schedule fields to Tournament
ALTER TABLE "Tournament" ADD COLUMN "slotMinutes" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "scheduleDays" TEXT;
-- Add match start tracking
ALTER TABLE "Match" ADD COLUMN "startedAt" DATETIME;
