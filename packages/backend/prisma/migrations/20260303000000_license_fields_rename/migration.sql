-- Migration: license_fields_rename
-- Rename subscribed* columns to licensed* and drop subscriptionLevel
-- Add licenseTags array field

ALTER TABLE "customer_product_mappings"
  RENAME COLUMN "subscribedModuleGroupIds" TO "licensedModuleGroupIds";

ALTER TABLE "customer_product_mappings"
  RENAME COLUMN "subscribedModuleIds" TO "licensedModuleIds";

ALTER TABLE "customer_product_mappings"
  RENAME COLUMN "subscribedServiceIds" TO "licensedServiceIds";

ALTER TABLE "customer_product_mappings"
  DROP COLUMN IF EXISTS "subscriptionLevel";

ALTER TABLE "customer_product_mappings"
  ADD COLUMN IF NOT EXISTS "licenseTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
