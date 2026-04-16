---
plan: 10-04
generated_at: 2026-04-15T16:43:25.647Z
status: pass
pages_measured: 15
pages_above_90_baseline: 7
pages_below_90_baseline: 8
pages_above_90_after_fix: 15
pages_below_90_after_fix: 0
remediation_plan: 10-05 + 10.1-02
remediation_status: shipped_complete
requirements_completed: [DEBT-03-measurement, DEBT-03-image-delivery]
requirements_still_open: []
phase_10_1_remeasured_at: 2026-04-16T16:40:00Z
phase_10_1_commit: e41152d
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

## Before / After (Plan 05 Fixes)

Plan 10-05 ha shippato 4 commit fix sulle 8 pagine sub-90 e re-misurato. Risultati per pagina:

| Page | Cat | Before | After | Delta | Pass | Commits applied |
|------|-----|--------|-------|-------|------|-----------------|
| home-en | Performance | 86 | 87 | +1 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| home-it | Performance | 87 | 86 | -1 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| home-es | Performance | 87 | 87 | 0 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| review-en | Performance | 86 | 89 | +3 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| review-it | Performance | 87 | **93** | +6 | **YES** | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| review-es | Performance | 87 | 87 | 0 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| tutorial-it | Performance | 89 | **90** | +1 | **YES** | ae8dd4d, 1d2b2e5, d454671, 576f12a |
| blog-en | Performance | 89 | 88 | -1 | NO | ae8dd4d, 1d2b2e5, d454671, 576f12a |

**Score:** 2/8 pagine ora pass (review-it 93, tutorial-it 90). 6/8 ancora sub-90 ma con miglioramenti significativi nelle metriche secondarie:

| Metrica | Baseline median | After-fix median | Delta |
|---------|-----------------|------------------|-------|
| FCP | 2.2 s | 2.1 s | -100 ms |
| CLS (peggior caso) | 0.344 (blog-en) | 0.035 | -0.309 |
| TTFB | ~600 ms | 100-220 ms | -300 a -500 ms |
| TBT | mostly 0 | 0 | stable |
| Render-blocking CSS | 56 KB blocking | 0 (inlined) | eliminated |
| Unused JS (review) | 113 KB | 0 (lazy) | eliminated |

Combined account category totals (post-fix re-measure of 8 pages, baseline still applies to other 7):

| Category | Baseline pages_above_90 | After-fix pages_above_90 | Delta |
|----------|--------------------------|---------------------------|-------|
| Performance | 7 / 15 | 9 / 15 | +2 |
| Accessibility | 15 / 15 | 15 / 15 | 0 (still pass) |
| Best Practices | 15 / 15 | 15 / 15 | 0 (still pass) |
| SEO | 15 / 15 | 15 / 15 | 0 (still pass) |

### Fix commits

| SHA | Description | Files |
|-----|-------------|-------|
| `ae8dd4d` | fetchpriority=high on LCP hero images | FeaturedHero, ContentLayout, 3× review pages |
| `1d2b2e5` | Lazy-load GSAP + inline scoped CSS chunks | animations.ts, astro.config.mjs |
| `d454671` | Width/height on cover images (CLS fix) | FeaturedHero, ContentLayout |
| `576f12a` | `<link rel=preload as=image>` for LCP image | BaseLayout + 12 page templates wired |

All commits live on production via adnanh/webhook deploy (verified via SSH log + curl probes).

### Residual gap analysis

The 6 still-sub-90 pages all share the same root cause: **LCP image transfer time on mobile throttled** (3.5-3.7 s). The cover images are served by Strapi at full resolution (~150-300 KB JPG, sometimes larger) without per-device responsive sizes or modern format negotiation. With Lighthouse's "Slow 4G" simulation, even an aggressive preload + fetchpriority can't pull the LCP timing below the 2.5 s "Good" threshold.

**This was anticipated in the Plan 10-05 Task 1 diagnostic (section D, `image-delivery-insight`)** and explicitly marked **out-of-scope** for this plan: "out-of-scope per questa fase (richiede modifica di `getStrapiMediaURL()` o aggiunta Cloudflare image transformation)".

### Remediation roadmap

To close the residual gap and bring all 15 pages ≥90 on Performance, a follow-up phase plan should address:

1. **Cloudflare Image Resizing** for `cms.bbq-experience.com/uploads/*` — generates AVIF/WebP responsive variants on demand. Expected LCP reduction: 1.5-2.0 s on mobile throttled (from ~3.5 s to ~1.5 s).
2. **Image dimensions metadata in Strapi** — surface `width` / `height` from Strapi media for use as proper `<img>` attributes (currently hardcoded 1600×900 — works for CLS but not optimal for actual aspect ratios).
3. **Optional: `<picture>` element with srcset** — maximum control over format + sizing per breakpoint.

Estimated effort: 1-2 plan tasks, primarily configuration + helper update. Likely Phase 11 inclusion.

## DEBT-03 Status

**COMPLETE — CLOSED.** Plan 10.1-02 (2026-04-16) ha chiuso il residuo DEBT-03 shippando Cloudflare Image Transformations + responsive srcset via rewrite di `web/src/lib/media.ts`. Status finale:

- **Measurement (DEBT-03-measurement):** ✓ COMPLETE (Plan 10-04 baseline + Plan 10-05 after-fix + Plan 10.1-02 final re-measurement)
- **All audits ≥90 (DEBT-03-fix):** ✓ COMPLETE — **15/15 pages pass ≥90** su Performance / Accessibility / Best Practices / SEO
- **Image-delivery gap:** ✓ CLOSED by Plan 10.1-02 — payload immagini ridotto fino a -89% (es. 111KB → 12KB per hero cover) via AVIF/WebP + width-clamped variants serviti dalla CF edge
- **Median Performance:** baseline 89 → **post-10.1 97** (+8 punti)

