// ═══════════════════════════════════════════════
// Product Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { Product } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/products';

// ── Queries ──
export function useProducts() {
  return useListQuery<Product>(queryKeys.products.all, URL);
}

export function useProduct(id: string) {
  return useDetailQuery<Product>(queryKeys.products.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateProductInput = {
  name: string;
  description?: string;
  isActive?: boolean;

  // Source control
  sourceControlType?: 'AZURE' | 'GITHUB' | null;
  azureOrg?: string | null;
  azureProject?: string | null;
  azureReleaseProject?: string | null;
  azurePat?: string | null;
  githubOwner?: string | null;
  githubToken?: string | null;

  // Artifact & branching
  supportedArtifactTypes?: ('DOCKER' | 'BINARY' | 'GIT_SYNC')[];
  usesReleaseBranches?: boolean;
  concurrentUpdatePolicy?: 'WARN' | 'BLOCK' | null;

  // Visibility
  customerVisibleStatuses?: string[];

  // Deprecated (backward compat)
  repoUrl?: string;
  pmType?: string;

  // Initial version (only for create)
  initialVersion?: string;
};

export type UpdateProductInput = CreateProductInput & { id: string };

export function useCreateProduct() {
  return useCreateMutation<Product, CreateProductInput>(URL, [queryKeys.products.all]);
}

export function useUpdateProduct() {
  return useUpdateMutation<Product, UpdateProductInput>(URL, [queryKeys.products.all]);
}

export function useDeleteProduct() {
  return useDeleteMutation(URL, [queryKeys.products.all]);
}
