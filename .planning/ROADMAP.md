# Roadmap: BBQ Experience

## Overview

BBQ Experience goes from zero to a fully operational premium BBQ editorial portal in 9 phases. We start by standing up the infrastructure (Strapi CMS, PostgreSQL, Docker on Hetzner with webhook deploys), then build the design system and Astro frontend scaffold with multilingual routing baked in from day one. From there, we wire up the CMS authoring workflow, then build each content vertical (reviews, recipes, content/discovery) as complete features. Instagram integration and social features come next, followed by advanced interactive differentiators (product comparison, animated scoring). The final phase is a comprehensive SEO and performance audit to hit Lighthouse 90+ before launch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure & Deploy Pipeline** - Strapi CMS, PostgreSQL, Docker on Hetzner with webhook auto-deploy
- [ ] **Phase 2: Design System & Frontend Scaffold** - Astro project with Tailwind dark theme, GSAP animation rules, i18n routing, base layouts
- [ ] **Phase 3: CMS Authoring Workflow** - Content entry, multilingual authoring, media library, preview, auto-rebuild
- [ ] **Phase 4: Review Pages** - Complete product review experience with scoring, specs, gallery, verdict card
- [ ] **Phase 5: Recipe Pages** - Full recipe experience with interactive features (cook mode, servings, units, print)
- [ ] **Phase 6: Content Pages & Discovery** - Tutorials, blog, taxonomy, search, breadcrumbs, related content, reading progress
- [ ] **Phase 7: Instagram & Social Integration** - IG Graph API sync, feed display, embeds, social sharing buttons
- [ ] **Phase 8: Product Comparison & Advanced Interactions** - Side-by-side comparison tool, animated scoring visuals, dark/light mode toggle
- [ ] **Phase 9: SEO Audit, Performance & Launch** - Sitemaps, structured data verification, Lighthouse 90+, 404 page, OG tags, final polish

## Phase Details

### Phase 1: Infrastructure & Deploy Pipeline
**Goal**: A running Strapi CMS instance with all content models defined, connected to PostgreSQL, deployed on Hetzner via Docker Compose, with webhook-triggered rebuilds working end-to-end
**Depends on**: Nothing (first phase)
**Requirements**: CMS-04
**Success Criteria** (what must be TRUE):
  1. Strapi admin panel is accessible at the production URL on Hetzner
  2. All content types (Product, Review, Recipe, Tutorial, BlogPost, InstagramPost) exist in Strapi with correct field structures
  3. A content change in Strapi triggers a webhook that initiates an Astro site rebuild and deploy automatically
  4. The i18n plugin is configured with EN (default), IT, and ES locales
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — Create Strapi CMS project with content types, config, Dockerfile, and Astro scaffold
- [x] 01-02-PLAN.md — Deploy to Hetzner server with webhook pipeline and verify end-to-end

### Phase 2: Design System & Frontend Scaffold
**Goal**: Users see a bold, street-culture BBQ design with dark theme, smooth animations, responsive mobile-first layout, and locale-prefixed URL routing across all pages
**Depends on**: Phase 1
**Requirements**: DES-01, DES-02, DES-03, DES-05, SEO-01, SEO-02
**Success Criteria** (what must be TRUE):
  1. Site renders with dark theme (dark grays, fire/amber/smoke accents) and bold BBQ typography on all screen sizes
  2. Scroll-triggered animations and micro-interactions play smoothly without layout shifts or jank on mobile
  3. Navigating to /en/, /it/, /es/ renders locale-specific content with a working language switcher
  4. Images are served in WebP/AVIF format with lazy loading and responsive srcset attributes
  5. hreflang and canonical tags are correctly set on every page for all three locales
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — Design system foundation: Tailwind 4 + dark theme tokens + BaseLayout with SEO tags + image component
- [x] 02-02-PLAN.md — i18n routing: locale-prefixed pages, translation strings, language switcher
- [x] 02-03-PLAN.md — UI shell: Header, Footer, Nav, Hero with GSAP animations + visual checkpoint
**UI hint**: yes

