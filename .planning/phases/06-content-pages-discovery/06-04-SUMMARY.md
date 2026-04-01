---
phase: 06-content-pages-discovery
plan: 04
subsystem: ui
tags: [astro, svelte, related-content, featured-hero, reading-progress, search, pagefind, discovery]

requires:
  - phase: 06-content-pages-discovery/01
    provides: shared content components (ContentLayout, ArticleCard, Breadcrumbs)
  - phase: 06-content-pages-discovery/02
    provides: Svelte interactive islands (ReadingProgress, SearchDialog)
provides:
  - RelatedContent cross-linking component for article pages
  - FeaturedHero homepage component with CMS-driven featured content
  - ReadingProgress wired into all content detail pages
  - SearchDialog accessible from Header on all pages
  - Homepage with featured content (no more placeholder)
affects: [homepage, content-pages, navigation]

tech-stack:
  added: []
  patterns: [cross-type-content-fetching, featured-content-hero, svelte-island-wiring]

key-files:
  created:
    - web/src/components/content/RelatedContent.astro
    - web/src/components/content/FeaturedHero.astro
  modified:
    - web/src/components/content/ContentLayout.astro
    - web/src/components/common/Header.astro
    - web/src/pages/en/index.astro
    - web/src/pages/it/index.astro
    - web/src/pages/es/index.astro
    - web/src/pages/en/tutorials/[slug].astro
    - web/src/pages/it/guide/[slug].astro
    - web/src/pages/es/tutoriales/[slug].astro
    - web/src/pages/en/blog/[slug].astro
    - web/src/pages/it/blog/[slug].astro
    - web/src/pages/es/blog/[slug].astro

key-decisions:
  - "RelatedContent fetches from tutorials, reviews, and recipes simultaneously using Promise.all"
  - "RelatedContent uses horizontal scroll on mobile, 3-column grid on desktop"
  - "FeaturedHero falls back to static Hero component when no featured posts exist in CMS"
  - "SearchDialog placed in Header before LanguageSwitcher for consistent access"

patterns-established:
  - "Cross-type content fetching: fetch from multiple content types, combine, shuffle, slice"
  - "Featured content pattern: CMS boolean flag drives homepage hero with graceful static fallback"
  - "Svelte island wiring: client:idle for non-critical interactive components"

requirements-completed: [CNT-07, CNT-08]

duration: 8min
completed: 2026-04-01
---

# Phase 06 Plan 04: Related Content, Featured Hero, and Discovery Wiring Summary

**Cross-type related content, CMS-driven featured hero, reading progress bar, and search dialog wired across all pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T20:04:00Z
- **Completed:** 2026-04-01T20:12:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- RelatedContent component fetches and displays cross-type suggestions (tutorials, reviews, recipes) on every article page
- FeaturedHero component replaces homepage placeholder with CMS-driven featured blog posts
- ReadingProgress bar appears on all content detail pages during scroll
- SearchDialog accessible from Header on every page via magnifying glass button
- Homepage no longer shows "Content sections will be added in future phases" placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RelatedContent and FeaturedHero components** - `4a7ae69` (feat)
2. **Task 2: Wire ReadingProgress, SearchDialog, RelatedContent, FeaturedHero into pages** - `37c6342` (feat)

## Files Created/Modified
- `web/src/components/content/RelatedContent.astro` - Cross-type related content section with content-type badges
- `web/src/components/content/FeaturedHero.astro` - Homepage hero with featured CMS content and static fallback
- `web/src/components/content/ContentLayout.astro` - Added ReadingProgress Svelte island with client:idle
- `web/src/components/common/Header.astro` - Added SearchDialog with search translations
- `web/src/pages/en/index.astro` - Replaced placeholder with FeaturedHero
- `web/src/pages/it/index.astro` - Replaced placeholder with FeaturedHero
- `web/src/pages/es/index.astro` - Replaced placeholder with FeaturedHero
- `web/src/pages/en/tutorials/[slug].astro` - Added RelatedContent in related slot
- `web/src/pages/it/guide/[slug].astro` - Added RelatedContent in related slot
- `web/src/pages/es/tutoriales/[slug].astro` - Added RelatedContent in related slot
- `web/src/pages/en/blog/[slug].astro` - Added RelatedContent in related slot
- `web/src/pages/it/blog/[slug].astro` - Added RelatedContent in related slot
- `web/src/pages/es/blog/[slug].astro` - Added RelatedContent in related slot

## Decisions Made
- RelatedContent fetches 4 tutorials, 3 reviews, 3 recipes in parallel, shuffles, takes first 6 for variety
- FeaturedHero renders the first featured post as a full-width hero card with gradient overlay, secondary posts below in a 2-column grid
- SearchDialog receives only the search-relevant translations (searchPlaceholder, noArticles) from the translations object
- Removed unused Hero imports from homepage files after switching to FeaturedHero

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused STRAPI_URL import in EN tutorial detail page**
- **Found during:** Task 1 (astro check verification)
- **Issue:** STRAPI_URL was imported but unused, causing a TypeScript warning
- **Fix:** Removed the unused named import
- **Files modified:** web/src/pages/en/tutorials/[slug].astro
- **Committed in:** 4a7ae69 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial cleanup. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Content discovery system fully wired: cross-linking, featured hero, search, reading progress
- All content pages have Schema.org structured data, Pagefind indexing, and related content
- Ready for content creation in Strapi CMS
- Homepage dynamically reflects featured content from CMS

---
*Phase: 06-content-pages-discovery*
*Completed: 2026-04-01*
