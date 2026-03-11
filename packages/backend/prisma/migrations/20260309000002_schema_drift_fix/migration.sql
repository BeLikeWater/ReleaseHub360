-- ============================================================
-- Schema Drift Fix Migration
-- Prisma schema ile migration dosyaları arasındaki tüm farklar
-- kapatıldı. Bu migration'dan sonra schema == migrations.
-- ============================================================

-- ── CustomerRole enum güncelleme ─────────────────────────────
BEGIN;
CREATE TYPE "CustomerRole_new" AS ENUM ('CUSTOMER_ADMIN', 'APP_ADMIN', 'APPROVER', 'BUSINESS_USER', 'PARTNER');
ALTER TABLE "customer_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "customer_users" ALTER COLUMN "role" TYPE "CustomerRole_new" USING ("role"::text::"CustomerRole_new");
ALTER TYPE "CustomerRole" RENAME TO "CustomerRole_old";
ALTER TYPE "CustomerRole_new" RENAME TO "CustomerRole";
DROP TYPE "CustomerRole_old";
ALTER TABLE "customer_users" ALTER COLUMN "role" SET DEFAULT 'BUSINESS_USER';
COMMIT;

-- ── OrgRole enum güncelleme ──────────────────────────────────
BEGIN;
CREATE TYPE "OrgRole_new" AS ENUM ('ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVELOPER', 'DEVOPS_ENGINEER', 'QA_ENGINEER', 'VIEWER');
ALTER TYPE "OrgRole" RENAME TO "OrgRole_old";
ALTER TYPE "OrgRole_new" RENAME TO "OrgRole";
DROP TYPE "OrgRole_old";
COMMIT;

-- ── customer_product_mappings FK ve index kaldır ─────────────
ALTER TABLE "customer_product_mappings" DROP CONSTRAINT IF EXISTS "customer_product_mappings_productId_fkey";
ALTER TABLE "customer_product_mappings" DROP CONSTRAINT IF EXISTS "customer_product_mappings_productVersionId_fkey";
DROP INDEX IF EXISTS "customer_product_mappings_customerId_productVersionId_key";

-- ── customer_branches yeni kolonlar ─────────────────────────
ALTER TABLE "customer_branches" ADD COLUMN IF NOT EXISTS "azureOrg" TEXT;
ALTER TABLE "customer_branches" ADD COLUMN IF NOT EXISTS "azureProject" TEXT;

-- ── customer_product_mappings değişiklikler ──────────────────
ALTER TABLE "customer_product_mappings"
  ADD COLUMN IF NOT EXISTS "binaryDistributionMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "ftpHost" TEXT,
  ADD COLUMN IF NOT EXISTS "ftpPassword" TEXT,
  ADD COLUMN IF NOT EXISTS "ftpPort" INTEGER,
  ADD COLUMN IF NOT EXISTS "ftpUser" TEXT;
ALTER TABLE "customer_product_mappings" ALTER COLUMN "productVersionId" DROP NOT NULL;
ALTER TABLE "customer_product_mappings" ALTER COLUMN "productId" SET NOT NULL;

-- ── customer_users role default ──────────────────────────────
ALTER TABLE "customer_users" ALTER COLUMN "role" SET DEFAULT 'BUSINESS_USER';

-- ── customer_version_transitions yeni kolonlar ───────────────
ALTER TABLE "customer_version_transitions"
  ADD COLUMN IF NOT EXISTS "actualDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'PROD',
  ADD COLUMN IF NOT EXISTS "plannedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PLANNED';

-- ── issue_comments yeni kolon ────────────────────────────────
ALTER TABLE "issue_comments" ADD COLUMN IF NOT EXISTS "authorSide" TEXT NOT NULL DEFAULT 'ORG';

-- ── metric_snapshots yeniden yapılandırma ────────────────────
ALTER TABLE "metric_snapshots"
  DROP COLUMN IF EXISTS "bugsReported",
  DROP COLUMN IF EXISTS "bugsResolved",
  DROP COLUMN IF EXISTS "changeFailRate",
  DROP COLUMN IF EXISTS "customersOnLatest",
  DROP COLUMN IF EXISTS "customersTotal",
  DROP COLUMN IF EXISTS "deployFreq",
  DROP COLUMN IF EXISTS "leadTimeDays",
  DROP COLUMN IF EXISTS "mttrHours",
  DROP COLUMN IF EXISTS "p0Count",
  DROP COLUMN IF EXISTS "releasesTotal";
ALTER TABLE "metric_snapshots"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "metricType" TEXT,
  ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION;
