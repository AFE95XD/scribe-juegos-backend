-- AlterTable
ALTER TABLE "Prize" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3);

-- Migrate existing data: copy unlockDate to startDate
UPDATE "Prize" SET "start_date" = "unlock_date" WHERE "unlock_date" IS NOT NULL;
