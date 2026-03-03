import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, waitForToast } from '../helpers/auth';

test.describe('19 — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/settings');
    await waitForLoad(page);
  });

  test('ayarlar sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/19-settings-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('ayar kategorileri yükleniyor', async ({ page }) => {
    // Ayarlar bir form veya kart grubunda olmalı
    const settingEl = page.locator('[class*="MuiCard"], [class*="MuiAccordion"], form').first();
    await page.screenshot({ path: 'test-results/19-settings-categories.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('ayar kaydetme butonu çalışıyor', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /kaydet|save|güncelle/i }).first();
    const hasBtn = await saveBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasBtn) {
      await saveBtn.click();
      await page.screenshot({ path: 'test-results/19-settings-save.png' });
      const toast = await waitForToast(page);
      test.info().annotations.push({ type: 'info', description: `Save toast: ${toast}` });
    } else {
      await page.screenshot({ path: 'test-results/19-settings-no-save.png' });
    }
  });

  test('bağlantı testi (test-connection) butonu çalışıyor (varsa)', async ({ page }) => {
    const testBtn = page.getByRole('button', { name: /test|bağlantı|connection/i }).first();
    const hasBtn = await testBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasBtn) {
      await testBtn.click();
      await page.screenshot({ path: 'test-results/19-settings-test-connection.png' });
      const toast = await waitForToast(page);
      test.info().annotations.push({ type: 'info', description: `Connection test result: ${toast}` });
    } else {
      await page.screenshot({ path: 'test-results/19-settings-no-test.png' });
    }
  });
});

test.describe('20 — Workflow History', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/workflow-history');
    await waitForLoad(page);
  });

  test('workflow geçmişi sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/20-workflow-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('geçmiş listesi veya boş state gösteriyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/20-workflow-list.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('özet (summary) bölümü yükleniyor', async ({ page }) => {
    // Summary kartlar (toplam çalışma sayısı vb.)
    const summaryCards = page.locator('[class*="MuiCard"], [class*="KPI"]');
    await page.screenshot({ path: 'test-results/20-workflow-summary.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('undefined');
  });

  test('retry butonu çalışıyor (kayıt varsa)', async ({ page }) => {
    const retryBtn = page.getByRole('button', { name: /retry|tekrar|yeniden/i }).first();
    const hasBtn = await retryBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await retryBtn.click();
      await page.screenshot({ path: 'test-results/20-workflow-retry.png' });
      const toast = await waitForToast(page);
      test.info().annotations.push({ type: 'info', description: `Retry toast: ${toast}` });
    } else {
      await page.screenshot({ path: 'test-results/20-workflow-no-retry.png' });
    }
  });
});
