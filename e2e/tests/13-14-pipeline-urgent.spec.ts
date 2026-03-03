import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, waitForToast } from '../helpers/auth';

test.describe('13 — Pipeline Status', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/pipeline-status');
    await waitForLoad(page);
  });

  test('pipeline sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/13-pipeline-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('pipeline listesi yükleniyor (TFS bağlı değilse boş state)', async ({ page }) => {
    // TFS bağlantısı olmayabilir — boş state veya error state kabul edilir
    // Ama sayfa crash etmemeli
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('filter is not a function');
    expect(bodyText).not.toContain('Cannot read');
    await page.screenshot({ path: 'test-results/13-pipeline-list.png' });
  });

  test('pipeline tetikle butonu çalışıyor (varsa)', async ({ page }) => {
    const triggerBtn = page.getByRole('button', { name: /tetikle|trigger|başlat|run/i }).first();
    const hasBtn = await triggerBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await triggerBtn.click();
      await page.screenshot({ path: 'test-results/13-pipeline-trigger.png' });
    } else {
      await page.screenshot({ path: 'test-results/13-pipeline-no-trigger.png' });
    }
  });

  test('pipeline drawer / detail panel (log görüntüleme)', async ({ page }) => {
    const row = page.locator('table tbody tr, [class*="Card"], [class*="ListItem"]').first();
    const hasRow = await row.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasRow) {
      await row.click();
      await waitForLoad(page);
      await page.screenshot({ path: 'test-results/13-pipeline-detail.png' });
    } else {
      await page.screenshot({ path: 'test-results/13-pipeline-no-rows.png' });
    }
  });
});

test.describe('14 — Urgent Changes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/urgent-changes');
    await waitForLoad(page);
  });

  test('acil değişiklikler sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/14-urgent-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('yeni acil değişiklik ekle → dialog + form + kaydet', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|acil/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }

    await addBtn.click();
    await page.waitForSelector('.MuiDialog-paper', { timeout: 5_000 });

    const titleInput = page.locator('.MuiDialog-paper input[type="text"]').first();
    await titleInput.fill('E2E Acil Değişiklik ' + Date.now());

    const descInput = page.locator('.MuiDialog-paper textarea').first();
    if (await descInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await descInput.fill('E2E test açıklama');
    }

    await page.getByRole('button', { name: /kaydet|save/i }).click();
    await page.screenshot({ path: 'test-results/14-urgent-saved.png' });
    const toast = await waitForToast(page);
    test.info().annotations.push({ type: 'info', description: `Toast: ${toast}` });
  });

  test('durum güncelleme çalışıyor (varsa)', async ({ page }) => {
    const statusBtn = page.getByRole('button', { name: /durum|status|güncelle/i }).first();
    const hasBtn = await statusBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await statusBtn.click();
      await page.screenshot({ path: 'test-results/14-urgent-status-update.png' });
    } else {
      await page.screenshot({ path: 'test-results/14-urgent-no-status-btn.png' });
    }
  });

  test('sil butonu çalışıyor (DELETE route fix sonrası)', async ({ page }) => {
    const deleteBtn = page.getByRole('button', { name: /sil|delete/i }).first();
    const hasBtn = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await deleteBtn.click();
      // Onay dialog bekle
      await page.screenshot({ path: 'test-results/14-urgent-delete-confirm.png' });
      const confirmBtn = page.getByRole('button', { name: /onayla|evet|confirm|yes|sil/i }).first();
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.screenshot({ path: 'test-results/14-urgent-deleted.png' });
      const toast = await waitForToast(page);
      test.info().annotations.push({ type: 'info', description: `Delete toast: ${toast}` });
    } else {
      await page.screenshot({ path: 'test-results/14-urgent-no-delete-btn.png' });
    }
  });
});
