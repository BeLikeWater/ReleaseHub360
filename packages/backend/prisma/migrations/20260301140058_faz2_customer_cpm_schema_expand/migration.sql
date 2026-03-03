-- AlterTable
ALTER TABLE "customer_product_mappings" ADD COLUMN     "artifactType" TEXT,
ADD COLUMN     "deploymentModel" TEXT,
ADD COLUMN     "environments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "helmChartTemplateName" TEXT,
ADD COLUMN     "helmRepoUrl" TEXT,
ADD COLUMN     "helmValuesOverrides" JSONB,
ADD COLUMN     "hostingType" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSyncDate" TIMESTAMP(3),
ADD COLUMN     "lastSyncRef" TEXT,
ADD COLUMN     "subscribedModuleGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subscribedModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subscribedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subscriptionLevel" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "azureTargetAreaPath" TEXT,
ADD COLUMN     "azureTargetIterationPath" TEXT,
ADD COLUMN     "azureTargetTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "azureTargetWorkItemType" TEXT,
ADD COLUMN     "emailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "githubTargetLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "githubTargetRepo" TEXT,
ADD COLUMN     "ticketApiToken" TEXT,
ADD COLUMN     "ticketBaseUrl" TEXT,
ADD COLUMN     "ticketPlatform" TEXT,
ADD COLUMN     "ticketProjectKey" TEXT;
