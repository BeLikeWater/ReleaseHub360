import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad } from '../helpers/auth';

test.describe('11 — Service Version Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/service-version-matrix');
    await waitForLoad(page);
  });

  test('servis versiyon matris sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/11-svm-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('filter is not a function');
  });

  test('tablo / matris görünümü yükleniyor', async ({ page }) => {
    const table = page.locator('table, [class*="Matrix"], [class*="Grid"]').first();
    await page.screenshot({ path: 'test-results/11-svm-table.png' });
    // Hata olmadan yüklenmeli
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('undefined is not');
  });

  test('ürün/müşteri filtresi çalışıyor (varsa)', async ({ page }) => {
    const filterEl = page.locator('[role="combobox"], select, input[placeholder*="filtre"], input[placeholder*="ara"]').first();
    const hasFilter = await filterEl.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasFilter) {
      await filterEl.click();
      await page.screenshot({ path: 'test-results/11-svm-filter.png' });
    } else {
      await page.screenshot({ path: 'test-results/11-svm-no-filter.png' });
    }
  });
});

test.describe('12 — Change Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/change-tracking');
    await waitForLoad(page);
  });

  test('değişiklik takip sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/12-change-tracking-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('değişiklik listesi veya boş state gösteriyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/12-change-tracking-list.png' });
    // API hatası yoksa body'de içerik olmalı
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read property');
  });

  test('yeni değişiklik ekle butonu (varsa)', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|değişiklik/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasBtn) {
      await addBtn.click();
      await page.screenshot({ path: 'test-results/12-change-tracking-dialog.png' });
    } else {
      await page.screenshot({ path: 'test-results/12-change-tracking-no-add.png' });
    }
  });
});
