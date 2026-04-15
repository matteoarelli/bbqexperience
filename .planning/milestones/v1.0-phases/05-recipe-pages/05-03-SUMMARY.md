---
phase: 05-recipe-pages
plan: 03
subsystem: ui
tags: [print, css, qr-code, recipe-card, media-print]

requires:
  - phase: 05-recipe-pages
    provides: Recipe page template with editorial intro, ingredients, instructions
provides:
  - Print stylesheet hiding UI chrome in @media print
  - PrintRecipeCard component with QR code via external API
  - no-print/print-only CSS class system
affects: [05-recipe-pages, seo, user-experience]

tech-stack:
  added: []
  patterns: [media-print-stylesheet, qr-code-api, no-print-class-convention]

key-files:
  created:
    - web/src/styles/print.css
    - web/src/components/recipe/PrintRecipeCard.astro
  modified:
    - web/src/pages/en/recipes/[slug].astro
    - web/src/pages/it/ricette/[slug].astro
    - web/src/pages/es/recetas/[slug].astro

key-decisions:
  - "QR code via external API (api.qrserver.com) instead of npm dependency"
  - "no-print/print-only CSS class convention for print visibility control"
  - "QR image uses loading=lazy since hidden by default"

patterns-established:
  - "Print class convention: .no-print hides in print, .print-only shows only in print"
  - "Print layout: white bg, black text, no shadows/rounded corners for ink efficiency"

requirements-completed: [REC-06]

duration: 2min
completed: 2026-04-01
---

# Phase 05 Plan 03: Print Recipe Card Summary

**Print stylesheet with @media print rules hiding navigation and interactive controls, plus PrintRecipeCard button with QR code linking back to full recipe page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T19:56:00Z
- **Completed:** 2026-04-01T19:58:00Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Created print.css with @media print rules: white background, black text, hidden UI chrome, page-break-avoid on steps
- PrintRecipeCard component with printer icon button (triggers window.print()) and QR code section visible only in print
- Applied no-print class to JumpToRecipe wrapper and editorial intro on all 3 locale pages
- QR code generated via api.qrserver.com with locale-correct canonical URLs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create print stylesheet and PrintRecipeCard** - `6d3e2cb` (feat)

## Files Created/Modified
- `web/src/styles/print.css` - @media print rules for clean recipe card printing
- `web/src/components/recipe/PrintRecipeCard.astro` - Print button + QR code with canonical URL
- `web/src/pages/en/recipes/[slug].astro` - Added print.css import, PrintRecipeCard, no-print classes
- `web/src/pages/it/ricette/[slug].astro` - Same with "Stampa Ricetta" label and IT URL
- `web/src/pages/es/recetas/[slug].astro` - Same with "Imprimir Receta" label and ES URL

## Decisions Made
- Used external QR code API to avoid adding an npm dependency (plan specified this approach)
- Print button positioned after RecipeHeader for visibility near recipe card top
- QR image has loading="lazy" since it is display:none by default

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Print functionality complete for recipe pages
- Phase 05 (recipe-pages) fully complete with all 3 plans done

## Self-Check: PASSED

All 2 created files verified on disk. Task commit (6d3e2cb) confirmed in git log.

---
*Phase: 05-recipe-pages*
*Completed: 2026-04-01*
