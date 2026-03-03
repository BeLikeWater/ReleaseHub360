// ═══════════════════════════════════════════════
// Module & Module Group Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { Module, ModuleGroup } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const MODULE_URL = '/modules';
const GROUP_URL = '/modules/groups';

// ═══════ Module Groups ═══════

export function useModuleGroups(productId?: string) {
  const url = productId ? `${GROUP_URL}?productId=${productId}` : GROUP_URL;
  const key = productId
    ? queryKeys.moduleGroups.byProduct(productId)
    : queryKeys.moduleGroups.all;
  return useListQuery<ModuleGroup>(key, url);
}

export type CreateModuleGroupInput = {
  name: string;
  productId: string;
  description?: string;
};

export type UpdateModuleGroupInput = Partial<CreateModuleGroupInput> & { id: string };

export function useCreateModuleGroup() {
  return useCreateMutation<ModuleGroup, CreateModuleGroupInput>(GROUP_URL, [
    queryKeys.moduleGroups.all,
  ]);
}

export function useUpdateModuleGroup() {
  return useUpdateMutation<ModuleGroup, UpdateModuleGroupInput>(GROUP_URL, [
    queryKeys.moduleGroups.all,
  ]);
}

export function useDeleteModuleGroup() {
  return useDeleteMutation(GROUP_URL, [queryKeys.moduleGroups.all]);
}

// ═══════ Modules ═══════

export function useModules(groupId?: string) {
  const url = groupId ? `${MODULE_URL}?groupId=${groupId}` : MODULE_URL;
  const key = groupId ? queryKeys.modules.byGroup(groupId) : queryKeys.modules.all;
  return useListQuery<Module>(key, url);
}

export function useModule(id: string) {
  return useDetailQuery<Module>(queryKeys.modules.detail(id), `${MODULE_URL}/${id}`, {
    enabled: !!id,
  });
}

export type CreateModuleInput = {
  name: string;
  productId: string;
  moduleGroupId?: string;
  description?: string;
};

export type UpdateModuleInput = Partial<CreateModuleInput> & { id: string };

export function useCreateModule() {
  return useCreateMutation<Module, CreateModuleInput>(MODULE_URL, [queryKeys.modules.all]);
}

export function useUpdateModule() {
  return useUpdateMutation<Module, UpdateModuleInput>(MODULE_URL, [queryKeys.modules.all]);
}

export function useDeleteModule() {
  return useDeleteMutation(MODULE_URL, [queryKeys.modules.all]);
}
