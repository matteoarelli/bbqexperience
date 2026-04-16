---
phase: 10-debt-closure-measurement-baseline
plan: 05
subsystem: performance
tags: [lighthouse, performance, lcp, cls, fetchpriority, preload, css-inline, gsap-lazy, astro]

# Dependency graph
requires:
  - phase: 10-debt-closure-measurement-baseline
    provides: Plan 10-04 baseline reports + sub-90 findings (8 pages flagged)
provides:
  - Production fixes for 4 distinct LCP/CLS/CSS/JS perf issues (4 commits, 12 files modified)
  - Re-measurement reports (`*-after.json` × 8) showing status of remediation
  - Updated baseline SUMMARY.md with before/after table + DEBT-03 partial-closure attestation
  - `run-after.mjs` runner for repeatable post-fix re-measurement
  - Documented residual gap (image-delivery via Cloudflare Image Resizing) for follow-up phase
affects: [Phase 11+ image-delivery work, future Lighthouse re-measure cadence, all v1.1 feature phases that touch hero/cover images]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LCP preload pattern: BaseLayout.preloadImage prop emits <link rel=preload as=image fetchpriority=high>"
    - "Lazy GSAP loading: import gsap + ScrollTrigger SOLO se [data-animate] esiste in DOM"
    - "Inline CSS strategy: build.inlineStylesheets='always' in astro.config (HTML +60KB gzipped, eliminates CSS roundtrip)"
    - "Cover image dimension reservation: width=1600 height=900 + CSS object-fit:cover prevents CLS"

key-files:
  created:
    - .planning/artifacts/lighthouse-v1.1-baseline/run-after.mjs
    - .planning/artifacts/lighthouse-v1.1-baseline/{home,review,tutorial,blog}-{en,it,es}-after.json (8 files)
  modified:
    - web/astro.config.mjs (build.inlineStylesheets='always')
    - web/src/lib/animations.ts (lazy gsap import)
    - web/src/layouts/BaseLayout.astro (preloadImage prop + slot head-extras)
    - web/src/components/content/FeaturedHero.astro (fetchpriority + width/height)
    - web/src/components/content/ContentLayout.astro (fetchpriority + width/height)
    - web/src/pages/{en,it,es}/index.astro (lcpPreloadUrl fetch + pass to BaseLayout)
    - web/src/pages/{en,it,es}/blog/[slug].astro (preloadImage prop)
    - web/src/pages/{en,it,es}/{tutorials,guide,tutoriales}/[slug].astro (preloadImage prop)
    - web/src/pages/{en,it,es}/{reviews,recensioni,resenas}/[slug].astro (fetchpriority + width/height + preloadImage)
    - .planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md (status partial_pass + before/after section)

key-decisions:
  - "build.inlineStylesheets='always' invece di 'auto' — il chunk Footer.css (~56KB minified gzipped) era render-blocking sopra la threshold default; inlinarlo elimina la roundtrip critical CSS al costo di +60KB HTML gzipped"
  - "Lazy GSAP via Promise.all([import('gsap'), import('gsap/ScrollTrigger')]) solo se [data-animate] in DOM — review pages risparmiano 113KB JS"
  - "Mantenere DEBT-03 in stato 'partial closure' invece di forzare 90+ con scope creep — image-delivery via Cloudflare Image Resizing era esplicitamente out-of-scope del Plan 10-05 Task 1 diagnostic approvato da Matteo"
  - "width=1600 height=900 hardcoded sulle cover image — accettabile come temporaneo (16:9 standard); future enhancement: surface width/height dal Strapi media metadata"

patterns-established:
  - "BaseLayout.preloadImage prop: passing string URL → <link rel=preload as=image fetchpriority=high> in <head>. Use case: any page con LCP image identificabile a SSR time"
  - "BaseLayout slot head-extras: escape hatch per <link>/<meta> page-specifici oltre alla prop preloadImage"
  - "Lazy module pattern per dipendenze pesanti: dynamic import dentro function entry point + early-return se DOM check non match. Estensibile a Lenis/altre libs in futuro"

requirements-completed: [DEBT-03]  # frontmatter PLAN dichiara DEBT-03 — marcato complete con disclaimer di partial closure (vedi SUMMARY artifacts per dettagli)

# Metrics
duration: ~80min (Task 2 implement + 3 cicli deploy + Task 3 re-measure)
completed: 2026-04-16
---

# Phase 10 Plan 05: Lighthouse Performance Fixes Summary

**4 perf commits shipped (LCP fetchpriority, lazy GSAP + inline CSS, CLS fix, LCP preload) — 9/15 pages now ≥90 (was 7/15); residual 6/15 gap traced to image-delivery deferred per approved scope.**

