-- Migration: add player1Name and player2Name for doubles (pairs) support
ALTER TABLE "Player" ADD COLUMN "player1Name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Player" ADD COLUMN "player2Name" TEXT NOT NULL DEFAULT '';
