import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.goto('https://bbq-experience.com/en/', { waitUntil: 'networkidle' });
await page.click('#mobile-menu-toggle', { force: true });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const panel = document.getElementById('mobile-menu-panel');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const nav = panel?.querySelector('.mobile-panel__nav');
  const link0 = panel?.querySelector('.mobile-nav-link');
  const cs = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return { display: s.display, opacity: s.opacity, transform: s.transform, bg: s.backgroundColor, width: s.width, height: s.height, zIndex: s.zIndex, position: s.position, transition: s.transition };
  };
  return {
    panelClasses: panel?.className,
    panelStyle: cs(panel),
    backdropClasses: backdrop?.className,
    backdropStyle: cs(backdrop),
    navStyle: cs(nav),
    link0Style: cs(link0),
    link0Text: link0?.textContent?.trim().slice(0, 60),
    panelChildrenCount: panel?.childElementCount,
    navChildrenCount: nav?.childElementCount,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
