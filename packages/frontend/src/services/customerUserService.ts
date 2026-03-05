import apiClient from '@/api/client';

export type CustomerRole = 'APP_ADMIN' | 'APPROVER' | 'BUSINESS_USER' | 'PARTNER';

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  customerRole: CustomerRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePortalUserPayload {
  name: string;
  email: string;
  password: string;
  customerRole: CustomerRole;
}

export interface UpdatePortalUserPayload {
  customerRole?: CustomerRole;
  isActive?: boolean;
  name?: string;
}

export const getPortalUsers = (): Promise<PortalUser[]> =>
  apiClient.get('/customer-users/portal/users').then((r) => r.data.data ?? r.data);

export const createPortalUser = (data: CreatePortalUserPayload): Promise<PortalUser> =>
  apiClient.post('/customer-users/portal/users', data).then((r) => r.data.data ?? r.data);

export const updatePortalUser = (id: string, data: UpdatePortalUserPayload): Promise<PortalUser> =>
  apiClient.patch(`/customer-users/portal/users/${id}`, data).then((r) => r.data.data ?? r.data);

export const deletePortalUser = (id: string): Promise<void> =>
  apiClient.delete(`/customer-users/portal/users/${id}`).then(() => undefined);
