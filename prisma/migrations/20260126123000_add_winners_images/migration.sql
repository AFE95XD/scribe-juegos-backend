-- CreateTable
CREATE TABLE "winners_images" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "winners_images_pkey" PRIMARY KEY ("id")
);
