---
phase: 16-a-b-headline-testing-infrastructure
plan: 01
subsystem: testing
tags: [ab-testing, nanoid, fnv1a, cookies, middleware, strapi]

requires:
  - phase: 15-growth-engine-v2-analytics-loop
    provides: Umami analytics infrastructure for tracking A/B events
provides:
  - Strapi ab-experiment content type with blog_post relation and variant fields
  - ab.ts library with deterministic variant assignment and bot detection
  - Astro middleware ab_id cookie assignment on every SSR request
  - StrapiAbExperiment TypeScript interface
affects: [16-02, 16-03]

tech-stack:
  added: [nanoid]
  patterns: [FNV-1a deterministic hashing for variant assignment, bot UA detection]

key-files:
  created:
    - cms/src/api/ab-experiment/content-types/ab-experiment/schema.json
    - cms/src/api/ab-experiment/routes/ab-experiment.ts
    - cms/src/api/ab-experiment/controllers/ab-experiment.ts
    - cms/src/api/ab-experiment/services/ab-experiment.ts
    - web/src/lib/ab.ts
    - web/src/lib/ab.test.ts
  modified:
    - web/src/lib/types.ts
    - web/src/middleware.ts
    - web/src/env.d.ts
    - web/package.json

key-decisions:
  - "FNV-1a hash for variant assignment — fast, deterministic, no crypto dependency"
  - "httpOnly:false on ab_id cookie — required for Umami JS tracking in Plan 02"
  - "TypeScript .ts files for Strapi factories — consistent with existing blog-post pattern"

patterns-established:
  - "A/B variant assignment: assignVariant(abId, postDocId, variantCount) returns 0-based index"
  - "Bot detection via isBot(ua) — 16 crawler patterns, always returns control variant for bots"
  - "ab_id cookie: 30-day TTL, lax sameSite, secure, set in middleware before any page logic"

requirements-completed: [AB-01, AB-02, AB-05]

duration: 5min
completed: 2026-04-21
---

# Phase 16 Plan 01: A/B Testing Foundation Summary

**Strapi ab-experiment content type + FNV-1a variant assignment library with nanoid cookies + Astro middleware extension**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-21T17:04:14Z
- **Completed:** 2026-04-21T17:09:25Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Strapi ab-experiment content type with blog_post relation, variant_a/b/c, status/winner enums, i18n localized
- ab.ts library with deterministic FNV-1a variant assignment (13 unit tests passing), bot detection for 16 crawler patterns, nanoid ID generation
- Astro middleware sets ab_id cookie (30-day, httpOnly:false) on first visit and passes abId + isBot to Astro.locals

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Strapi ab-experiment content type + TypeScript types** - `c010bbb` (feat)
2. **Task 2: Create ab.ts library with unit tests + install nanoid** - `edb4689` (feat)
3. **Task 3: Extend Astro middleware + env.d.ts for A/B cookie assignment** - `a24b6a9` (feat)

## Files Created/Modified
- `cms/src/api/ab-experiment/content-types/ab-experiment/schema.json` - A/B experiment Strapi schema
- `cms/src/api/ab-experiment/routes/ab-experiment.ts` - Core router factory
- `cms/src/api/ab-experiment/controllers/ab-experiment.ts` - Core controller factory
- `cms/src/api/ab-experiment/services/ab-experiment.ts` - Core service factory
- `web/src/lib/ab.ts` - Variant assignment + bot detection + ID generation
- `web/src/lib/ab.test.ts` - 13 unit tests for ab.ts
- `web/src/lib/types.ts` - Added StrapiAbExperiment interface and ab-experiments to ContentType
- `web/src/middleware.ts` - ab_id cookie logic + analytics CSP connect-src
- `web/src/env.d.ts` - abId + isBot in App.Locals
- `web/package.json` - nanoid dependency

## Decisions Made
- FNV-1a hash for variant assignment: fast, deterministic, zero dependency, well-distributed
- httpOnly:false on ab_id cookie: required so Umami JS client can read it for event tracking in Plan 02
- Used .ts (TypeScript) for Strapi factory files, matching existing blog-post pattern (not .js as plan specified)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used .ts instead of .js for Strapi routes/controllers/services**
- **Found during:** Task 1
- **Issue:** Plan specified .js files but existing Strapi content types use .ts with `import { factories } from '@strapi/strapi'`
- **Fix:** Created .ts files matching existing pattern
- **Files modified:** routes/ab-experiment.ts, controllers/ab-experiment.ts, services/ab-experiment.ts
- **Verification:** Files consistent with blog-post pattern

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for consistency with existing codebase. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ab-experiment Strapi content type ready for deploy (auto-registers on Strapi restart)
- ab.ts library ready for import in blog post pages (Plan 02)
- Middleware cookie assignment ready — all SSR requests will set ab_id
- CSP connect-src updated for analytics.bbq-experience.com (Umami tracking in Plan 02)

## Self-Check: PASSED

All 6 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 16-a-b-headline-testing-infrastructure*
*Completed: 2026-04-21*
