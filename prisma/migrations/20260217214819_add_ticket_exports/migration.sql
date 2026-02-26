-- CreateTable
CREATE TABLE "TicketExport" (
    "id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "ticket_count" INTEGER NOT NULL DEFAULT 0,
    "file_path" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_created_at_idx" ON "Ticket"("created_at");
