// Cattura screenshot mobile della prod per audit UI.
// Uso: node scripts/mobile_screenshots.mjs <label>   (label = before|after)
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] || 'snap';
const outDir = join(process.cwd(), 'screenshots', label);
mkdirSync(outDir, { recursive: true });

const BASE = process.env.SCREENSHOT_BASE || 'https://bbq-experience.com';
const pages = [
  ['home',         '/en/'],
  ['blog',         '/en/blog/weber-kettle-vs-big-green-egg-comparison/'],
  ['recipe',       '/en/recipes/bbq-sauce-recipe/'],
  ['review',       '/en/reviews/meater-plus-wireless-thermometer-review/'],
  ['reviews-list', '/en/reviews/'],
];

const iphone = devices['iPhone 13'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iphone });
const page = await ctx.newPage();

for (const [name, path] of pages) {
  const url = `${BASE}${path}`;
  console.log(`-> ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);
  // Closed menu
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });

  try {
    const toggle = await page.$('#mobile-menu-toggle');
    if (toggle) {
      await toggle.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(outDir, `${name}_menu-open.png`), fullPage: false });
      await toggle.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(200);
    }
  } catch (e) {
    console.log(`  menu click failed: ${e.message.slice(0, 100)}`);
  }

  try {
    const themeBtn = await page.$('button[aria-label*="light" i]');
    if (themeBtn) {
      await themeBtn.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(outDir, `${name}_light.png`), fullPage: false });
      const back = await page.$('button[aria-label*="dark" i]');
      if (back) await back.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(200);
    }
  } catch (e) {
    console.log(`  theme click failed: ${e.message.slice(0, 100)}`);
  }
}

await browser.close();
console.log(`Done -> ${outDir}`);
