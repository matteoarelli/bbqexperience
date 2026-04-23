---
phase: 14-recipe-collections
plan: 03
subsystem: seo, ui
tags: [sitemap, hreflang, xhtml, navigation, i18n, recipe-collections]

requires:
  - phase: 14-01
    provides: collections route in localizedRoutes + translation keys
provides:
  - Sitemap with recipe-collections content type and xhtml:link hreflang alternates
  - Collections link in desktop Nav and MobileMenuPanel
  - Sitemap hreflang unit test (3 tests)
affects: [seo, navigation, recipe-collections]

tech-stack:
  added: []
  patterns: [xhtml:link hreflang alternates in sitemap, alternates field on SitemapEntry interface]

key-files:
  created:
    - web/tests/sitemap-collections.test.ts
  modified:
    - web/src/pages/sitemap.xml.ts
    - web/src/components/common/Nav.astro
    - web/src/components/common/MobileMenuPanel.astro
    - web/src/lib/i18n.ts
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json

key-decisions:
  - "Exclude recipe-collections from standard content type loop to avoid duplicate entries -- hreflang section handles all collection detail URLs"
  - "Add collections after recipes in nav order (before tutorials) for content grouping logic"

patterns-established:
  - "xhtml:link hreflang pattern: fetch slugs per locale, cross-check existence, add x-default to EN variant"

requirements-completed: [COLL-05]

duration: 4min
completed: 2026-04-21
---

# Phase 14 Plan 03: Sitemap hreflang + Navigation Summary

**Sitemap extended with recipe-collections + xhtml:link hreflang alternates (COLL-05), collections link added to desktop and mobile navigation, sitemap hreflang test passing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T14:24:49Z
- **Completed:** 2026-04-21T14:28:36Z
- **Tasks:** 2 of 2 auto tasks (Task 3 is human-verify checkpoint)
- **Files modified:** 8

## Accomplishments
- Sitemap includes recipe-collections in listing routes and detail pages with xhtml:link hreflang alternate entries
- xmlns:xhtml namespace declared on urlset element
- x-default hreflang points to EN variant when available
- Collections link appears in desktop Nav and MobileMenuPanel after "Recipes"
- 3 vitest tests validate hreflang rendering logic (alternates, no-alternates, x-default)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend sitemap with recipe-collections + xhtml:link hreflang** - `1699bc7` (feat)
2. **Task 2: Add collections to navigation + sitemap hreflang test** - `1dddecf` (feat)

## Files Created/Modified
- `web/src/pages/sitemap.xml.ts` - Added recipe-collections to content types, hreflang alternates section, xmlns:xhtml namespace
- `web/src/components/common/Nav.astro` - Added collections to navLinks array
- `web/src/components/common/MobileMenuPanel.astro` - Added collections to navLinks array
- `web/src/lib/i18n.ts` - Added collections route to localizedRoutes
- `web/src/i18n/en.json` - Added nav.collections translation key
- `web/src/i18n/it.json` - Added nav.collections translation key
- `web/src/i18n/es.json` - Added nav.collections translation key
- `web/tests/sitemap-collections.test.ts` - Sitemap hreflang unit test (3 tests)

## Decisions Made
- Excluded recipe-collections from standard section 4 loop to avoid duplicate entries -- dedicated hreflang section handles all collection detail URLs with alternates
- Positioned collections link after "Recipes" in nav order for logical content grouping

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added collections route + translation keys missing from worktree**
- **Found during:** Task 1 (sitemap extension)
- **Issue:** Plan 14-01 added collections to i18n.ts and locale JSON in a separate worktree -- not present in this worktree
- **Fix:** Added `collections: { en: 'collections', it: 'raccolte', es: 'colecciones' }` to localizedRoutes and `nav.collections` to all 3 locale JSON files
- **Files modified:** web/src/lib/i18n.ts, web/src/i18n/en.json, web/src/i18n/it.json, web/src/i18n/es.json
- **Verification:** Grep confirms presence in all files
- **Committed in:** 1699bc7 (Task 1 commit)

**2. [Rule 3 - Blocking] MobileMenu.astro is hamburger only -- nav links in MobileMenuPanel.astro**
- **Found during:** Task 2 (navigation update)
- **Issue:** Plan referenced MobileMenu.astro for nav links, but actual nav links live in MobileMenuPanel.astro (hamburger + panel split per CLAUDE.md convention)
- **Fix:** Updated MobileMenuPanel.astro instead of MobileMenu.astro
- **Files modified:** web/src/components/common/MobileMenuPanel.astro
- **Verification:** Grep confirms collections in MobileMenuPanel
- **Committed in:** 1dddecf (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness in worktree context. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 3 (human-verify checkpoint) pending -- requires deploy + manual verification of sitemap, navigation, and full collections feature
- All auto tasks complete and committed

---
## Self-Check: PASSED

All 6 files found. Both commit hashes verified.

---
*Phase: 14-recipe-collections*
*Completed: 2026-04-21*
