---
phase: 02-design-system-frontend-scaffold
plan: 03
subsystem: ui
tags: [astro, gsap, lenis, tailwind, animations, header, footer, hero, responsive, i18n]

requires:
  - phase: 02-01
    provides: "BaseLayout, SEOHead, design tokens, global CSS, Tailwind 4 setup"
  - phase: 02-02
    provides: "i18n utilities, translation files (en/it/es), LanguageSwitcher, locale pages"
provides:
  - "Header component with sticky dark backdrop, logo, desktop nav, language switcher, mobile hamburger"
  - "Footer component with 4-column grid (about, sections, connect, legal)"
  - "Nav component with localized route links"
  - "MobileMenu component with slide-in panel and hamburger toggle"
  - "Hero component with animated fire-gradient title and CTA"
  - "GSAP animation utilities (initScrollAnimations, fadeInUp, staggerReveal, titleReveal)"
  - "All 3 locale homepages wired to full UI shell (header, hero, footer)"
affects: [content-pages, reviews, recipes, tutorials, blog]

tech-stack:
  added: [gsap, lenis]
  patterns: [gsap-scroll-trigger, data-animate-attribute, hamburger-mobile-menu, sticky-header-backdrop-blur]

key-files:
  created:
    - web/src/components/common/Header.astro
    - web/src/components/common/Nav.astro
    - web/src/components/common/MobileMenu.astro
    - web/src/components/common/Footer.astro
    - web/src/components/common/Hero.astro
    - web/src/lib/animations.ts
  modified:
    - web/src/pages/en/index.astro
    - web/src/pages/it/index.astro
    - web/src/pages/es/index.astro
    - web/src/components/common/LanguageSwitcher.astro
    - web/package.json

key-decisions:
  - "LanguageSwitcher changed from fixed to relative positioning for header integration"
  - "GSAP animations use data-animate attributes for declarative scroll triggers"
  - "Hero title splits BBQ (fire gradient) from EXPERIENCE (white) for visual impact"
  - "Mobile menu uses CSS translateX for slide-in animation (no JS animation library needed)"

patterns-established:
  - "data-animate pattern: add data-animate, data-animate-delay, data-animate-duration attributes to any element for scroll-triggered fadeInUp"
  - "Component prop pattern: locale + translations passed from page to all layout components"
  - "Hamburger pattern: CSS class toggle (.menu-open, .is-open) with aria-expanded for accessibility"

requirements-completed: [DES-01, DES-02, DES-03]

duration: 3min
completed: 2026-04-01
---

# Phase 02 Plan 03: UI Shell & Animations Summary

**Sticky dark header with BBQ logo, responsive nav, mobile hamburger menu, animated hero with fire-gradient title, and 4-column footer -- wired across all 3 locale homepages with GSAP scroll animations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T16:42:28Z
- **Completed:** 2026-04-01T16:45:33Z
- **Tasks:** 3 (2 auto + 1 visual checkpoint auto-approved)
- **Files modified:** 11

## Accomplishments
- Sticky header with backdrop blur, BBQ EXP logo, desktop nav with localized routes, and language switcher
- Mobile hamburger menu with full-screen slide-in panel, animated X toggle, and keyboard/escape support
- Hero section with 90vh height, radial fire gradient background, animated BBQ EXPERIENCE title, CTA button
- Footer with 4-column grid: about, sections, connect (Instagram), legal
- GSAP animation utilities module with ScrollTrigger for scroll-triggered effects
- All 3 locale pages (en, it, es) fully wired to BaseLayout with Header, Hero, Footer

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Header, Nav, MobileMenu, Footer, and GSAP animation utilities** - `55827cd` (feat)
2. **Task 2: Create Hero component and wire all locale pages to BaseLayout with full UI shell** - `de1c7e5` (feat)
3. **Task 3: Visual verification of design system** - auto-approved (checkpoint)

## Files Created/Modified
- `web/src/components/common/Header.astro` - Sticky header with logo, Nav, LanguageSwitcher, MobileMenu
- `web/src/components/common/Nav.astro` - Desktop navigation with localized route links
- `web/src/components/common/MobileMenu.astro` - Mobile hamburger menu with slide-in panel
- `web/src/components/common/Footer.astro` - Site footer with 4-column grid, social links, copyright
- `web/src/components/common/Hero.astro` - Homepage hero with animated fire-gradient title and CTA
- `web/src/lib/animations.ts` - GSAP animation utilities (initScrollAnimations, fadeInUp, staggerReveal, titleReveal)
- `web/src/pages/en/index.astro` - Rewritten to use full UI shell with BaseLayout
- `web/src/pages/it/index.astro` - Rewritten to use full UI shell with BaseLayout
- `web/src/pages/es/index.astro` - Rewritten to use full UI shell with BaseLayout
- `web/src/components/common/LanguageSwitcher.astro` - Changed from fixed to relative positioning
- `web/package.json` - Added gsap and lenis dependencies

## Decisions Made
- LanguageSwitcher positioning changed from `position:fixed` to `position:relative` so it integrates cleanly inside the Header component instead of floating over content
- GSAP ScrollTrigger animations use a declarative `data-animate` attribute pattern -- any element with `data-animate` gets automatic fadeInUp on scroll
- Hero title splits into two visual parts: "BBQ" with text-gradient-fire and "EXPERIENCE" in primary white for brand differentiation
- Mobile menu uses pure CSS transitions (translateX) with JS class toggling rather than GSAP for the panel animation, keeping the menu lightweight

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated LanguageSwitcher from fixed to relative positioning**
- **Found during:** Task 1 (Header creation)
- **Issue:** LanguageSwitcher used position:fixed which would overlap the Header and cause z-index conflicts
- **Fix:** Changed to position:relative so it flows naturally inside Header's flex layout
- **Files modified:** web/src/components/common/LanguageSwitcher.astro
- **Verification:** Build passes, switcher renders inside header container
- **Committed in:** 55827cd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix for Header integration. Plan explicitly mentioned overriding Plan 02's fixed positioning.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `web/src/pages/en/index.astro` line ~37: Placeholder section with "Content sections will be added in future phases" -- intentional, content sections come in Phase 03+
- `web/src/components/common/Footer.astro`: Privacy Policy and Terms of Service links point to pages that don't exist yet -- will be created in a future phase

## Next Phase Readiness
- Full UI shell is operational: header, hero, footer render across all 3 locales
- GSAP animation utilities are ready for use by any future component via data-animate attributes
- Design tokens (colors, typography, spacing) are consistently applied across all components
- Layout is responsive: desktop nav + language switcher, mobile hamburger menu
- Ready for content type pages (reviews, recipes, tutorials, blog) in Phase 03

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (55827cd, de1c7e5) verified in git log. Build passes successfully producing 4 pages.

---
*Phase: 02-design-system-frontend-scaffold*
*Completed: 2026-04-01*
