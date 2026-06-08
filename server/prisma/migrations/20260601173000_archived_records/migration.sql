-- AlterTable
ALTER TABLE "CargoRequest" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Route" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Waybill" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Preserve legacy archived cargo requests as archived records.
UPDATE "CargoRequest"
SET
  "archivedAt" = COALESCE("archivedAt", CURRENT_TIMESTAMP),
  "status" = 'COMPLETED'
WHERE "status" = 'ARCHIVED';
