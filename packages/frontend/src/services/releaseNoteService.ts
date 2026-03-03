// ═══════════════════════════════════════════════
// Release Note Service Hooks
// ═══════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ReleaseNote, ApiError } from '@/types';
import { unwrap, useListQuery, useCreateMutation, useUpdateMutation, useDeleteMutation } from './helpers';

const URL = '/release-notes';

// ── Queries ──
export function useReleaseNotes(versionId: string) {
  return useListQuery<ReleaseNote>(
    queryKeys.releaseNotes.byVersion(versionId),
    `${URL}?versionId=${versionId}`,
    { enabled: !!versionId },
  );
}

// ── Mutations ──
export type CreateReleaseNoteInput = {
  productVersionId: string;
  workitemId?: number;
  category: string;
  title: string;
  description?: string;
  isBreaking?: boolean;
  sortOrder?: number;
};

export type UpdateReleaseNoteInput = Partial<CreateReleaseNoteInput> & { id: string };

export function useCreateReleaseNote() {
  return useCreateMutation<ReleaseNote, CreateReleaseNoteInput>(URL, [
    queryKeys.releaseNotes.all,
  ]);
}

export function useUpdateReleaseNote() {
  return useUpdateMutation<ReleaseNote, UpdateReleaseNoteInput>(URL, [
    queryKeys.releaseNotes.all,
  ]);
}

export function useDeleteReleaseNote() {
  return useDeleteMutation(URL, [queryKeys.releaseNotes.all]);
}

// ── Trigger AI generation ──
export type TriggerGenerationInput = {
  versionId: string;
  productId: string;
  workItemIds: number[];
};

export type TriggerGenerationResult = {
  triggered: boolean;
  missingCount?: number;
  missingIds?: number[];
  message?: string;
};

export function useTriggerNoteGeneration() {
  const qc = useQueryClient();
  return useMutation<TriggerGenerationResult, AxiosError<ApiError>, TriggerGenerationInput>({
    mutationFn: async (body) =>
      unwrap<TriggerGenerationResult>(await apiClient.post(`${URL}/trigger-generation`, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.releaseNotes.all });
    },
  });
}
