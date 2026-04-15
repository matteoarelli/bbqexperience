# Phase 9: SEO Audit, Performance & Launch - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped)

<domain>
## Phase Boundary

Final quality gate before launch. Lighthouse 90+ across all metrics, per-locale XML sitemaps, BreadcrumbList Schema.org on all pages, OG/Twitter Card meta verification, branded 404 page with search and navigation. This is an audit and polish phase — fix issues found, don't add features.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Lighthouse 90+ on Performance, Accessibility, Best Practices, SEO
- Per-locale XML sitemaps (en.xml, it.xml, es.xml)
- BreadcrumbList Schema.org JSON-LD on all pages
- Open Graph + Twitter Card meta tags on all content
- Branded 404 page with search and navigation back to content
- Fix any performance issues found during audit (image optimization, bundle size, CLS)
- GDPR cookie consent for EU visitors (IT, ES markets)

</decisions>

<code_context>
## Existing Code
- All components and pages from Phases 2-8
- `web/src/components/common/SEOHead.astro` — OG/Twitter meta already partially implemented
- `web/src/components/content/Breadcrumbs.astro` — Breadcrumb component exists
- `web/src/components/content/SearchDialog.svelte` — Search already implemented
- Pagefind already integrated for search

</code_context>

<specifics>
No specific requirements.
</specifics>

<deferred>
None.
</deferred>