### Phase 3: CMS Authoring Workflow
**Goal**: The author (Matteo) can efficiently create, translate, and publish all content types through the Strapi admin with media management and draft preview
**Depends on**: Phase 1
**Requirements**: CMS-01, CMS-02, CMS-03, CMS-05
**Success Criteria** (what must be TRUE):
  1. Author can create and publish reviews, recipes, tutorials, and blog posts from the Strapi admin panel
  2. Author can enter content in EN, IT, and ES for any content item from a single editing interface
  3. Author can upload images to a media library that automatically optimizes and manages assets
  4. Author can preview draft content on the frontend before publishing
**Plans**: 2 plans
Plans:
- [x] 03-01-PLAN.md — Strapi API client, TypeScript types, and media URL helpers
- [x] 03-02-PLAN.md — Draft preview system with hybrid SSR and review page template

### Phase 4: Review Pages
**Goal**: Users can read the most complete BBQ product reviews online -- with structured scoring, editorial deep-dives, technical specs, photo galleries, and verdict cards
**Depends on**: Phase 2, Phase 3
**Requirements**: REV-01, REV-02, REV-03, REV-04, REV-05, REV-08
**Success Criteria** (what must be TRUE):
  1. User sees overall score and per-category scores (build quality, performance, value, ease of use) on each review page
  2. User can read a long-form editorial opinion section and view a structured technical specs table with pros/cons
  3. User can browse a product photo gallery with zoom/lightbox functionality
  4. User sees a condensed verdict card (score, one-line verdict, pros/cons, product photo) that summarizes each review
  5. Review pages output valid Product + Review + AggregateRating Schema.org JSON-LD verified via Google Rich Results Test
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — Review components (ScoreCard, SpecsTable, ProsConsCard, VerdictCard) + Schema.org JSON-LD + full page templates
- [x] 04-02-PLAN.md — Photo gallery with lightbox + visual verification checkpoint
**UI hint**: yes

### Phase 5: Recipe Pages
**Goal**: Users can follow BBQ recipes with interactive tools that adapt to their needs -- adjustable servings, unit conversion, cook mode for hands-free use, and printable recipe cards
**Depends on**: Phase 2, Phase 3
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08
**Success Criteria** (what must be TRUE):
  1. User sees a complete recipe page with ingredients, step-by-step instructions (with photos), prep/cook/total time, difficulty, and servings
  2. User can click "Jump to Recipe" to skip editorial intro and land directly on the recipe card
  3. User can activate Cook Mode (screen stays awake, large text, step-by-step progression, minimal UI)
  4. User can adjust serving size and see ingredients recalculate; user can toggle between metric and imperial units
  5. User can print a clean recipe card (ingredients + steps only) with a QR code linking back to the full page
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Recipe page template with Svelte 5 setup, layout, components, and JSON-LD structured data
- [x] 05-02-PLAN.md — Interactive Svelte 5 islands: serving adjuster, unit toggle, cook mode
- [x] 05-03-PLAN.md — Print recipe card with QR code and print stylesheet
**UI hint**: yes

### Phase 6: Content Pages & Discovery
**Goal**: Users can browse tutorials and blog posts, discover content through categories, search, breadcrumbs, and related content suggestions -- with reading aids like progress indicators and time estimates
**Depends on**: Phase 2, Phase 3
**Requirements**: CNT-01, CNT-02, CNT-03, CNT-04, CNT-05, CNT-06, CNT-07, CNT-08, CNT-09, CNT-10
**Success Criteria** (what must be TRUE):
  1. User can browse tutorial/guide articles and blog/news articles as distinct content sections
  2. User can navigate content via categories/taxonomy and breadcrumb trails on all content pages
  3. User can search content by keyword with results filtered by content type (reviews, recipes, tutorials, blog)
  4. User sees related content suggestions cross-linking reviews, recipes, and tutorials on every content page
  5. User sees featured/seasonal content on the homepage hero, reading time estimates on articles, and a reading progress indicator with section navigation on long-form content
**Plans**: 4 plans
Plans:
- [x] 06-01-PLAN.md — Shared content components (Breadcrumbs, ArticleCard, ContentLayout) + Tutorial pages for 3 locales
- [x] 06-02-PLAN.md — Svelte integration + ReadingProgress island + Pagefind SearchDialog island
- [ ] 06-03-PLAN.md — Blog pages for 3 locales + Category filtering + Article Schema.org JSON-LD
- [ ] 06-04-PLAN.md — Related content cross-linking + Featured homepage hero + Wiring all islands into pages
**UI hint**: yes

