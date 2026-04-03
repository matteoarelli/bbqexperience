import { test, expect } from '@playwright/test';

test.describe('Dark/Light mode', () => {
  test('toggle cambia tema e persiste', async ({ page }) => {
    await page.goto('/en/');
    const toggle = page.locator('[data-theme-toggle], button:has-text("theme"), button:has-text("Theme")').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(theme).toBe('light');

      await page.reload();
      const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(themeAfterReload).toBe('light');
    }
  });
});

test.describe('Search dialog', () => {
  test('si apre e accetta input', async ({ page }) => {
    await page.goto('/en/');
    const searchButton = page.locator('button[aria-label*="earch"], button[aria-label*="cerca"], [data-search-trigger]').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      const dialog = page.locator('[role="dialog"], dialog').first();
      await expect(dialog).toBeVisible();
    }
  });
});

test.describe('Reviews page', () => {
  test('/en/reviews/ carica e mostra contenuto', async ({ page }) => {
    const response = await page.goto('/en/reviews/');
    expect(response?.status()).toBe(200);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Recipes page', () => {
  test('/en/recipes/ carica e mostra contenuto', async ({ page }) => {
    const response = await page.goto('/en/recipes/');
    expect(response?.status()).toBe(200);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});
