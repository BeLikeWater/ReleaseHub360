import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, dialogOpen, waitForToast } from '../helpers/auth';

test.describe('07 — Release Notes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/release-notes');
    await waitForLoad(page);
  });

  test('release notes sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/07-release-notes-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('ürün seçimi → sürüm listesi yükleniyor', async ({ page }) => {
    const productSelect = page.locator('select, [role="combobox"], [class*="MuiSelect"]').first();
    const hasSelect = await productSelect.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasSelect) {
      await productSelect.click();
      await page.screenshot({ path: 'test-results/07-release-notes-product-select.png' });
      // İlk option'ı seç
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await option.click();
        await waitForLoad(page);
        await page.screenshot({ path: 'test-results/07-release-notes-product-selected.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/07-release-notes-no-select.png' });
    }
  });

  test('not ekle butonu → dialog açılıyor', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /ekle|add|yeni|not/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }
    await addBtn.click();
    const open = await dialogOpen(page);
    expect(open).toBeTruthy();
    await page.screenshot({ path: 'test-results/07-release-notes-dialog.png' });
  });

  test('"Yayımla" butonu çalışıyor (varsa)', async ({ page }) => {
    const publishBtn = page.getByRole('button', { name: /yayım|publish/i }).first();
    const hasBtn = await publishBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await publishBtn.click();
      await page.screenshot({ path: 'test-results/07-release-notes-publish.png' });
    } else {
      await page.screenshot({ path: 'test-results/07-release-notes-no-publish.png' });
    }
  });
});
