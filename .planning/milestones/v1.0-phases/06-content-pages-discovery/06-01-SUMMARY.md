---
phase: 06-content-pages-discovery
plan: 01
subsystem: ui
tags: [astro, tutorials, content-pages, breadcrumbs, i18n, strapi]

requires:
  - phase: 03-cms-authoring-workflow
    provides: Strapi content types, fetchCollection/fetchBySlug API, preview system
  - phase: 02-design-system-frontend-scaffold
    provides: BaseLayout, Header, Footer, design tokens, i18n utilities
provides:
  - Reusable Breadcrumbs component for content pages
  - Reusable ArticleCard component for listing grids
  - Reusable ContentLayout for long-form articles with prose styling
  - Tutorial listing pages for all 3 locales (en, it, es)
  - Tutorial detail pages with SSR preview support
  - Content i18n translations (categories, difficulty, reading time)
affects: [06-02, 06-03, 06-04, blog-pages, discovery-features]

tech-stack:
  added: []
  patterns: [content-listing-page, content-detail-page, breadcrumb-navigation, article-card-grid]

key-files:
  created:
    - web/src/components/content/Breadcrumbs.astro
    - web/src/components/content/ArticleCard.astro
    - web/src/components/content/ContentLayout.astro
    - web/src/pages/en/tutorials/index.astro
    - web/src/pages/en/tutorials/[slug].astro
    - web/src/pages/it/guide/index.astro
    - web/src/pages/it/guide/[slug].astro
    - web/src/pages/es/tutoriales/index.astro
    - web/src/pages/es/tutoriales/[slug].astro
  modified:
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json

key-decisions:
  - "Tutorial listing pages use prerender=true (static) while detail pages use SSR for preview support"
  - "ContentLayout adds id attributes to h2 elements via regex for section navigation"
  - "Difficulty badges color-coded: green for beginner, amber for intermediate, red for advanced"

patterns-established:
  - "Content listing pattern: fetchCollection with locale, render ArticleCard grid with responsive 1/2/3 columns"
  - "Content detail pattern: fetchBySlug with preview status, ContentLayout with breadcrumbs and badges slots"
  - "Shared content components: Breadcrumbs, ArticleCard, ContentLayout reusable across tutorials and blog"

requirements-completed: [CNT-01, CNT-04, CNT-05]

duration: 4min
completed: 2026-04-01
---

# Phase 06 Plan 01: Tutorial Pages & Shared Content Components Summary

**Shared content components (Breadcrumbs, ArticleCard, ContentLayout) and tutorial listing/detail pages for 3 locales with breadcrumb navigation, reading time, and difficulty badges**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T19:44:40Z
- **Completed:** 2026-04-01T19:48:53Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Created 3 reusable content components (Breadcrumbs, ArticleCard, ContentLayout) establishing patterns for all content pages
- Built tutorial listing pages for all 3 locales with responsive grid, empty state handling, and breadcrumbs
- Built tutorial detail pages with SSR preview support, difficulty badges, reading time, and prose-styled content
- Added comprehensive content i18n translations (categories, difficulty levels, UI strings) to all 3 locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared content components** - `5579578` (feat)
2. **Task 2: Create tutorial listing and detail pages** - `5fa8097` (feat)

## Files Created/Modified
- `web/src/components/content/Breadcrumbs.astro` - Accessible breadcrumb navigation with aria-label and fire accent hover
- `web/src/components/content/ArticleCard.astro` - Dark-themed card with cover image, category badge, reading time, date
- `web/src/components/content/ContentLayout.astro` - Long-form article layout with prose styling and h2 ID anchors
- `web/src/pages/en/tutorials/index.astro` - Tutorial listing page (EN)
- `web/src/pages/en/tutorials/[slug].astro` - Tutorial detail page (EN)
- `web/src/pages/it/guide/index.astro` - Tutorial listing page (IT)
- `web/src/pages/it/guide/[slug].astro` - Tutorial detail page (IT)
- `web/src/pages/es/tutoriales/index.astro` - Tutorial listing page (ES)
- `web/src/pages/es/tutoriales/[slug].astro` - Tutorial detail page (ES)
- `web/src/i18n/en.json` - Added content translations section
- `web/src/i18n/it.json` - Added content translations section (Italian)
- `web/src/i18n/es.json` - Added content translations section (Spanish)

## Decisions Made
- Tutorial listing pages use `prerender = true` (static generation) for performance; detail pages use SSR (`prerender = false`) for preview support -- consistent with existing review page pattern
- ContentLayout processes rich text content by adding `id` attributes to h2 elements via regex, enabling future section navigation and reading progress features
- Difficulty badges use color-coded system: green (#22c55e) for beginner, amber (#f59e0b) for intermediate, red (#ef4444) for advanced

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing astro check errors (OptimizedImage type mismatch, review page slot issues) are unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Shared content components (Breadcrumbs, ArticleCard, ContentLayout) are ready for blog pages (Plan 03) to reuse
- Content i18n translations include blog-related keys (blog categories, allPosts) anticipating Plan 03
- Pattern established for all future content listing/detail pages

## Self-Check: PASSED

All 9 created files verified on disk. Both commits (5579578, 5fa8097) verified in git log.

---
*Phase: 06-content-pages-discovery*
*Completed: 2026-04-01*
