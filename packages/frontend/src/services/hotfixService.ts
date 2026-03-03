// ═══════════════════════════════════════════════
// Hotfix Request Service Hooks
// ═══════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { HotfixRequest, ApiError } from '@/types';
import { unwrap, useListQuery, useDetailQuery, useCreateMutation } from './helpers';

const URL = '/hotfix-requests';

// ── Queries ──
export function useHotfixRequests(status?: string) {
  const url = status ? `${URL}?status=${status}` : URL;
  return useListQuery<HotfixRequest>(queryKeys.hotfixRequests.all, url);
}

export function useHotfixRequest(id: string) {
  return useDetailQuery<HotfixRequest>(
    queryKeys.hotfixRequests.detail(id),
    `${URL}/${id}`,
    { enabled: !!id },
  );
}

// ── Mutations ──
export type CreateHotfixInput = {
  productVersionId: string;
  title: string;
  description: string;
  severity?: string;
  prUrl?: string;
  branchName?: string;
  customerImpact?: string;
};

export function useCreateHotfix() {
  return useCreateMutation<HotfixRequest, CreateHotfixInput>(URL, [
    queryKeys.hotfixRequests.all,
  ]);
}

export function useApproveHotfix() {
  const qc = useQueryClient();
  return useMutation<HotfixRequest, AxiosError<ApiError>, { id: string; note?: string }>({
    mutationFn: async ({ id, ...body }) =>
      unwrap<HotfixRequest>(await apiClient.patch(`${URL}/${id}/approve`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hotfixRequests.all });
    },
  });
}

export function useRejectHotfix() {
  const qc = useQueryClient();
  return useMutation<HotfixRequest, AxiosError<ApiError>, { id: string; reason: string }>({
    mutationFn: async ({ id, ...body }) =>
      unwrap<HotfixRequest>(await apiClient.patch(`${URL}/${id}/reject`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hotfixRequests.all });
    },
  });
}
