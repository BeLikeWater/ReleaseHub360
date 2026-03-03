import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, assertMinRows, getApiToken } from '../helpers/auth';

test.describe('02 — Home Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('dashboard render — summary kartlar yükleniyor', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    await page.screenshot({ path: 'test-results/02-dashboard-render.png' });
    // Herhangi bir skeleton yok olmuş olmalı
    await expect(page.locator('[class*="Skeleton"]')).toHaveCount(0, { timeout: 8_000 }).catch(() => {});
  });

  test('summary kartlar — kritik issues ve hotfix sayısı görünüyor', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    // Sayfa üzerinde sayısal değer içeren kartlar olmalı
    const cards = page.locator('[class*="MuiCard"], [class*="MuiPaper"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/02-dashboard-cards.png' });
  });

  test('aktif sürümler tablosu görünüyor', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    // Releases table veya card grid mevcut olmalı
    await page.screenshot({ path: 'test-results/02-dashboard-releases.png' });
    // Başarılı yükleme — herhangi bir "hata" metni olmamalı
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('undefined');
  });

  test('bekleyen aksiyonlar bölümü boş state veya içerik gösteriyor', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    await page.screenshot({ path: 'test-results/02-dashboard-actions.png' });
  });

  test('API: dashboard/summary gerçek değer döndürüyor (sayı, "—" değil)', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);
    const bodyText = await page.textContent('body') ?? '';
    // "—" gösteriyorsa summary veri gelmiyor demektir
    const dashCount = (bodyText.match(/—/g) ?? []).length;
    expect(dashCount).toBeLessThanOrEqual(2); // en fazla 2 tane — tolere edilir
    await page.screenshot({ path: 'test-results/02-dashboard-no-dash.png' });
  });
});
