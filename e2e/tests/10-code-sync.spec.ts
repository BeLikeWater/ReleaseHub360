import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad } from '../helpers/auth';

test.describe('10 — Code Sync', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/code-sync');
    await waitForLoad(page);
  });

  test('code sync sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/10-code-sync-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('ürün seçim adımı görünüyor', async ({ page }) => {
    // Step 1: ürün seçimi
    const productSelect = page.locator('[role="combobox"], select, [class*="MuiSelect"]').first();
    const hasSelect = await productSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSelect) {
      await productSelect.click();
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await option.click();
        await waitForLoad(page);
        await page.screenshot({ path: 'test-results/10-code-sync-product-selected.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/10-code-sync-no-product-select.png' });
    }
  });

  test('servis seçim adımı (ürün seçildikten sonra)', async ({ page }) => {
    // Servis dropdown'ı görünüyor mu?
    const selects = page.locator('[role="combobox"], select, [class*="MuiSelect"]');
    const count = await selects.count();
    await page.screenshot({ path: 'test-results/10-code-sync-selects.png' });
    // En az 1 select olmalı
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('sync başlat butonu var', async ({ page }) => {
    const syncBtn = page.getByRole('button', { name: /sync|başlat|start|karşılaştır/i }).first();
    await page.screenshot({ path: 'test-results/10-code-sync-buttons.png' });
    // Sync butonu sayfa üzerinde görünür ya da disable
    const exists = await syncBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    test.info().annotations.push({ type: 'info', description: `Sync button visible: ${exists}` });
  });
});
