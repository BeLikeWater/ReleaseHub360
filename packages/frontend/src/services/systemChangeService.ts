// ═══════════════════════════════════════════════
// System Change Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { SystemChange } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/system-changes';

// ── Queries ──
export function useSystemChanges(versionId?: string) {
  const url = versionId ? `${URL}?versionId=${versionId}` : URL;
  const key = versionId ? queryKeys.systemChanges.byVersion(versionId) : queryKeys.systemChanges.all;
  return useListQuery<SystemChange>(key, url);
}

export function useSystemChange(id: string) {
  return useDetailQuery<SystemChange>(
    queryKeys.systemChanges.detail(id),
    `${URL}/${id}`,
    { enabled: !!id },
  );
}

// ── Mutations ──
export type CreateSystemChangeInput = {
  title: string;
  description: string;
  changeType: string;
  isBreaking?: boolean;
  productVersionId?: string;
  apiPath?: string;
};

export type UpdateSystemChangeInput = Partial<CreateSystemChangeInput> & { id: string };

export function useCreateSystemChange() {
  return useCreateMutation<SystemChange, CreateSystemChangeInput>(URL, [
    queryKeys.systemChanges.all,
  ]);
}

export function useUpdateSystemChange() {
  return useUpdateMutation<SystemChange, UpdateSystemChangeInput>(URL, [
    queryKeys.systemChanges.all,
  ]);
}

export function useDeleteSystemChange() {
  return useDeleteMutation(URL, [queryKeys.systemChanges.all]);
}
