# Project Research Summary

**Project:** BBQ Experience — Premium BBQ Editorial Portal
**Domain:** Headless CMS editorial portal (product reviews, recipes, tutorials, blog)
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

BBQ Experience is a premium editorial portal for a single expert author with an established Instagram audience of 74k followers. The correct category for this product is "content-first, statically generated headless CMS site" — not a web application, not a blog platform, and explicitly not WordPress. Research confirms the optimal approach is Astro (static site generator with Islands Architecture) consuming content from a self-hosted Strapi 5 CMS backed by PostgreSQL. This combination delivers the near-zero JavaScript default behavior necessary for 90+ Lighthouse scores while preserving the ability to add targeted GSAP animations only on components that need them. The entire infrastructure runs on the existing Hetzner VPS alongside other projects at near-zero marginal cost (~$100/yr), leaving virtually the entire €30k budget for design and development.

The recommended approach has three clear tiers: Strapi handles all content authoring, media, and i18n (EN/IT/ES) through a single admin panel; Astro fetches content at build time and generates optimized static HTML with Svelte islands for interactive components; Caddy with Cloudflare CDN serves the static output globally. Content updates trigger an Astro rebuild via webhook (same adnanh/webhook infrastructure already running on Hetzner), completing a new deploy in under 60 seconds for ~500 pages. The architecture is inherently statically scaled — Strapi never sees end-user traffic, making traffic spikes a CDN problem rather than an infrastructure problem.

The two primary risks are (1) multilingual i18n treated as an afterthought — retrofitting locale-aware routing and content models after the fact requires touching every component and causes SEO penalties, so locale must be first-class from day one; and (2) animations destroying Core Web Vitals — the project's "WOW factor" design goal is in direct tension with the 90+ Lighthouse target unless an animation budget is enforced from the start (only `transform`/`opacity` properties, never layout-triggering animations). A third non-obvious risk is the Instagram Graph API — the Basic Display API was killed in December 2024, rate limits dropped 96%, and any integration must be built around a local cache rather than live API calls.

## Key Findings

### Recommended Stack

The stack is entirely open-source and self-hosted, with zero licensing costs. Astro 6 is the clear choice for the frontend: it ships no JavaScript by default, achieves 90+ Lighthouse out of the box, and its Islands Architecture means GSAP animations can be loaded surgically on specific components without hydrating the entire page. Strapi 5 is the headless CMS — self-hosted on the existing Hetzner server, full-featured i18n plugin built in, PostgreSQL recommended for production. Tailwind CSS 4 handles styling with its Lightning CSS engine (100x faster incremental builds) and OKLCH color space suited to the fire/smoke palette. Node 22 LTS is required as the runtime for both Astro 6 and Strapi.

Notable decisions from the alternatives analysis: i18next is incompatible with Astro 5+, so Paraglide JS handles UI string translations (70% smaller i18n bundles); Svelte 5 is preferred over React for interactive islands (3-5KB per island vs 30KB+ for React); Pagefind provides static client-side search at build time with zero runtime cost; Lenis replaces Locomotive Scroll (heavier, less maintained); GSAP free tier covers ScrollTrigger without a license fee.

**Core technologies:**
- Astro 6.x: frontend SSG — zero JS default, Islands Architecture, built-in i18n routing
- Strapi 5.x: headless CMS — self-hosted, built-in i18n, auto-generated TypeScript types
- Tailwind CSS 4.x: styling — CSS-first config, OKLCH colors, Lightning CSS engine
- GSAP 3.x: animations — ScrollTrigger included in free tier, composited animations only
- Svelte 5: interactive islands — minimal bundle (3-5KB), no framework overhead in static pages
- PostgreSQL 16: Strapi database — Docker container on Hetzner
- Caddy + Cloudflare CDN: delivery — already in use, auto-HTTPS, global edge caching
- Paraglide JS: UI string i18n — tree-shakes unused translations, Astro 5+ compatible
- Pagefind: client-side search — static index built at build time, zero server cost
- Node 22 LTS: runtime — required by Astro 6 (dropped Node 18/20 support)

### Expected Features

The competitive landscape has a clear gap: no BBQ review site currently combines deep content, product comparison, modern mobile design, and multilingual coverage. AmazingRibs has content depth but poor UX. Serious Eats has quality but no BBQ focus. Design alone is a genuine differentiator — every competitor looks dated.

