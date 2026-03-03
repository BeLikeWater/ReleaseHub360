// ═══════════════════════════════════════════════
// User Service Hooks
// ═══════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { AuthUser, ApiError } from '@/types';
import { unwrap, useListQuery, useDetailQuery, useCreateMutation, useDeleteMutation } from './helpers';

const URL = '/users';

// ── Queries ──
export function useUsers() {
  return useListQuery<AuthUser>(queryKeys.users.all, URL);
}

export function useUser(id: string) {
  return useDetailQuery<AuthUser>(queryKeys.users.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateUserInput = {
  email: string;
  name: string;
  role?: string;
  password?: string;
};

export function useCreateUser() {
  return useCreateMutation<AuthUser, CreateUserInput>(URL, [queryKeys.users.all]);
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation<AuthUser, AxiosError<ApiError>, { id: string; role: string }>({
    mutationFn: async ({ id, role }) =>
      unwrap<AuthUser>(await apiClient.patch(`${URL}/${id}/role`, { role })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation<AuthUser, AxiosError<ApiError>, { id: string; isActive: boolean }>({
    mutationFn: async ({ id, isActive }) =>
      unwrap<AuthUser>(await apiClient.patch(`${URL}/${id}/status`, { isActive })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateUserPassword() {
  return useMutation<{ message: string }, AxiosError<ApiError>, { id: string; password: string }>({
    mutationFn: async ({ id, password }) =>
      unwrap<{ message: string }>(await apiClient.patch(`${URL}/${id}/password`, { password })),
  });
}

export function useDeleteUser() {
  return useDeleteMutation(URL, [queryKeys.users.all]);
}
