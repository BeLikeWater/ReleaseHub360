import { Page, expect } from '@playwright/test';

export const ADMIN = {
  email: 'admin@releasehub360.local',
  password: 'admin123',
};

export const BASE = 'http://localhost:5173';
export const API = 'http://localhost:3001';

/** Admin olarak login ol, token localStorage'a kaydedilir */
export async function loginAs(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Ana sayfaya yönlendirme veya ana URL'ye gelme bekleniyor
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

/** Ekranda herhangi bir API error toastı / hata mesajı var mı? */
export async function hasError(page: Page): Promise<string | null> {
  const selectors = [
    '[role="alert"]',
    '.MuiAlert-message',
    '[class*="error"]',
    '[data-testid="error"]',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      return await el.textContent() ?? 'hata var';
    }
  }
  return null;
}

/** Bir MUI select/autocomplete'i değer girerek seç */
export async function selectMui(page: Page, label: string, value: string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: value }).click();
}

/** Sayfa yüklenirken Skeleton/CircularProgress yok olana kadar bekle */
export async function waitForLoad(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {}); // ignore timeout
}

/** Tablo veya liste en az N kayıt içeriyor mu kontrol et */
export async function assertMinRows(page: Page, min = 1) {
  const rows = page.locator('table tbody tr, [role="row"], [data-testid="row"]');
  await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(min);
  return count;
}

/** MUI Dialog açık mı? (Drawer'dan ayırt etmek için .MuiDialog-paper kullanılır) */
export async function dialogOpen(page: Page): Promise<boolean> {
  return page.locator('.MuiDialog-paper').isVisible({ timeout: 3_000 }).catch(() => false);
}

/** MUI Dialog VEYA Drawer panel açık mı? (Bazı sayfalar Drawer kullanır) */
export async function panelOpen(page: Page): Promise<boolean> {
  const dlg = await page.locator('.MuiDialog-paper').isVisible({ timeout: 1_500 }).catch(() => false);
  if (dlg) return true;
  const drawer = await page.locator('.MuiDrawer-paperAnchorRight').isVisible({ timeout: 1_500 }).catch(() => false);
  return drawer;
}

/** Sayfa başlığını (Typography h4/h5/h6 veya page-title) al */
export async function getPageTitle(page: Page): Promise<string> {
  const h = page.locator('h4, h5, h6, [data-testid="page-title"]').first();
  return (await h.textContent({ timeout: 5_000 }).catch(() => '')) ?? '';
}

/** Snackbar/toast mesajını bekle ve döndür */
export async function waitForToast(page: Page, timeout = 6_000): Promise<string | null> {
  const toast = page.locator('.MuiSnackbar-root, [role="alert"]').first();
  try {
    await toast.waitFor({ state: 'visible', timeout });
    return await toast.textContent();
  } catch {
    return null;
  }
}

/** Backend API'yi doğrudan çağır (token almak için) */
export async function getApiToken(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
  });
  const d = (await res.json()) as { data: { accessToken: string } };
  return d.data.accessToken;
}
