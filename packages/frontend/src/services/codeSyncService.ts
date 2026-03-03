// ═══════════════════════════════════════════════
// Code Sync Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { SyncHistory, CustomerBranch, ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/code-sync';

// ── Types ──
export interface DeltaResult {
  workitems: unknown[];
  unclassified: unknown[];
  total_pr_count: number;
  alreadySyncedPrIds: number[];
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  details: unknown;
}

export interface SyncStartResult {
  syncId: string;
  mcpJobId: string;
  status: 'RUNNING';
}

export interface SyncStatusResult {
  status: string;
  syncBranchName?: string;
  progress?: unknown;
  result?: unknown;
  conflict?: unknown;
  error?: unknown;
}

// ── Queries ──
export function useCustomerBranches(customerId?: string, serviceId?: string) {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  if (serviceId) params.set('serviceId', serviceId);
  const qs = params.toString();
  const url = qs ? `${URL}/customer-branches?${qs}` : `${URL}/customer-branches`;

  return useQuery<CustomerBranch[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.codeSync.all, 'branches', customerId, serviceId],
    queryFn: async () => {
      const res = await apiClient.get(url);
      return res.data.data ?? [];
    },
    enabled: !!(customerId || serviceId),
  });
}

export function useDelta(params: {
  sourceVersionId: string;
  targetVersionId: string;
  serviceId: string;
  customerBranchId: string;
}) {
  const qs = new URLSearchParams(params).toString();
  return useQuery<DeltaResult, AxiosError<ApiError>>({
    queryKey: [...queryKeys.codeSync.delta, params],
    queryFn: async () =>
      unwrap<DeltaResult>(await apiClient.get(`${URL}/delta?${qs}`)),
    enabled: !!(params.sourceVersionId && params.targetVersionId && params.serviceId && params.customerBranchId),
  });
}

export function useSyncHistory(customerBranchId: string, limit?: number) {
  const params = new URLSearchParams({ customerBranchId });
  if (limit) params.set('limit', String(limit));
  return useQuery<SyncHistory[], AxiosError<ApiError>>({
    queryKey: [...queryKeys.codeSync.history, customerBranchId],
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/history?${params}`);
      return res.data.data ?? [];
    },
    enabled: !!customerBranchId,
  });
}

export function useSyncStatus(syncId: string) {
  return useQuery<SyncStatusResult, AxiosError<ApiError>>({
    queryKey: [...queryKeys.codeSync.all, 'status', syncId],
    queryFn: async () =>
      unwrap<SyncStatusResult>(await apiClient.get(`${URL}/${syncId}/status`)),
    enabled: !!syncId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' ? 3_000 : false;
    },
  });
}

// ── Mutations ──
export function useConflictCheck() {
  return useMutation<ConflictCheckResult, AxiosError<ApiError>, {
    serviceId: string;
    customerBranchId: string;
    prIds: number[];
  }>({
    mutationFn: async (body) =>
      unwrap<ConflictCheckResult>(await apiClient.post(`${URL}/conflict-check`, body)),
  });
}

export function useStartSync() {
  const qc = useQueryClient();
  return useMutation<SyncStartResult, AxiosError<ApiError>, {
    serviceId: string;
    customerBranchId: string;
    sourceVersionId: string;
    targetVersionId: string;
    prIds: number[];
    workitemSummary?: string;
  }>({
    mutationFn: async (body) =>
      unwrap<SyncStartResult>(await apiClient.post(`${URL}/start`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSync.all });
    },
  });
}

export function useSkipAndContinue() {
  const qc = useQueryClient();
  return useMutation<SyncStartResult, AxiosError<ApiError>, {
    syncId: string;
    skipPrId: number;
  }>({
    mutationFn: async ({ syncId, ...body }) =>
      unwrap<SyncStartResult>(await apiClient.post(`${URL}/${syncId}/skip-and-continue`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSync.all });
    },
  });
}