Zero regression sulle 9 pagine già-passanti: tutte i loro score sono migliorati o stabili dopo il fix (format=auto globalizza la delivery ottimale anche per le pagine che non avevano bisogno del fix specifico).

All 4 categorie (Performance / Accessibility / Best Practices / SEO) passano ≥90 su tutte le 15 pagine. DEBT-03 è chiuso.

## Phase 10.1 Post-Fix Re-Measurement (DEBT-03 residual close-out)

Plan 10.1-02 ha shippato Cloudflare Image Transformations + `buildStrapiSrcset` via rewrite di `web/src/lib/media.ts` + wiring in 12 template hot. Commit di deploy: **`e41152d`** (2026-04-16T14:27:00Z). Re-misurazione effettuata 2026-04-16 post-deploy, stesso tool/parametrizzazione della baseline (Lighthouse 13.1.0, mobile, simulated throttling, 4 categorie).

### Score delta (Plan 10-05 after → Plan 10.1 after)

| Page | Category | Before (10-05) | After (10.1) | Δ | Pass |
|------|----------|---------------|--------------|---|------|
| home-en | Performance | 87 | **91** | +4 | YES |
| home-it | Performance | 86 | **96** | +10 | YES |
| home-es | Performance | 87 | **97** | +10 | YES |
| review-en | Performance | 89 | **94** | +5 | YES |
| review-it | Performance | 93 | **97** | +4 | YES |
| review-es | Performance | 87 | **96** | +9 | YES |
| recipe-en | Performance | 93 | **98** | +5 | YES |
| recipe-it | Performance | 93 | **98** | +5 | YES |
| recipe-es | Performance | 93 | **98** | +5 | YES |
| tutorial-en | Performance | 90 | **97** | +7 | YES |
| tutorial-it | Performance | 90 | **97** | +7 | YES |
| tutorial-es | Performance | 90 | **97** | +7 | YES |
| blog-en | Performance | 88 | **96** | +8 | YES |
| blog-it | Performance | 93 | **97** | +4 | YES |
| blog-es | Performance | 93 | **98** | +5 | YES |

**Median Performance:** 0.89 (baseline) → 0.97 (post-10.1), **Δ +8 punti**.
**Minimum Performance:** 0.86 (baseline) → 0.91 (post-10.1). **Zero pagine < 0.90.**

### Aggregate category totals (post-10.1)

| Category | Min | Max | Median | Pages ≥90 |
|----------|-----|-----|--------|-----------|
| Performance | 91 | 98 | 97 | **15 / 15** |
| Accessibility | 95 | 100 | 100 | 15 / 15 |
| Best Practices | 96 | 96 | 96 | 15 / 15 |
| SEO | 100 | 100 | 100 | 15 / 15 |

**15/15 pages ≥90 on Performance / Accessibility / Best Practices / SEO — DEBT-03 CLOSED.**

### How this was measured

Due runner in serie (Lighthouse è greedy):

```bash
cd .planning/artifacts/lighthouse-v1.1-baseline
rm -f *-after.json *-regression.json    # force fresh measurement
node run-after.mjs                       # 6 sub-90 + 2 promossi = 8 pagine -> *-after.json
node run-regression.mjs                  # 9 pagine gia >=90 -> *-regression.json (no-regression gate)
```

- `run-after.mjs` output: 8/8 pass (home-en 0.91, home-it 0.96, home-es 0.97, review-en 0.94, review-it 0.97, review-es 0.96, tutorial-it 0.96, blog-en 0.96).
- `run-regression.mjs` output: 9/9 pass (review-it 0.97, recipe-en 0.98, recipe-it 0.98, recipe-es 0.98, tutorial-en 0.97, tutorial-it 0.97, tutorial-es 0.97, blog-it 0.97, blog-es 0.98).

Note: alcune pagine compaiono in entrambi i runner (review-it, tutorial-it) — sovrapposizione intenzionale per avere misurazione indipendente post-fix + post-regression sullo stesso target.

### Evidence per 3-probe smoke (T-10.1-09, T-10.1-06)

| Verifica | Valore |
|----------|--------|
| Homepage EN preload URL | `/cdn-cgi/image/width=1280,quality=75,format=auto/...stop_buying_cheap_thermometers...` |
| Homepage EN featured-main `<img src>` | stesso URL (stesso width=1280) — **preload=src match** (threat T-10.1-09 mitigato) |
| Blog-en `<meta og:image>` | `https://cms.bbq-experience.com/uploads/oklahoma_joes_new_offset_smoker_lineup...` raw — **no `/cdn-cgi/image/`** (threat T-10.1-06 mitigato) |
| CF transform endpoint health | `Content-Type: image/jpeg`, `CF-Ray: 9ed3edb07d94edcb-MXP`, `CF-Cache-Status: MISS` → HIT on retry |

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

### Re-running only the sub-90 pages (Plan 10-05 after-fix)

```bash
cd .planning/artifacts/lighthouse-v1.1-baseline
rm *-after.json          # force fresh re-measure
node run-after.mjs       # runs only the 8 originally-sub-90 pages → *-after.json
```

After-fix reports: `*-after.json` (one per remediated page, contains the same Lighthouse JSON shape as baseline reports).

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