**Must have (table stakes — Phase 1-2):**
- Product review pages with structured scoring (overall + per-category) — the core product
- Recipe pages with structured format (ingredients, steps, times, difficulty) — second content pillar
- Schema.org structured data (Review, Recipe, Article, BreadcrumbList) — highest ROI SEO feature; Recipe schema yields 82% higher CTR
- Bold/street dark design system with GSAP micro-interactions — the WOW factor IS the differentiator
- Responsive mobile-first design — 80%+ of Instagram traffic arrives on mobile
- Multilingual support (EN/IT/ES) with locale-prefixed URLs and hreflang tags — architectural requirement from day one
- Image optimization pipeline (WebP/AVIF, responsive srcsets, lazy loading) — BBQ is visual and image-heavy
- Content taxonomy (categories, tags) — foundation for search, related content, and comparisons
- Breadcrumb navigation — SEO (BreadcrumbList schema) and UX
- "Jump to Recipe" anchor button — trivial to build, significant UX impact

**Should have (competitive differentiators — Phase 3):**
- Product comparison tool (up to 5 products side-by-side) — universal gap in BBQ review space
- Instagram feed integration — connects the 74k community, reduces bounce rate 20-23%
- Search functionality (Pagefind) — needed once content library grows
- Reading progress indicator — low effort, premium editorial feel
- Related content engine (cross-link reviews/recipes/tutorials) — increases pages per session
- Social sharing buttons — light, fast-loading only
- Dark mode as default with light toggle — brand identity, not just accessibility

**Defer to v2+:**
- Cook mode for recipes (screen-awake, large text)
- Animated score visualizations (flame-themed gauges)
- Serving size adjuster with real-time recalculation
- Unit conversion toggle (metric/imperial) — can launch metric-first with EN showing imperial
- Print-friendly recipe cards
- Review verdict shareable cards

**Explicit anti-features (never build):**
- User accounts, comments, or community features — community lives on Instagram
- E-commerce or affiliate price tracking in v1
- Newsletter/email marketing in v1 (GDPR overhead, IG already handles notifications)
- Ads — destroy the premium editorial feel and trust
- AI chatbot or recommendation engine — over-engineering

### Architecture Approach

The architecture is a three-tier decoupled system: Strapi CMS as the single source of truth for all editorial content (referenced by ID from a PostgreSQL database); Astro SSG as the rendering layer that fetches content at build time and outputs static HTML with Svelte islands hydrated only where needed; Caddy as the reverse proxy serving static files with Cloudflare CDN in front for global edge caching. Instagram content is fetched via a cron-based sync script every 6 hours, cached in Strapi as a local content type, and read by Astro at build time — no live API calls to Instagram at page load or build time. Content changes in Strapi fire a webhook to the existing adnanh/webhook listener on Hetzner, which triggers an Astro rebuild. The critical path for dependencies is: PostgreSQL -> Strapi setup -> content models -> Strapi REST API -> Astro Strapi client -> page templates -> static build -> deploy.

**Major components:**
1. Strapi CMS (Docker/Hetzner) — content modeling, authoring, media uploads, i18n, REST API, webhook firing
2. PostgreSQL 16 (Docker/Hetzner) — persistent data storage, never exposed to Astro directly
3. Astro 6 frontend — SSG, i18n routing (`/en/`, `/it/`, `/es/`), image optimization, page composition
4. Svelte 5 islands — interactive components (score charts, image galleries, product comparison, search UI)
5. Caddy reverse proxy (existing) — TLS termination, static file serving, proxy to Strapi admin
6. Cloudflare CDN (free tier) — global edge caching of static assets
7. Instagram cron sync — Graph API fetch every 6h, upserts to Strapi `InstagramPost` content type
8. Pagefind — static search index built at Astro build time

**Strapi content model (flat, not over-engineered):**
- `Product` (standalone) — name, brand, category, specs, images, affiliate links
- `Review` (references Product) — scores as structured JSON, pros/cons, verdict, gallery, locale
- `Recipe` — ingredients/steps as repeatable components, times, difficulty, locale
- `Tutorial` — technique/equipment/knowledge categories, locale
- `BlogPost` — tags, locale
- `InstagramPost` (cached, not authored) — ig_id, media_url, caption, timestamp

### Critical Pitfalls

1. **Multilingual as afterthought** — i18n routing (`/en/`, `/it/`, `/es/`), hreflang tags, and locale-aware content models must be set up in Phase 1. 60% of multilingual sites have hreflang errors. Retrofitting i18n after the fact requires touching every component, route, and SEO tag.

