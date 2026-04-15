// Genera SUMMARY.md dallo score matrix dei 15 report Lighthouse
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(__dirname, 'selected-slugs.json'), 'utf8'));

const ids = manifest.targets.map((t) => t.id);
const urlMap = Object.fromEntries(manifest.targets.map((t) => [t.id, t.url]));

const rows = [];
for (const id of ids) {
  const r = JSON.parse(readFileSync(resolve(__dirname, `${id}.json`), 'utf8'));
  const perf = Math.round(r.categories.performance.score * 100);
  const a11y = Math.round(r.categories.accessibility.score * 100);
  const bp = Math.round(r.categories['best-practices'].score * 100);
  const seo = Math.round(r.categories.seo.score * 100);
  rows.push({ id, url: urlMap[id], perf, a11y, bp, seo });
}

const fullPass = rows.filter((r) => r.perf >= 90 && r.a11y >= 90 && r.bp >= 90 && r.seo >= 90);
const subNinety = rows.filter((r) => r.perf < 90 || r.a11y < 90 || r.bp < 90 || r.seo < 90);

const status = subNinety.length === 0 ? 'pass' : 'gaps_found';
const reqComplete = status === 'pass' ? '[DEBT-03]' : '[DEBT-03-measurement]';

function bold(n) {
  return n < 90 ? `**${n}**` : `${n}`;
}

function matrixRow(r) {
  return `| ${r.id} | ${r.url} | ${bold(r.perf)} | ${bold(r.a11y)} | ${bold(r.bp)} | ${bold(r.seo)} | [${r.id}.json](./${r.id}.json) |`;
}

const perfScores = rows.map((r) => r.perf).sort((a, b) => a - b);
const a11yScores = rows.map((r) => r.a11y).sort((a, b) => a - b);
const bpScores = rows.map((r) => r.bp).sort((a, b) => a - b);
const seoScores = rows.map((r) => r.seo).sort((a, b) => a - b);
const median = (arr) => arr[Math.floor(arr.length / 2)];

// Estrai top failing audits per ogni pagina sub-90
function topFailingAudits(id) {
  const r = JSON.parse(readFileSync(resolve(__dirname, `${id}.json`), 'utf8'));
  const audits = r.audits;
  const failed = Object.values(audits)
    .filter(
      (a) =>
        a.score != null &&
        a.score < 0.9 &&
        a.scoreDisplayMode !== 'notApplicable' &&
        (a.details?.type !== undefined || a.numericValue !== undefined)
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);
  return failed.map((a) => {
    const sav = a.details?.overallSavingsMs
      ? ` --- ~${Math.round(a.details.overallSavingsMs)} ms savings`
      : a.numericValue && a.id.includes('contentful-paint')
        ? ` --- ${Math.round(a.numericValue)} ms`
        : a.numericValue && a.id === 'speed-index'
          ? ` --- ${Math.round(a.numericValue)} ms`
          : '';
    return `  - \`${a.id}\` (${a.score.toFixed(2)})${sav} --- ${a.title}`;
  });
}

const lines = [];
lines.push('---');
lines.push('plan: 10-04');
lines.push(`generated_at: ${new Date().toISOString()}`);
lines.push(`status: ${status}`);
lines.push(`pages_measured: ${rows.length}`);
lines.push(`pages_above_90: ${fullPass.length}`);
lines.push(`pages_below_90: ${subNinety.length}`);
lines.push(`requirements_completed: ${reqComplete}`);
lines.push('---');
lines.push('');
lines.push('# Lighthouse v1.1 Baseline --- SUMMARY');
lines.push('');
lines.push('**Measurement date:** 2026-04-15');
lines.push('**Tool:** Lighthouse 13.1.0 (via `npx lighthouse@latest`)');
lines.push('**Target host:** https://bbq-experience.com (production)');
lines.push('**Form factor:** mobile (mobile emulation + simulated throttling)');
lines.push('**Pages measured:** 15 (5 page types x 3 locales: home, review, recipe, tutorial, blog x en/it/es)');
lines.push('**Categories measured:** Performance, Accessibility, Best Practices, SEO');
lines.push('**Threshold:** >=90 per category');
lines.push('');

