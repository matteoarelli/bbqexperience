# Phase 7: Instagram & Social Integration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped)

<domain>
## Phase Boundary

Seamless connection between BBQ Experience website and 74k Instagram community. Curated IG feeds on homepage, embeddable IG/YouTube content within articles, social sharing buttons, and CTAs to follow on Instagram.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Instagram Graph API with cron-based caching in Strapi (no live API calls on page load)
- Lite-embed for YouTube/IG reels (performance)
- Social sharing: copy link, WhatsApp, Instagram, X
- Instagram posts cached as InstagramPost content type in Strapi
- CTA buttons driving readers to follow on Instagram

</decisions>

<code_context>
## Existing Code
- `cms/src/api/instagram-post/content-types/instagram-post/schema.json` — InstagramPost schema
- `web/src/lib/strapi.ts` — API client
- `web/src/components/common/Header.astro`, `Footer.astro` — UI shell
- All content pages exist from Phases 4-6

</code_context>

<specifics>
No specific requirements.
</specifics>

<deferred>
None.
</deferred>
