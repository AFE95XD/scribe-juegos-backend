-- AlterTable
ALTER TABLE "GameLog"
ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
ADD COLUMN "event_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "finished_at" TIMESTAMP(3),
ADD COLUMN "last_event_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "game_log_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_type" VARCHAR(20) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "points_delta" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameEvent_game_log_id_idx" ON "GameEvent"("game_log_id");

-- CreateIndex
CREATE INDEX "GameEvent_user_id_created_at_idx" ON "GameEvent"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "GameEvent_game_log_id_sequence_key" ON "GameEvent"("game_log_id", "sequence");

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_game_log_id_fkey" FOREIGN KEY ("game_log_id") REFERENCES "GameLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