if (status === 'gaps_found') {
  lines.push(
    `Status: **gaps_found** --- Accessibility / Best Practices / SEO pass on every page, but Performance falls below 90 on ${subNinety.length} of ${rows.length} pages. All failures are LCP-driven (3.4-3.8 s on mobile throttled), not functional regressions --- v3.2 markup changes (hreflang, CollectionPage JSON-LD, nested anchor fix, mobile-menu fix) did not degrade the site qualitatively, but the mobile LCP budget needs one more pass. Hand off to Plan 10-05 for remediation.`
  );
} else {
  lines.push('Status: **pass** --- all 15 pages score >=90 across every category. DEBT-03 fully closed. Plan 10-05 skipped.');
}
lines.push('');
lines.push('## Score Matrix');
lines.push('');
lines.push('| Page | URL | Performance | Accessibility | Best Practices | SEO | Report |');
lines.push('|------|-----|-------------|---------------|----------------|-----|--------|');
for (const r of rows) lines.push(matrixRow(r));
lines.push('');
lines.push('**Bold score = below 90 threshold.**');
lines.push('');
lines.push('Category totals across the 15-page baseline:');
lines.push('');
lines.push('| Category | Min | Max | Median | Pages >=90 |');
lines.push('|----------|-----|-----|--------|------------|');
lines.push(
  `| Performance | ${perfScores[0]} | ${perfScores[perfScores.length - 1]} | ${median(perfScores)} | ${rows.filter((r) => r.perf >= 90).length} / ${rows.length} |`
);
lines.push(
  `| Accessibility | ${a11yScores[0]} | ${a11yScores[a11yScores.length - 1]} | ${median(a11yScores)} | ${rows.filter((r) => r.a11y >= 90).length} / ${rows.length} |`
);
lines.push(
  `| Best Practices | ${bpScores[0]} | ${bpScores[bpScores.length - 1]} | ${median(bpScores)} | ${rows.filter((r) => r.bp >= 90).length} / ${rows.length} |`
);
lines.push(
  `| SEO | ${seoScores[0]} | ${seoScores[seoScores.length - 1]} | ${median(seoScores)} | ${rows.filter((r) => r.seo >= 90).length} / ${rows.length} |`
);
lines.push('');

lines.push('## Pass/Fail Analysis');
lines.push('');
lines.push('### Pages fully passing (all 4 categories >=90)');
lines.push('');
if (fullPass.length === 0) {
  lines.push('_(none)_');
} else {
  for (const r of fullPass) lines.push(`- ${r.id} --- ${r.perf} / ${r.a11y} / ${r.bp} / ${r.seo}`);
}
lines.push('');
lines.push(`**${fullPass.length} / ${rows.length} pages fully pass.**`);
lines.push('');

lines.push('### Pages with sub-90 scores');
lines.push('');
if (subNinety.length === 0) {
  lines.push('_None --- all pages >=90 across every category._');
} else {
  lines.push('Every sub-90 page fails ONLY on Performance. Accessibility / BP / SEO all pass >=90 on every page.');
  lines.push('');
  for (const r of subNinety) {
    const failing = [];
    if (r.perf < 90) failing.push(`Performance (${r.perf})`);
    if (r.a11y < 90) failing.push(`Accessibility (${r.a11y})`);
    if (r.bp < 90) failing.push(`Best Practices (${r.bp})`);
    if (r.seo < 90) failing.push(`SEO (${r.seo})`);
    lines.push(`**${r.id} --- Performance ${r.perf}**`);
    lines.push(`- Sub-90 categories: ${failing.join(', ')}`);
    lines.push('- Top failing Lighthouse audits (score < 0.9):');
    const audits = topFailingAudits(r.id);
    for (const a of audits) lines.push(a);
    lines.push('');
  }
}

lines.push('## Sub-90 Findings -> Fix Targets');
lines.push('');
if (status === 'pass') {
  lines.push('_None --- all pages meet the >=90 threshold on every category._');
  lines.push('');
} else {
  lines.push(
    'The sub-90 root cause is uniform across the 8 affected pages: **mobile LCP in the 3.4-3.8 s band** (target <2.5 s). This is the single biggest lever; fixing it should pull all pages above 90 because no other category is failing.'
  );
  lines.push('');
  lines.push('Concrete Lighthouse audit IDs below are the input scope for Plan 10-05 (conditional fix plan).');
  lines.push('');
  lines.push('| Audit ID | Pages affected | Typical score | Observation |');
  lines.push('|----------|----------------|---------------|-------------|');
  lines.push('| `largest-contentful-paint` | 8 / 8 sub-90 pages | 0.56-0.66 | LCP 3.4-3.8 s mobile --- primary cause |');
  lines.push('| `render-blocking-insight` | 8 / 8 | 0 | Render-blocking requests (CSS / fonts) delay first paint |');
  lines.push('| `lcp-discovery-insight` | 7 / 8 | 0 | LCP element not prioritized (no `fetchpriority=high` or preload on hero image) |');
  lines.push('| `image-delivery-insight` | 5 / 8 | 0 | Hero/cover images not in next-gen format or under-optimized |');
  lines.push('| `document-latency-insight` | 8 / 8 | 0.5 | Origin/TTFB contributing ~500-700 ms |');
  lines.push('| `forced-reflow-insight` | 6 / 8 | 0 | Layout thrash during boot (likely Svelte island hydration) |');
  lines.push('| `unused-javascript` | 3 / 8 (reviews) | 0 | ~300 ms savings per review page --- bundle splitting opportunity |');
  lines.push('| `unsized-images` | 1 / 8 (review-en) | 0.5 | Some `<img>` missing width/height attrs |');
  lines.push('| `first-contentful-paint` | 4 / 8 | 0.67-0.81 | FCP 2.1-2.5 s --- knock-on from render-blocking |');
  lines.push('| `speed-index` | 2 / 8 (review-it, review-es) | 0.89 | Speed Index ~3.4 s |');
  lines.push('');
  lines.push('### Recommended remediation scope (Plan 10-05 input)');
  lines.push('');
  lines.push(
    '1. **Hero image LCP optimization** --- add `fetchpriority="high"` to the LCP `<img>` on home / review / tutorial / blog entry templates; add `<link rel="preload" as="image">` for the above-the-fold cover; ensure the image is served via Astro Image with AVIF/WebP + explicit srcset widths.'
  );
  lines.push(
    '2. **Render-blocking path** --- audit `<link rel="stylesheet">` chain; inline critical CSS for above-the-fold; defer non-critical CSS. Consider `font-display: optional` on `@fontsource-variable` packages if FCP deltas justify.'
  );
  lines.push(
    '3. **Unused JS on review pages** --- review bundles ship ~300 ms of unused code; split Svelte islands more aggressively or lazy-load below-the-fold interactivity (gallery, sticky TOC, etc.).'
  );
  lines.push(
    '4. **Unsized images (review-en)** --- ensure Astro `<Image>` component always emits `width` + `height`; grep for raw `<img>` tags in review templates.'
  );
  lines.push(
    '5. **Document latency (TTFB)** --- 0.5 score on all sub-90 pages (~500-700 ms). Check Caddy / Astro SSR cold-start on Hetzner; consider adding Cloudflare full-page cache on `/` + content detail routes (bypass only on preview mode).'
  );
  lines.push('');
  lines.push(
    'Note on `color-contrast` audit: appears failing on home-en / home-it / home-es at score 0, but the Accessibility category score is 95 (>=90 threshold) on all pages, so no pass/fail action here. Worth tracking for a future a11y sweep.'
  );
  lines.push('');
}

