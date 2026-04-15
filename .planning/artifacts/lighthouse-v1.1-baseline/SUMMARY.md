---
plan: 10-04
generated_at: 2026-04-15T16:43:25.647Z
status: gaps_found
pages_measured: 15
pages_above_90: 7
pages_below_90: 8
requirements_completed: [DEBT-03-measurement]
---

# Lighthouse v1.1 Baseline --- SUMMARY

**Measurement date:** 2026-04-15
**Tool:** Lighthouse 13.1.0 (via `npx lighthouse@latest`)
**Target host:** https://bbq-experience.com (production)
**Form factor:** mobile (mobile emulation + simulated throttling)
**Pages measured:** 15 (5 page types x 3 locales: home, review, recipe, tutorial, blog x en/it/es)
**Categories measured:** Performance, Accessibility, Best Practices, SEO
**Threshold:** >=90 per category

Status: **gaps_found** --- Accessibility / Best Practices / SEO pass on every page, but Performance falls below 90 on 8 of 15 pages. All failures are LCP-driven (3.4-3.8 s on mobile throttled), not functional regressions --- v3.2 markup changes (hreflang, CollectionPage JSON-LD, nested anchor fix, mobile-menu fix) did not degrade the site qualitatively, but the mobile LCP budget needs one more pass. Hand off to Plan 10-05 for remediation.

## Score Matrix

| Page | URL | Performance | Accessibility | Best Practices | SEO | Report |
|------|-----|-------------|---------------|----------------|-----|--------|
| home-en | https://bbq-experience.com/en/ | **86** | 95 | 96 | 100 | [home-en.json](./home-en.json) |
| home-it | https://bbq-experience.com/it/ | **87** | 95 | 96 | 100 | [home-it.json](./home-it.json) |
| home-es | https://bbq-experience.com/es/ | **87** | 95 | 96 | 100 | [home-es.json](./home-es.json) |
| review-en | https://bbq-experience.com/en/reviews/lodge-cast-iron-sportsman-grill-review/ | **86** | 100 | 96 | 100 | [review-en.json](./review-en.json) |
| review-it | https://bbq-experience.com/it/recensioni/jealous-devil-lump-charcoal-review/ | **87** | 100 | 96 | 100 | [review-it.json](./review-it.json) |
| review-es | https://bbq-experience.com/es/resenas/kamado-joe-classic-iii-review/ | **87** | 100 | 96 | 100 | [review-es.json](./review-es.json) |
| recipe-en | https://bbq-experience.com/en/recipes/bbq-sauce-recipe/ | 93 | 95 | 96 | 100 | [recipe-en.json](./recipe-en.json) |
| recipe-it | https://bbq-experience.com/it/ricette/smoked-pork-belly-burnt-ends/ | 93 | 95 | 96 | 100 | [recipe-it.json](./recipe-it.json) |
| recipe-es | https://bbq-experience.com/es/recetas/smoked-pork-belly-burnt-ends/ | 93 | 95 | 96 | 100 | [recipe-es.json](./recipe-es.json) |
| tutorial-en | https://bbq-experience.com/en/tutorials/how-to-smoke-meat-without-a-smoker/ | 90 | 100 | 96 | 100 | [tutorial-en.json](./tutorial-en.json) |
| tutorial-it | https://bbq-experience.com/it/guide/how-to-smoke-meat/ | **89** | 100 | 96 | 100 | [tutorial-it.json](./tutorial-it.json) |
| tutorial-es | https://bbq-experience.com/es/tutoriales/how-to-smoke-meat-without-a-smoker/ | 90 | 100 | 96 | 100 | [tutorial-es.json](./tutorial-es.json) |
| blog-en | https://bbq-experience.com/en/blog/oklahoma-joes-new-offset-smoker-lineup/ | **89** | 100 | 96 | 100 | [blog-en.json](./blog-en.json) |
| blog-it | https://bbq-experience.com/it/blog/best-pellet-grill-for-beginners-2026/ | 93 | 100 | 96 | 100 | [blog-it.json](./blog-it.json) |
| blog-es | https://bbq-experience.com/es/blog/best-pellet-grill-for-beginners-2026/ | 93 | 100 | 96 | 100 | [blog-es.json](./blog-es.json) |

**Bold score = below 90 threshold.**

Category totals across the 15-page baseline:

| Category | Min | Max | Median | Pages >=90 |
|----------|-----|-----|--------|------------|
| Performance | 86 | 93 | 89 | 7 / 15 |
| Accessibility | 95 | 100 | 100 | 15 / 15 |
| Best Practices | 96 | 96 | 96 | 15 / 15 |
| SEO | 100 | 100 | 100 | 15 / 15 |

