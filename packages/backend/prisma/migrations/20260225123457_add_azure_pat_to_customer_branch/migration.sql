/*
  Warnings:

  - You are about to drop the column `repoPath` on the `customer_branches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customer_branches" DROP COLUMN "repoPath",
ADD COLUMN     "azurePat" TEXT,
ADD COLUMN     "baseBranch" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "repoName" TEXT,
ADD COLUMN     "repoUrl" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "approverEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "azureReleaseTemplate" TEXT,
ADD COLUMN     "devOpsEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "emailDomain" TEXT,
ADD COLUMN     "environments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "supportSuffix" TEXT,
ADD COLUMN     "tenantName" TEXT;

-- AlterTable
ALTER TABLE "product_versions" ADD COLUMN     "isHotfix" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "masterStartDate" TIMESTAMP(3),
ADD COLUMN     "preProdDate" TIMESTAMP(3),
ADD COLUMN     "testDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "azureOrg" TEXT,
ADD COLUMN     "azurePat" TEXT,
ADD COLUMN     "azureProject" TEXT,
ADD COLUMN     "azureReleaseProject" TEXT,
ADD COLUMN     "deploymentType" TEXT,
ADD COLUMN     "pmType" TEXT,
ADD COLUMN     "serviceImageName" TEXT;

-- AlterTable
ALTER TABLE "release_notes" ADD COLUMN     "workitemId" TEXT;

-- AlterTable
ALTER TABLE "release_todos" ADD COLUMN     "timing" TEXT NOT NULL DEFAULT 'PRE';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "currentVersion" TEXT,
ADD COLUMN     "currentVersionCreatedAt" TIMESTAMP(3),
ADD COLUMN     "lastReleaseName" TEXT,
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "pipelineName" TEXT,
ADD COLUMN     "releaseName" TEXT,
ADD COLUMN     "releaseStage" TEXT,
ADD COLUMN     "repoName" TEXT,
ADD COLUMN     "serviceImageName" TEXT;

-- AlterTable
ALTER TABLE "sync_history" ADD COLUMN     "mergeCommitId" TEXT,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "syncBranchName" TEXT;

-- AlterTable
ALTER TABLE "system_changes" ALTER COLUMN "productVersionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "service_release_snapshots" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "productVersionId" TEXT NOT NULL,
    "releaseName" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "prIds" JSONB NOT NULL,
    "publishedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_release_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_release_snapshots_serviceId_releasedAt_idx" ON "service_release_snapshots"("serviceId", "releasedAt" DESC);

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_release_snapshots" ADD CONSTRAINT "service_release_snapshots_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_release_snapshots" ADD CONSTRAINT "service_release_snapshots_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
