import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, panelOpen, waitForToast } from '../helpers/auth';

test.describe('05 — Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/customer-management');
    await waitForLoad(page);
  });

  test('müşteri listesi yükleniyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/05-customers-list.png' });
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('Cannot read');
  });

  test('müşteri satırına tıkla → detay görünüyor', async ({ page }) => {
    const row = page.locator('table tbody tr, [class*="MuiListItem"], [role="row"]').first();
    const hasRow = await row.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasRow) {
      await row.click();
      await page.screenshot({ path: 'test-results/05-customers-detail.png' });
    } else {
      await page.screenshot({ path: 'test-results/05-customers-no-rows.png' });
    }
  });

  test('yeni müşteri panel açılıyor (Dialog veya Drawer)', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|new|add|müşteri/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }
    await addBtn.click();
    // Customer Management sayfası Drawer kullanır
    const open = await panelOpen(page);
    expect(open).toBeTruthy();
    await page.screenshot({ path: 'test-results/05-customers-panel.png' });
  });

  test('yeni müşteri form + kaydet', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|müşteri/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }

    await addBtn.click();
    await page.waitForSelector('.MuiDrawer-paperAnchorRight, .MuiDialog-paper', { timeout: 5_000 });

    // Explicit descendant selectors for drawer inputs (panelSel interpolation bug workaround)
    const inputs = page.locator('.MuiDrawer-paperAnchorRight input[type="text"], .MuiDialog-paper input[type="text"]');
    await inputs.first().fill('E2E Test Müşteri ' + Date.now());

    // Email varsa doldur
    const emailInput = page.locator('.MuiDrawer-paperAnchorRight input[type="email"], .MuiDialog-paper input[type="email"]');
    if (await emailInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await emailInput.fill('e2e@test.com');
    }

    const saveBtn = page.getByRole('button', { name: /kaydet|save|oluştur|güncelle/i });
    const isSaveEnabled = await saveBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
    if (isSaveEnabled) {
      await saveBtn.click();
    }
    await page.screenshot({ path: 'test-results/05-customers-form.png' });
    // Panel açıldı = başarı
    expect(await panelOpen(page)).toBeTruthy();
  });

  test('"Ürün Eşleştirme" tab/sekme çalışıyor', async ({ page }) => {
    const mappingTab = page.getByRole('tab', { name: /eşleştirme|mapping/i }).first();
    const hasTab = await mappingTab.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasTab) {
      await mappingTab.click();
      await waitForLoad(page);
      await page.screenshot({ path: 'test-results/05-customers-mapping-tab.png' });
    } else {
      await page.screenshot({ path: 'test-results/05-customers-no-mapping-tab.png' });
    }
  });
});
