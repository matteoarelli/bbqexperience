# Milestones

## v1.0 BBQ Experience v1.0 Launch (Shipped: 2026-04-15)

**Phases completed:** 9 phases, 23 plans, 47 tasks

**Key accomplishments:**

- Strapi 5 CMS with 6 content type schemas (Product, Review with 5-category scoring, Recipe, Tutorial, BlogPost, InstagramPost), i18n enabled, webhook rebuild headers, production Dockerfile, and Astro 6 static scaffold
- Strapi CMS deployed to Hetzner with dual webhook pipeline (GitHub push deploy + Strapi content change rebuild), Caddy reverse proxy, and local docker-compose for development
- Tailwind 4 dark theme with CSS design tokens, BaseLayout with hreflang/canonical SEO, and OptimizedImage component
- i18n utility library with 3-locale routing (en/it/es), translation JSON files covering 6 content sections, and LanguageSwitcher component with hreflang SEO tags
- Sticky dark header with BBQ logo, responsive nav, mobile hamburger menu, animated hero with fire-gradient title, and 4-column footer -- wired across all 3 locale homepages with GSAP scroll animations
- Strapi REST API client with typed interfaces for all 6 content types, locale-aware fetching, and media URL resolution
- Hybrid SSR preview system with secret-protected cookie flow and multilingual review page templates fetching from Strapi
- 5 review display components (ScoreCard, SpecsTable, ProsConsCard, VerdictCard, ReviewJsonLd) with Schema.org structured data and full 3-locale page integration
- Responsive photo gallery grid with full-screen lightbox overlay, keyboard navigation, and 3-locale integration
- Recipe page template with cover image, metadata bar, numbered instructions with photos, ingredient list with Svelte mount point, and Schema.org Recipe JSON-LD for all 3 locales
- Svelte 5 islands for serving adjustment with proportional ingredient recalculation, metric/imperial unit toggle, and full-screen cook mode with Wake Lock and swipe navigation
- Print stylesheet with @media print rules hiding navigation and interactive controls, plus PrintRecipeCard button with QR code linking back to full recipe page
- Shared content components (Breadcrumbs, ArticleCard, ContentLayout) and tutorial listing/detail pages for 3 locales with breadcrumb navigation, reading time, and difficulty badges
- Svelte 5 islands for reading progress tracking and Pagefind-powered content search with type filtering
- Blog listing/detail pages for 3 locales with category filtering and Schema.org Article JSON-LD for SEO rich results
- Cross-type related content, CMS-driven featured hero, reading progress bar, and search dialog wired across all pages
- Instagram feed grid, social sharing bar with clipboard API, and fire-gradient follow CTA with full EN/IT/ES i18n
- Lite-embed facade components for YouTube/Instagram plus full site wiring of InstagramFeed, SocialShareBar, and FollowCTA across 16 pages
- Light/dark theme toggle with Svelte 5 island, CSS custom properties under [data-theme="light"], localStorage persistence, and FOUC-prevention inline script
- SVG radial progress gauges with flame gradient and GSAP ScrollTrigger stagger animation replacing static ScoreCard on review pages
- Interactive Svelte 5 comparison tool with side-by-side scoring table, product search, winner highlighting, and shareable URLs across 3 locales
- Branded 404 error page with BBQ Experience styling, Pagefind search integration, and SEO/performance meta tag fixes for Lighthouse audit readiness

---
