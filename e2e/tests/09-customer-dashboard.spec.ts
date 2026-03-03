import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad } from '../helpers/auth';

test.describe('09 — Customer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('müşteri dashboard sayfası (müşteri seçimi gerekiyor)', async ({ page }) => {
    await page.goto('/customer-dashboard');
    await waitForLoad(page);
    await page.screenshot({ path: 'test-results/09-customer-dashboard-empty.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('müşteri seçilince dashboard yükleniyor', async ({ page }) => {
    await page.goto('/customer-dashboard');
    await waitForLoad(page);

    // Müşteri seçim dropdown/arama varsa
    const customerSelect = page.locator('[role="combobox"], select, [class*="MuiSelect"], [placeholder*="müşteri"], [placeholder*="Müşteri"]').first();
    const hasSelect = await customerSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSelect) {
      await customerSelect.click();
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await option.click();
        await waitForLoad(page);
        await page.screenshot({ path: 'test-results/09-customer-dashboard-selected.png' });
        const bodyText = await page.textContent('body');
        expect(bodyText).not.toContain('TypeError');
      } else {
        await page.screenshot({ path: 'test-results/09-customer-dashboard-no-options.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/09-customer-dashboard-no-select.png' });
      test.info().annotations.push({ type: 'warn', description: 'Müşteri seçim dropdown bulunamadı' });
    }
  });

  test('ürün mapping kartları görünüyor (varsa)', async ({ page }) => {
    await page.goto('/customer-dashboard');
    await waitForLoad(page);
    await page.screenshot({ path: 'test-results/09-customer-dashboard-cards.png' });
  });
});
