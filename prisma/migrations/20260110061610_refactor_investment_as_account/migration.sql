/*
  Warnings:

  - You are about to drop the column `account_id` on the `holding_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `account_id` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `investments` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `investments` table. All the data in the column will be lost.
  - You are about to drop the column `current_price` on the `investments` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `investments` table. All the data in the column will be lost.
  - Added the required column `investment_id` to the `holding_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `investment_id` to the `holdings` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_holding_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holding_id" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "price" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "fee" REAL,
    "quantity_after" REAL NOT NULL,
    "avg_cost_after" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "raw_text" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "holding_transactions_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "holding_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_holding_transactions" ("amount", "avg_cost_after", "created_at", "date", "fee", "holding_id", "id", "note", "price", "quantity", "quantity_after", "raw_text", "type", "user_id") SELECT "amount", "avg_cost_after", "created_at", "date", "fee", "holding_id", "id", "note", "price", "quantity", "quantity_after", "raw_text", "type", "user_id" FROM "holding_transactions";
DROP TABLE "holding_transactions";
ALTER TABLE "new_holding_transactions" RENAME TO "holding_transactions";
CREATE INDEX "holding_transactions_holding_id_idx" ON "holding_transactions"("holding_id");
CREATE INDEX "holding_transactions_investment_id_date_idx" ON "holding_transactions"("investment_id", "date");
CREATE INDEX "holding_transactions_user_id_date_idx" ON "holding_transactions"("user_id", "date");
CREATE TABLE "new_holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "type" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'US',
    "ticker_code" TEXT,
    "code_verified" BOOLEAN NOT NULL DEFAULT false,
    "code_source" TEXT,
    "quantity" REAL NOT NULL,
    "avg_cost_price" REAL NOT NULL,
    "current_price" REAL,
    "previous_close" REAL,
    "price_change" REAL,
    "price_change_percent" REAL,
    "last_price_at" DATETIME,
    "price_source" TEXT,
    "current_value" REAL,
    "profit_loss" REAL,
    "profit_loss_percent" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "holdings_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_holdings" ("avg_cost_price", "code_source", "code_verified", "created_at", "currency", "current_price", "current_value", "deleted_at", "display_name", "id", "last_price_at", "market", "name", "previous_close", "price_change", "price_change_percent", "price_source", "profit_loss", "profit_loss_percent", "quantity", "ticker_code", "type", "updated_at", "user_id") SELECT "avg_cost_price", "code_source", "code_verified", "created_at", "currency", "current_price", "current_value", "deleted_at", "display_name", "id", "last_price_at", "market", "name", "previous_close", "price_change", "price_change_percent", "price_source", "profit_loss", "profit_loss_percent", "quantity", "ticker_code", "type", "updated_at", "user_id" FROM "holdings";
DROP TABLE "holdings";
ALTER TABLE "new_holdings" RENAME TO "holdings";
CREATE INDEX "holdings_investment_id_idx" ON "holdings"("investment_id");
CREATE INDEX "holdings_user_id_idx" ON "holdings"("user_id");
CREATE INDEX "holdings_ticker_code_idx" ON "holdings"("ticker_code");
CREATE UNIQUE INDEX "holdings_investment_id_ticker_code_key" ON "holdings"("investment_id", "ticker_code");
CREATE TABLE "new_investments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "institution_name" TEXT,
    "account_number" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balance" REAL NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_investments" ("created_at", "id", "name", "type", "updated_at", "user_id") SELECT "created_at", "id", "name", "type", "updated_at", "user_id" FROM "investments";
DROP TABLE "investments";
ALTER TABLE "new_investments" RENAME TO "investments";
CREATE INDEX "investments_user_id_idx" ON "investments"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
