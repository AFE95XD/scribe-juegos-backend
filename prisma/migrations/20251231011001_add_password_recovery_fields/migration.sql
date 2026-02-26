-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recovery_code" VARCHAR(6),
ADD COLUMN     "recovery_code_expires_at" TIMESTAMP(3);
