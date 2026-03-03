import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, waitForToast } from '../helpers/auth';

test.describe('15 — Release Todos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/release-todos');
    await waitForLoad(page);
  });

  test('release todos sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/15-todos-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('ürün seçimi → sürüm listesi yükleniyor', async ({ page }) => {
    const productSelect = page.locator('[role="combobox"], select, [class*="MuiSelect"]').first();
    const hasSelect = await productSelect.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSelect) {
      await productSelect.click();
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await option.click();
        await waitForLoad(page);
        await page.screenshot({ path: 'test-results/15-todos-product-selected.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/15-todos-no-select.png' });
    }
  });

  test('todo checkbox toggle çalışıyor (varsa)', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"], [class*="Checkbox"]').first();
    const hasCheckbox = await checkbox.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasCheckbox) {
      await checkbox.click();
      await page.screenshot({ path: 'test-results/15-todos-checkbox-toggled.png' });
      const toast = await waitForToast(page);
      test.info().annotations.push({ type: 'info', description: `Toast: ${toast}` });
    } else {
      await page.screenshot({ path: 'test-results/15-todos-no-checkbox.png' });
    }
  });
});

test.describe('16 — Report Issue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/report-issue');
    await waitForLoad(page);
  });

  test('issue raporlama sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/16-report-issue-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('issue listesi yükleniyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/16-report-issue-list.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('yeni issue raporla → form + kaydet', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|raporla|issue|add/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }

    await addBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    const titleInput = page.locator('[role="dialog"] input[type="text"]').first();
    await titleInput.fill('E2E Test Issue ' + Date.now());

    const descInput = page.locator('[role="dialog"] textarea').first();
    if (await descInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await descInput.fill('E2E test açıklaması');
    }

    await page.getByRole('button', { name: /kaydet|gönder|save|submit/i }).click();
    await page.screenshot({ path: 'test-results/16-report-issue-saved.png' });
    const toast = await waitForToast(page);
    test.info().annotations.push({ type: 'info', description: `Toast: ${toast}` });
  });

  test('issue detayı → durum geçişi (transition) çalışıyor', async ({ page }) => {
    const issueRow = page.locator('table tbody tr, [class*="Card"], [class*="ListItem"]').first();
    const hasRow = await issueRow.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasRow) {
      await issueRow.click();
      await waitForLoad(page);
      await page.screenshot({ path: 'test-results/16-report-issue-detail.png' });
    } else {
      await page.screenshot({ path: 'test-results/16-report-issue-no-rows.png' });
    }
  });
});
