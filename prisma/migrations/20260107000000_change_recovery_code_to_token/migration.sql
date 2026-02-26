-- AlterTable
ALTER TABLE "User" DROP COLUMN "recovery_code",
DROP COLUMN "recovery_code_expires_at",
ADD COLUMN     "recovery_token" VARCHAR(500),
ADD COLUMN     "recovery_token_expires_at" TIMESTAMP(3);
