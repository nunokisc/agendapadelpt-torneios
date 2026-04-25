-- Migration: player check-in field
ALTER TABLE "Player" ADD COLUMN "checkedIn" BOOLEAN NOT NULL DEFAULT 1;