2. **Animations killing performance** — Only `transform` and `opacity` properties for all animations (GPU-composited, zero layout impact). Never animate `width`, `height`, `top`, `left`, or `margin`. Set Lighthouse CI threshold of 90 from day one as a build gate. Test on real mobile hardware every sprint, not just Chrome DevTools throttling.

3. **Instagram API integration assumptions** — The Basic Display API is dead (December 2024). Rate limits are ~200 calls/hour. All integration must go through the Instagram Graph API with a Business/Creator account. Cache all IG data in Strapi every 1-6 hours. The site must never make live API calls to Instagram on page load. Build IG display as a gracefully degrading optional component.

4. **Content model over-engineering** — Start with 5-6 flat content types. Scoring goes directly on the Review type as structured JSON, not as a separate relational content type. Add content types only when a real need exists, not speculatively. If creating one review requires filling in more than 3 separate content entries, the model is too complex.

5. **SEO missing from headless architecture** — Headless CMS provides no SEO out of the box. Build a reusable `<SEOHead>` component with meta, og, canonical, and hreflang handling in Phase 2. Implement JSON-LD structured data for all content types (Recipe, Product+Review, Article, Organization). Generate per-locale XML sitemaps. Enforce meta description and image alt text as required CMS fields before publish.

## Implications for Roadmap

Based on the dependency graph from ARCHITECTURE.md and pitfall phase mapping from PITFALLS.md, the natural phase structure is:

### Phase 1: Foundation — Infrastructure, CMS, and Content Models

**Rationale:** Everything else depends on the content model being correct. Changing content types after content exists is painful and risks data migration. i18n must be architectural from day one. The Hetzner deploy pipeline should be tested early, not at launch.
**Delivers:** Running Strapi instance on Hetzner with Docker Compose (Strapi + PostgreSQL), all content types defined, i18n plugin configured for EN/IT/ES, Astro project scaffold with locale-based routing structure, Hetzner webhook deploy for Astro builds.
**Addresses features:** Content taxonomy and URL structure (permanent decisions), multilingual routing foundation, review scoring model.
**Avoids pitfalls:** Content model over-engineering (flat 5-6 types), multilingual as afterthought (locale from day one), Docker/ISR deployment misconfiguration (test the full pipeline early).

### Phase 2: Design System and Frontend Architecture

**Rationale:** The design system is a dependency for every page template. Animation rules must be established before any animation work begins — retrofitting the performance budget after animations are designed is painful. The SEO component system must exist before content pages are built.
**Delivers:** Tailwind 4 design system with fire/smoke dark theme tokens, GSAP animation budget rules documented and enforced, reusable `<SEOHead>` component with all schema types, base layouts (ArticleLayout, ReviewLayout, RecipeLayout), font loading (self-hosted, 2 families max), Lighthouse CI gate at 90.
**Uses:** Tailwind CSS 4, GSAP 3 with ScrollTrigger, Svelte 5 for island pattern, Astro Image optimization.
**Avoids pitfalls:** Animations killing performance (establish rules first), font/script bloat, missing SEO structured data component.

### Phase 3: Core Content Types and Pipeline

**Rationale:** With the design system and CMS in place, the four content types can be built in parallel (reviews, recipes, tutorials, blog). The Strapi-to-Astro content fetching pattern is established once and reused for all types. Schema.org structured data is implemented per content type here, not retroactively.
**Delivers:** Review pages with scoring system and photo gallery, recipe pages with "Jump to Recipe", tutorial pages, blog post pages, Strapi Astro client (`strapi.ts`), all Schema.org JSON-LD implementations, Pagefind search index integrated, breadcrumb navigation, per-locale XML sitemaps, CMS validation rules (required meta description, alt text).
**Addresses features:** All P0 table stakes features, structured data (highest ROI SEO feature).
**Avoids pitfalls:** SEO missing from headless architecture (implement structured data per content type), ISR/caching mismatch with multilingual routes (revalidate all locale paths on webhook).

### Phase 4: Interactive Features and Differentiators

**Rationale:** Interactive features (product comparison, Instagram feed, animated scoring) depend on the content types existing and having real data to compare/display. These are differentiators, not foundations — Phase 3 content is sufficient for an MVP launch.
**Delivers:** Product comparison tool (Svelte island, up to 5 products), Instagram Graph API cron sync to Strapi cache, Instagram feed display components, reading progress indicator, related content engine (tag-based cross-linking), social sharing buttons, dark/light mode toggle.
**Addresses features:** All P1 differentiator features.
**Avoids pitfalls:** Instagram API rate limits and deprecated endpoints (cron-based cache, graceful degradation), third-party script bloat (facade patterns for embeds, lazy-load strategy).

