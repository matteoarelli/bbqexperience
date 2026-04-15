---
phase: 02-design-system-frontend-scaffold
plan: 01
subsystem: ui
tags: [tailwind-4, css-tokens, astro, seo, hreflang, dark-theme, oswald, inter]

requires:
  - phase: 01-project-setup
    provides: Astro 6 scaffold with basic pages and i18n routing

provides:
  - CSS design tokens for BBQ dark theme palette
  - Tailwind 4 integration via Vite plugin
  - BaseLayout with SEO head (hreflang, canonical, Open Graph)
  - OptimizedImage component with lazy loading and WebP/AVIF
  - Global CSS with dark theme base styles and custom utilities

affects: [03-homepage, 04-content-templates, 05-components]

tech-stack:
  added: ["@tailwindcss/vite", "tailwindcss", "@astrojs/sitemap", "@fontsource-variable/inter", "@fontsource-variable/oswald", "sharp"]
  patterns: ["CSS custom properties for design tokens", "Tailwind 4 CSS-first config", "Astro BaseLayout with named slots"]

key-files:
  created:
    - web/src/styles/tokens.css
    - web/src/styles/global.css
    - web/src/layouts/BaseLayout.astro
    - web/src/components/common/SEOHead.astro
    - web/src/components/common/OptimizedImage.astro
  modified:
    - web/astro.config.mjs
    - web/tsconfig.json
    - web/package.json
    - web/src/pages/en/index.astro

key-decisions:
  - "Tailwind 4 via @tailwindcss/vite plugin (CSS-first, no tailwind.config.js)"
  - "Design tokens as CSS custom properties in tokens.css, imported by global.css"
  - "Updated en/index.astro instead of root index.astro (root is i18n redirect)"

patterns-established:
  - "BaseLayout pattern: all pages use BaseLayout with SEOHead for consistent meta tags"
  - "Design tokens: use var(--color-*), var(--space-*), var(--font-*) throughout"
  - "Custom utilities: container-bbq, text-gradient-fire, bg-gradient-dark, border-glow-fire"

requirements-completed: [DES-01, DES-03, DES-05, SEO-02]

duration: 4min
completed: 2026-04-01
---

# Phase 02 Plan 01: Design System Foundation Summary

**Tailwind 4 dark theme with CSS design tokens, BaseLayout with hreflang/canonical SEO, and OptimizedImage component**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T16:36:20Z
- **Completed:** 2026-04-01T16:40:07Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Dark theme design system with fire/amber/smoke palette (#0D0D0D background, #F97316 fire accent) as CSS custom properties
- BaseLayout with SEOHead generating hreflang tags for en/it/es, canonical URLs, Open Graph, and Twitter Card meta
- OptimizedImage component wrapping Astro Image with lazy loading, WebP format, and responsive srcset
- Tailwind 4 integrated via Vite plugin with custom utility classes (text-gradient-fire, container-bbq)
- Oswald (headings) and Inter (body) variable fonts installed and configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure Tailwind 4 with design tokens** - `9e7c985` (feat)
2. **Task 2: Create BaseLayout, SEOHead, and OptimizedImage components** - `2d504a5` (feat)

## Files Created/Modified
- `web/src/styles/tokens.css` - CSS custom properties for colors, spacing, typography, shadows, transitions
- `web/src/styles/global.css` - Tailwind 4 import, font imports, base dark theme, custom utilities
- `web/src/layouts/BaseLayout.astro` - Base HTML layout with SEOHead, skip-to-content, named slots
- `web/src/components/common/SEOHead.astro` - SEO head with hreflang, canonical, OG, Twitter meta
- `web/src/components/common/OptimizedImage.astro` - Image wrapper with lazy loading, WebP, srcset
- `web/astro.config.mjs` - Added Tailwind Vite plugin, sitemap integration, i18n config
- `web/tsconfig.json` - Added @layouts/*, @styles/*, @/* path aliases
- `web/package.json` - Added all design system dependencies
- `web/src/pages/en/index.astro` - Updated to use BaseLayout with fire gradient hero

## Decisions Made
- Used Tailwind 4 CSS-first approach via @tailwindcss/vite (no tailwind.config.js needed)
- Design tokens defined as CSS custom properties rather than Tailwind theme extension for framework independence
- Updated en/index.astro (not root index.astro) since root is an i18n redirect to /en/

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated en/index.astro instead of root index.astro**
- **Found during:** Task 2 (component integration)
- **Issue:** Root index.astro was changed by parallel agent to i18n redirect page; plan specified updating root index
- **Fix:** Applied BaseLayout integration to en/index.astro instead, which is the actual English homepage
- **Files modified:** web/src/pages/en/index.astro
- **Verification:** Build passes, en/index.html contains all required SEO elements
- **Committed in:** 2d504a5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Adaptation to parallel execution - correct file targeted. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully functional with real data sources.

## Next Phase Readiness
- BaseLayout ready for all page templates to inherit
- Design tokens ready for component styling
- SEOHead generates proper multilingual meta tags
- OptimizedImage ready for media-rich content pages

## Self-Check: PASSED

- All 5 created files verified on disk
- Both task commits (9e7c985, 2d504a5) verified in git log

---
*Phase: 02-design-system-frontend-scaffold*
*Completed: 2026-04-01*
