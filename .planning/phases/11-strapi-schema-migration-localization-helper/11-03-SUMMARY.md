---
phase: 11-strapi-schema-migration-localization-helper
plan: 03
subsystem: database
tags: [strapi, migration, postgresql, deployment, hetzner, i18n]

# Dependency graph
requires:
  - phase: 11-01
    provides: "New Strapi schemas (product-category, recipe-collection, modified product/subscriber/recipe)"
  - phase: 11-02
    provides: "Migration script (migrate-v11.mjs) and TypeScript locale helper"
provides:
  - "Production Strapi running v1.1 schema with all data migrated"
  - "5 product categories seeded with EN/IT/ES translations"
  - "25 products backfilled with product_category relation"
  - "6 subscribers tagged with source=legacy"
  - "recipe_collections table live in production"
affects: [12-frontend-taxonomy-collection-ui, 13-newsletter-subscribe-widget, 14-strapi-permissions-api-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Idempotent migration via REST API inside Docker container"]

key-files:
  created: []
  modified: []

key-decisions:
  - "Ran migration inside Strapi container (node not installed on host)"
  - "Used internal http://localhost:1337 URL from inside container for migration"
  - "Database name is bbqexperience (not strapi) with user bbqexperience"

patterns-established:
  - "Run Node.js scripts via docker exec bbqexperience-strapi node /opt/app/scripts/<script>"
  - "Source /opt/services/bbqexperience/.env to get STRAPI_API_TOKEN before docker exec"

requirements-completed: [FILT-02, FILT-08, NEWS-05, COLL-06]

# Metrics
duration: 7min
completed: 2026-04-17
---

# Phase 11 Plan 03: Production Deploy & Migration Summary

**Deployed v1.1 schema to Hetzner, ran migration seeding 5 product categories (EN/IT/ES), backfilling 25 products, and tagging 6 subscribers as legacy -- all SQL audits passed**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-17T09:15:15Z
- **Completed:** 2026-04-17T09:22:22Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 0 (server-side operations only)

## Accomplishments
- Pushed all Phase 11 schema + migration files to production via git push (webhook auto-deploy)
- Strapi container rebuilt with new content types (product-category, recipe-collection)
- Migration script executed successfully: 5 categories seeded, 25 products backfilled, 6 subscribers tagged
- All 5 SQL audits passed with zero data gaps

## Task Commits

Tasks 1 and 2 were server-side deployment and verification operations with no local file changes.

1. **Task 1: Push changes and rebuild CMS on Hetzner** - No local commit (server-side deploy + migration)
2. **Task 2: Verify migration with SQL and REST audits** - No local commit (server-side verification)
3. **Task 3: Matteo verifies migration in Strapi admin** - CHECKPOINT (awaiting human verification)

## Migration Results

### Step 1: Category Seeding
| Category | EN | IT | ES | Document ID |
|----------|----|----|-----|-------------|
| grill | Grill | Griglia | Parrilla | bj851zksmzdfqo8jnf79ipke |
| smoker | Smoker | Affumicatore | Ahumador | v6izgp53ftrc7odez9i0t9a1 |
| pellet | Pellet Grill | Griglia a Pellet | Parrilla de Pellet | egtcsq5bdgcf0f2vrh772z7h |
| thermometer | Thermometer | Termometro | Termometro | pku7388gfdk5ssq3nz8vz4nm |
| accessory | Accessory | Accessorio | Accesorio | lr3pw1ezkakkohkrzge5oql1 |

### Step 2: Product Backfill
All 25 products assigned to categories. 4 fuel products remapped to accessory per D-03.

### Step 3: Subscriber Tagging
All 6 subscribers tagged with source=legacy.

## SQL Audit Results

| Audit | Expected | Actual | Status |
|-------|----------|--------|--------|
| Product categories (EN) | 5 | 5 | PASS |
| Product categories (total 3 locales) | 15 | 15 | PASS |
| Products with null category (EN) | 0 | 0 | PASS |
| Subscribers with null source | 0 | 0 (all legacy) | PASS |
| recipe_collections table exists | yes | yes | PASS |
| REST API categories (locale=en) | 5 | 5 | PASS |

## Decisions Made
- Ran migration script inside Strapi container via `docker exec` because Node.js is not installed on the host
- Used `http://localhost:1337` as STRAPI_URL inside the container (internal network)
- Database credentials: user=bbqexperience, db=bbqexperience (not "strapi" as suggested in plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Database name and user differ from plan**
- **Found during:** Task 1 (pre-migration query)
- **Issue:** Plan assumed database "strapi" with user "strapi", actual is "bbqexperience" with user "bbqexperience"
- **Fix:** Used correct credentials for all psql commands
- **Files modified:** None (runtime fix)
- **Verification:** All queries executed successfully

**2. [Rule 3 - Blocking] Node.js not available on host**
- **Found during:** Task 1 (migration script execution)
- **Issue:** `node` command not found on Hetzner host
- **Fix:** Ran script inside Strapi container via `docker exec bbqexperience-strapi node /opt/app/scripts/migrate-v11.mjs`
- **Files modified:** None (runtime fix)
- **Verification:** Migration completed successfully

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes are runtime environment adaptations. No scope creep.

## Issues Encountered
- Strapi container has no published ports (accessed via Docker network + Caddy reverse proxy). Used `docker exec` for internal access.
- Deploy webhook triggered automatically on push, rebuilding both Strapi and web containers. Waited for full deploy completion before running migration.

## User Setup Required
None - migration is complete. Task 3 requires Matteo to verify in Strapi admin panel.

## Next Phase Readiness
- All v1.1 schema changes live in production
- Product categories available via REST API for Phase 12 (frontend taxonomy UI)
- Recipe-collection content type ready for Phase 14 content seeding
- Subscriber source field ready for Phase 13 (newsletter subscribe widget)

## Self-Check: PENDING

Task 3 (human-verify checkpoint) not yet complete. Summary will be finalized after Matteo approves.

---
*Phase: 11-strapi-schema-migration-localization-helper*
*Completed: 2026-04-17 (pending Task 3 human verification)*
