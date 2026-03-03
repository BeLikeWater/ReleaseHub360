// ═══════════════════════════════════════════════
// Auth Service Hooks
// ═══════════════════════════════════════════════

import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import type { AuthUser, ApiError } from '@/types';
import { unwrap } from './helpers';
import { useAuthStore } from '@/store/authStore';

const URL = '/auth';

// ── Types ──
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── Queries ──
export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<AuthUser, AxiosError<ApiError>>({
    queryKey: ['auth', 'me'],
    queryFn: async () => unwrap<AuthUser>(await apiClient.get(`${URL}/me`)),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ── Mutations ──
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation<LoginResult, AxiosError<ApiError>, LoginInput>({
    mutationFn: async (body) =>
      unwrap<LoginResult>(await apiClient.post(`${URL}/login`, body)),
    onSuccess: ({ accessToken, refreshToken, user }) => {
      login(user, accessToken, refreshToken);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      logout();
    },
  });
}