### Phase 5: Polish, SEO Audit, and Launch Preparation

**Rationale:** A pre-launch audit phase prevents the "looks done but isn't" traps documented in PITFALLS.md. Performance must be verified on real mobile hardware, not just DevTools. GDPR compliance (cookie consent) is legally required for IT/ES audiences.
**Delivers:** Full Lighthouse 90+ verification on real mobile devices, Google Rich Results Test passing for all content types, per-locale sitemaps submitted to Google Search Console, custom 404 page, OpenGraph images per content type, RSS feed, robots.txt (production vs staging), GDPR cookie consent banner (required for EU locales IT/ES), favicon full set, content backup strategy for Strapi PostgreSQL, security review (CMS admin IP restriction, API keys server-side only).
**Avoids pitfalls:** "Looks done but isn't" checklist from PITFALLS.md, GDPR compliance gaps.

### Phase Ordering Rationale

- Phase 1 before everything: content model decisions are irreversible without data migration; i18n routing is hardest to retrofit; deploy pipeline failures discovered late cost the most time.
- Phase 2 before Phase 3: the design system is a blocking dependency for all page templates; animation rules established here prevent performance regressions that are expensive to fix in designed pages.
- Phase 3 before Phase 4: interactive features (comparison tool, related content) have no value without real content to compare or relate; Instagram feed needs content pages to embed posts within.
- Phase 4 before Phase 5: all features must exist before a comprehensive audit is meaningful.
- Phases 1 and 2 can overlap: CMS setup (backend) and Astro scaffold + design system (frontend) are independent and can run in parallel with two developers or in two tracks.
- Within Phase 3: review pages, recipe pages, tutorial pages, and blog pages are independent and can be built in parallel once the Strapi client and base layouts are established.

### Research Flags

Phases likely needing deeper research during planning (use `/gsd:research-phase`):

- **Phase 4 (Instagram Integration):** Instagram Graph API authentication, long-lived token lifecycle, oEmbed Read endpoint changes (Meta updated as of April 2025), and Business account requirements need specific validation. The API landscape is actively changing.
- **Phase 4 (Product Comparison Tool):** UX for cross-locale comparison (a product reviewed only in EN should still be comparable in IT/ES context) needs design research. The data model for handling products with different scoring category sets needs validation.

Phases with standard well-documented patterns (skip research-phase):

- **Phase 1 (Strapi + Docker on Hetzner):** Strapi Docker deployment is thoroughly documented and consistent with existing Hetzner infrastructure patterns.
- **Phase 2 (Astro + Tailwind 4 + GSAP):** All three technologies have official Astro integration guides and community examples (LaunchFast, Codrops).
- **Phase 3 (Astro Content + Schema.org):** Pattern is well-documented in official Astro CMS integration docs and Google's structured data developer docs.
- **Phase 5 (SEO Audit + Launch Checklist):** Standard checklist process, no novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All primary technologies verified against official docs (Astro 6.1.2, Strapi 5.40.0, Tailwind 4.x). Version compatibility matrix validated. Node 22 LTS requirement confirmed. |
| Features | HIGH | Competitor analysis concrete (AmazingRibs, Serious Eats). Schema.org CTR data from Google official docs. NNGroup research on comparison tables. Feature prioritization grounded in verified traffic patterns (IG mobile). |
| Architecture | HIGH | Three-tier decoupled pattern is industry standard for headless editorial portals. Component boundaries and data flows verified against official Astro and Strapi docs. Hetzner/webhook integration consistent with existing project patterns. |
| Pitfalls | HIGH | Critical pitfalls confirmed from multiple independent sources. Instagram API changes confirmed from Meta developer docs and community analysis. Animation performance pitfall confirmed from Chrome DevDocs. i18n pitfalls from Shopify Engineering and Google's international site guidance. |

**Overall confidence:** HIGH

### Gaps to Address

- **Paraglide JS maturity:** Paraglide is recommended over i18next (incompatible with Astro 5+) and is compiler-based (smaller bundles), but it is a newer tool with a smaller community than i18next. Validate that it handles ICU message format and pluralization correctly for IT/ES before committing to it in Phase 1.

- **Instagram account type:** The integration plan requires a Business or Creator Instagram account connected to a Facebook Page. This must be verified for the actual BBQ Experience account before Phase 4 planning. If the account is personal, the API integration path changes significantly.

