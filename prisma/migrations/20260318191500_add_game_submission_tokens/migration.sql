-- CreateTable
CREATE TABLE "GameSubmissionToken" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_log_id" TEXT NOT NULL,
    "game_type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSubmissionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSubmissionToken_token_hash_key" ON "GameSubmissionToken"("token_hash");

-- CreateIndex
CREATE INDEX "GameSubmissionToken_user_id_idx" ON "GameSubmissionToken"("user_id");

-- CreateIndex
CREATE INDEX "GameSubmissionToken_game_log_id_idx" ON "GameSubmissionToken"("game_log_id");

-- CreateIndex
CREATE INDEX "GameSubmissionToken_expires_at_idx" ON "GameSubmissionToken"("expires_at");

-- AddForeignKey
ALTER TABLE "GameSubmissionToken" ADD CONSTRAINT "GameSubmissionToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSubmissionToken" ADD CONSTRAINT "GameSubmissionToken_game_log_id_fkey" FOREIGN KEY ("game_log_id") REFERENCES "GameLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