## Pass/Fail Analysis

### Pages fully passing (all 4 categories >=90)

- recipe-en --- 93 / 95 / 96 / 100
- recipe-it --- 93 / 95 / 96 / 100
- recipe-es --- 93 / 95 / 96 / 100
- tutorial-en --- 90 / 100 / 96 / 100
- tutorial-es --- 90 / 100 / 96 / 100
- blog-it --- 93 / 100 / 96 / 100
- blog-es --- 93 / 100 / 96 / 100

**7 / 15 pages fully pass.**

### Pages with sub-90 scores

Every sub-90 page fails ONLY on Performance. Accessibility / BP / SEO all pass >=90 on every page.

**home-en --- Performance 86**
- Sub-90 categories: Performance (86)
- Top failing Lighthouse audits (score < 0.9):
  - `color-contrast` (0.00) --- Background and foreground colors do not have a sufficient contrast ratio.
  - `heading-order` (0.00) --- Heading elements are not in a sequentially-descending order
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery

**home-it --- Performance 87**
- Sub-90 categories: Performance (87)
- Top failing Lighthouse audits (score < 0.9):
  - `color-contrast` (0.00) --- Background and foreground colors do not have a sufficient contrast ratio.
  - `heading-order` (0.00) --- Heading elements are not in a sequentially-descending order
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery

**home-es --- Performance 87**
- Sub-90 categories: Performance (87)
- Top failing Lighthouse audits (score < 0.9):
  - `color-contrast` (0.00) --- Background and foreground colors do not have a sufficient contrast ratio.
  - `heading-order` (0.00) --- Heading elements are not in a sequentially-descending order
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery

**review-en --- Performance 86**
- Sub-90 categories: Performance (86)
- Top failing Lighthouse audits (score < 0.9):
  - `unused-javascript` (0.00) --- ~300 ms savings --- Reduce unused JavaScript
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery
  - `network-dependency-tree-insight` (0.00) --- Network dependency tree

**review-it --- Performance 87**
- Sub-90 categories: Performance (87)
- Top failing Lighthouse audits (score < 0.9):
  - `unused-javascript` (0.00) --- ~310 ms savings --- Reduce unused JavaScript
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `network-dependency-tree-insight` (0.00) --- Network dependency tree
  - `render-blocking-insight` (0.00) --- Render blocking requests
  - `document-latency-insight` (0.50) --- Document request latency

**review-es --- Performance 87**
- Sub-90 categories: Performance (87)
- Top failing Lighthouse audits (score < 0.9):
  - `unused-javascript` (0.00) --- ~300 ms savings --- Reduce unused JavaScript
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `network-dependency-tree-insight` (0.00) --- Network dependency tree
  - `render-blocking-insight` (0.00) --- Render blocking requests
  - `document-latency-insight` (0.50) --- Document request latency

**tutorial-it --- Performance 89**
- Sub-90 categories: Performance (89)
- Top failing Lighthouse audits (score < 0.9):
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery
  - `network-dependency-tree-insight` (0.00) --- Network dependency tree
  - `render-blocking-insight` (0.00) --- Render blocking requests

**blog-en --- Performance 89**
- Sub-90 categories: Performance (89)
- Top failing Lighthouse audits (score < 0.9):
  - `inspector-issues` (0.00) --- Issues were logged in the `Issues` panel in Chrome Devtools
  - `forced-reflow-insight` (0.00) --- Forced reflow
  - `image-delivery-insight` (0.00) --- Improve image delivery
  - `lcp-discovery-insight` (0.00) --- LCP request discovery
  - `network-dependency-tree-insight` (0.00) --- Network dependency tree
  - `render-blocking-insight` (0.00) --- Render blocking requests

## Sub-90 Findings -> Fix Targets

The sub-90 root cause is uniform across the 8 affected pages: **mobile LCP in the 3.4-3.8 s band** (target <2.5 s). This is the single biggest lever; fixing it should pull all pages above 90 because no other category is failing.

Concrete Lighthouse audit IDs below are the input scope for Plan 10-05 (conditional fix plan).

