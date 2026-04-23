---
phase: 14-recipe-collections
plan: 01
subsystem: cms, ui
tags: [strapi, astro, i18n, recipe-collections, typescript]

# Dependency graph
requires:
  - phase: 11-strapi-v1.1
    provides: "recipe-collection content type scaffold"
provides:
  - "recipe-collection schema with description + author_note fields"
  - "StrapiRecipeCollection TypeScript interface"
  - "collections localizedRoutes for en/it/es"
  - "collections.* translation keys in 3 locales"
  - "CollectionCard + CollectionBadge reusable Astro components"
affects: [14-02, 14-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CollectionCard follows RecipeCard grid pattern", "CollectionBadge pill-link for cross-referencing"]

key-files:
  created:
    - web/src/components/collection/CollectionCard.astro
    - web/src/components/collection/CollectionBadge.astro
  modified:
    - cms/src/api/recipe-collection/content-types/recipe-collection/schema.json
    - web/src/lib/types.ts
    - web/src/lib/i18n.ts
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json

key-decisions:
  - "CollectionCard uses Cloudflare Image Transformations srcset (320/640/960) for responsive images"
  - "CollectionBadge uses fire-orange pill style consistent with existing badge/tag patterns"

patterns-established:
  - "collection/ component directory for recipe collection UI"
  - "CollectionCard props pattern: collection + locale + collectionsRoute + translations"

requirements-completed: [COLL-01]

# Metrics
duration: 4min
completed: 2026-04-21
---

# Phase 14 Plan 01: Recipe Collections Foundation Summary

**Strapi schema evolution with description/author_note fields, StrapiRecipeCollection TS interface, 3-locale i18n routes+keys, and CollectionCard/CollectionBadge Astro components**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T14:18:04Z
- **Completed:** 2026-04-21T14:22:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- CMS schema extended with description (text) and author_note (richtext) i18n fields
- TypeScript StrapiRecipeCollection interface + recipe-collections in ContentType union
- localizedRoutes.collections with en/it/es slugs (collections/raccolte/colecciones)
- Full collections.* translation keys in all 3 locale JSON files + nav.collections
- CollectionCard component with hero image, CF srcset, recipe count badge, truncated description
- CollectionBadge component with "Part of [Collection]" pill link for recipe detail pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Evolve Strapi schema + TypeScript types + i18n routes** - `e24e20e` (feat)
2. **Task 2: Create CollectionCard and CollectionBadge components** - `c8bf709` (feat)

## Files Created/Modified
- `cms/src/api/recipe-collection/content-types/recipe-collection/schema.json` - Added description + author_note fields
- `web/src/lib/types.ts` - StrapiRecipeCollection interface, recipe-collections in ContentType
- `web/src/lib/i18n.ts` - collections route in localizedRoutes
- `web/src/i18n/en.json` - collections.* keys + nav.collections
- `web/src/i18n/it.json` - collections.* keys + nav.collections
- `web/src/i18n/es.json` - collections.* keys + nav.collections
- `web/src/components/collection/CollectionCard.astro` - Card component for collection listing
- `web/src/components/collection/CollectionBadge.astro` - Badge component for recipe detail pages

## Decisions Made
- CollectionCard uses Cloudflare Image Transformations srcset (320/640/960) matching existing responsive image patterns
- CollectionBadge uses fire-orange pill style with uppercase text, consistent with existing badge patterns
- Description truncated to 120 chars in CollectionCard for visual consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript compiler not available in worktree (no node_modules) - verified via JSON parse + grep checks instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All contracts (types, routes, translations, components) ready for Plan 02 (listing page) and Plan 03 (detail page)
- CMS schema needs Strapi restart on server for the new fields to take effect

---
*Phase: 14-recipe-collections*
*Completed: 2026-04-21*
