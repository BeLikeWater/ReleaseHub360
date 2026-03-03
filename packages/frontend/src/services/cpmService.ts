// ═══════════════════════════════════════════════
// Customer Product Mapping (CPM) Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { CustomerProductMapping, SubscriptionLevel, CpmArtifactType, CpmDeploymentModel, CpmHostingType } from '@/types';
import {
  useListQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/customer-product-mappings';

// ── Queries ──
export function useCpmList(customerId?: string, productVersionId?: string) {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  if (productVersionId) params.set('productVersionId', productVersionId);
  const qs = params.toString();
  const url = qs ? `${URL}?${qs}` : URL;

  const key = customerId
    ? queryKeys.cpm.byCustomer(customerId)
    : queryKeys.cpm.all;

  return useListQuery<CustomerProductMapping>(key, url);
}

// ── Mutations ──
export type CreateCpmInput = {
  customerId: string;
  productVersionId: string;
  branch?: string;
  environment?: string;
  notes?: string;
  subscriptionLevel?: SubscriptionLevel;
  subscribedModuleGroupIds?: string[];
  subscribedModuleIds?: string[];
  subscribedServiceIds?: string[];
  artifactType?: CpmArtifactType;
  deploymentModel?: CpmDeploymentModel;
  hostingType?: CpmHostingType;
  helmChartTemplateName?: string;
  helmValuesOverrides?: Record<string, unknown>;
  helmRepoUrl?: string;
  environments?: string[];
};

export type UpdateCpmInput = Partial<CreateCpmInput> & { id: string };

export function useCreateCpm() {
  return useCreateMutation<CustomerProductMapping, CreateCpmInput>(URL, [
    queryKeys.cpm.all,
    queryKeys.customers.all,
  ]);
}

export function useUpdateCpm() {
  return useUpdateMutation<CustomerProductMapping, UpdateCpmInput>(URL, [
    queryKeys.cpm.all,
    queryKeys.customers.all,
  ]);
}

export function useDeleteCpm() {
  return useDeleteMutation(URL, [queryKeys.cpm.all, queryKeys.customers.all]);
}
