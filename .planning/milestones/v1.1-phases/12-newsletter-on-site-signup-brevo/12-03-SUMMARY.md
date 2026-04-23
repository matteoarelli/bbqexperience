---
phase: 12-newsletter-on-site-signup-brevo
plan: 03
subsystem: web/newsletter
tags: [newsletter, landing-page, i18n, brevo, doi]
dependency_graph:
  requires: [12-01]
  provides: [newsletter-landing-pages]
  affects: [web/src/pages/en/newsletter/, web/src/pages/it/newsletter/, web/src/pages/es/newsletter/]
tech_stack:
  added: []
  patterns: [locale-landing-page, source-attribution]
key_files:
  created:
    - web/src/pages/en/newsletter/index.astro
    - web/src/pages/it/newsletter/index.astro
    - web/src/pages/es/newsletter/index.astro
  modified:
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json
    - web/src/lib/i18n.ts
decisions:
  - Used BaseLayout with title/description/canonicalPath props (not separate SEOHead) to match existing page pattern (privacy.astro)
  - Added newsletter.landing.* i18n keys and newsletter route to localizedRoutes (parallel worktree prerequisite from Plan 01)
metrics:
  duration: ~4 min
  completed: 2026-04-17
  tasks: 1/2 (checkpoint reached at Task 2)
---

# Phase 12 Plan 03: Newsletter Landing Pages + Brevo DOI Verification Summary

Three newsletter landing pages (EN/IT/ES) with hero, 3-column benefits grid, social proof counter, signup form with source=landing attribution, and GDPR consent text linking to privacy policy. Checkpoint reached for Brevo DOI template configuration.

## Task Results

### Task 1: Create 3 newsletter landing pages (EN/IT/ES)
**Commit:** 9b571fe

Created 3 structurally identical pages differing only in locale value and number formatting:
- `web/src/pages/en/newsletter/index.astro` (EN, 74,000 count format)
- `web/src/pages/it/newsletter/index.astro` (IT, 74.000 count format)
- `web/src/pages/es/newsletter/index.astro` (ES, 74.000 count format)

Each page contains:
- Hero section with localized title and subtitle from i18n keys
- 3-column benefits grid (Exclusive Reviews, Original Recipes, BBQ Secrets) with SVG icons
- Social proof section with highlighted follower count
- NewsletterSignup component with `source="landing"` attribution
- Consent text with privacy policy link (`/{locale}/privacy/`)
- SEO title and description via BaseLayout (handles hreflang automatically)
- Scoped BEM-style CSS with design token variables

**Supporting changes:**
- Added 13 `newsletter.landing.*` i18n keys to all 3 locale files (EN/IT/ES)
- Added `newsletter` route to `localizedRoutes` in `web/src/lib/i18n.ts`

### Task 2: Verify Brevo DOI templates, SURFACE attribute, and welcome automation
**Status:** CHECKPOINT — awaiting human verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added newsletter.landing.* i18n keys and newsletter route**
- **Found during:** Task 1
- **Issue:** Plan 01 added these in a parallel worktree (wave 1), but this worktree is based on the pre-Plan-01 commit. Keys required for landing pages to render.
- **Fix:** Added all 13 landing i18n keys to EN/IT/ES JSON files and newsletter route to localizedRoutes
- **Files modified:** web/src/i18n/en.json, web/src/i18n/it.json, web/src/i18n/es.json, web/src/lib/i18n.ts
- **Commit:** 9b571fe

**2. [Rule 3 - Blocking] Used BaseLayout pattern instead of plan's SEOHead slot pattern**
- **Found during:** Task 1
- **Issue:** Plan template used separate SEOHead in a slot, but BaseLayout already renders SEOHead internally with title/description/locale/canonicalPath props. Using both would duplicate head tags.
- **Fix:** Followed the established page pattern (privacy.astro) passing SEO props directly to BaseLayout
- **Files modified:** All 3 newsletter pages
- **Commit:** 9b571fe

## Threat Flags

No new threat surfaces beyond what the plan's threat model covers.

## Known Stubs

None. All i18n keys contain real production copy. NewsletterSignup component has `source="landing"` wired.

## Self-Check: PASSED