| Audit ID | Pages affected | Typical score | Observation |
|----------|----------------|---------------|-------------|
| `largest-contentful-paint` | 8 / 8 sub-90 pages | 0.56-0.66 | LCP 3.4-3.8 s mobile --- primary cause |
| `render-blocking-insight` | 8 / 8 | 0 | Render-blocking requests (CSS / fonts) delay first paint |
| `lcp-discovery-insight` | 7 / 8 | 0 | LCP element not prioritized (no `fetchpriority=high` or preload on hero image) |
| `image-delivery-insight` | 5 / 8 | 0 | Hero/cover images not in next-gen format or under-optimized |
| `document-latency-insight` | 8 / 8 | 0.5 | Origin/TTFB contributing ~500-700 ms |
| `forced-reflow-insight` | 6 / 8 | 0 | Layout thrash during boot (likely Svelte island hydration) |
| `unused-javascript` | 3 / 8 (reviews) | 0 | ~300 ms savings per review page --- bundle splitting opportunity |
| `unsized-images` | 1 / 8 (review-en) | 0.5 | Some `<img>` missing width/height attrs |
| `first-contentful-paint` | 4 / 8 | 0.67-0.81 | FCP 2.1-2.5 s --- knock-on from render-blocking |
| `speed-index` | 2 / 8 (review-it, review-es) | 0.89 | Speed Index ~3.4 s |

### Recommended remediation scope (Plan 10-05 input)

1. **Hero image LCP optimization** --- add `fetchpriority="high"` to the LCP `<img>` on home / review / tutorial / blog entry templates; add `<link rel="preload" as="image">` for the above-the-fold cover; ensure the image is served via Astro Image with AVIF/WebP + explicit srcset widths.
2. **Render-blocking path** --- audit `<link rel="stylesheet">` chain; inline critical CSS for above-the-fold; defer non-critical CSS. Consider `font-display: optional` on `@fontsource-variable` packages if FCP deltas justify.
3. **Unused JS on review pages** --- review bundles ship ~300 ms of unused code; split Svelte islands more aggressively or lazy-load below-the-fold interactivity (gallery, sticky TOC, etc.).
4. **Unsized images (review-en)** --- ensure Astro `<Image>` component always emits `width` + `height`; grep for raw `<img>` tags in review templates.
5. **Document latency (TTFB)** --- 0.5 score on all sub-90 pages (~500-700 ms). Check Caddy / Astro SSR cold-start on Hetzner; consider adding Cloudflare full-page cache on `/` + content detail routes (bypass only on preview mode).

Note on `color-contrast` audit: appears failing on home-en / home-it / home-es at score 0, but the Accessibility category score is 95 (>=90 threshold) on all pages, so no pass/fail action here. Worth tracking for a future a11y sweep.

## DEBT-03 Status

**At least one page scored <90 in at least one category. DEBT-03 measurement half is complete. Plan 10-05 (conditional fix plan) is now required with the sub-90 findings above as its scope.**

Scope of Plan 10-05:
- Lift Performance >=90 on all 8 sub-90 pages by addressing the Sub-90 Findings -> Fix Targets list
- Re-run Lighthouse on at minimum the 8 sub-90 pages (re-running all 15 is cheap via `run-audits.mjs`)
- Re-write this SUMMARY.md in-place (or produce a sibling post-fix SUMMARY) with new scores
- Only then mark DEBT-03 fully closed in REQUIREMENTS.md

All Accessibility / Best Practices / SEO categories currently pass >=90 on every page. Plan 10-05 does not need to touch those unless Performance fixes incidentally regress them.

## Reproducibility

All 15 URLs are recorded in [`selected-slugs.json`](./selected-slugs.json) (top-level `targets` array, each with `id`, `url`, `page_type`, `locale`, `slug`).

### Re-running the full baseline

```bash
cd .planning/artifacts/lighthouse-v1.1-baseline
node build-manifest.mjs   # OPTIONAL --- refreshes slugs from Strapi + re-validates 200s
node run-audits.mjs       # re-runs all 15 (skips any already-valid report file)
node build-summary.mjs    # regenerates SUMMARY.md from the 15 reports
```

To force a fresh run of a single page: delete the matching `<id>.json` then re-run `run-audits.mjs`.

### Lighthouse CLI shape (per target)

```bash
npx lighthouse "<URL>" \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json \
  --output-path="./<id>.json" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --quiet \
  --max-wait-for-load=60000
```

### Windows EPERM note

On Windows, Lighthouse exits with code 1 after writing the JSON report due to a temp-dir cleanup race (`EPERM` on `C:\Users\...\AppData\Local\Temp\lighthouse.<pid>`). The report is complete. `run-audits.mjs` validates the output file + the `categories.performance.score` field directly and ignores the exit code --- this is a known chrome-launcher Windows quirk, not a measurement failure.
