---
phase: 03-cms-authoring-workflow
plan: 02
subsystem: cms
tags: [astro, strapi, preview, ssr, hybrid, cookies, middleware]

# Dependency graph
requires:
  - phase: 03-cms-authoring-workflow/01
    provides: Strapi API client (fetchBySlug), TypeScript types (StrapiReview), media helpers
provides:
  - Draft content preview system with secret-protected cookie flow
  - SSR review page template for all 3 locales (en/it/es)
  - Astro hybrid output mode with @astrojs/node adapter
  - Middleware injecting preview state into Astro.locals
affects: [04-review-pages, 05-recipe-pages, 06-content-pages]

# Tech tracking
tech-stack:
  added: ["@astrojs/node"]
  patterns: ["Hybrid SSR for preview routes", "Cookie-based preview with secret validation", "Locale-specific page routes with Strapi fetch"]

key-files:
  created:
    - web/src/lib/preview.ts
    - web/src/pages/api/preview.ts
    - web/src/middleware.ts
    - web/src/pages/en/reviews/[slug].astro
    - web/src/pages/it/recensioni/[slug].astro
    - web/src/pages/es/resenas/[slug].astro
  modified:
    - web/astro.config.mjs
    - web/src/env.d.ts
    - web/.env.example

key-decisions:
  - "All review pages are SSR (prerender=false) to support both preview and published content via status param"
  - "Preview cookie uses httpOnly with 1-hour expiry for security"
  - "Minimal review template — Phase 4 builds full scoring UI, gallery, verdict cards"

patterns-established:
  - "Preview pattern: API endpoint sets cookie -> middleware reads cookie -> page checks Astro.locals.isPreview -> fetches with draft/published status"
  - "Locale page pattern: separate .astro files per locale at locale-specific paths (/en/reviews, /it/recensioni, /es/resenas)"

requirements-completed: [CMS-05, CMS-01, CMS-02]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 03 Plan 02: Draft Preview System & Review Page Template Summary

**Hybrid SSR preview system with secret-protected cookie flow and multilingual review page templates fetching from Strapi**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T19:28:20Z
- **Completed:** 2026-04-01T19:31:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 9

## Accomplishments
- Astro switched to hybrid output mode with @astrojs/node adapter, enabling SSR for preview and API routes
- Complete preview flow: API endpoint validates secret, sets httpOnly cookie, middleware injects isPreview into locals, pages fetch draft/published based on status
- Review page templates for all 3 locales (EN, IT, ES) proving the full CMS-to-frontend data pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable hybrid mode and create preview system** - `a280dac` (feat)
2. **Task 2: Create first content page template (review) with preview support** - `fad6778` (feat)
3. **Task 3: Verify CMS authoring workflow end-to-end** - auto-approved (checkpoint, no code changes)

## Files Created/Modified
- `web/astro.config.mjs` - Changed output to hybrid, added @astrojs/node adapter
- `web/src/lib/preview.ts` - Preview constants and helpers (isPreviewMode, getContentStatus)
- `web/src/pages/api/preview.ts` - GET sets preview cookie + redirects, DELETE clears cookie
- `web/src/middleware.ts` - Reads preview cookie, sets Astro.locals.isPreview
- `web/src/env.d.ts` - App.Locals type declaration with isPreview
- `web/.env.example` - Added PREVIEW_SECRET env var
- `web/src/pages/en/reviews/[slug].astro` - EN review template with preview banner
- `web/src/pages/it/recensioni/[slug].astro` - IT review template with Italian preview banner
- `web/src/pages/es/resenas/[slug].astro` - ES review template with Spanish preview banner

## Decisions Made
- All review pages use SSR (prerender=false) to handle both preview draft and published content dynamically
- Preview cookie is httpOnly with sameSite lax and 1-hour maxAge for security
- Review templates are intentionally minimal — Phase 4 will build the full scoring UI, gallery, and verdict cards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

To use the preview system:
1. Set `PREVIEW_SECRET` in `web/.env` to a random string
2. Access preview via: `/api/preview?secret=YOUR_SECRET&slug=REVIEW_SLUG&type=reviews&locale=en`

## Next Phase Readiness
- Preview system ready for all future content types (recipes, tutorials, blog posts)
- Review page template establishes the pattern for Phase 4 full design
- Hybrid SSR mode enables any future route to opt into server rendering

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (a280dac, fad6778) verified in git log.

---
*Phase: 03-cms-authoring-workflow*
*Completed: 2026-04-01*
