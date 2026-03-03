// ═══════════════════════════════════════════════
// Urgent Change Service Hooks
// ═══════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { UrgentChange, ApiError } from '@/types';
import { unwrap, useListQuery, useDetailQuery, useCreateMutation } from './helpers';

const URL = '/urgent-changes';

// ── Queries ──
export function useUrgentChanges(status?: string) {
  const url = status ? `${URL}?status=${status}` : URL;
  return useListQuery<UrgentChange>(queryKeys.urgentChanges.all, url);
}

export function useUrgentChange(id: string) {
  return useDetailQuery<UrgentChange>(
    queryKeys.urgentChanges.detail(id),
    `${URL}/${id}`,
    { enabled: !!id },
  );
}

// ── Mutations ──
export type CreateUrgentChangeInput = {
  title: string;
  description: string;
  priority?: string;
  affectedProducts?: string;
  workaroundExists?: boolean;
  customerImpact?: string;
};

export function useCreateUrgentChange() {
  return useCreateMutation<UrgentChange, CreateUrgentChangeInput>(URL, [
    queryKeys.urgentChanges.all,
  ]);
}

export function useUpdateUrgentChangeStatus() {
  const qc = useQueryClient();
  return useMutation<UrgentChange, AxiosError<ApiError>, { id: string; status: string }>({
    mutationFn: async ({ id, status }) =>
      unwrap<UrgentChange>(await apiClient.patch(`${URL}/${id}/status`, { status })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.urgentChanges.all });
    },
  });
}
