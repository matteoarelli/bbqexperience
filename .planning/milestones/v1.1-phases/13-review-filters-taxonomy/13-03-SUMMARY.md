---
phase: 13-review-filters-taxonomy
plan: 03
subsystem: database
tags: [strapi, python, data-migration, products]

requires:
  - phase: 11
    provides: Product schema with price decimal, brand_relation, product_category fields
provides:
  - All 25 products have non-null EUR prices across 5 price buckets
  - All 25 products have correct brand_relation links
  - Traeger and Camp Chef recategorized from Smoker to Pellet Grill
affects: [13-review-filters-taxonomy]

tech-stack:
  added: []
  patterns: [direct-db-migration-for-strapi-v5-relations]

key-files:
  created: [scripts/fix_review_data.py]
  modified: []

key-decisions:
  - "Brand relations and category reassignment done via direct SQL INSERT/UPDATE instead of REST API — Strapi v5 REST API has issues updating relations between localized and non-localized content types"
  - "Brand matching uses lowercase name with dashes (e.g., 'Lodge' -> 'lodge') since Brand content type has no slug field"
  - "Pellet category slug is 'pellet' not 'pellet-grill' as originally assumed"

patterns-established:
  - "Direct DB updates for Strapi v5 relation fixes between localized↔non-localized content types"

requirements-completed: [FILT-01, FILT-03]

duration: 15min
completed: 2026-04-21
---

# Phase 13, Plan 03: Data Remediation Summary

**Populated all 25 product prices (5 price buckets), linked 12 missing brand relations, recategorized 2 pellet grills from Smoker category**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-21T12:09:00Z
- **Completed:** 2026-04-21T12:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- 25 products now have EUR prices: <100 (10), 100-300 (5), 300-800 (4), 800-1500 (3), >1500 (3)
- 12 missing brand_relation links created (13 already existed)
- Traeger Ironwood 885 and Camp Chef Woodwind WiFi 24 moved from Smoker to Pellet Grill category

## Task Commits

1. **Task 1: Create data remediation script** - `0227559` (feat)
2. **Task 2: Fix script bugs + apply data** - `8282c5c` (fix)

## Files Created/Modified
- `scripts/fix_review_data.py` - One-shot migration script for product prices, brands, and categories

## Decisions Made
- Used direct PostgreSQL INSERT/UPDATE instead of Strapi REST API for relation changes — Strapi v5 REST API returns 400 when connecting non-localized (Brand) to localized (Product) content types
- Applied prices via REST API (works for simple decimal fields), relations via SQL

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Script missing .env.windows loader**
- **Found during:** Task 2 (script execution)
- **Issue:** STRAPI_API_TOKEN not loaded — other agents load from .env.windows but this script didn't
- **Fix:** Added standard env loader pattern matching content_generator.py
- **Committed in:** 8282c5c

**2. [Rule 1 - Bug] Brand matching used non-existent slug field**
- **Found during:** Task 2 (script execution)
- **Issue:** Brand content type has `name` not `slug` — `_get_brand_map()` returned empty dict
- **Fix:** Map brand name to lowercase-with-dashes key (e.g., "Jealous Devil" -> "jealous-devil")
- **Committed in:** 8282c5c

**3. [Rule 1 - Bug] Wrong pellet category slug**
- **Found during:** Task 2 (script execution)
- **Issue:** Script looked for slug `pellet-grill` but actual slug is `pellet`
- **Fix:** Changed all references from `pellet-grill` to `pellet`
- **Committed in:** 8282c5c

**4. [Rule 1 - Bug] Strapi v5 REST API cannot update cross-locale relations**
- **Found during:** Task 2 (script execution)
- **Issue:** PUT /api/products/{docId} with brand_relation returns 400 "locale null not found"
- **Fix:** Used direct SQL INSERT INTO products_brand_relation_lnk and UPDATE products_product_category_lnk
- **Committed in:** 8282c5c (script fix) + data applied via SSH

---

**Total deviations:** 4 auto-fixed (4 bugs)
**Impact on plan:** All fixes necessary for script to function. Direct SQL approach is more reliable for Strapi v5 relation migrations.

## Issues Encountered
- Strapi v5 REST API has a known limitation with cross-locale relation updates via API tokens — documented in key-decisions

## User Setup Required
None - data already applied to production.

## Next Phase Readiness
- All filter dimensions have complete data: prices in 5 buckets, brands linked, categories correct
- Plan 13-02 (filter UI) can now show meaningful results for all filter types

---
*Phase: 13-review-filters-taxonomy*
*Completed: 2026-04-21*
