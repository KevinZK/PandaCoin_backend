-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "category" TEXT,
    "name" TEXT,
    "amount" REAL NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_budgets" ("amount", "category", "created_at", "id", "month", "updated_at", "user_id") SELECT "amount", "category", "created_at", "id", "month", "updated_at", "user_id" FROM "budgets";
DROP TABLE "budgets";
ALTER TABLE "new_budgets" RENAME TO "budgets";
CREATE INDEX "budgets_user_id_month_idx" ON "budgets"("user_id", "month");
CREATE INDEX "budgets_user_id_is_recurring_idx" ON "budgets"("user_id", "is_recurring");
CREATE UNIQUE INDEX "budgets_user_id_month_category_key" ON "budgets"("user_id", "month", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
