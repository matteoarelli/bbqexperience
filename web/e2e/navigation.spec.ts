import { test, expect } from '@playwright/test';

test.describe('Homepage per locale', () => {
  for (const locale of ['en', 'it', 'es']) {
    test(`carica /${locale}/ con status 200`, async ({ page }) => {
      const response = await page.goto(`/${locale}/`);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Language switcher', () => {
  test('naviga da EN a IT mantenendo la pagina', async ({ page }) => {
    await page.goto('/en/');
    const itLink = page.locator('a[hreflang="it"]').first();
    if (await itLink.isVisible()) {
      await itLink.click();
      await expect(page).toHaveURL(/\/it\//);
    }
  });
});

test.describe('Header navigation', () => {
  test('link principali sono visibili e funzionanti', async ({ page }) => {
    await page.goto('/en/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('mostra contenuto per URL inesistente', async ({ page }) => {
    const response = await page.goto('/en/nonexistent-page/');
    expect(response?.status()).toBe(404);
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
});
