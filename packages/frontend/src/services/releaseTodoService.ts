// ═══════════════════════════════════════════════
// Release Todo Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { ReleaseTodo } from '@/types';
import { useListQuery, useCreateMutation, usePatchMutation, useDeleteMutation } from './helpers';

const URL = '/release-todos';

// ── Queries ──
export function useReleaseTodos(versionId: string) {
  return useListQuery<ReleaseTodo>(
    queryKeys.releaseTodos.byVersion(versionId),
    `${URL}?versionId=${versionId}`,
    { enabled: !!versionId },
  );
}

// ── Mutations ──
export type CreateReleaseTodoInput = {
  productVersionId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  timing?: string;
  sortOrder?: number;
};

export type PatchReleaseTodoInput = {
  id: string;
  isCompleted?: boolean;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  timing?: string;
  sortOrder?: number;
};

export function useCreateReleaseTodo() {
  return useCreateMutation<ReleaseTodo, CreateReleaseTodoInput>(URL, [
    queryKeys.releaseTodos.all,
  ]);
}

export function usePatchReleaseTodo() {
  return usePatchMutation<ReleaseTodo, PatchReleaseTodoInput>(URL, [
    queryKeys.releaseTodos.all,
  ]);
}

export function useDeleteReleaseTodo() {
  return useDeleteMutation(URL, [queryKeys.releaseTodos.all]);
}
