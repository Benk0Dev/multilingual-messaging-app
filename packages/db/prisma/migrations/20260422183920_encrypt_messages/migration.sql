/*
  Warnings:

  - You are about to drop the column `text` on the `message_contents` table. All the data in the column will be lost.
  - You are about to drop the column `translated_text` on the `message_translations` table. All the data in the column will be lost.
  - Added the required column `text_cipher` to the `message_contents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text_nonce` to the `message_contents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `translated_text_cipher` to the `message_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `translated_text_nonce` to the `message_translations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "message_contents" DROP COLUMN "text",
ADD COLUMN     "enc_scheme" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "text_cipher" BYTEA NOT NULL,
ADD COLUMN     "text_nonce" BYTEA NOT NULL;

-- AlterTable
ALTER TABLE "message_translations" DROP COLUMN "translated_text",
ADD COLUMN     "translated_text_cipher" BYTEA NOT NULL,
ADD COLUMN     "translated_text_nonce" BYTEA NOT NULL;
