// ═══════════════════════════════════════════════
// API (Endpoint) Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { Api } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/apis';

// ── Queries ──
export function useApis(productId?: string) {
  const url = productId ? `${URL}?productId=${productId}` : URL;
  const key = productId ? queryKeys.apis.byProduct(productId) : queryKeys.apis.all;
  return useListQuery<Api>(key, url);
}

export function useApi(id: string) {
  return useDetailQuery<Api>(queryKeys.apis.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateApiInput = {
  name: string;
  path: string;
  method: string;
  description?: string;
  isBreaking?: boolean;
  productId: string;
};

export type UpdateApiInput = Partial<CreateApiInput> & { id: string };

export function useCreateApi() {
  return useCreateMutation<Api, CreateApiInput>(URL, [queryKeys.apis.all]);
}

export function useUpdateApi() {
  return useUpdateMutation<Api, UpdateApiInput>(URL, [queryKeys.apis.all]);
}

export function useDeleteApi() {
  return useDeleteMutation(URL, [queryKeys.apis.all]);
}
