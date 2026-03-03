-- AlterTable
ALTER TABLE "products" ADD COLUMN     "concurrentUpdatePolicy" TEXT,
ADD COLUMN     "customerVisibleStatuses" TEXT[] DEFAULT ARRAY['RELEASED']::TEXT[],
ADD COLUMN     "githubOwner" TEXT,
ADD COLUMN     "githubToken" TEXT,
ADD COLUMN     "sourceControlType" TEXT,
ADD COLUMN     "supportedArtifactTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "usesReleaseBranches" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "binaryArtifacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "clusterName" TEXT,
ADD COLUMN     "containerPlatform" TEXT,
ADD COLUMN     "deploymentTargets" JSONB,
ADD COLUMN     "dockerImageName" TEXT,
ADD COLUMN     "lastProdReleaseDate" TIMESTAMP(3),
ADD COLUMN     "lastProdReleaseName" TEXT,
ADD COLUMN     "namespace" TEXT,
ADD COLUMN     "platformToken" TEXT,
ADD COLUMN     "platformUrl" TEXT,
ADD COLUMN     "prepStageId" TEXT,
ADD COLUMN     "prepStageName" TEXT,
ADD COLUMN     "prodStageId" TEXT,
ADD COLUMN     "prodStageName" TEXT,
ADD COLUMN     "workloadName" TEXT;

-- ────────────────────────────────────────────────
-- Data migration: eski alanları yeni alanlara kopyala
-- ────────────────────────────────────────────────

-- Product: pmType → sourceControlType
UPDATE "products" SET "sourceControlType" = "pmType" WHERE "pmType" IS NOT NULL;

-- Product: deploymentType → supportedArtifactTypes (tek değer → array)
UPDATE "products" SET "supportedArtifactTypes" = ARRAY["deploymentType"]
WHERE "deploymentType" IS NOT NULL AND "deploymentType" != '';

-- Service: serviceImageName → dockerImageName
UPDATE "services" SET "dockerImageName" = "serviceImageName"
WHERE "serviceImageName" IS NOT NULL AND "dockerImageName" IS NULL;

-- Service: releaseStage → prodStageName (varsayılan olarak aynı stage ismi)
UPDATE "services" SET "prodStageName" = "releaseStage"
WHERE "releaseStage" IS NOT NULL AND "prodStageName" IS NULL;

-- Service: lastReleaseName → lastProdReleaseName
UPDATE "services" SET "lastProdReleaseName" = "lastReleaseName"
WHERE "lastReleaseName" IS NOT NULL AND "lastProdReleaseName" IS NULL;

-- Service: currentVersionCreatedAt → lastProdReleaseDate
UPDATE "services" SET "lastProdReleaseDate" = "currentVersionCreatedAt"
WHERE "currentVersionCreatedAt" IS NOT NULL AND "lastProdReleaseDate" IS NULL;
