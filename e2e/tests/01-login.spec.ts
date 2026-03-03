import { test, expect } from '@playwright/test';
import { loginAs, hasError, waitForLoad, waitForToast } from '../helpers/auth';

test.describe('01 — Login Ekranı', () => {
  test('login sayfası render oluyor', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/01-login-render.png' });
  });

  test('hatalı şifre → hata mesajı gösterir', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'admin@releasehub360.local');
    await page.fill('input[type="password"]', 'yanlis_sifre');
    await page.click('button[type="submit"]');
    // Backend cevabını bekle, sonra hata mesajını kontrol et
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForSelector('[role="alert"], .MuiAlert-message', { timeout: 8_000 }).catch(() => {});
    const err = await hasError(page);
    await page.screenshot({ path: 'test-results/01-login-wrong-pass.png' });
    expect(err).not.toBeNull();
  });

  test('boş form → hata veya submit disabled', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await page.screenshot({ path: 'test-results/01-login-empty.png' });
    // Ya URL hâlâ /login'de kalmalı ya da hata mesajı çıkmalı
    const url = page.url();
    const err = await hasError(page);
    expect(url.includes('/login') || err !== null).toBeTruthy();
  });

  test('doğru bilgilerle login → dashboard\'a yönlendirir', async ({ page }) => {
    await loginAs(page);
    await page.screenshot({ path: 'test-results/01-login-success.png' });
    expect(page.url()).not.toContain('/login');
  });
});
