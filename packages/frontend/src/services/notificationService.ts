// ═══════════════════════════════════════════════
// Notification Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Notification, ApiError } from '@/types';
import { unwrap, useListQuery } from './helpers';

const URL = '/notifications';

// ── Queries ──
export function useNotifications(unreadOnly?: boolean) {
  const url = unreadOnly ? `${URL}?unread=true` : URL;
  return useListQuery<Notification>(queryKeys.notifications.all, url);
}

export function useUnreadCount() {
  return useQuery<number, AxiosError<ApiError>>({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const res = await apiClient.get(`${URL}/unread-count`);
      return res.data.data?.count ?? 0;
    },
    refetchInterval: 30_000, // Poll every 30s
  });
}

// ── Mutations ──
export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation<Notification, AxiosError<ApiError>, string>({
    mutationFn: async (id) =>
      unwrap<Notification>(await apiClient.patch(`${URL}/${id}/read`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, AxiosError<ApiError>, void>({
    mutationFn: async () =>
      unwrap<{ success: boolean }>(await apiClient.patch(`${URL}/read-all`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}
