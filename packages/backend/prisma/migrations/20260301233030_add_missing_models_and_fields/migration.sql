/*
  Warnings:

  - Made the column `tenantName` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customer_product_mappings" ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "productId" TEXT;

-- Backfill: NULL tenantName değerlerini boş string'e çevir (NOT NULL migration için)
UPDATE "customers" SET "tenantName" = '' WHERE "tenantName" IS NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "githubTargetMilestone" TEXT,
ADD COLUMN     "githubTargetProjectId" TEXT,
ALTER COLUMN "tenantName" SET NOT NULL,
ALTER COLUMN "tenantName" SET DEFAULT '';

-- AlterTable
ALTER TABLE "product_versions" ADD COLUMN     "actualReleaseDate" TIMESTAMP(3),
ADD COLUMN     "commitCount" INTEGER,
ADD COLUMN     "gitSyncRef" TEXT,
ADD COLUMN     "gitSyncRefType" TEXT,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "rollbackPlan" TEXT;

-- AlterTable
ALTER TABLE "urgent_changes" ADD COLUMN     "affectedCustomers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "releaseId" TEXT;

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_mappings" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "targetTicketId" TEXT,
    "targetPlatform" TEXT NOT NULL,
    "productVersionId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_templates" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_check_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "productVersionId" TEXT NOT NULL,
    "templateId" TEXT,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "commitCount" INTEGER,
    "commitAnalysis" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_items" (
    "id" TEXT NOT NULL,
    "healthCheckId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependency_health" (
    "id" TEXT NOT NULL,
    "healthCheckId" TEXT NOT NULL,
    "dependencyName" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "currentVersion" TEXT,
    "requiredVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependency_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" TEXT NOT NULL,
    "productVersionId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approverRole" TEXT,
    "approvalType" TEXT NOT NULL,
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_gating_rules" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blockLevel" TEXT NOT NULL DEFAULT 'WARN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_gating_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_versions" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "productVersionId" TEXT NOT NULL,
    "prodVersion" TEXT,
    "prepVersion" TEXT,
    "currentReleaseId" TEXT,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "staleThresholdDays" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_configs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "tenantId" TEXT,
    "domain" TEXT,
    "redirectUri" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "secret" TEXT,
    "backupCodes" JSONB,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environments_productId_name_key" ON "environments"("productId", "name");

-- CreateIndex
CREATE INDEX "ticket_mappings_customerId_idx" ON "ticket_mappings"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_mappings_customerId_sourceTicketId_sourcePlatform_key" ON "ticket_mappings"("customerId", "sourceTicketId", "sourcePlatform");

-- CreateIndex
CREATE INDEX "health_checks_productVersionId_idx" ON "health_checks"("productVersionId");

-- CreateIndex
CREATE INDEX "health_check_items_healthCheckId_idx" ON "health_check_items"("healthCheckId");

-- CreateIndex
CREATE INDEX "dependency_health_healthCheckId_idx" ON "dependency_health"("healthCheckId");

-- CreateIndex
CREATE INDEX "approval_logs_productVersionId_idx" ON "approval_logs"("productVersionId");

-- CreateIndex
CREATE INDEX "service_versions_serviceId_idx" ON "service_versions"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_versions_serviceId_productVersionId_key" ON "service_versions"("serviceId", "productVersionId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_configs_userId_key" ON "two_factor_configs"("userId");

-- AddForeignKey
ALTER TABLE "customer_product_mappings" ADD CONSTRAINT "customer_product_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_mappings" ADD CONSTRAINT "customer_product_mappings_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urgent_changes" ADD CONSTRAINT "urgent_changes_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check_items" ADD CONSTRAINT "health_check_items_healthCheckId_fkey" FOREIGN KEY ("healthCheckId") REFERENCES "health_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependency_health" ADD CONSTRAINT "dependency_health_healthCheckId_fkey" FOREIGN KEY ("healthCheckId") REFERENCES "health_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
