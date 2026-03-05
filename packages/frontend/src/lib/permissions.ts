/**
 * B3-03: Permission utility — Design doc Section 10.4+ yetki matrisleri
 * Buton/UI gizleme için kullanılır.
 */

// ── Kurum (ORG) Yetki Matrisi ──────────────────────────────────────────────────

const ORG_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'users.manage', 'users.invite', 'users.deactivate', 'users.changeRole',
    'products.manage', 'products.create', 'products.delete',
    'releases.manage', 'releases.create', 'releases.approve',
    'customers.manage', 'customers.create', 'customers.delete',
    'settings.manage', 'code-sync.manage',
    'health-check.view', 'health-check.release',
    'reports.view', 'metrics.view',
  ],
  RELEASE_MANAGER: [
    'products.manage', 'products.create',
    'releases.manage', 'releases.create', 'releases.approve',
    'customers.manage', 'customers.create',
    'health-check.view', 'health-check.release',
    'reports.view', 'metrics.view',
  ],
  PRODUCT_OWNER: [
    'products.view',
    'releases.view', 'releases.create',
    'customers.view',
    'health-check.view',
    'reports.view', 'metrics.view',
  ],
  DEVELOPER: [
    'products.view',
    'releases.view',
    'health-check.view',
    'reports.view',
  ],
  DEVOPS_ENGINEER: [
    'products.view',
    'releases.view',
    'code-sync.manage',
    'health-check.view',
    'metrics.view',
  ],
  QA_ENGINEER: [
    'products.view',
    'releases.view',
    'health-check.view',
    'reports.view',
  ],
  VIEWER: [
    'products.view',
    'releases.view',
    'reports.view',
  ],
};

// ── Müşteri (CUSTOMER) Yetki Matrisi ───────────────────────────────────────────

const CUSTOMER_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER_ADMIN: [
    'customer.users.manage', 'customer.users.invite',
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  APP_ADMIN: [
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  APPROVER: [
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.view',
    'customer.calendar.view',
  ],
  BUSINESS_USER: [
    'customer.releases.view',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  PARTNER: [
    'customer.releases.view',
    'customer.calendar.view',
  ],
};

/**
 * Kurum kullanıcısının belirli bir yetkiye sahip olup olmadığını kontrol eder.
 */
export function hasPermission(role: string, action: string): boolean {
  const perms = ORG_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(action);
}

/**
 * Müşteri kullanıcısının belirli bir yetkiye sahip olup olmadığını kontrol eder.
 */
export function hasCustomerPermission(customerRole: string, action: string): boolean {
  const perms = CUSTOMER_PERMISSIONS[customerRole];
  if (!perms) return false;
  return perms.includes(action);
}

/**
 * Belirtilen rolün tüm yetkilerini döndürür.
 */
export function getPermissions(role: string): string[] {
  return ORG_PERMISSIONS[role] ?? [];
}

/**
 * Belirtilen müşteri rolünün tüm yetkilerini döndürür.
 */
export function getCustomerPermissions(customerRole: string): string[] {
  return CUSTOMER_PERMISSIONS[customerRole] ?? [];
}
