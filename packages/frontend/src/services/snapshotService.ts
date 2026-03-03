// ═══════════════════════════════════════════════
// Service Release Snapshot Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ServiceReleaseSnapshot, ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/service-release-snapshots';

// ── Queries ──
export function useSnapshots(productId?: string) {
  const url = productId ? `${URL}?productId=${productId}` : URL;
  const key = productId
    ? queryKeys.snapshots.byProduct(productId)
    : queryKeys.snapshots.all;

  return useQuery<ServiceReleaseSnapshot[], AxiosError<ApiError>>({
    queryKey: key,
    queryFn: async () => {
      const res = await apiClient.get(url);
      return res.data.data ?? [];
    },
  });
}

// ── Mutations ──
export type CreateSnapshotInput = {
  productId: string;
  productVersionId: string;
  releaseName?: string;
  serviceIds?: string[];
};

export type SnapshotResult = {
  succeeded: string[];
  failed: Array<{ serviceId: string; reason: string }>;
};

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation<SnapshotResult, AxiosError<ApiError>, CreateSnapshotInput>({
    mutationFn: async (body) =>
      unwrap<SnapshotResult>(await apiClient.post(URL, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.snapshots.all });
    },
  });
}

export type InitializeSnapshotInput = {
  productId: string;
};

export type InitializeSnapshotResult = {
  succeeded: number;
  skipped: number;
  failed: number;
  debug: unknown;
};

export function useInitializeSnapshots() {
  const qc = useQueryClient();
  return useMutation<InitializeSnapshotResult, AxiosError<ApiError>, InitializeSnapshotInput>({
    mutationFn: async (body) =>
      unwrap<InitializeSnapshotResult>(await apiClient.post(`${URL}/initialize`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.snapshots.all });
    },
  });
}
