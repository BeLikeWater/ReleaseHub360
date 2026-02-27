import { http, HttpResponse } from 'msw';

const BASE = '/api';

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      user: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
  ),
  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({ accessToken: 'mock-access-token-refreshed' }),
  ),
  http.get(`${BASE}/auth/me`, () =>
    HttpResponse.json({ data: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' } }),
  ),

  // Dashboard
  http.get(`${BASE}/dashboard/summary`, () =>
    HttpResponse.json({
      data: { totalProducts: 3, totalCustomers: 12, pendingHotfixes: 2, activeVersions: 5, unreadNotificationsCount: 4 },
    }),
  ),
  http.get(`${BASE}/dashboard/pending-actions`, () =>
    HttpResponse.json({ data: [] }),
  ),

  // Products
  http.get(`${BASE}/products`, () => HttpResponse.json({ data: [] })),
  http.get(`${BASE}/products/:id`, () => HttpResponse.json({ data: null })),

  // Customers
  http.get(`${BASE}/customers`, () => HttpResponse.json({ data: [] })),
  http.get(`${BASE}/customers/:id`, () => HttpResponse.json({ data: null })),

  // Product Versions
  http.get(`${BASE}/product-versions`, () => HttpResponse.json({ data: [] })),

  // Hotfix Requests
  http.get(`${BASE}/hotfix-requests`, () => HttpResponse.json({ data: [] })),

  // Release Notes
  http.get(`${BASE}/release-notes`, () => HttpResponse.json({ data: [] })),

  // Release Todos
  http.get(`${BASE}/release-todos`, () => HttpResponse.json({ data: [] })),

  // Notifications
  http.get(`${BASE}/notifications`, () => HttpResponse.json({ data: [] })),
  http.get(`${BASE}/notifications/unread-count`, () => HttpResponse.json({ count: 0 })),

  // Urgent Changes
  http.get(`${BASE}/urgent-changes`, () => HttpResponse.json({ data: [] })),

  // System Changes
  http.get(`${BASE}/system-changes`, () => HttpResponse.json({ data: [] })),

  // Services
  http.get(`${BASE}/services`, () => HttpResponse.json({ data: [] })),

  // Settings
  http.get(`${BASE}/settings`, () => HttpResponse.json({ data: [] })),
];
