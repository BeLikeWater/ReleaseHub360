// ═══════════════════════════════════════════════
// Settings Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Setting, ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/settings';

// ── Queries ──
export function useSettings() {
  return useQuery<Setting[], AxiosError<ApiError>>({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const res = await apiClient.get(URL);
      return res.data.data ?? [];
    },
  });
}

// ── Mutations ──
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, AxiosError<ApiError>, Record<string, string>>({
    mutationFn: async (body) =>
      unwrap<{ message: string }>(await apiClient.put(URL, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export type TestConnectionType = 'tfs' | 'n8n' | 'mcp';

export function useTestConnection() {
  return useMutation<
    { ok: boolean; type: string; message: string },
    AxiosError<ApiError>,
    TestConnectionType
  >({
    mutationFn: async (type) =>
      unwrap<{ ok: boolean; type: string; message: string }>(
        await apiClient.post(`${URL}/test-connection`, { type }),
      ),
  });
}
