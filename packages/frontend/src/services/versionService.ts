// ═══════════════════════════════════════════════
// Product Version Service Hooks
// ═══════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ProductVersion, ApiError } from '@/types';
import {
  unwrap,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/product-versions';

// ── Queries ──
export function useVersions(productId?: string, filters?: { phase?: string; upcoming?: boolean }) {
  const params = new URLSearchParams();
  if (productId) params.set('productId', productId);
  if (filters?.phase) params.set('phase', filters.phase);
  if (filters?.upcoming) params.set('upcoming', 'true');
  const qs = params.toString();
  const url = qs ? `${URL}?${qs}` : URL;
  const key = productId
    ? queryKeys.versions.byProduct(productId)
    : queryKeys.versions.all;

  return useQuery<ProductVersion[], AxiosError<ApiError>>({
    queryKey: [...key, filters],
    queryFn: async () => {
      const res = await apiClient.get(url);
      return res.data.data ?? [];
    },
  });
}

export function useVersion(id: string) {
  return useDetailQuery<ProductVersion>(queryKeys.versions.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateVersionInput = {
  productId: string;
  version: string;
  phase?: string;
  isHotfix?: boolean;
  masterStartDate?: string;
  testDate?: string;
  preProdDate?: string;
  targetDate?: string;
  description?: string;
};

export type UpdateVersionInput = Partial<CreateVersionInput> & { id: string };

export function useCreateVersion() {
  return useCreateMutation<ProductVersion, CreateVersionInput>(URL, [
    queryKeys.versions.all,
    queryKeys.products.all,
  ]);
}

export function useUpdateVersion() {
  return useUpdateMutation<ProductVersion, UpdateVersionInput>(URL, [
    queryKeys.versions.all,
    queryKeys.products.all,
  ]);
}

export function useDeleteVersion() {
  return useDeleteMutation(URL, [queryKeys.versions.all, queryKeys.products.all]);
}

// ── Patch (partial updates) ──
export type PatchVersionInput = {
  id: string;
  notesPublished?: boolean;
  description?: string;
  isHotfix?: boolean;
  masterStartDate?: string;
  testDate?: string;
  preProdDate?: string;
  targetDate?: string;
};

export function usePatchVersion() {
  const qc = useQueryClient();
  return useMutation<ProductVersion, AxiosError<ApiError>, PatchVersionInput>({
    mutationFn: async ({ id, ...body }) =>
      unwrap<ProductVersion>(await apiClient.patch(`${URL}/${id}`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.versions.all });
    },
  });
}

// ── Release version (PATCH /product-versions/:id/release) ──
export function useReleaseVersion() {
  const qc = useQueryClient();
  return useMutation<ProductVersion, AxiosError<ApiError>, string>({
    mutationFn: async (id) =>
      unwrap<ProductVersion>(await apiClient.patch(`${URL}/${id}/release`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.versions.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
