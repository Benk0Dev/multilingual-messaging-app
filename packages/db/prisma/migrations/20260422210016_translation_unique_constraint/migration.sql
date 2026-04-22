/*
  Warnings:

  - A unique constraint covering the columns `[content_id,target_lang]` on the table `message_translations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "message_translations_content_id_target_lang_key" ON "message_translations"("content_id", "target_lang");
