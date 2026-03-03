// ═══════════════════════════════════════════════
// Workflow History Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { WorkflowHistory, ApiError } from '@/types';
import { unwrap, useDetailQuery } from './helpers';

const URL = '/workflow-history';

// ── Types ──
export interface WorkflowSummary {
  success: number;
  failed: number;
  pending: number;
}

// ── Queries ──
export function useWorkflowHistory(filters?: {
  status?: string;
  workflowType?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.workflowType) params.set('workflowType', filters.workflowType);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  const url = qs ? `${URL}?${qs}` : URL;

  return useQuery<
    { data: WorkflowHistory[]; total: number },
    AxiosError<ApiError>
  >({
    queryKey: [...queryKeys.workflowHistory.all, filters],
    queryFn: async () => {
      const res = await apiClient.get(url);
      return { data: res.data.data ?? [], total: res.data.total ?? 0 };
    },
  });
}

export function useWorkflowHistoryDetail(id: string) {
  return useDetailQuery<WorkflowHistory>(
    queryKeys.workflowHistory.detail(id),
    `${URL}/${id}`,
    { enabled: !!id },
  );
}

export function useWorkflowSummary() {
  return useQuery<WorkflowSummary, AxiosError<ApiError>>({
    queryKey: queryKeys.workflowHistory.summary,
    queryFn: async () =>
      unwrap<WorkflowSummary>(await apiClient.get(`${URL}/summary`)),
  });
}

// ── Mutations ──
export function useRetryWorkflow() {
  const qc = useQueryClient();
  return useMutation<WorkflowHistory, AxiosError<ApiError>, string>({
    mutationFn: async (id) =>
      unwrap<WorkflowHistory>(await apiClient.post(`${URL}/${id}/retry`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflowHistory.all });
      qc.invalidateQueries({ queryKey: queryKeys.workflowHistory.summary });
    },
  });
}
