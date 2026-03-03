// ═══════════════════════════════════════════════
// Dashboard Service Hooks
// ═══════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/dashboard';

// ── Types ──
export interface DashboardSummary {
  totalProducts: number;
  totalCustomers: number;
  pendingHotfixes: number;
  activeVersions: number;
  unreadNotificationsCount: number;
}

export interface PendingAction {
  type: 'hotfix' | 'todo';
  id: string;
  label: string;
}

// ── Queries ──
export function useDashboardSummary() {
  return useQuery<DashboardSummary, AxiosError<ApiError>>({
    queryKey: queryKeys.dashboard.summary,
    queryFn: async () => unwrap<DashboardSummary>(await apiClient.get(`${URL}/summary`)),
    refetchInterval: 60_000, // 1 minute
  });
}

export function usePendingActions() {
  return useQuery<PendingAction[], AxiosError<ApiError>>({
    queryKey: queryKeys.dashboard.pendingActions,
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/pending-actions`);
      return res.data.data ?? [];
    },
  });
}
