-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Mail_mailboxId_deletedAt_idx" ON "Mail"("mailboxId", "deletedAt");