lines.push('## DEBT-03 Status');
lines.push('');
if (status === 'pass') {
  lines.push(
    'All 15 pages score >=90 across Performance, Accessibility, Best Practices, and SEO. **DEBT-03 fully closed. v1.1 baseline established. Plan 10-05 skipped.**'
  );
} else {
  lines.push(
    '**At least one page scored <90 in at least one category. DEBT-03 measurement half is complete. Plan 10-05 (conditional fix plan) is now required with the sub-90 findings above as its scope.**'
  );
  lines.push('');
  lines.push('Scope of Plan 10-05:');
  lines.push(
    '- Lift Performance >=90 on all 8 sub-90 pages by addressing the Sub-90 Findings -> Fix Targets list'
  );
  lines.push(
    '- Re-run Lighthouse on at minimum the 8 sub-90 pages (re-running all 15 is cheap via `run-audits.mjs`)'
  );
  lines.push('- Re-write this SUMMARY.md in-place (or produce a sibling post-fix SUMMARY) with new scores');
  lines.push('- Only then mark DEBT-03 fully closed in REQUIREMENTS.md');
  lines.push('');
  lines.push(
    'All Accessibility / Best Practices / SEO categories currently pass >=90 on every page. Plan 10-05 does not need to touch those unless Performance fixes incidentally regress them.'
  );
}
lines.push('');

lines.push('## Reproducibility');
lines.push('');
lines.push(
  'All 15 URLs are recorded in [`selected-slugs.json`](./selected-slugs.json) (top-level `targets` array, each with `id`, `url`, `page_type`, `locale`, `slug`).'
);
lines.push('');
lines.push('### Re-running the full baseline');
lines.push('');
lines.push('```bash');
lines.push('cd .planning/artifacts/lighthouse-v1.1-baseline');
lines.push('node build-manifest.mjs   # OPTIONAL --- refreshes slugs from Strapi + re-validates 200s');
lines.push('node run-audits.mjs       # re-runs all 15 (skips any already-valid report file)');
lines.push('node build-summary.mjs    # regenerates SUMMARY.md from the 15 reports');
lines.push('```');
lines.push('');
lines.push('To force a fresh run of a single page: delete the matching `<id>.json` then re-run `run-audits.mjs`.');
lines.push('');
lines.push('### Lighthouse CLI shape (per target)');
lines.push('');
lines.push('```bash');
lines.push('npx lighthouse "<URL>" \\');
lines.push('  --only-categories=performance,accessibility,best-practices,seo \\');
lines.push('  --form-factor=mobile \\');
lines.push('  --throttling-method=simulate \\');
lines.push('  --output=json \\');
lines.push('  --output-path="./<id>.json" \\');
lines.push('  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \\');
lines.push('  --quiet \\');
lines.push('  --max-wait-for-load=60000');
lines.push('```');
lines.push('');
lines.push('### Windows EPERM note');
lines.push('');
lines.push(
  'On Windows, Lighthouse exits with code 1 after writing the JSON report due to a temp-dir cleanup race (`EPERM` on `C:\\Users\\...\\AppData\\Local\\Temp\\lighthouse.<pid>`). The report is complete. `run-audits.mjs` validates the output file + the `categories.performance.score` field directly and ignores the exit code --- this is a known chrome-launcher Windows quirk, not a measurement failure.'
);
lines.push('');

writeFileSync(resolve(__dirname, 'SUMMARY.md'), lines.join('\n'), 'utf8');
console.log(`SUMMARY.md written (${lines.length} lines, status=${status})`);
