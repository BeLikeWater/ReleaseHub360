-- AlterTable
ALTER TABLE "product_versions" ADD COLUMN     "deprecatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "customer_version_transitions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fromVersionId" TEXT,
    "toVersionId" TEXT NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_version_transitions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_version_transitions" ADD CONSTRAINT "customer_version_transitions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_version_transitions" ADD CONSTRAINT "customer_version_transitions_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_version_transitions" ADD CONSTRAINT "customer_version_transitions_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "product_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
