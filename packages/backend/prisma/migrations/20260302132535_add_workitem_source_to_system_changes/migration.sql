-- AlterTable
ALTER TABLE "system_changes" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "workitemId" TEXT;
