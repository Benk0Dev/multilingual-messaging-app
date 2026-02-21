-- AlterTable
ALTER TABLE "message_contents" RENAME COLUMN "original_language" TO "original_lang";

-- AlterTable
ALTER TABLE "message_contents" RENAME COLUMN "text_body" TO "text";

-- AlterTable
ALTER TABLE "message_translations" DROP CONSTRAINT "message_translations_pkey";

-- AlterTable
ALTER TABLE "message_translations" RENAME COLUMN "target_language" TO "target_lang";

-- AlterTable
ALTER TABLE "message_translations" RENAME COLUMN "translated_text_body" TO "translated_text";

-- AlterTable
ALTER TABLE "message_translations" ADD CONSTRAINT "message_translations_pkey"
PRIMARY KEY ("content_id", "target_lang");

-- AlterTable
ALTER TABLE "users" RENAME COLUMN "preferred_language" TO "preferred_lang";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Set username values manually
UPDATE "users"
SET "username" = LEFT("id"::text, 6)
WHERE "username" IS NULL;

-- Enforce username constraints
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");
