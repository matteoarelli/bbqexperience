---
phase: 11-strapi-schema-migration-localization-helper
plan: 02
subsystem: database
tags: [strapi, migration, i18n, typescript, product-category, subscriber]

requires:
  - phase: 11-01
    provides: "New Strapi schemas (product-category, subscriber.source, product.product_category)"
provides:
  - "Data migration script for seeding categories, backfilling products, tagging subscribers"
  - "TypeScript locale helper for CMS-side Strapi v5 PUT operations"
  - "Python agent slug-in-body compliance audit confirmation"
affects: [phase-14, recipe-collections, newsletter-doi]

tech-stack:
  added: []
  patterns: ["updateLocalized() helper for type-safe Strapi v5 locale PUT", "Hard-coded migration map from production DB query"]

key-files:
  created:
    - cms/scripts/migrate-v11.mjs
    - cms/src/lib/update-localized.ts
  modified: []

key-decisions:
  - "Hard-coded product-to-category map from live DB query instead of reading removed enum field at migration time"
  - "fuel and other categories mapped to accessory per D-03"
  - "No products matched pellet criteria (name contains pellet AND was grill)"

patterns-established:
  - "updateLocalized(): shared TS helper enforcing slug-in-body convention for all CMS-side locale updates"
  - "Migration idempotency: check existence before seed/update"

requirements-completed: [FILT-02, FILT-08, COLL-06]

duration: 3min
completed: 2026-04-17
---

# Phase 11 Plan 02: Data Migration & Locale Helper Summary

**Idempotent migration script seeding 5 product categories (EN/IT/ES), backfilling 25 products with category relation (fuel/other to accessory), tagging subscribers as legacy; plus TypeScript updateLocalized() helper for CMS-side locale PUT**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-17T09:09:53Z
- **Completed:** 2026-04-17T09:13:11Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Migration script seeds 5 product categories with full EN/IT/ES translations via Strapi REST API
- 25 products mapped to categories from live production DB (4 fuel products remapped to accessory per D-03)
- Existing subscribers tagged with source="legacy" (non-critical, won't abort on failure)
- TypeScript updateLocalized() helper enforces slug-in-body convention with type safety
- Python agent audit confirms all 4 locale-using agents already compliant

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration script cms/scripts/migrate-v11.mjs** - `2badd63` (feat)
2. **Task 2: Create TS locale helper and audit Python agents** - `816a9cb` (feat)

## Files Created/Modified
- `cms/scripts/migrate-v11.mjs` - Data migration: seed categories, backfill products, tag subscribers
- `cms/src/lib/update-localized.ts` - Shared TS helper for Strapi v5 locale PUT with slug enforcement

## Decisions Made
- Hard-coded product-to-category mapping from production DB query (25 products) rather than trying to read the removed `category` enum field at migration time. More reliable and explicit.
- Traeger Ironwood 885 "Pellet Smoker" stays as smoker (not pellet) because the pellet category rule requires previous category = grill AND name contains "pellet". No products matched both criteria.
- All 4 fuel products (Jealous Devil, Fogo, Royal Oak, Kingsford) mapped to accessory per D-03.

## Deviations from Plan

None - plan executed exactly as written.

## Python Agent Slug-in-Body Audit

| Agent | Location | Status |
|-------|----------|--------|
| translation_agent.py | line 73: `{"slug": item.get("slug", "")}` | COMPLIANT |
| retranslate_all.py | line 127: `{"slug": slug}` | COMPLIANT |
| fix_all_translations.py | lines 93, 124, 152: `{"slug": slug}` | COMPLIANT |
| seo_optimizer.py | line 196: `"slug": slug` in data dict | COMPLIANT |

All Python agents already include slug in the body for locale PUT operations per CLAUDE.md convention. No changes needed.

## Issues Encountered
- PostgreSQL user on Hetzner is `bbqexperience` (not `strapi` as suggested in plan). Resolved by querying database list first to find correct credentials.

## User Setup Required

Migration script must be run manually after CMS rebuild with new schemas:
```bash
STRAPI_URL=https://cms.bbq-experience.com STRAPI_API_TOKEN=<token> node cms/scripts/migrate-v11.mjs
```

## Next Phase Readiness
- Migration script ready to execute post-deploy
- TS locale helper available for Phase 14 (recipe-collections) and beyond
- All Python agents confirmed slug-compliant for future locale work

---
*Phase: 11-strapi-schema-migration-localization-helper*
*Completed: 2026-04-17*
