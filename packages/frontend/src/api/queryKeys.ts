// ═══════════════════════════════════════════════
// ReleaseHub360 — TanStack Query Key Factory
// Tüm query key'ler burada merkezi tanımlanır.
// Query invalidation tutarlılığı sağlar.
// ═══════════════════════════════════════════════

export const queryKeys = {
  // ── Product ──
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },

  // ── Service ──
  services: {
    all: ['services'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.services.all, 'list', filters] as const,
    byProduct: (productId: string) => [...queryKeys.services.all, 'byProduct', productId] as const,
    detail: (id: string) => [...queryKeys.services.all, 'detail', id] as const,
  },

  // ── Api ──
  apis: {
    all: ['apis'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.apis.all, 'list', filters] as const,
    byProduct: (productId: string) => [...queryKeys.apis.all, 'byProduct', productId] as const,
    detail: (id: string) => [...queryKeys.apis.all, 'detail', id] as const,
  },

  // ── Module & ModuleGroup ──
  modules: {
    all: ['modules'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.modules.all, 'list', filters] as const,
    byProduct: (productId: string) => [...queryKeys.modules.all, 'byProduct', productId] as const,
    byGroup: (groupId: string) => [...queryKeys.modules.all, 'byGroup', groupId] as const,
    detail: (id: string) => [...queryKeys.modules.all, 'detail', id] as const,
  },
  moduleGroups: {
    all: ['moduleGroups'] as const,
    byProduct: (productId: string) => [...queryKeys.moduleGroups.all, 'byProduct', productId] as const,
  },

  // ── ProductVersion ──
  versions: {
    all: ['versions'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.versions.all, 'list', filters] as const,
    byProduct: (productId: string) => [...queryKeys.versions.all, 'byProduct', productId] as const,
    detail: (id: string) => [...queryKeys.versions.all, 'detail', id] as const,
  },

  // ── Customer ──
  customers: {
    all: ['customers'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.customers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },

  // ── CustomerProductMapping ──
  cpm: {
    all: ['cpm'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.cpm.all, 'list', filters] as const,
    byCustomer: (customerId: string) => [...queryKeys.cpm.all, 'byCustomer', customerId] as const,
    byVersion: (versionId: string) => [...queryKeys.cpm.all, 'byVersion', versionId] as const,
  },

  // ── ReleaseNote ──
  releaseNotes: {
    all: ['releaseNotes'] as const,
    byVersion: (versionId: string) => [...queryKeys.releaseNotes.all, 'byVersion', versionId] as const,
  },

  // ── SystemChange ──
  systemChanges: {
    all: ['systemChanges'] as const,
    byVersion: (versionId: string) => [...queryKeys.systemChanges.all, 'byVersion', versionId] as const,
    detail: (id: string) => [...queryKeys.systemChanges.all, 'detail', id] as const,
  },

  // ── ReleaseTodo ──
  releaseTodos: {
    all: ['releaseTodos'] as const,
    byVersion: (versionId: string) => [...queryKeys.releaseTodos.all, 'byVersion', versionId] as const,
    templates: () => [...queryKeys.releaseTodos.all, 'templates'] as const,
    templateById: (id: string) => [...queryKeys.releaseTodos.all, 'template', id] as const,
  },

  // ── HotfixRequest ──
  hotfixRequests: {
    all: ['hotfixRequests'] as const,
    byVersion: (versionId: string) => [...queryKeys.hotfixRequests.all, 'byVersion', versionId] as const,
    detail: (id: string) => [...queryKeys.hotfixRequests.all, 'detail', id] as const,
  },

  // ── UrgentChange ──
  urgentChanges: {
    all: ['urgentChanges'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.urgentChanges.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.urgentChanges.all, 'detail', id] as const,
  },

  // ── Notification ──
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },

  // ── Setting ──
  settings: {
    all: ['settings'] as const,
  },

  // ── User ──
  users: {
    all: ['users'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },

  // ── Dashboard ──
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    pendingActions: ['dashboard', 'pendingActions'] as const,
    dora: (filters?: Record<string, unknown>) => [...queryKeys.dashboard.all, 'dora', filters] as const,
  },

  // ── WorkflowHistory ──
  workflowHistory: {
    all: ['workflowHistory'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.workflowHistory.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.workflowHistory.all, 'detail', id] as const,
    summary: ['workflowHistory', 'summary'] as const,
  },

  // ── ServiceReleaseSnapshot ──
  snapshots: {
    all: ['snapshots'] as const,
    byVersion: (versionId: string) => [...queryKeys.snapshots.all, 'byVersion', versionId] as const,
    byProduct: (productId: string) => [...queryKeys.snapshots.all, 'byProduct', productId] as const,
  },

  // ── CodeSync ──
  codeSync: {
    all: ['codeSync'] as const,
    branches: (customerId: string) => [...queryKeys.codeSync.all, 'branches', customerId] as const,
    history: ['codeSync', 'history'] as const,
    delta: ['codeSync', 'delta'] as const,
  },

  // ── TFS / Azure DevOps Proxy ──
  tfs: {
    all: ['tfs'] as const,
    pullRequests: ['tfs', 'pullRequests'] as const,
    pipelines: ['tfs', 'pipelines'] as const,
    workItems: (filters?: Record<string, unknown>) => ['tfs', 'workItems', filters] as const,
    builds: (filters?: Record<string, unknown>) => ['tfs', 'builds', filters] as const,
    gitRefs: (productId?: string, repoName?: string) => ['tfs', 'gitRefs', productId, repoName] as const,
  },

  // ── Customer Portal Users ──
  customerPortalUsers: {
    all: ['customerPortalUsers'] as const,
    list: () => [...['customerPortalUsers'], 'list'] as const,
  },

  // ── Metrics ──
  metrics: {
    all: ['metrics'] as const,
    doraTrend: (filters?: Record<string, unknown>) => ['metrics', 'doraTrend', filters] as const,
    releaseOps: (filters?: Record<string, unknown>) => ['metrics', 'releaseOps', filters] as const,
    todoTrend: (filters?: Record<string, unknown>) => ['metrics', 'todoTrend', filters] as const,
    awarenessDetail: (type: string) => ['metrics', 'awarenessDetail', type] as const,
  },

  // ── Dashboard Extended ──
  dashboardHighlights: ['dashboard', 'highlights'] as const,
  versionTransitionDetail: (versionId: string) => ['dashboard', 'versionTransition', versionId] as const,

  // ── Customer Calendar ──
  customerCalendar: {
    all: ['customerCalendar'] as const,
    list: (filters?: Record<string, unknown>) => [...['customerCalendar'], 'list', filters] as const,
  },

  // ── Product Access ──
  productAccess: {
    all: ['productAccess'] as const,
    byUser: (userId: string) => ['productAccess', 'byUser', userId] as const,
  },
} as const;