- **Svelte 5 vs vanilla JS for islands:** Svelte 5 is recommended for interactive islands (smaller bundles than React), but vanilla JS with web components is a zero-dependency alternative. If the interactive components remain simple (score charts, galleries), vanilla JS islands may be sufficient and avoids adding a second framework. Evaluate at Phase 4 planning time.

- **Strapi `findOne` locale limitation:** PITFALLS.md flags that `findOne` routes don't support the locale parameter by default in Strapi 5. Validate this against the current Strapi 5.40.0 API before building the Astro content fetching layer in Phase 3, and plan to use `findMany` with filters as the workaround.

- **Unit conversion at launch:** Research recommends deferring unit conversion (metric/imperial) to v2+, but BBQ content is temperature-critical and the EN audience expects Fahrenheit while IT/ES expect Celsius. Decide in Phase 2 whether to build a simple conversion utility from the start (low complexity if done early, high cost if retrofitted).

## Sources

### Primary (HIGH confidence)

- [Astro 6.0 Release Blog](https://astro.build/blog/astro-6/) — Astro 6 features and Node 22 requirement
- [Astro i18n Documentation](https://docs.astro.build/en/guides/internationalization/) — Locale routing patterns
- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/) — Hydration directives and island patterns
- [Astro CMS Integrations](https://docs.astro.build/en/guides/cms/) — Strapi + Astro integration
- [Strapi 5 Features Page](https://strapi.io/five) — Content model, i18n, TypeScript features
- [Strapi Docker Documentation](https://docs.strapi.io/cms/installation/docker) — Production Docker setup
- [Strapi npm v5.40.0](https://www.npmjs.com/package/@strapi/strapi) — Current stable version
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — Lightning CSS, CSS-first config
- [GSAP Pricing](https://gsap.com/pricing/) — Free tier includes ScrollTrigger
- [Google Structured Data — Product](https://developers.google.com/search/docs/appearance/structured-data/product) — Review schema
- [Google Structured Data — Recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe) — Recipe schema, CTR data
- [Google Managing Multi-Regional Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) — hreflang requirements
- [Instagram oEmbed API](https://developers.facebook.com/docs/instagram-platform/oembed/) — Current oEmbed endpoint
- [Avoid Non-Composited Animations](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations) — Animation performance pitfall

### Secondary (MEDIUM confidence)

- [Paraglide-Astro Integration](https://inlang.com/m/iljlwzfs/paraglide-astro-i18n) — UI i18n with Paraglide
- [GSAP + Astro Integration Guide (LaunchFast)](https://www.launchfa.st/blog/gsap-astro/) — GSAP island pattern
- [Instagram Graph API Developer Guide 2026 (Elfsight)](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/) — API rate limits and restrictions
- [Instagram API Rate Limits 2026 (CreatorFlow)](https://creatorflow.so/blog/instagram-api-rate-limits-explained/) — Rate limit changes
- [NNGroup — Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) — 5-product comparison cap
- [AmazingRibs — About Reviews and Medals](https://amazingribs.com/ratings-reviews/about-our-reviews-and-medals/) — Competitor scoring methodology
- [Recipe Schema SEO (Playwire)](https://www.playwire.com/blog/recipe-site-seo-recommendations-how-to-use-recipe-schema) — 82% CTR improvement data
- [Building Multi-language Blog with Strapi and Astro](https://noahflk.com/blog/strapi-astro-multilang-blog) — Multilingual content flow
- [Strapi 5 i18n Guide](https://strapi.io/blog/strapi-5-i18n-complete-guide) — i18n plugin configuration
- [Shopify Engineering — i18n Best Practices](https://shopify.engineering/internationalization-i18n-best-practices-front-end-developers) — ICU message format, pluralization

### Tertiary (MEDIUM-LOW confidence)

- [Instagram API 2026 Changes (Storrito)](https://storrito.com/resources/Instagram-API-2026/) — API landscape changes
- [Elementor — Web Design Trends 2026](https://elementor.com/blog/web-design-trends-2026/) — Narrative design trend
- [Astro vs Next.js Comparison (Pagepro)](https://pagepro.co/blog/astro-nextjs/) — Performance comparison data
- [Google Recipe Structured Data Update 2025 (Revolutex)](https://revolutexdigital.com/how-googles-2025-recipe-structured-data-update-affects-seo-rankings/) — Exact time value requirement

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
