/**
 * serviceVersionMatrixService.ts
 * API service functions for the Customer-Service Version Matrix (Section 8).
 */

import apiClient from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatrixCell {
  customerId: string;
  customerName: string;
  customerCode: string;
  serviceId: string;
  serviceName: string;
  productId: string;
  productName: string;
  currentRelease: string | null;
  latestRelease: string | null;
  staleCount: number;
  status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  takenAt: string | null;
  previousRelease: string | null;
}

export interface MatrixSummary {
  total: number;
  current: number;
  warning: number;
  critical: number;
  unknown: number;
  stalePairs: number;
}

export interface ServiceFocusRow {
  serviceId: string;
  serviceName: string;
  productId: string;
  productName: string;
  totalCustomers: number;
  releases: { release: string; count: number }[];
  staleCount: number;
}

export interface CustomerFocusRow {
  serviceId: string;
  serviceName: string;
  currentRelease: string | null;
  latestRelease: string | null;
  staleCount: number;
  status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  takenAt: string | null;
}

export interface StalePair {
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  currentRelease: string | null;
  latestRelease: string | null;
  staleCount: number;
  status: 'WARNING' | 'CRITICAL';
}

export interface HistoryEntry {
  id: string;
  customerId: string;
  serviceId: string;
  fromRelease: string;
  toRelease: string;
  transitionDate: string;
  createdAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /api/service-version-matrix
 * Full pivot matrix: all customers × services
 */
export async function fetchMatrix(params?: {
  productId?: string;
  customerId?: string;
  serviceId?: string;
  status?: string;
}): Promise<MatrixCell[]> {
  const res = await apiClient.get('/service-version-matrix', { params });
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/summary
 * Dashboard widget counts
 */
export async function fetchMatrixSummary(productId?: string): Promise<MatrixSummary> {
  const res = await apiClient.get('/service-version-matrix/summary', {
    params: productId ? { productId } : undefined,
  });
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/by-service
 * Service-focused view with release distribution
 */
export async function fetchMatrixByService(params?: {
  serviceId?: string;
  productId?: string;
}): Promise<ServiceFocusRow[]> {
  const res = await apiClient.get('/service-version-matrix/by-service', { params });
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/by-customer
 * Customer-focused: all services for a given customer
 */
export async function fetchMatrixByCustomer(customerId: string, productId?: string): Promise<CustomerFocusRow[]> {
  const res = await apiClient.get('/service-version-matrix/by-customer', {
    params: { customerId, productId },
  });
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/stale
 * Pairs above stale threshold
 */
export async function fetchStalePairs(params?: {
  productId?: string;
  threshold?: number;
}): Promise<StalePair[]> {
  const res = await apiClient.get('/service-version-matrix/stale', { params });
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/history
 * Transition history for a customer-service pair
 */
export async function fetchServiceVersionHistory(params: {
  customerId: string;
  serviceId: string;
}): Promise<HistoryEntry[]> {
  const res = await apiClient.get('/service-version-matrix/history', { params });
  return res.data.data ?? res.data;
}

/**
 * POST /api/service-version-matrix/bootstrap
 * ADMIN: Idempotent batch import of CustomerServiceVersion records
 */
export async function bootstrapMatrix(customerId?: string, productId?: string): Promise<{ created: number; skipped: number }> {
  const res = await apiClient.post('/service-version-matrix/bootstrap', {
    customerId,
    productId,
  });
  return res.data.data ?? res.data;
}

/**
 * POST /api/service-version-matrix/notify-stale
 * Create notifications for stale customers
 */
export async function notifyStaleCustomers(params?: {
  productId?: string;
  threshold?: number;
}): Promise<{ notified: number }> {
  const res = await apiClient.post('/service-version-matrix/notify-stale', params);
  return res.data.data ?? res.data;
}

/**
 * GET /api/service-version-matrix/export
 * Download Excel/CSV file — triggers browser download
 */
export function downloadMatrixExport(format: 'excel' | 'csv', productId?: string): void {
  const token = localStorage.getItem('accessToken') ??
    // Fallback: read from zustand store (if accessible)
    (window as unknown as Record<string, unknown>).__authToken as string | undefined;

  const params = new URLSearchParams({ format });
  if (productId) params.append('productId', productId);
  if (token) params.append('token', token);

  // Use direct fetch with auth header for blob download
  fetch(`/api/service-version-matrix/export?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(res => res.blob())
    .then(blob => {
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-version-matrix.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    })
    .catch(err => console.error('[MatrixExport] Download failed:', err));
}
