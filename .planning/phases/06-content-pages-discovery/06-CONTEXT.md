# Phase 6: Content Pages & Discovery - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users can browse tutorials and blog posts, discover content through categories, search, breadcrumbs, and related content suggestions. Reading aids include progress indicators and time estimates. Homepage has featured/seasonal content rotation curated by author.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints:
- Tutorial and blog sections as distinct browsable areas
- Content categorization/taxonomy (product type, meat type, technique)
- Breadcrumb navigation on all content pages
- Reading time estimate on all articles
- Keyword search with results filtered by content type (Pagefind recommended from research)
- Related content cross-linking reviews ↔ recipes ↔ tutorials
- Homepage hero with featured/seasonal content curated by author
- Reading progress indicator with section navigation on long-form content
- Article Schema.org JSON-LD for tutorials and blog posts
- Must work in all 3 locales

</decisions>

<code_context>
## Existing Code Insights

- `web/src/lib/strapi.ts` — API client (fetchCollection, fetchBySlug)
- `web/src/lib/types.ts` — StrapiTutorial, StrapiBlogPost types
- `web/src/layouts/BaseLayout.astro` — Base layout
- `web/src/components/common/` — Header, Footer, Nav, Hero, SEOHead
- `web/src/lib/i18n.ts` — i18n utilities
- `cms/src/api/tutorial/content-types/tutorial/schema.json` — Tutorial schema
- `cms/src/api/blog-post/content-types/blog-post/schema.json` — Blog post schema

</code_context>

<specifics>
## Specific Ideas
No specific requirements.
</specifics>

<deferred>
## Deferred Ideas
None.
</deferred>
