-- AlterTable
ALTER TABLE "accounts" ADD COLUMN "card_identifier" TEXT;
ALTER TABLE "accounts" ADD COLUMN "deleted_at" DATETIME;
ALTER TABLE "accounts" ADD COLUMN "institution_name" TEXT;
ALTER TABLE "accounts" ADD COLUMN "interest_rate" REAL;
ALTER TABLE "accounts" ADD COLUMN "loan_start_date" DATETIME;
ALTER TABLE "accounts" ADD COLUMN "loan_term_months" INTEGER;
ALTER TABLE "accounts" ADD COLUMN "monthly_payment" REAL;
ALTER TABLE "accounts" ADD COLUMN "repayment_day" INTEGER;

-- AlterTable
ALTER TABLE "records" ADD COLUMN "deleted_at" DATETIME;

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NONE',
    "plan" TEXT,
    "apple_product_id" TEXT,
    "apple_transaction_id" TEXT,
    "trial_start_date" DATETIME,
    "trial_end_date" DATETIME,
    "subscription_start_date" DATETIME,
    "subscription_end_date" DATETIME,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
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
    CONSTRAINT "holdings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holding_id" TEXT NOT NULL,
    "ticker_code" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "open" REAL,
    "high" REAL,
    "low" REAL,
    "close" REAL NOT NULL,
    "volume" REAL,
    "source" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "asset_code_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "input_name" TEXT NOT NULL,
    "standard_code" TEXT NOT NULL,
    "standard_name" TEXT,
    "type" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "price_update_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_assets" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "fail_count" INTEGER NOT NULL,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "errors" TEXT
);

-- CreateTable
CREATE TABLE "holding_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holding_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "auto_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "credit_card_id" TEXT,
    "liability_account_id" TEXT,
    "fixed_amount" REAL,
    "day_of_month" INTEGER NOT NULL,
    "execute_time" TEXT NOT NULL DEFAULT '08:00',
    "reminder_days_before" INTEGER NOT NULL DEFAULT 2,
    "insufficient_funds_policy" TEXT NOT NULL DEFAULT 'TRY_NEXT_SOURCE',
    "total_periods" INTEGER,
    "completed_periods" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATETIME,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_executed_at" DATETIME,
    "next_execute_at" DATETIME,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "auto_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auto_payments_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "auto_payments_liability_account_id_fkey" FOREIGN KEY ("liability_account_id") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auto_payment_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auto_payment_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "auto_payment_sources_auto_payment_id_fkey" FOREIGN KEY ("auto_payment_id") REFERENCES "auto_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auto_payment_sources_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auto_payment_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auto_payment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "source_balance" REAL,
    "record_id" TEXT,
    "message" TEXT,
    "executed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auto_payment_logs_auto_payment_id_fkey" FOREIGN KEY ("auto_payment_id") REFERENCES "auto_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auto_incomes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "income_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "target_account_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '工资',
    "day_of_month" INTEGER NOT NULL,
    "execute_time" TEXT NOT NULL DEFAULT '09:00',
    "reminder_days_before" INTEGER NOT NULL DEFAULT 1,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_executed_at" DATETIME,
    "next_execute_at" DATETIME,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "auto_incomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auto_incomes_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auto_income_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auto_income_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "record_id" TEXT,
    "message" TEXT,
    "executed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auto_income_logs_auto_income_id_fkey" FOREIGN KEY ("auto_income_id") REFERENCES "auto_incomes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "country" TEXT,
    "apple_id" TEXT,
    "auth_type" TEXT NOT NULL DEFAULT 'email',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "default_expense_account_id" TEXT,
    "default_expense_account_type" TEXT,
    "default_income_account_id" TEXT,
    "default_income_account_type" TEXT
);
INSERT INTO "new_users" ("avatar", "country", "created_at", "default_expense_account_id", "default_expense_account_type", "email", "id", "name", "password", "updated_at") SELECT "avatar", "country", "created_at", "default_expense_account_id", "default_expense_account_type", "email", "id", "name", "password", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_apple_id_key" ON "users"("apple_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "holdings_account_id_idx" ON "holdings"("account_id");

-- CreateIndex
CREATE INDEX "holdings_user_id_idx" ON "holdings"("user_id");

-- CreateIndex
CREATE INDEX "holdings_ticker_code_idx" ON "holdings"("ticker_code");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_account_id_ticker_code_key" ON "holdings"("account_id", "ticker_code");

-- CreateIndex
CREATE INDEX "price_history_holding_id_idx" ON "price_history"("holding_id");

-- CreateIndex
CREATE INDEX "price_history_ticker_code_date_idx" ON "price_history"("ticker_code", "date");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_holding_id_date_key" ON "price_history"("holding_id", "date");

-- CreateIndex
CREATE INDEX "asset_code_mappings_input_name_idx" ON "asset_code_mappings"("input_name");

-- CreateIndex
CREATE INDEX "asset_code_mappings_standard_code_idx" ON "asset_code_mappings"("standard_code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_code_mappings_input_name_type_market_key" ON "asset_code_mappings"("input_name", "type", "market");

-- CreateIndex
CREATE INDEX "price_update_logs_executed_at_idx" ON "price_update_logs"("executed_at");

-- CreateIndex
CREATE INDEX "holding_transactions_holding_id_idx" ON "holding_transactions"("holding_id");

-- CreateIndex
CREATE INDEX "holding_transactions_account_id_date_idx" ON "holding_transactions"("account_id", "date");

-- CreateIndex
CREATE INDEX "holding_transactions_user_id_date_idx" ON "holding_transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "auto_payments_user_id_idx" ON "auto_payments"("user_id");

-- CreateIndex
CREATE INDEX "auto_payments_next_execute_at_is_enabled_idx" ON "auto_payments"("next_execute_at", "is_enabled");

-- CreateIndex
CREATE INDEX "auto_payment_sources_auto_payment_id_idx" ON "auto_payment_sources"("auto_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "auto_payment_sources_auto_payment_id_account_id_key" ON "auto_payment_sources"("auto_payment_id", "account_id");

-- CreateIndex
CREATE INDEX "auto_payment_logs_auto_payment_id_idx" ON "auto_payment_logs"("auto_payment_id");

-- CreateIndex
CREATE INDEX "auto_incomes_user_id_idx" ON "auto_incomes"("user_id");

-- CreateIndex
CREATE INDEX "auto_incomes_next_execute_at_is_enabled_idx" ON "auto_incomes"("next_execute_at", "is_enabled");

-- CreateIndex
CREATE INDEX "auto_income_logs_auto_income_id_idx" ON "auto_income_logs"("auto_income_id");