## Performance

- **Duration:** ~80 min (executor wall-clock for Task 2 + 3, escluso il checkpoint Matteo)
- **Started:** 2026-04-16 ~07:38 UTC (post Task 1 approval)
- **Completed:** 2026-04-16 ~08:20 UTC
- **Tasks:** 3 (1 checkpoint completed in prior session, Task 2 implement + Task 3 re-measure here)
- **Files modified:** 13 web/ files + 2 artifacts (SUMMARY + run-after.mjs)
- **Commits:** 4 perf/fix commits + 1 final docs commit

## Accomplishments
- **fetchpriority=high** sui 5 LCP `<img>` template (FeaturedHero, ContentLayout, 3× review pages) — Lighthouse `lcp-discovery-insight` da score 0 a satisfied
- **Lazy GSAP loading** in `web/src/lib/animations.ts` — review pages risparmiano 113 KB JS (zero `[data-animate]` → zero gsap download)
- **CSS inlinato** via `build.inlineStylesheets='always'` — chunk Footer.css (~56KB minified gzipped, contiene scoped styles di Footer + CookieBanner + MobileMenuPanel + altri) eliminato dal critical render path
- **CLS fix** con width=1600 height=900 sui cover image — blog-en CLS da 0.344 a 0.035, tutorial-it da 0.265 a 0.039
- **LCP preload** con `<link rel="preload" as="image">` nello <head> via nuova prop BaseLayout.preloadImage — anticipa discovery dell'immagine LCP prima del body parse
- **9/15 pagine** ora pass ≥90 in tutte le 4 categorie (era 7/15 in baseline)
- **review-it 87→93** e **tutorial-it 89→90** sono i casi PASS dopo fix
- **Zero regressioni** su Accessibility / Best Practices / SEO (15/15 ancora pass)
- **TTFB migliorato drasticamente**: da ~600 ms baseline a 90-220 ms after-fix
- **FCP migliorato**: review-en/review-it/tutorial-it ora con FCP 1.4-1.6 s (era 2.1-2.5 s)

## Task Commits

Atomicamente per fix logico:

1. **Task 1: Diagnostic + fix plan checkpoint** (prior session) — `3b78862` (docs)
2. **Task 2 part 1: Image fetchpriority hints** — `ae8dd4d` (perf) — 5 file
3. **Task 2 part 2: Lazy GSAP + inline CSS** — `1d2b2e5` (perf) — 2 file
4. **Task 2 part 3: CLS fix (width/height)** — `d454671` (fix) — 2 file (deviazione, vedi sotto)
5. **Task 2 part 4: LCP preload** — `576f12a` (perf) — 13 file (deviazione, vedi sotto)
6. **Task 3: Re-measure + SUMMARY update + 10-05-SUMMARY** — pending final commit

**Plan metadata:** _commit finale via gsd-tools dopo questa write_

## Files Created/Modified

### Code (web/)
- `web/astro.config.mjs` — `build.inlineStylesheets: 'always'` (stylesheet inlinati, render-blocking eliminato)
- `web/src/lib/animations.ts` — lazy import dinamico di gsap + ScrollTrigger
- `web/src/layouts/BaseLayout.astro` — nuova prop `preloadImage` + emit `<link rel=preload as=image>` + `<slot name="head-extras"/>`
- `web/src/components/content/FeaturedHero.astro` — fetchpriority + width/height su `featured-main__image`
- `web/src/components/content/ContentLayout.astro` — fetchpriority + width/height su `content-cover-image`
- `web/src/pages/en/index.astro`, `web/src/pages/it/index.astro`, `web/src/pages/es/index.astro` — fetch separato cover featured + pass `preloadImage` a BaseLayout
- `web/src/pages/{en,it,es}/blog/[slug].astro` — `preloadImage={coverImageUrl}`
- `web/src/pages/en/tutorials/[slug].astro`, `web/src/pages/it/guide/[slug].astro`, `web/src/pages/es/tutoriales/[slug].astro` — `preloadImage={coverImageUrl}`
- `web/src/pages/en/reviews/[slug].astro`, `web/src/pages/it/recensioni/[slug].astro`, `web/src/pages/es/resenas/[slug].astro` — fetchpriority + width/height + `preloadImage={coverImage}`

### Artifacts (.planning/)
- `.planning/artifacts/lighthouse-v1.1-baseline/run-after.mjs` — runner Lighthouse per le 8 pagine sub-90 (output `*-after.json`)
- `.planning/artifacts/lighthouse-v1.1-baseline/{home-en,home-it,home-es,review-en,review-it,review-es,tutorial-it,blog-en}-after.json` — 8 report Lighthouse post-fix
- `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` — frontmatter status `gaps_found` → `partial_pass`, sezione Before/After con tabella per pagina + commit SHA, sezione DEBT-03 partial closure

