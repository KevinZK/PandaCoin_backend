-- AlterTable
ALTER TABLE "users" ADD COLUMN "country" TEXT;

-- CreateTable
CREATE TABLE "ai_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "user_region" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ai_audit_logs_user_id_idx" ON "ai_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_audit_logs_provider_created_at_idx" ON "ai_audit_logs"("provider", "created_at");
