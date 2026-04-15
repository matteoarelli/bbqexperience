# Phase 4: Review Pages - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users can read the most complete BBQ product reviews online — with structured scoring (overall + per-category), editorial deep-dives, technical specs tables, photo galleries with zoom/lightbox, verdict cards, and Schema.org structured data. Review pages must use the existing design system (dark theme, GSAP animations) and data pipeline (Strapi API client, types).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints:
- Scoring: overall + per-category (build quality, performance, value, ease of use) — 0-10 scale
- Review structure: editorial opinion + tech specs table + pros/cons + photo gallery + verdict card
- Schema.org: Product + Review + AggregateRating JSON-LD
- Photo gallery with zoom/lightbox functionality
- Verdict cards: condensed, shareable summary (score, one-line verdict, pros/cons, product photo)
- Must work in all 3 locales (EN, IT, ES)
- Skeleton review templates already exist from Phase 3 — enhance them

</decisions>

<code_context>
## Existing Code Insights

- `web/src/pages/en/reviews/[slug].astro` — Skeleton review page (from Phase 3)
- `web/src/lib/strapi.ts` — API client
- `web/src/lib/types.ts` — StrapiReview, StrapiProduct types
- `web/src/lib/media.ts` — Media URL helpers
- `web/src/layouts/BaseLayout.astro` — Base layout
- `web/src/styles/tokens.css` — Design tokens
- `web/src/lib/animations.ts` — GSAP utilities
- `cms/src/api/review/content-types/review/schema.json` — Review schema

</code_context>

<specifics>
## Specific Ideas
No specific requirements.
</specifics>

<deferred>
## Deferred Ideas
- Product comparison tool (Phase 8)
- Animated scoring visualizations (Phase 8)
</deferred>
