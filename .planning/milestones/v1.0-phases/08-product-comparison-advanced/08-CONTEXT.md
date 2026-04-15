# Phase 8: Product Comparison & Advanced Interactions - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped)

<domain>
## Phase Boundary

Users can compare 2-5 BBQ products side-by-side, see animated scoring visualizations (radial progress bars, flame-themed gauges), and toggle dark/light mode. Premium interactive features.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Comparison tool: select products, side-by-side across all scoring categories and specs
- Cap at 5 products per comparison (UX research)
- Animated scoring: GSAP-driven radial progress bars, flame gauge effects
- Dark mode default with light mode toggle, preference persisted in localStorage
- Shareable comparison URLs
- Svelte 5 islands for interactive features

</decisions>

<code_context>
## Existing Code
- `web/src/components/review/ScoreCard.astro` — Current score display
- `web/src/lib/strapi.ts` — API client
- `web/src/lib/types.ts` — StrapiReview, StrapiProduct types
- `web/src/lib/animations.ts` — GSAP utilities
- `web/src/styles/tokens.css` — Design tokens with dark theme

</code_context>

<specifics>
No specific requirements.
</specifics>

<deferred>
None.
</deferred>
