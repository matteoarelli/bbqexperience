---
phase: 06-content-pages-discovery
plan: 03
subsystem: ui
tags: [astro, blog, category-filter, schema-org, json-ld, seo, strapi, i18n]

requires:
  - phase: 06-content-pages-discovery/01
    provides: shared content components (Breadcrumbs, ArticleCard, ContentLayout, tutorial pages)
provides:
  - Blog listing pages for all 3 locales with featured posts
  - Blog detail pages with SSR preview support
  - Category filtering on tutorial and blog listing pages
  - ArticleSchema.astro for Schema.org Article JSON-LD
  - data-pagefind-body on all content detail pages
affects: [06-content-pages-discovery, seo, search]

tech-stack:
  added: []
  patterns: [category-filter-via-query-params, schema-org-json-ld-component]

key-files:
  created:
    - web/src/pages/en/blog/index.astro
    - web/src/pages/en/blog/[slug].astro
    - web/src/pages/it/blog/index.astro
    - web/src/pages/it/blog/[slug].astro
    - web/src/pages/es/blog/index.astro
    - web/src/pages/es/blog/[slug].astro
    - web/src/components/content/ArticleSchema.astro
  modified:
    - web/src/pages/en/tutorials/index.astro
    - web/src/pages/it/guide/index.astro
    - web/src/pages/es/tutoriales/index.astro
    - web/src/pages/en/tutorials/[slug].astro
    - web/src/pages/it/guide/[slug].astro
    - web/src/pages/es/tutoriales/[slug].astro
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json

key-decisions:
  - "Listing pages changed from prerender=true to SSR (prerender=false) to support dynamic category filtering via query params"
  - "Category filter uses <a> links with ?category= query params for zero-JS filtering"
  - "Featured posts hidden when category filter is active to avoid confusion"

patterns-established:
  - "Category filter pattern: SSR page reads Astro.url.searchParams.get('category') and passes to fetchCollection filters"
  - "ArticleSchema component: reusable JSON-LD generator that omits null fields"

requirements-completed: [CNT-02, CNT-03, CNT-10]

duration: 12min
completed: 2026-04-01
---

# Phase 06 Plan 03: Blog Pages, Category Filtering, and Article Schema Summary

**Blog listing/detail pages for 3 locales with category filtering and Schema.org Article JSON-LD for SEO rich results**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-01T19:51:57Z
- **Completed:** 2026-04-01T20:04:00Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Blog section fully operational across all 3 locales (en, it, es) with listing and detail pages
- Category filtering on both tutorial and blog listing pages via URL query params (?category=technique)
- ArticleSchema component generating valid Schema.org Article JSON-LD on all content detail pages
- Featured blog posts highlighted at top of listing pages with full-width first card
- data-pagefind-body attribute added to all content detail pages for search indexing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create blog listing and detail pages for all 3 locales** - `94c345b` (feat)
2. **Task 2: Add category filtering to listing pages and create ArticleSchema** - `7a75f7f` (feat)

## Files Created/Modified
- `web/src/pages/en/blog/index.astro` - Blog listing page (EN) with featured posts and category filter
- `web/src/pages/en/blog/[slug].astro` - Blog detail page (EN) with SSR preview, ArticleSchema, data-pagefind-body
- `web/src/pages/it/blog/index.astro` - Blog listing page (IT)
- `web/src/pages/it/blog/[slug].astro` - Blog detail page (IT)
- `web/src/pages/es/blog/index.astro` - Blog listing page (ES)
- `web/src/pages/es/blog/[slug].astro` - Blog detail page (ES)
- `web/src/components/content/ArticleSchema.astro` - Reusable Schema.org Article JSON-LD component
- `web/src/pages/en/tutorials/index.astro` - Updated to SSR with category filter bar
- `web/src/pages/it/guide/index.astro` - Updated to SSR with category filter bar
- `web/src/pages/es/tutoriales/index.astro` - Updated to SSR with category filter bar
- `web/src/pages/en/tutorials/[slug].astro` - Added ArticleSchema + data-pagefind-body
- `web/src/pages/it/guide/[slug].astro` - Added ArticleSchema + data-pagefind-body
- `web/src/pages/es/tutoriales/[slug].astro` - Added ArticleSchema + data-pagefind-body
- `web/src/i18n/en.json` - Added allCategories translation key
- `web/src/i18n/it.json` - Added allCategories translation key
- `web/src/i18n/es.json` - Added allCategories translation key

## Decisions Made
- Changed listing pages from static (prerender=true) to SSR (prerender=false) to support dynamic category filtering via query params without client-side JavaScript
- Category filter uses plain `<a>` links for zero-JS operation, with fire accent background on active state
- Featured posts section is hidden when a category filter is active to avoid visual confusion
- ArticleSchema omits null fields from JSON-LD output for cleaner structured data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added allCategories i18n translation key**
- **Found during:** Task 2 (Category filtering)
- **Issue:** No "All" label existed in i18n files for the category filter reset button
- **Fix:** Added `content.allCategories` key to en.json, it.json, and es.json
- **Files modified:** web/src/i18n/en.json, web/src/i18n/it.json, web/src/i18n/es.json
- **Committed in:** 7a75f7f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential i18n key for category filter functionality. No scope creep.

## Issues Encountered
- Pre-existing astro check error in OptimizedImage.astro (unrelated to this plan, out of scope)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Blog section complete and ready for content creation in Strapi
- Category filtering works for both tutorials and blog posts
- Schema.org structured data ready for SEO validation

---
*Phase: 06-content-pages-discovery*
*Completed: 2026-04-01*
