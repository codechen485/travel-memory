-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('ongoing', 'archived');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" VARCHAR(500),
    "nickname" VARCHAR(50),
    "bio" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "cover_image" VARCHAR(500),
    "destinations" JSONB NOT NULL DEFAULT '[]',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "JourneyStatus" NOT NULL DEFAULT 'ongoing',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diaries" (
    "id" SERIAL NOT NULL,
    "journey_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "mood" VARCHAR(20),
    "location_name" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "journey_id" INTEGER NOT NULL,
    "diary_id" INTEGER,
    "original_url" VARCHAR(500) NOT NULL,
    "thumbnail_url" VARCHAR(500) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" INTEGER,
    "exif_taken_at" TIMESTAMP(3),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "ai_scene_tags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copywritings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "photo_id" INTEGER,
    "journey_id" INTEGER NOT NULL,
    "scene_tag" VARCHAR(50) NOT NULL,
    "mood" VARCHAR(20),
    "short_version" TEXT NOT NULL,
    "narrative_version" TEXT NOT NULL,
    "poetic_version" TEXT NOT NULL,
    "final_version" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copywritings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "copywriting_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "journeys_user_id_idx" ON "journeys"("user_id");

-- CreateIndex
CREATE INDEX "journeys_status_idx" ON "journeys"("status");

-- CreateIndex
CREATE INDEX "journeys_start_date_idx" ON "journeys"("start_date");

-- CreateIndex
CREATE INDEX "diaries_journey_id_idx" ON "diaries"("journey_id");

-- CreateIndex
CREATE INDEX "diaries_date_idx" ON "diaries"("date");

-- CreateIndex
CREATE INDEX "diaries_mood_idx" ON "diaries"("mood");

-- CreateIndex
CREATE INDEX "photos_journey_id_idx" ON "photos"("journey_id");

-- CreateIndex
CREATE INDEX "photos_diary_id_idx" ON "photos"("diary_id");

-- CreateIndex
CREATE INDEX "copywritings_user_id_idx" ON "copywritings"("user_id");

-- CreateIndex
CREATE INDEX "copywritings_photo_id_idx" ON "copywritings"("photo_id");

-- CreateIndex
CREATE INDEX "copywritings_journey_id_idx" ON "copywritings"("journey_id");

-- CreateIndex
CREATE INDEX "copywritings_scene_tag_idx" ON "copywritings"("scene_tag");

-- CreateIndex
CREATE INDEX "copywritings_mood_idx" ON "copywritings"("mood");

-- CreateIndex
CREATE INDEX "copywritings_is_public_idx" ON "copywritings"("is_public");

-- CreateIndex
CREATE INDEX "collects_user_id_idx" ON "collects"("user_id");

-- CreateIndex
CREATE INDEX "collects_copywriting_id_idx" ON "collects"("copywriting_id");

-- CreateIndex
CREATE UNIQUE INDEX "collects_user_id_copywriting_id_key" ON "collects"("user_id", "copywriting_id");

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "diaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copywritings" ADD CONSTRAINT "copywritings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copywritings" ADD CONSTRAINT "copywritings_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copywritings" ADD CONSTRAINT "copywritings_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collects" ADD CONSTRAINT "collects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collects" ADD CONSTRAINT "collects_copywriting_id_fkey" FOREIGN KEY ("copywriting_id") REFERENCES "copywritings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
