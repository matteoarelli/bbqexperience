# Phase 2: Design System & Frontend Scaffold - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users see a bold, street-culture BBQ design with dark theme, smooth animations, responsive mobile-first layout, and locale-prefixed URL routing across all pages. This phase creates the complete design system foundation: Tailwind 4 dark theme with fire/amber/smoke palette, GSAP animation utilities, base Astro layouts with i18n routing, image optimization pipeline, and all reusable UI components.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key design constraints from PROJECT.md:
- Bold/street BBQ design — dark grays (#1a1a1a range), fire/amber/smoke accent colors
- NOT corporate, NOT minimal — think BBQ magazine meets street food culture
- Scroll-triggered animations via GSAP + ScrollTrigger (only transform/opacity for performance)
- Mobile-first responsive design (80%+ traffic from Instagram mobile)
- Astro 6 with Tailwind 4 and Svelte 5 islands for interactive components
- 90+ Lighthouse target — animations must not degrade performance
- i18n routing: /en/ (default), /it/, /es/ with language switcher
- Images in WebP/AVIF with lazy loading and responsive srcset
- hreflang and canonical tags on every page

</decisions>

<code_context>
## Existing Code Insights

### Existing Assets
- `web/` — Minimal Astro 6 scaffold (from Phase 1)
- `web/src/pages/index.astro` — Placeholder page
- `web/astro.config.mjs` — Base Astro config
- `cms/` — Strapi 5 CMS with content types (from Phase 1)

### Integration Points
- Astro frontend at `web/`
- Strapi API for content fetching
- Deploy via webhook rebuild on Hetzner

</code_context>

<specifics>
## Specific Ideas

No specific requirements — refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — design system phase.

</deferred>
