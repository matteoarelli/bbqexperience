---
phase: 13-review-filters-taxonomy
plan: 02
subsystem: ui
tags: [astro, svelte5, filters, facets, seo, noindex, 301-redirect, i18n]

requires:
  - phase: 13-01
    provides: filter utility library (parseFilterParams, buildStrapiFilters, computeFacetCounts, buildFilterUrl), SEO helpers, updated types, i18n filter keys, unit tests
  - phase: 13-03
    provides: product price and brand_relation data remediation, pellet category recategorization
provides:
  - ReviewFilterBar.astro (desktop multi-facet filter UI with count badges)
  - ReviewFilterDrawer.svelte (mobile bottom-sheet Svelte 5 island with pending selections)
  - ReviewEmptyState.astro (zero-match empty state with clear filters link)
  - Rewritten EN/IT/ES reviews index pages with full filter system and SEO noindex/canonical
  - 301 redirects from old category routes in all 3 locales
affects: [review-pages, seo, mobile-ux]

tech-stack:
  added: []
  patterns: [svelte5-island-with-prebuilt-urls, facet-count-filter-bar, mobile-bottom-sheet-drawer]

key-files:
  created:
    - web/src/components/review/ReviewFilterBar.astro
    - web/src/components/review/ReviewFilterDrawer.svelte
    - web/src/components/review/ReviewEmptyState.astro
  modified:
    - web/src/pages/en/reviews/index.astro
    - web/src/pages/it/recensioni/index.astro
    - web/src/pages/es/resenas/index.astro
    - web/src/pages/en/reviews/category/[category].astro
    - web/src/pages/it/recensioni/categoria/[category].astro
    - web/src/pages/es/resenas/categoria/[category].astro
    - web/src/lib/types.ts

key-decisions:
  - "Pre-build all filter URLs server-side in Astro, pass to Svelte drawer as props -- avoids duplicating URL logic in island"
  - "Add slug field to StrapiBrand type (was missing, needed for facet count matching)"
  - "Toggle behavior on filter pills (clicking active filter deselects it) for better UX"

patterns-established:
  - "Svelte island receives pre-built URLs from Astro parent: no URL construction logic duplication in islands"
  - "Desktop filter bar hidden via CSS on mobile, replaced by bottom-sheet drawer with pending state and Apply button"
  - "Filtered URLs emit noindex via BaseLayout prop, canonical always points to unfiltered index"

requirements-completed: [FILT-01, FILT-02, FILT-03, FILT-04, FILT-05, FILT-06, FILT-07]

duration: 7min
completed: 2026-04-21
---

# Phase 13 Plan 02: Filter UI Components & Reviews Pages Summary

**Multi-facet filter UI (brand, category, price, score) with desktop filter bar, mobile bottom-sheet drawer, count badges, empty state, SEO noindex/canonical, and 301 redirects from old category routes across all 3 locales**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-21T12:20:49Z
- **Completed:** 2026-04-21T12:27:19Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Full multi-facet filter system (brand, category, price bucket, score threshold) on all 3 locale reviews pages with count badges
- Mobile bottom-sheet drawer (Svelte 5 island) with pending selections, focus trap, and Apply button navigating to pre-built URLs
- SEO guardrails: filtered URLs get noindex,follow + canonical to unfiltered index; unfiltered stays index,follow
- 301 redirects from all 3 locale old category routes to query-param equivalents

## Task Commits

Each task was committed atomically:

1. **Task 1: Create filter components and rewrite EN reviews index page with 301 redirects** - `d25e7a1` (feat)
2. **Task 2: Replicate filter system to IT and ES reviews index pages** - `711c769` (feat)

## Files Created/Modified
- `web/src/components/review/ReviewFilterBar.astro` - Desktop inline filter UI with 4 filter groups, pills, count badges, clear filters link
- `web/src/components/review/ReviewFilterDrawer.svelte` - Mobile bottom-sheet Svelte 5 island with $props/$state/$derived, focus trap, Apply/Clear buttons
- `web/src/components/review/ReviewEmptyState.astro` - Zero-match state with search-X icon and clear filters CTA
- `web/src/pages/en/reviews/index.astro` - Rewritten with multi-facet filters, computeFacetCounts, noindex for filtered URLs
- `web/src/pages/it/recensioni/index.astro` - Replicated filter system with IT locale and translations
- `web/src/pages/es/resenas/index.astro` - Replicated filter system with ES locale and translations
- `web/src/pages/en/reviews/category/[category].astro` - Converted to 301 redirect
- `web/src/pages/it/recensioni/categoria/[category].astro` - Converted to 301 redirect
- `web/src/pages/es/resenas/categoria/[category].astro` - Converted to 301 redirect
- `web/src/lib/types.ts` - Added slug field to StrapiBrand interface

## Decisions Made
- Pre-build all filter URLs server-side in Astro and pass to Svelte drawer as props, avoiding URL construction logic duplication in the island (only a simple URLSearchParams assembly for the Apply button)
- Added slug field to StrapiBrand type -- was missing but needed by computeFacetCounts and filter matching
- Toggle behavior on active filter pills (clicking a selected filter deselects it) for intuitive UX

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing slug field to StrapiBrand type**
- **Found during:** Task 1 (EN reviews index implementation)
- **Issue:** StrapiBrand interface lacked slug field, but computeFacetCounts and filter brand matching rely on brand.slug
- **Fix:** Added `slug: string` to StrapiBrand in types.ts
- **Files modified:** web/src/lib/types.ts
- **Verification:** Type usage consistent across filters.ts and all review pages
- **Committed in:** d25e7a1 (Task 1 commit)

**2. [Rule 3 - Blocking] Removed unsupported fields parameter from fetchCollection call**
- **Found during:** Task 1 (EN reviews index implementation)
- **Issue:** Plan specified `fields: ['score_overall']` but FetchCollectionOptions doesn't support fields parameter
- **Fix:** Removed fields param; Strapi returns all fields anyway with pageSize: 100 fetch for 25-item corpus
- **Files modified:** web/src/pages/en/reviews/index.astro
- **Committed in:** d25e7a1 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Worktree was behind main (missing Plan 13-01 changes) -- merged main before starting to get filters.ts, updated types, and i18n filter keys

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 locale reviews pages have complete multi-facet filtering with shareable URLs and SEO guardrails
- Old category routes return 301 redirects preserving SEO value
- Phase 13 is complete (Plans 01, 02, 03 all done) -- ready for phase transition

---
*Phase: 13-review-filters-taxonomy*
*Completed: 2026-04-21*
