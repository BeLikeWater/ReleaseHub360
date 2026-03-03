// ═══════════════════════════════════════════════
// TFS (Azure DevOps) Proxy Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/tfs';

// ── Types ──
export interface ReleaseStage {
  id: number;
  name: string;
  rank: number;
  status: string;
}

export interface PullRequest {
  pullRequestId: number;
  title: string;
  status: string;
  createdBy: { displayName: string };
  creationDate: string;
  repository: { name: string };
  // TFS PR model — additional fields vary
  [key: string]: unknown;
}

// ── Queries ──
export function useReleaseStages(serviceId?: string, productId?: string, releaseName?: string) {
  const params = new URLSearchParams();
  if (serviceId) params.set('serviceId', serviceId);
  if (productId) params.set('productId', productId);
  if (releaseName) params.set('releaseName', releaseName);
  const qs = params.toString();

  return useQuery<ReleaseStage[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.tfs.all, 'stages', serviceId, productId, releaseName],
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/release-stages?${qs}`);
      return res.data.data ?? [];
    },
    enabled: !!(serviceId || productId),
  });
}

export function usePullRequests(repo?: string, productId?: string) {
  const params = new URLSearchParams();
  if (repo) params.set('repo', repo);
  if (productId) params.set('productId', productId);
  const qs = params.toString();

  return useQuery<PullRequest[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.tfs.pullRequests, repo, productId],
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/pull-requests?${qs}`);
      return res.data.data?.value ?? res.data.value ?? [];
    },
    enabled: !!(repo || productId),
  });
}

export function usePipelines(productId: string) {
  return useQuery<unknown[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.tfs.pipelines, productId],
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/pipelines?productId=${productId}`);
      return res.data.data ?? [];
    },
    enabled: !!productId,
  });
}

export function useReleaseDelta(productId: string) {
  return useQuery<unknown[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.tfs.all, 'delta', productId],
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/release-delta?productId=${productId}`);
      return res.data.data ?? [];
    },
    enabled: !!productId,
  });
}

// ── Mutations ──
export function useTriggerPipeline() {
  return useMutation<unknown, AxiosError<ApiError>, { pipelineId: number; productId?: string }>({
    mutationFn: async ({ pipelineId, ...body }) =>
      unwrap<unknown>(await apiClient.post(`${URL}/pipelines/${pipelineId}/trigger`, body)),
  });
}