### Phase 7: Instagram & Social Integration
**Goal**: Users experience seamless connection between the BBQ Experience website and its 74k-follower Instagram community -- curated feeds, embedded posts, social sharing, and clear CTAs to follow
**Depends on**: Phase 4, Phase 5, Phase 6
**Requirements**: IGM-01, IGM-02, IGM-03, IGM-04, DES-08
**Success Criteria** (what must be TRUE):
  1. Homepage and relevant pages display curated Instagram posts/reels from the BBQ Experience account (loaded from local cache, not live API)
  2. Author can embed specific IG posts/reels and YouTube videos within review and recipe articles using lite-embed for performance
  3. All content pages include social sharing buttons (copy link, WhatsApp, Instagram, X) and CTAs driving readers to follow on Instagram
**Plans**: 2 plans
Plans:
- [x] 07-01-PLAN.md — Instagram feed components, social sharing buttons, follow CTA, and i18n translations
- [x] 07-02-PLAN.md — Lite-embed components for YouTube/Instagram + wiring social components into all pages
**UI hint**: yes

### Phase 8: Product Comparison & Advanced Interactions
**Goal**: Users can compare BBQ products side-by-side, see animated scoring visualizations, and switch between dark and light mode -- the features that make BBQ Experience feel premium
**Depends on**: Phase 4
**Requirements**: REV-06, REV-07, DES-06
**Success Criteria** (what must be TRUE):
  1. User can select 2-5 reviewed products and compare them side-by-side across all scoring categories and specifications
  2. Review pages display animated scoring visualizations (radial progress bars, flame-themed gauges) that animate on scroll
  3. User can toggle between dark mode (default) and light mode, with preference persisted across sessions
**Plans**: 3 plans
Plans:
- [x] 08-01-PLAN.md — Dark/light mode toggle with light theme tokens and localStorage persistence
- [x] 08-02-PLAN.md — Animated scoring visualizations (FlameGauge + radial progress bars) on review pages
- [x] 08-03-PLAN.md — Product comparison tool with side-by-side table and shareable URLs
**UI hint**: yes

### Phase 9: SEO Audit, Performance & Launch
**Goal**: The site meets all technical quality bars for launch -- Lighthouse 90+ across all metrics, complete structured data coverage, XML sitemaps, social previews, and a branded error experience
**Depends on**: Phase 7, Phase 8
**Requirements**: DES-04, DES-07, SEO-03, SEO-04, SEO-05
**Success Criteria** (what must be TRUE):
  1. Site achieves 90+ Lighthouse score across Performance, Accessibility, Best Practices, and SEO on real mobile hardware
  2. Per-locale XML sitemaps are generated and submitted to search engines
  3. BreadcrumbList Schema.org structured data renders on all pages; Open Graph and Twitter Card meta tags generate correct social sharing previews
  4. A branded 404 error page with search and navigation is displayed for missing URLs
**Plans**: 2 plans
Plans:
- [ ] 09-01-PLAN.md — BreadcrumbList JSON-LD, ogImage on all pages, per-locale sitemap config
- [ ] 09-02-PLAN.md — Branded 404 page with search/navigation + Lighthouse audit fixes
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
Note: Phases 4, 5, 6 can execute in parallel (all depend on 2+3, not each other).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Deploy Pipeline | 0/2 | Planning complete | - |
| 2. Design System & Frontend Scaffold | 0/3 | Planning complete | - |
| 3. CMS Authoring Workflow | 0/2 | Planning complete | - |
| 4. Review Pages | 0/2 | Planning complete | - |
| 5. Recipe Pages | 3/3 | Complete | 2026-04-01 |
| 6. Content Pages & Discovery | 0/4 | Planning complete | - |
| 7. Instagram & Social Integration | 0/2 | Planning complete | - |
| 8. Product Comparison & Advanced Interactions | 0/3 | Planning complete | - |
| 9. SEO Audit, Performance & Launch | 0/2 | Planning complete | - |
