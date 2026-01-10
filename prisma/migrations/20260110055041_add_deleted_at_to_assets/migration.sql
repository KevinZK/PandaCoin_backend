-- AlterTable
ALTER TABLE "credit_cards" ADD COLUMN "deleted_at" DATETIME;

-- AlterTable
ALTER TABLE "holdings" ADD COLUMN "deleted_at" DATETIME;
