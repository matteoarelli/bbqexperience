// Cattura screenshot full-page mobile in dark + light per audit completo.
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'screenshots', 'audit');
mkdirSync(outDir, { recursive: true });

const BASE = 'https://bbq-experience.com';
const pages = [
  ['home',         '/en/'],
  ['blog',         '/en/blog/weber-kettle-vs-big-green-egg-comparison/'],
  ['recipe',       '/en/recipes/bbq-sauce-recipe/'],
  ['review',       '/en/reviews/meater-plus-wireless-thermometer-review/'],
  ['reviews-list', '/en/reviews/'],
  ['recipes-list', '/en/recipes/'],
];

const iphone = devices['iPhone 13'];
const browser = await chromium.launch();

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    ...iphone,
    colorScheme: theme,
    storageState: undefined,
  });
  const page = await ctx.newPage();
  // Persist theme via localStorage
  await page.addInitScript((t) => {
    try { localStorage.setItem('bbq-theme', t); } catch {}
  }, theme);

  for (const [name, path] of pages) {
    const url = `${BASE}${path}`;
    console.log(`[${theme}] -> ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(700);
      // Dismiss cookie banner per non oscurare contenuto
      const cookieAccept = await page.$('button:has-text("Accept"), button:has-text("ACCEPT")');
      if (cookieAccept) {
        await cookieAccept.click({ force: true, timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
      await page.screenshot({
        path: join(outDir, `${theme}_${name}.png`),
        fullPage: true,
      });
    } catch (e) {
      console.log(`  ERR ${name}: ${e.message.slice(0, 100)}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`Done -> ${outDir}`);
