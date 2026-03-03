// ═══════════════════════════════════════════════
// Workflow Trigger Service Hooks
// ═══════════════════════════════════════════════

import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '@/api/client';
import type { ApiError } from '@/types';
import { unwrap } from './helpers';

const URL = '/workflows';

export type WorkflowId =
  | 'tfs-merge-start'
  | 'approval-response'
  | 'deployment-trigger'
  | 'breaking-change-alert'
  | 'hotfix-notify';

export interface TriggerResult {
  success: boolean;
  status: string;
  result: unknown;
}

export function useTriggerWorkflow() {
  return useMutation<TriggerResult, AxiosError<ApiError>, {
    workflowId: WorkflowId;
    payload?: Record<string, unknown>;
  }>({
    mutationFn: async (body) =>
      unwrap<TriggerResult>(await apiClient.post(`${URL}/trigger`, body)),
  });
}
