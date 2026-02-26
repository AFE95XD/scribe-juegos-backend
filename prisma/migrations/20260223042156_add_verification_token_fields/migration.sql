-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verification_token" VARCHAR(500),
ADD COLUMN     "verification_token_expires_at" TIMESTAMP(3);
