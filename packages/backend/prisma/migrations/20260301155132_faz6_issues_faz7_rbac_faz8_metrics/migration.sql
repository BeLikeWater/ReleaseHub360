-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER', 'QA', 'VIEWER');

-- CreateEnum
CREATE TYPE "CustomerRole" AS ENUM ('CONTACT', 'VIEWER', 'ADMIN');

-- CreateTable
CREATE TABLE "transition_issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "module" TEXT,
    "steps" TEXT,
    "reportedById" TEXT,
    "reportedByName" TEXT,
    "assignedTo" TEXT,
    "customerId" TEXT,
    "productVersionId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transition_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_comments" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_attachments" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_product_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_product_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_users" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CustomerRole" NOT NULL DEFAULT 'VIEWER',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "productId" TEXT,
    "deployFreq" DOUBLE PRECISION,
    "leadTimeDays" DOUBLE PRECISION,
    "changeFailRate" DOUBLE PRECISION,
    "mttrHours" DOUBLE PRECISION,
    "releasesTotal" INTEGER,
    "bugsReported" INTEGER,
    "bugsResolved" INTEGER,
    "p0Count" INTEGER,
    "customersOnLatest" INTEGER,
    "customersTotal" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transition_issues_status_idx" ON "transition_issues"("status");

-- CreateIndex
CREATE INDEX "transition_issues_customerId_idx" ON "transition_issues"("customerId");

-- CreateIndex
CREATE INDEX "transition_issues_productVersionId_idx" ON "transition_issues"("productVersionId");

-- CreateIndex
CREATE INDEX "issue_comments_issueId_idx" ON "issue_comments"("issueId");

-- CreateIndex
CREATE INDEX "issue_attachments_issueId_idx" ON "issue_attachments"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "user_product_access_userId_productId_key" ON "user_product_access"("userId", "productId");

-- CreateIndex
CREATE INDEX "customer_users_email_idx" ON "customer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_customerId_email_key" ON "customer_users"("customerId", "email");

-- CreateIndex
CREATE INDEX "metric_snapshots_period_productId_idx" ON "metric_snapshots"("period", "productId");

-- AddForeignKey
ALTER TABLE "transition_issues" ADD CONSTRAINT "transition_issues_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_issues" ADD CONSTRAINT "transition_issues_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "transition_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "transition_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_access" ADD CONSTRAINT "user_product_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_access" ADD CONSTRAINT "user_product_access_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_users" ADD CONSTRAINT "customer_users_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
