---
phase: 13-review-filters-taxonomy
plan: 01
subsystem: web-frontend
tags: [filters, types, seo, i18n, tdd]
dependency_graph:
  requires: []
  provides: [filter-utils, seo-noindex, product-category-types, filter-i18n]
  affects: [reviews-page, strapi-queries]
tech_stack:
  added: [vitest-tests-directory]
  patterns: [tdd-red-green, testable-helpers-extraction]
key_files:
  created:
    - web/src/lib/filters.ts
    - web/src/lib/seo-utils.ts
    - web/tests/filters.test.ts
    - web/tests/seo-head.test.ts
  modified:
    - web/src/lib/types.ts
    - web/src/components/common/SEOHead.astro
    - web/src/layouts/BaseLayout.astro
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json
    - web/vitest.config.ts
decisions:
  - Extracted seo-utils.ts helpers from SEOHead.astro so noindex/canonical logic is unit-testable
  - Extended vitest.config.ts include to cover tests/ directory alongside src/
metrics:
  duration: 6m39s
  completed: 2026-04-21
  tasks: 3/3
  tests: 32
---

# Phase 13 Plan 01: Filter Foundation — Types, Utils, SEO, i18n Summary

Filter utility library with TDD, TypeScript types aligned to Phase 11 CMS schema (product_category relation + price decimal), SEOHead noindex prop, and 19 filter i18n keys across 3 locales.

## What Was Done

### Task 1: TypeScript types + filter utility library (TDD)
- Updated `StrapiProduct`: replaced stale `category` enum and `price_range` enum with `product_category` relation and `price: number`
- Added `StrapiProductCategory` interface matching CMS schema
- Added `'product-categories'` to `ContentType` union
- Created `filters.ts` with 7 exports: `PRICE_BUCKETS`, `PRICE_BUCKET_LABELS`, `SCORE_THRESHOLDS`, `VALID_SCORES`, `parseFilterParams`, `hasActiveFilters`, `buildFilterUrl`, `buildStrapiFilters`, `computeFacetCounts`
- Input validation: score whitelist (`['6','7','8']`), price key-of-PRICE_BUCKETS check (T-13-01 mitigation)
- 25 unit tests all passing

### Task 2: SEOHead noindex prop + filter i18n keys
- Added `noindex?: boolean` prop to SEOHead and BaseLayout
- SEOHead renders `noindex, follow` or `index, follow` conditionally
- BaseLayout passes noindex through to SEOHead
- Added 19 filter translation keys to EN, IT, ES locale JSONs

### Task 3: SEO noindex/canonical unit tests (TDD)
- Created `seo-utils.ts` with `getRobotsContent()` and `getCanonicalUrl()` helpers
- Refactored SEOHead.astro to import and use these testable helpers
- 7 unit tests covering noindex true/false/default + canonical URL with/without query params

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest config didn't include tests/ directory**
- **Found during:** Task 1
- **Issue:** vitest.config.ts only included `src/**/*.test.ts`, tests in `tests/` directory wouldn't be found
- **Fix:** Extended include pattern to `['src/**/*.test.ts', 'tests/**/*.test.ts']`
- **Files modified:** web/vitest.config.ts
- **Commit:** d8b3c9d

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (RED) | d8b3c9d | test(13-01): add failing tests for filter utility library |
| 1 (GREEN) | 2a8990e | feat(13-01): implement filter utility library and update TypeScript types |
| 2 | 500d8ea | feat(13-01): add noindex prop to SEOHead/BaseLayout and filter i18n keys |
| 3 | 9525bed | feat(13-01): add SEO utils helper and noindex/canonical unit tests |

## Verification Results

- 25/25 filter tests pass
- 7/7 SEO head tests pass
- 32 total tests, 0 failures
- noindex prop present in SEOHead + BaseLayout
- 19 filter i18n keys in all 3 locales
- No stale category/price_range enums in types.ts
