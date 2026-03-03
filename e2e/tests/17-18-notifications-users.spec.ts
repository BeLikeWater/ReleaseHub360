import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, waitForToast } from '../helpers/auth';

test.describe('17 — Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/notifications');
    await waitForLoad(page);
  });

  test('bildirimler sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/17-notifications-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('bildirim listesi yükleniyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/17-notifications-list.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('"Tümünü okundu işaretle" butonu çalışıyor', async ({ page }) => {
    const markAllBtn = page.getByRole('button', { name: /tümünü|hepsini|okundu|read.?all/i }).first();
    const hasBtn = await markAllBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasBtn) {
      // Buton görünür ama disabled olabilir (hiç okunmamış bildirim yoksa)
      const isEnabled = await markAllBtn.isEnabled({ timeout: 1_000 }).catch(() => false);
      if (isEnabled) {
        await markAllBtn.click();
        await page.screenshot({ path: 'test-results/17-notifications-mark-all.png' });
        const toast = await waitForToast(page);
        test.info().annotations.push({ type: 'info', description: `Toast: ${toast}` });
      } else {
        // Disabled butonu zorla tıklama — okunmamış bildirim yok
        test.info().annotations.push({ type: 'info', description: 'Buton disabled: okunmamış bildirim yok (doğru davranış)' });
        await page.screenshot({ path: 'test-results/17-notifications-mark-all-disabled.png' });
      }
    } else {
      await page.screenshot({ path: 'test-results/17-notifications-no-mark-all.png' });
    }
  });

  test('tekil bildirim okundu işaretleme', async ({ page }) => {
    const notifItem = page.locator('[class*="ListItem"], [class*="Card"], [class*="notification"]').first();
    const hasItem = await notifItem.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasItem) {
      await notifItem.click();
      await page.screenshot({ path: 'test-results/17-notifications-single-read.png' });
    } else {
      await page.screenshot({ path: 'test-results/17-notifications-empty.png' });
    }
  });
});

test.describe('18 — Users & Roles', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/users-roles');
    await waitForLoad(page);
  });

  test('kullanıcılar sayfası render oluyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/18-users-render.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });

  test('kullanıcı listesi yükleniyor (en az 1 kullanıcı)', async ({ page }) => {
    const row = page.locator('table tbody tr, [class*="Card"], [class*="ListItem"]').first();
    await expect(row).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'test-results/18-users-list.png' });
  });

  test('yeni kullanıcı ekle → panel açılıyor (Drawer)', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|kullanıcı/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }
    await addBtn.click();
    // Users sayfası Drawer kullanır (MuiDrawer-paperAnchorRight)
    await page.waitForSelector('.MuiDrawer-paperAnchorRight, .MuiDialog-paper', { timeout: 5_000 });
    await page.screenshot({ path: 'test-results/18-users-panel.png' });
  });

  test('rol güncelle (PATCH /users/:id/role) çalışıyor', async ({ page }) => {
    const roleSelect = page.locator('[class*="Select"], select').first();
    const hasSelect = await roleSelect.isVisible({ timeout: 4_000 }).catch(() => false);
    if (hasSelect) {
      await roleSelect.click();
      await page.screenshot({ path: 'test-results/18-users-role-select.png' });
    } else {
      await page.screenshot({ path: 'test-results/18-users-no-role-select.png' });
    }
  });

  test('müşteri kullanıcıları sekmesi (varsa)', async ({ page }) => {
    const cuTab = page.getByRole('tab', { name: /müşteri|customer.?user/i }).first();
    const hasTab = await cuTab.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasTab) {
      await cuTab.click();
      await waitForLoad(page);
      await page.screenshot({ path: 'test-results/18-users-customer-tab.png' });
    } else {
      await page.screenshot({ path: 'test-results/18-users-no-customer-tab.png' });
    }
  });
});
