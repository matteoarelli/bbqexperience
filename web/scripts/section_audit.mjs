// Cattura screenshot mobile per sezioni scrollate (viewport 390x844 iPhone 13).
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'screenshots', 'sections');
mkdirSync(outDir, { recursive: true });

const BASE = 'https://bbq-experience.com';
const pages = [
  ['home', '/en/'],
  ['recipe', '/en/recipes/bbq-sauce-recipe/'],
  ['review', '/en/reviews/meater-plus-wireless-thermometer-review/'],
  ['reviews-list', '/en/reviews/'],
];

const iphone = devices['iPhone 13'];
const browser = await chromium.launch();

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ ...iphone, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    try { localStorage.setItem('bbq-theme', t); } catch {}
  }, theme);

  for (const [name, path] of pages) {
    const url = `${BASE}${path}`;
    console.log(`[${theme}] ${name}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(700);
      const cookieAccept = await page.$('button:has-text("ACCEPT")');
      if (cookieAccept) await cookieAccept.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);

      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const vh = 844;
      let pos = 0;
      let i = 0;
      while (pos < total && i < 10) {
        await page.evaluate((y) => window.scrollTo(0, y), pos);
        await page.waitForTimeout(400);
        await page.screenshot({
          path: join(outDir, `${theme}_${name}_${String(i).padStart(2, '0')}.png`),
          fullPage: false,
        });
        pos += vh;
        i++;
      }
    } catch (e) {
      console.log(`  ERR: ${e.message.slice(0, 100)}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`Done -> ${outDir}`);