-- Mevcut satırlar yoksa NOT NULL direkt set edilir
UPDATE "metric_snapshots" SET "metricType" = 'UNKNOWN', "value" = 0 WHERE "metricType" IS NULL OR "value" IS NULL;
ALTER TABLE "metric_snapshots" ALTER COLUMN "metricType" SET NOT NULL;
ALTER TABLE "metric_snapshots" ALTER COLUMN "value" SET NOT NULL;

-- ── products yeni kolonlar ───────────────────────────────────
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "staleThresholdCritical" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "staleThresholdWarning" INTEGER NOT NULL DEFAULT 3;

-- ── release_notes yeni kolonlar ──────────────────────────────
ALTER TABLE "release_notes"
  ADD COLUMN IF NOT EXISTS "isNotRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- ── release_todos yeni kolonlar ──────────────────────────────
ALTER TABLE "release_todos"
  ADD COLUMN IF NOT EXISTS "customerScope" TEXT,
  ADD COLUMN IF NOT EXISTS "guideUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "responsibleTeam" TEXT;

-- ── transition_issues yeni kolonlar ─────────────────────────
ALTER TABLE "transition_issues"
  ADD COLUMN IF NOT EXISTS "reportMode" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "severity" TEXT;

-- ── user_product_access canWrite kolonu kaldır ───────────────
ALTER TABLE "user_product_access" DROP COLUMN IF EXISTS "canWrite";

-- ── Yeni tablo: customer_todo_completions ────────────────────
CREATE TABLE IF NOT EXISTS "customer_todo_completions" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_todo_completions_pkey" PRIMARY KEY ("id")
);

-- ── Yeni tablo: customer_service_versions ───────────────────
CREATE TABLE IF NOT EXISTS "customer_service_versions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "currentRelease" TEXT NOT NULL,
    "currentVersionId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "previousRelease" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_service_versions_pkey" PRIMARY KEY ("id")
);

-- ── Yeni tablo: customer_service_version_histories ──────────
CREATE TABLE IF NOT EXISTS "customer_service_version_histories" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fromRelease" TEXT NOT NULL,
    "toRelease" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_service_version_histories_pkey" PRIMARY KEY ("id")
);

-- ── Index'ler ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "customer_todo_completions_customerId_versionId_idx"
  ON "customer_todo_completions"("customerId", "versionId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_todo_completions_todoId_customerId_versionId_key"
  ON "customer_todo_completions"("todoId", "customerId", "versionId");
CREATE INDEX IF NOT EXISTS "customer_service_versions_customerId_idx"
  ON "customer_service_versions"("customerId");
CREATE INDEX IF NOT EXISTS "customer_service_versions_serviceId_idx"
  ON "customer_service_versions"("serviceId");
CREATE INDEX IF NOT EXISTS "customer_service_versions_productId_idx"
  ON "customer_service_versions"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_service_versions_customerId_serviceId_key"
  ON "customer_service_versions"("customerId", "serviceId");
CREATE INDEX IF NOT EXISTS "customer_service_version_histories_customerId_serviceId_idx"
  ON "customer_service_version_histories"("customerId", "serviceId");
CREATE INDEX IF NOT EXISTS "customer_service_version_histories_customerId_serviceId_tra_idx"
  ON "customer_service_version_histories"("customerId", "serviceId", "transitionDate" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_product_mappings_customerId_productId_key"
  ON "customer_product_mappings"("customerId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_version_transitions_customerId_toVersionId_environ_key"
  ON "customer_version_transitions"("customerId", "toVersionId", "environment");
CREATE INDEX IF NOT EXISTS "metric_snapshots_metricType_idx"
  ON "metric_snapshots"("metricType");

-- ── Foreign Key'ler ──────────────────────────────────────────
ALTER TABLE "customer_product_mappings"
  ADD CONSTRAINT "customer_product_mappings_productVersionId_fkey"
  FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_product_mappings"
  ADD CONSTRAINT "customer_product_mappings_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_todo_completions"
  ADD CONSTRAINT "customer_todo_completions_todoId_fkey"
  FOREIGN KEY ("todoId") REFERENCES "release_todos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_todo_completions"
  ADD CONSTRAINT "customer_todo_completions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_todo_completions"
  ADD CONSTRAINT "customer_todo_completions_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "product_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_service_versions"
  ADD CONSTRAINT "customer_service_versions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_service_versions"
  ADD CONSTRAINT "customer_service_versions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_service_versions"
  ADD CONSTRAINT "customer_service_versions_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_service_versions"
  ADD CONSTRAINT "customer_service_versions_currentVersionId_fkey"
  FOREIGN KEY ("currentVersionId") REFERENCES "product_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_service_version_histories"
  ADD CONSTRAINT "customer_service_version_histories_customerId_serviceId_fkey"
  FOREIGN KEY ("customerId", "serviceId")
  REFERENCES "customer_service_versions"("customerId", "serviceId")
  ON DELETE CASCADE ON UPDATE CASCADE;
