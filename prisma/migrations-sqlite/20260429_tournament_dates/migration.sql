-- Add tournament date range fields
ALTER TABLE "Tournament" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Tournament" ADD COLUMN "endDate" DATETIME;
