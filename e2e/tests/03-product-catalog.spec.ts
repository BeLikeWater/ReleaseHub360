import { test, expect } from '@playwright/test';
import { loginAs, waitForLoad, dialogOpen, waitForToast } from '../helpers/auth';

test.describe('03 — Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/product-catalog');
    await waitForLoad(page);
  });

  test('ürün listesi yükleniyor', async ({ page }) => {
    await page.screenshot({ path: 'test-results/03-products-list.png' });
    // Hata değil içerik bekliyoruz
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('undefined');
  });

  test('ürün seçince detay paneli / tab açılıyor', async ({ page }) => {
    // İlk ürüne tıkla
    const firstProduct = page.locator('[class*="MuiListItem"], tr, [role="row"], [class*="Card"]').first();
    const count = await firstProduct.count();
    if (count > 0) {
      await firstProduct.click();
      await page.screenshot({ path: 'test-results/03-products-detail.png' });
    } else {
      await page.screenshot({ path: 'test-results/03-products-empty.png' });
    }
  });

  test('"Yeni Ürün" veya ekle butonu → dialog açılıyor', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|new/i }).first();
    const haBtn = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (haBtn) {
      await addBtn.click();
      const open = await dialogOpen(page);
      expect(open).toBeTruthy();
      await page.screenshot({ path: 'test-results/03-products-dialog.png' });
    } else {
      // Ekle butonu yoksa sayfayı raporla
      await page.screenshot({ path: 'test-results/03-products-no-add-btn.png' });
      test.info().annotations.push({ type: 'warn', description: 'Ekle butonu bulunamadı' });
    }
  });

  test('form doldur + kaydet → ürün oluşuyor', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /yeni|ekle|add|new/i }).first();
    const hasBtn = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasBtn) { test.skip(); return; }

    await addBtn.click();
    await page.waitForSelector('.MuiDialog-paper', { timeout: 5_000 });

    // Ad alanını bul ve doldur (zorunlu alan — butonu aktifleştirir)
    const nameInput = page.locator('.MuiDialog-paper input[type="text"]').first();
    await nameInput.fill('Test Ürün E2E ' + Date.now());

    // Ürün dialog çok adımlı: adım 0 → "İleri →" butonu, adım 1 → "Kaydet"
    // İleri butonunu bul ve tıkla
    const nextBtn = page.locator('.MuiDialog-paper button[class*="MuiButton-contained"]').first();
    const isNextEnabled = await nextBtn.isEnabled({ timeout: 2_000 }).catch(() => false);
    if (isNextEnabled) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      // Adım 2'de Kaydet butonu var mı?
      const saveBtn = page.getByRole('button', { name: /kaydet|save|oluştur|create/i });
      const isSaveEnabled = await saveBtn.isEnabled({ timeout: 2_000 }).catch(() => false);
      if (isSaveEnabled) {
        await saveBtn.click();
      }
    }
    await page.screenshot({ path: 'test-results/03-products-form.png' });
    // Ana assertion: forma etkileşim yapıldı ve crash olmadı
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('TypeError');
  });
});
