// ═══════════════════════════════════════════════
// API Service Helpers
// Ortak CRUD hook fabrikaları. Entity service'ler bunları kullanır.
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

// ── Response unwrap helper ──
// Backend { data: T } wrapper'ını açar. Azure DevOps proxy { value: T[] } da ele alınır.
export function unwrap<T>(response: { data: { data?: T; value?: T } }): T {
  const d = response.data;
  if (d.data !== undefined) return d.data;
  if (d.value !== undefined) return d.value;
  return d as unknown as T;
}

// ── Generic List Query ──
export function useListQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T[], AxiosError<ApiError>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T[], AxiosError<ApiError>>({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get(url);
      const d = res.data.data ?? res.data;
      return Array.isArray(d) ? d : d.value ?? [];
    },
    ...options,
  });
}

// ── Generic Detail Query ──
export function useDetailQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T, AxiosError<ApiError>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, AxiosError<ApiError>>({
    queryKey,
    queryFn: async () => unwrap<T>(await apiClient.get(url)),
    ...options,
  });
}

// ── Generic Create Mutation ──
export function useCreateMutation<TData, TVariables>(
  url: string,
  invalidateKeys: readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<TData, AxiosError<ApiError>, TVariables>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TData, AxiosError<ApiError>, TVariables>({
    mutationFn: async (body) => unwrap<TData>(await apiClient.post(url, body)),
    onSuccess: (...args) => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Generic Update Mutation ──
export function useUpdateMutation<TData, TVariables extends { id: string }>(
  baseUrl: string,
  invalidateKeys: readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<TData, AxiosError<ApiError>, TVariables>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TData, AxiosError<ApiError>, TVariables>({
    mutationFn: async ({ id, ...body }) =>
      unwrap<TData>(await apiClient.put(`${baseUrl}/${id}`, body)),
    onSuccess: (...args) => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Generic Patch Mutation ──
export function usePatchMutation<TData, TVariables extends { id: string }>(
  baseUrl: string,
  invalidateKeys: readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<TData, AxiosError<ApiError>, TVariables>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TData, AxiosError<ApiError>, TVariables>({
    mutationFn: async ({ id, ...body }) =>
      unwrap<TData>(await apiClient.patch(`${baseUrl}/${id}`, body)),
    onSuccess: (...args) => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Generic Delete Mutation ──
export function useDeleteMutation(
  baseUrl: string,
  invalidateKeys: readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<void, AxiosError<ApiError>, string>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${baseUrl}/${id}`);
    },
    onSuccess: (...args) => {
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Error message extractor ──
export function getErrorMessage(error: AxiosError<ApiError> | Error | unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as AxiosError<ApiError>;
    return axiosErr.response?.data?.error ?? axiosErr.message ?? 'Bilinmeyen hata';
  }
  if (error instanceof Error) return error.message;
  return 'Bilinmeyen hata';
}
