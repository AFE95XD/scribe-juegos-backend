-- AlterTable
ALTER TABLE "Prize" ADD COLUMN     "unlock_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrizeRedemption" (
    "id" TEXT NOT NULL,
    "prize_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',

    CONSTRAINT "PrizeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrizeRedemption_user_id_idx" ON "PrizeRedemption"("user_id");

-- CreateIndex
CREATE INDEX "PrizeRedemption_prize_id_idx" ON "PrizeRedemption"("prize_id");

-- AddForeignKey
ALTER TABLE "PrizeRedemption" ADD CONSTRAINT "PrizeRedemption_prize_id_fkey" FOREIGN KEY ("prize_id") REFERENCES "Prize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeRedemption" ADD CONSTRAINT "PrizeRedemption_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
