// ═══════════════════════════════════════════════
// Customer Service Hooks
// ═══════════════════════════════════════════════

import { queryKeys } from '@/api/queryKeys';
import type { Customer, TicketPlatform } from '@/types';
import {
  useListQuery,
  useDetailQuery,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from './helpers';

const URL = '/customers';

// ── Queries ──
export function useCustomers() {
  return useListQuery<Customer>(queryKeys.customers.all, URL);
}

export function useCustomer(id: string) {
  return useDetailQuery<Customer>(queryKeys.customers.detail(id), `${URL}/${id}`, {
    enabled: !!id,
  });
}

// ── Mutations ──
export type CreateCustomerInput = {
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
  approverEmails?: string[];
  devOpsEmails?: string[];
  emailDomains?: string[];
  environments?: string[];
  supportSuffix?: string;
  tenantName?: string;
  azureReleaseTemplate?: string;
  // Ticket Platform
  ticketPlatform?: TicketPlatform;
  ticketBaseUrl?: string;
  ticketApiToken?: string;
  ticketProjectKey?: string;
  // Azure Ticket Targets
  azureTargetAreaPath?: string;
  azureTargetIterationPath?: string;
  azureTargetWorkItemType?: string;
  azureTargetTags?: string[];
  // GitHub Ticket Targets
  githubTargetRepo?: string;
  githubTargetLabels?: string[];
};

export type UpdateCustomerInput = Partial<CreateCustomerInput> & { id: string };

export function useCreateCustomer() {
  return useCreateMutation<Customer, CreateCustomerInput>(URL, [queryKeys.customers.all]);
}

export function useUpdateCustomer() {
  return useUpdateMutation<Customer, UpdateCustomerInput>(URL, [queryKeys.customers.all]);
}

export function useDeleteCustomer() {
  return useDeleteMutation(URL, [queryKeys.customers.all]);
}
