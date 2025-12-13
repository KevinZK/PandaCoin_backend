-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "card_identifier" TEXT NOT NULL,
    "credit_limit" REAL NOT NULL DEFAULT 0,
    "current_balance" REAL NOT NULL DEFAULT 0,
    "repayment_due_date" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_card_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credit_card_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_id" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "credit_card_transactions_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "credit_card_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "raw_text" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" TEXT,
    "user_id" TEXT NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "confidence" REAL,
    "ai_raw_response" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "target_account_id" TEXT,
    "investment_id" TEXT,
    "quantity" REAL,
    "unit_price" REAL,
    "credit_card_id" TEXT,
    "card_identifier" TEXT,
    CONSTRAINT "records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "records_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "records_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_records" ("account_id", "ai_raw_response", "amount", "category", "confidence", "created_at", "date", "description", "id", "is_confirmed", "raw_text", "type", "updated_at", "user_id") SELECT "account_id", "ai_raw_response", "amount", "category", "confidence", "created_at", "date", "description", "id", "is_confirmed", "raw_text", "type", "updated_at", "user_id" FROM "records";
DROP TABLE "records";
ALTER TABLE "new_records" RENAME TO "records";
CREATE INDEX "records_user_id_date_idx" ON "records"("user_id", "date");
CREATE INDEX "records_account_id_idx" ON "records"("account_id");
CREATE INDEX "records_target_account_id_idx" ON "records"("target_account_id");
CREATE INDEX "records_credit_card_id_idx" ON "records"("credit_card_id");
CREATE INDEX "records_category_idx" ON "records"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_user_id_card_identifier_key" ON "credit_cards"("user_id", "card_identifier");

-- CreateIndex
CREATE INDEX "credit_card_transactions_credit_card_id_idx" ON "credit_card_transactions"("credit_card_id");

-- CreateIndex
CREATE INDEX "credit_card_transactions_user_id_idx" ON "credit_card_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_card_transactions_date_idx" ON "credit_card_transactions"("date");