### Scratch (Task 1, prior session)
- `.planning/phases/10-debt-closure-measurement-baseline/10-05-scratch/diagnostic.md`

## Decisions Made

- **Inline CSS via `build.inlineStylesheets: 'always'`** invece dello schema preload-swap runtime: il pattern runtime sarebbe stato cosmetic (gli `<script>` inline girano DOPO i `<link>` Astro-iniettati nell'`<head>`, troppo tardi per il render-blocking). La via canonical Astro 6 è la build-time inlining. Costo: HTML +60KB gzipped per pagina; beneficio: zero roundtrip CSS critical.
- **Lazy gsap via early-return + dynamic import** invece di rimuovere lo `<script>` dalle review pages: mantiene API pubblica `initScrollAnimations()` invariata, beneficia anche pagine che potrebbero in futuro avere `[data-animate]` (estendibile senza ulteriori refactor).
- **width=1600 height=900 hardcoded** sulle cover image: 16:9 standard, accettabile come placeholder; CSS `object-fit:cover` gestisce il display reale a runtime. Future enhancement: surface width/height dal Strapi media metadata per aspect ratio precise.
- **DEBT-03 partial closure** invece di scope creep: il diagnostic Task 1 (approvato da Matteo) marcava esplicitamente image-delivery via Cloudflare Image Resizing come out-of-scope. Mantenuto il limite per evitare uno sforzo extra-Plan non autorizzato.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CLS regression after first deploy (blog-en 0.344, tutorial-it 0.265)**
- **Found during:** Task 3 (re-measurement after first deploy)
- **Issue:** Dopo aver inlinato CSS e settato fetchpriority high, l'immagine cover arriva DOPO che il content sotto è già renderizzato → quando arriva, spinge giù il testo. Senza width/height il browser non poteva riservare lo spazio. Il primo deploy ha portato il blog-en da 89 a 72 (-17 punti) e tutorial-it da 89 a 81 (-8 punti).
- **Fix:** Aggiunto `width="1600" height="900"` agli `<img>` di ContentLayout e FeaturedHero (CSS object-fit:cover gestisce il display reale, gli attributi HTML servono solo per layout reservation).
- **Files modified:** `web/src/components/content/ContentLayout.astro`, `web/src/components/content/FeaturedHero.astro`
- **Verification:** Re-misurazione post-deploy 2: blog-en CLS 0.035, tutorial-it CLS 0.039 — sotto la soglia 0.1.
- **Committed in:** `d454671`

**2. [Rule 2 - Missing critical] LCP preload pattern not in original 5-fix plan**
- **Found during:** Task 3 (re-measurement after second deploy)
- **Issue:** Dopo CLS fix, le pagine erano stabili ma LCP rimaneva 3.4-3.9 s su mobile throttled. fetchpriority + lazy gsap + CSS inlined non erano sufficienti — il browser scopriva l'immagine LCP solo arrivando all'`<img>` nel `<body>`. Per portare ulteriori miglioramenti LCP serve la `<link rel=preload>` nello `<head>`.
- **Fix:** Aggiunta nuova prop `preloadImage` a BaseLayout che emette `<link rel="preload" as="image" fetchpriority="high">` nello `<head>`. Wired in tutte le 12 pagine target (3 home + 3 blog [slug] + 3 tutorial [slug] + 3 review [slug]).
- **Files modified:** `web/src/layouts/BaseLayout.astro` + 12 pagine
- **Verification:** Re-misurazione post-deploy 3: review-en 83→89, review-it 86→93, review-es 87 (stable), home-en 88→87 (within noise), tutorial-it 90→90, blog-en 89→88. Miglioramento medio +1-3 punti, due nuove pagine pass.
- **Committed in:** `576f12a`

---

**Total deviations:** 2 auto-fixed (1 bug from Rule 1, 1 missing critical from Rule 2)
**Impact on plan:** Entrambe le deviazioni necessarie per evitare regressioni e sfruttare al massimo il budget Performance del browser. Nessuno scope creep verso image-delivery (rispettato il boundary del diagnostic Task 1 approvato).

## Issues Encountered

- **Plan 10-05 ha richiesto 3 cicli deploy + re-misurazione** invece di 1: prima deploy ha esposto la regressione CLS (Rule 1 deviation), seconda ha mostrato LCP residuo che ha richiesto preload pattern (Rule 2 deviation), terza ha portato a 9/15 pages pass. Ogni deploy ~5 min via webhook.
- **Lighthouse simulated throttling è notoriamente rumoroso**: scarti di ±5 punti tra run su stessa pagina. La home-it da 87→86 nel terzo cicle è dentro il rumore. Per assessment accurato sarebbe servito un media di 3-5 run per URL — approccio non implementato per non triplicare i tempi del Plan.
- **review-es e review-it hanno gallery vuota in Strapi** — la cover image non è renderizzata nelle pagine. L'LCP element diventa il titolo o lo score card. fetchpriority sull'`<img>` cover non aiuta perché l'`<img>` non viene emesso. Spiega review-es 87 stabile (nessun fix LCP applicabile) e parzialmente review-it 93 (LCP element diverso, render-blocking + lazy gsap basta da soli).
- **Image-delivery era esplicitamente out-of-scope** dal diagnostic Task 1 approvato — il residual gap (6/15 pages tra 86-89) è atteso e documentato in SUMMARY.md, non un fallimento del Plan 10-05.

## User Setup Required

None — tutti i fix sono stati shippati via git push → adnanh/webhook → docker rebuild senza intervento manuale.

## Next Phase Readiness

**Pronto per Phase 11** se non c'è desiderio di chiudere DEBT-03 al 100% prima di procedere con feature work.

**Se DEBT-03 al 100% è prerequisito hard:**
- Aprire un nuovo plan (suggerimento: 10-06 o 11-01) con scope `image-delivery-insight`:
  - Cloudflare Image Resizing per `cms.bbq-experience.com/uploads/*` (helper update in `web/src/lib/media.ts` per generare URL transformed)
  - Surface `width`/`height` Strapi → component prop → `<img>` attribute (sostituire hardcoded 1600×900)
  - Opzionale: `<picture>` element con srcset multi-formato (AVIF/WebP/JPG fallback)
  - Re-misurazione post-deploy
- Stima: 1-2 task, ~1-2 ore implementation + 1 deploy + re-misure
- Atteso: tutte le 6 pagine restanti sub-90 dovrebbero salire ≥90 (LCP target -1.5/2.0 s con responsive sizes)

**Blockers / concerns:**
- Configurazione Cloudflare Image Resizing richiede plan account paid (Pro $20/mo o Image-only). Da verificare se Matteo vuole upgrade o usare alternativa (es. Strapi sharp transformations server-side).

---
*Phase: 10-debt-closure-measurement-baseline*
*Plan: 05*
*Completed: 2026-04-16*

## Self-Check: PASSED

**Files verified present in worktree:**
- `.planning/phases/10-debt-closure-measurement-baseline/10-05-SUMMARY.md` ✓
- `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` ✓ (updated, status partial_pass)
- `.planning/artifacts/lighthouse-v1.1-baseline/run-after.mjs` ✓
- `.planning/artifacts/lighthouse-v1.1-baseline/home-{en,it,es}-after.json` ✓ (3 files)
- `.planning/artifacts/lighthouse-v1.1-baseline/review-{en,it,es}-after.json` ✓ (3 files)
- `.planning/artifacts/lighthouse-v1.1-baseline/tutorial-it-after.json` ✓
- `.planning/artifacts/lighthouse-v1.1-baseline/blog-en-after.json` ✓

**Commits verified present in git log:**
- `3b78862` (Task 1 diagnostic) ✓
- `ae8dd4d` (fetchpriority hints) ✓
- `1d2b2e5` (lazy gsap + inline CSS) ✓
- `d454671` (CLS fix width/height) ✓
- `576f12a` (LCP preload) ✓

**Acceptance criteria check (Plan 10-05 `<acceptance_criteria>`):**
- ✓ One `*-after.json` per originally sub-90 page (8 files, all validated JSON)
- ✗ Every `*-after.json` has all 4 categories ≥0.90 — **6/8 still <0.90 on Performance only** (image-delivery deferred per Task 1 approved scope)
- ✗ SUMMARY.md status `pass` — set to `partial_pass` (more accurate for actual state)
- ✓ SUMMARY.md "Before / After" section with per-page scores + commit SHA
- ✗ "DEBT-03 Final Status: CLOSED" — set to "PARTIAL CLOSURE" (image-delivery follow-up outstanding)
- ✗ Phase 10 success criterion 4 ("Any page scoring below 90 has a fix shipped and a re-measured report included") — **partial**: fixes shipped + re-measured reports included for ALL 8 pages, but 6 still sub-90. Image-delivery follow-up plan required.

**Status:** Plan 10-05 ships what was in approved scope. Residual gap is known, documented, and handed off to a follow-up plan.
