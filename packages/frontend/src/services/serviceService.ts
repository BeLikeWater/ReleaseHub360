// ═══════════════════════════════════════════════
// Service (Backend Entity) Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { Service } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/services';

// ── Queries ──
export function useServices(productId?: string) {
  const url = productId ? `${URL}?productId=${productId}` : URL;
  const key = productId ? queryKeys.services.byProduct(productId) : queryKeys.services.all;
  return useListQuery<Service>(key, url);
}

export function useService(id: string) {
  return useDetailQuery<Service>(queryKeys.services.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateServiceInput = {
  name: string;
  productId: string;
  description?: string;
  moduleId?: string | null;
  repoName?: string;
  pipelineName?: string;
  releaseName?: string;
  releaseProject?: string | null;
  port?: number | null;
  isActive?: boolean;

  // Stage config (ikili stage)
  prodStageName?: string | null;
  prepStageName?: string | null;
  prodStageId?: string | null;
  prepStageId?: string | null;

  // Release tracking
  lastProdReleaseName?: string | null;
  lastProdReleaseDate?: string | null;

  // Docker
  dockerImageName?: string | null;
  containerPlatform?: 'RANCHER' | 'OPENSHIFT' | 'KUBERNETES' | 'DOCKER_COMPOSE' | null;
  platformUrl?: string | null;
  platformToken?: string | null;
  clusterName?: string | null;
  namespace?: string | null;
  workloadName?: string | null;

  // Binary
  binaryArtifacts?: string[];
  deploymentTargets?: unknown;

  // Deprecated (backward compat)
  repoUrl?: string;
  serviceImageName?: string;
  currentVersion?: string;
  currentVersionCreatedAt?: string;
  releaseStage?: string;
  lastReleaseName?: string;
};

export type UpdateServiceInput = Partial<CreateServiceInput> & { id: string };

export function useCreateService() {
  return useCreateMutation<Service, CreateServiceInput>(URL, [queryKeys.services.all]);
}

export function useUpdateService() {
  return useUpdateMutation<Service, UpdateServiceInput>(URL, [queryKeys.services.all]);
}

export function useDeleteService() {
  return useDeleteMutation(URL, [queryKeys.services.all]);
}
