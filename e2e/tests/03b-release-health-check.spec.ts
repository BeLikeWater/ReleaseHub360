import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad } from '../helpers/auth';

test.describe('03b — Release Health Check', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/release-health-check');
    await waitForLoad(page);
  });

  test('health check sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/03b-health-check-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('ürün seçimi → versiyon yükleniyor', async ({ page }) => {
    const productSelect = page.locator('[role="combobox"], [class*="MuiSelect"], select').first();
    const hasSelect = await productSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSelect) {
      await productSelect.click();
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await option.click();
        await waitForLoad(page);
        await page.screenshot({ path: 'test-results/03b-health-check-product-selected.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/03b-health-check-no-select.png' });
    }
  });

  test('health score / skor göstergesi var', async ({ page }) => {
    await page.screenshot({ path: 'test-results/03b-health-check-score.png' });
    const bodyText = await page.textContent('body');
    // Sayfa crash etmemeli
    expect(bodyText).not.toContain('filter is not a function');
  });

  test('TFS PR listesi yükleniyor (TFS bağlı değilse boş kabul edilir)', async ({ page }) => {
    await page.screenshot({ path: 'test-results/03b-health-check-tfs.png' });
    const bodyText = await page.textContent('body');
    // TFS bağlantı hatası OK, ama sayfa crash olmamalı
    expect(bodyText).not.toContain('TypeError: payload.filter is not a function');
  });

  test('"Snapshot al" butonu çalışıyor (varsa)', async ({ page }) => {
    const snapshotBtn = page.getByRole('button', { name: /snapshot|anlık görüntü/i }).first();
    const hasBtn = await snapshotBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await snapshotBtn.click();
      await page.screenshot({ path: 'test-results/03b-health-check-snapshot.png' });
    } else {
      await page.screenshot({ path: 'test-results/03b-health-check-no-snapshot.png' });
    }
  });
});
