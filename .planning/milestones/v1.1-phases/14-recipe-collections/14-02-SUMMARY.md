---
phase: 14-recipe-collections
plan: 02
subsystem: ui
tags: [astro, strapi, i18n, hreflang, seo, collections, recipes]

# Dependency graph
requires:
  - phase: 14-recipe-collections plan 01
    provides: StrapiRecipeCollection type, CollectionCard, CollectionBadge, i18n keys, collections route
provides:
  - 6 collection pages (listing + detail x3 locales)
  - Conditional hreflang via availableLocales prop on SEOHead/BaseLayout
  - CollectionBadge on recipe detail pages
affects: [14-recipe-collections plan 03, seo-optimizer, sweep-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [availableLocales prop for conditional hreflang on content with partial translations]

key-files:
  created:
    - web/src/pages/en/collections/index.astro
    - web/src/pages/en/collections/[slug].astro
    - web/src/pages/it/raccolte/index.astro
    - web/src/pages/it/raccolte/[slug].astro
    - web/src/pages/es/colecciones/index.astro
    - web/src/pages/es/colecciones/[slug].astro
  modified:
    - web/src/components/common/SEOHead.astro
    - web/src/layouts/BaseLayout.astro
    - web/src/lib/types.ts
    - web/src/pages/en/recipes/[slug].astro
    - web/src/pages/it/ricette/[slug].astro
    - web/src/pages/es/recetas/[slug].astro

key-decisions:
  - "availableLocales prop is backward-compatible: pages that omit it still get all 3 hreflang links"
  - "Hero title on detail pages uses color: #fff + text-shadow per CLAUDE.md convention for text over dark overlays"

patterns-established:
  - "availableLocales pattern: pass string[] to BaseLayout to limit hreflang output for partially-translated content"

requirements-completed: [COLL-02, COLL-03, COLL-04]

# Metrics
duration: 7min
completed: 2026-04-21
---

# Phase 14 Plan 02: Collection Pages Summary

**6 collection pages (listing + detail x3 locales) with conditional hreflang and CollectionBadge on recipe detail pages**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-21T14:24:37Z
- **Completed:** 2026-04-21T14:31:47Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- 3 collection listing pages (EN/IT/ES) with empty-collection filter, CollectionCard grid, CollectionPageSchema JSON-LD
- 3 collection detail pages with hero image (CF Image Transformations srcset), editorial intro, ordered recipe grid, author's note, conditional hreflang
- SEOHead/BaseLayout wired with optional availableLocales prop for conditional hreflang (backward-compatible)
- CollectionBadge rendered on recipe detail pages when recipe belongs to a collection
- StrapiRecipe type extended with optional collection field

## Task Commits

Each task was committed atomically:

1. **Task 1: SEOHead/BaseLayout availableLocales + collection listing pages** - `f2c7edb` (feat)
2. **Task 2: Collection detail pages with conditional hreflang** - `999cc93` (feat)
3. **Task 3: Wire CollectionBadge on recipe detail pages** - `0ccd917` (feat)

## Files Created/Modified
- `web/src/components/common/SEOHead.astro` - Added availableLocales prop, hreflangLocales computation
- `web/src/layouts/BaseLayout.astro` - Added availableLocales prop, forward to SEOHead
- `web/src/pages/en/collections/index.astro` - EN collection listing with grid and empty filter
- `web/src/pages/it/raccolte/index.astro` - IT collection listing
- `web/src/pages/es/colecciones/index.astro` - ES collection listing
- `web/src/pages/en/collections/[slug].astro` - EN collection detail with hero, intro, recipes, author note
- `web/src/pages/it/raccolte/[slug].astro` - IT collection detail
- `web/src/pages/es/colecciones/[slug].astro` - ES collection detail
- `web/src/lib/types.ts` - Added optional collection field to StrapiRecipe
- `web/src/pages/en/recipes/[slug].astro` - Added CollectionBadge import and rendering
- `web/src/pages/it/ricette/[slug].astro` - Added CollectionBadge import and rendering
- `web/src/pages/es/recetas/[slug].astro` - Added CollectionBadge import and rendering

## Decisions Made
- availableLocales prop is backward-compatible: existing pages that don't pass it still emit all 3 hreflang links
- Hero overlay text uses `color: #fff` + `text-shadow` per CLAUDE.md convention for text over dark images
- Collection detail returns 404 when collection has no recipes (empty collection = not browsable)
- editorial_intro and author_note passed through renderMarkdown() for XSS sanitization (threat mitigations T-14-03, T-14-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree was behind main (missing Plan 01 artifacts). Resolved by merging latest main commits before execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 collection pages created, ready for Plan 03 (nav integration + smoke test)
- Collection badge wired on recipe pages, will display when recipes are assigned to collections in Strapi

---
*Phase: 14-recipe-collections*
*Completed: 2026-04-21*
