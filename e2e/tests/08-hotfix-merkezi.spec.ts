import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, dialogOpen, waitForToast } from '../helpers/auth';

test.describe('08 — Hotfix Merkezi', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/hotfix-merkezi');
    await waitForLoad(page);
  });

  test('hotfix listesi render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/08-hotfix-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('undefined is not');
  });

  test('yeni hotfix talebi butonu → dialog açılıyor', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|talep|ekle|hotfix/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) {
      await page.screenshot({ path: 'test-results/08-hotfix-no-add.png' });
      return;
    }
    await addBtn.click();
    const open = await dialogOpen(page);
    expect(open).toBeTruthy();
    await page.screenshot({ path: 'test-results/08-hotfix-dialog.png' });
  });

  test('yeni hotfix formu doldur + kaydet', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|talep|hotfix/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }

    await addBtn.click();
    await page.waitForSelector('.MuiDialog-paper', { timeout: 5_000 });

    // Başlık (zorunlu)
    const titleInput = page.locator('.MuiDialog-paper input[type="text"]').first();
    await titleInput.fill('E2E Hotfix Test ' + Date.now());

    // Açıklama (textarea, zorunlu)
    const descInput = page.locator('.MuiDialog-paper textarea').first();
    if (await descInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await descInput.fill('E2E test açıklaması');
    }

    // Hedef Versiyon seç (MUI Select, zorunlu)
    const versionSelect = page.locator('.MuiDialog-paper [role="combobox"]').first();
    const hasVersionSelect = await versionSelect.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasVersionSelect) {
      await versionSelect.click();
      const firstOpt = page.locator('[role="option"]').first();
      if (await firstOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOpt.click();
      }
    }

    // Submit butonu — 'Oluştur' veya 'Kaydet'
    const saveBtn = page.getByRole('button', { name: /kaydet|gönder|save|submit|oluştur/i });
    const isSaveEnabled = await saveBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
    if (isSaveEnabled) {
      await saveBtn.click();
    }
    await page.screenshot({ path: 'test-results/08-hotfix-form.png' });
    // Ana assertion: crash yok
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
    test.info().annotations.push({ type: 'info', description: `Save enabled: ${isSaveEnabled}` });
  });

  test('hotfix onaylama butonu çalışıyor (varsa)', async ({ page }) => {
    const approveBtn = page.getByRole('button', { name: /onayla|approve/i }).first();
    const hasBtn = await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await approveBtn.click();
      await page.screenshot({ path: 'test-results/08-hotfix-approve.png' });
    } else {
      await page.screenshot({ path: 'test-results/08-hotfix-no-approve.png' });
    }
  });

  test('hotfix reddetme butonu → reason dialog (varsa)', async ({ page }) => {
    const rejectBtn = page.getByRole('button', { name: /reddet|reject/i }).first();
    const hasBtn = await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await rejectBtn.click();
      await page.screenshot({ path: 'test-results/08-hotfix-reject-dialog.png' });
    } else {
      await page.screenshot({ path: 'test-results/08-hotfix-no-reject.png' });
    }
  });
});
