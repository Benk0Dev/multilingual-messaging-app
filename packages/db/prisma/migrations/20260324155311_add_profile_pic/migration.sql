-- AlterTable
ALTER TABLE "users" ADD COLUMN     "picture_url" TEXT;

-- CreateIndex
CREATE INDEX "users_display_name_idx" ON "users"("display_name");
