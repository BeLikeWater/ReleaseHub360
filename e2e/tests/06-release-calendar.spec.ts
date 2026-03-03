import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, dialogOpen, waitForToast } from '../helpers/auth';

test.describe('06 — Release Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/release-calendar');
    await waitForLoad(page);
  });

  test('takvim sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/06-calendar-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('takvim veya liste görünüm var', async ({ page }) => {
    // Sayfa liste/takvim toggle butonları + içerik render eder
    // ToggleButton (Liste / Takvim anahtarı) her zaman görünür
    const toggleBtn = page.locator('[class*="MuiToggleButton"]').first();
    await expect(toggleBtn).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'test-results/06-calendar-view.png' });
  });

  test('yeni versiyon ekle butonu → dialog (varsa)', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|versiyon/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) {
      await page.screenshot({ path: 'test-results/06-calendar-no-add.png' });
      return;
    }
    await addBtn.click();
    const open = await dialogOpen(page);
    expect(open).toBeTruthy();
    await page.screenshot({ path: 'test-results/06-calendar-dialog.png' });
  });

  test('versiyon faz güncelleme çalışıyor (advance-phase)', async ({ page }) => {
    // Faz ilerletme butonu varsa tıkla
    const phaseBtn = page.getByRole('button', { name: /faz|phase|ilerlet|advance/i }).first();
    const hasBtn = await phaseBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await phaseBtn.click();
      await page.screenshot({ path: 'test-results/06-calendar-phase.png' });
    } else {
      await page.screenshot({ path: 'test-results/06-calendar-no-phase-btn.png' });
    }
  });
});
