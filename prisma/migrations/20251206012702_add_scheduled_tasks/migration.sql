-- CreateTable
CREATE TABLE "scheduled_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "month_of_year" INTEGER,
    "execute_time" TEXT NOT NULL DEFAULT '09:00',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" DATETIME,
    "next_run_at" DATETIME,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scheduled_task_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "record_id" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "executed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "scheduled_tasks_user_id_idx" ON "scheduled_tasks"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_tasks_next_run_at_is_enabled_idx" ON "scheduled_tasks"("next_run_at", "is_enabled");

-- CreateIndex
CREATE INDEX "scheduled_task_logs_task_id_idx" ON "scheduled_task_logs"("task_id");
