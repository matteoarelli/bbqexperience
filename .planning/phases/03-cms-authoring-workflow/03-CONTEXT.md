# Phase 3: CMS Authoring Workflow - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The author (Matteo) can efficiently create, translate, and publish all content types through the Strapi admin with media management and draft preview. This phase connects the Astro frontend to the Strapi CMS API, creates the data fetching layer, and enables the author to see draft content on the frontend before publishing.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints:
- Strapi 5 CMS already deployed on Hetzner with all content types
- Astro 6 frontend with i18n routing already in place
- Single author (Matteo) — CMS must be streamlined for solo workflow
- Media library with image upload and optimization
- Draft preview before publishing
- Content changes trigger auto-rebuild via webhook (already configured)
- Strapi API at cms.bbqexperience.com (once DNS configured)

</decisions>

<code_context>
## Existing Code Insights

### Existing Assets
- `cms/` — Strapi 5 project with 6 content types deployed on Hetzner
- `web/` — Astro 6 frontend with design system, i18n, BaseLayout
- `web/src/lib/i18n.ts` — i18n utilities
- `web/src/layouts/BaseLayout.astro` — Base layout with SEOHead

### Integration Points
- Strapi REST API for content fetching
- Astro Content Collections or direct API fetch
- Preview mode for draft content

</code_context>

<specifics>
## Specific Ideas

No specific requirements — refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
