-- CreateTable
CREATE TABLE "version_packages" (
    "id" TEXT NOT NULL,
    "productVersionId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "artifactUrl" TEXT,
    "helmRepoUrl" TEXT,
    "helmChartName" TEXT,
    "imageRegistry" TEXT,
    "imageName" TEXT,
    "imageTag" TEXT,
    "sizeBytes" BIGINT,
    "checksum" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "version_packages_productVersionId_idx" ON "version_packages"("productVersionId");

-- AddForeignKey
ALTER TABLE "version_packages" ADD CONSTRAINT "version_packages_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "product_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
