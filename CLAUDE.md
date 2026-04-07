<!-- GSD:project-start source:PROJECT.md -->
## Project

**BBQ Experience**

A top-class editorial portal for the BBQ Experience brand (74k Instagram followers), serving as the authoritative online hub for BBQ product reviews, recipes, tutorials, and news. The site extends and amplifies the existing Instagram presence with deep, structured content that Instagram can't deliver — while maintaining a bold, street-culture BBQ aesthetic. Primary language is English, with Italian and Spanish support.

**Core Value:** When someone searches for a BBQ product review, BBQ Experience must be the most complete, visually striking, and trustworthy result they find — the undisputed reference point for the BBQ community.

### Constraints

- **Tech stack**: Custom/headless architecture — no WordPress or traditional CMS
- **Timeline**: 3 months to launch (by July 2026)
- **Budget**: €30,000 total
- **Content author**: Single person (Matteo) — admin UX must be streamlined for one-person operation
- **Performance**: Must score 90+ on Lighthouse across all metrics
- **Multilingual**: Must support EN, IT, ES from day one with clean URL structure
- **Instagram API**: Subject to Meta's API limitations and rate limits
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro | 6.x (6.1.2) | Frontend framework / static site generator | Content-first architecture with zero JS by default. 40% faster than Next.js for static sites, 90% less JS shipped (8KB vs 85KB). Perfect Lighthouse 100 scores out of the box. Islands architecture lets us add GSAP animations only where needed without hydrating the entire page. Requires Node 22+. | HIGH |
| Strapi | 5.x (5.40.0) | Headless CMS backend | Open-source, self-hosted, MIT license. Full control over data. Built-in i18n plugin for EN/IT/ES. Single-author admin panel is clean and efficient. REST + GraphQL APIs. Runs on existing Hetzner server alongside other projects. AI content-type builder speeds up schema creation. TypeScript support with auto-generated types. | HIGH |
| Tailwind CSS | 4.x | Styling | 5x faster builds, 100x faster incremental builds via Lightning CSS engine. CSS-first config (no tailwind.config.js needed). Built-in container queries. OKLCH color space for the vibrant fire/smoke palette BBQ Experience needs. Zero-config with Astro's Vite integration. | HIGH |
### Animation & Micro-interactions
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| GSAP | 3.x | Scroll animations, page transitions, micro-interactions | Industry standard for web animation. Free tier includes ScrollTrigger (the key plugin). Proven Astro integration via islands -- load GSAP only on components that animate. Works with Astro View Transitions for page-level motion. Active community with Astro-specific examples (Codrops, LaunchFast). | HIGH |
| Lenis | latest | Smooth scrolling | Lightweight smooth scroll library that pairs with GSAP ScrollTrigger. Used in premium editorial sites. Replaces Locomotive Scroll which is heavier and less maintained. | MEDIUM |
### Internationalization
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro i18n routing | built-in | URL-based locale routing (/en/, /it/, /es/) | Native Astro feature since v4. Folder-based routing with helper functions (getRelativeLocaleUrl). No extra dependency. | HIGH |
| Paraglide JS | latest | UI string translations (buttons, labels, nav) | Compiler-based -- tree-shakes unused translations, 70% smaller i18n bundles than i18next. Works with Astro's built-in routing. i18next is NOT yet compatible with Astro 5+. | MEDIUM |
| Strapi i18n plugin | built-in | CMS content localization | Native Strapi plugin. Content editors create translations per locale in the admin panel. API returns locale-specific content. | HIGH |
### Image & Media
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro Image (built-in) | built-in | Image optimization at build time | Uses Sharp internally. Generates WebP/AVIF, responsive srcsets, lazy loading. Handles the heavy media load (recipes, reviews) without runtime cost. | HIGH |
| Strapi Media Library | built-in | Media asset management in CMS | Upload, organize, and serve images from the CMS. Supports responsive formats. | HIGH |
| Cloudflare CDN | free tier | Global content delivery | Cache static assets globally. Free tier sufficient for editorial traffic. Sits in front of Hetzner server (already used for other projects). | HIGH |
### Database & Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16 | Strapi database | Recommended by Strapi for production. Handles i18n content, relations (reviews/recipes/categories). Runs in Docker alongside Strapi. | HIGH |
| Docker + Docker Compose | latest | Container orchestration | Strapi + PostgreSQL in containers on existing Hetzner VPS. Consistent with Matteo's existing deployment pattern (webhook-based deploys). | HIGH |
| Caddy | latest | Reverse proxy (already in use) | Already running on Hetzner for other projects. Auto-HTTPS via Let's Encrypt. Add a new site block for Strapi API. | HIGH |
| Node.js | 22 LTS | Runtime | Required by Astro 6. Also runs Strapi. Single runtime for entire stack. | HIGH |
### SEO & Performance
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @astrojs/sitemap | latest | XML sitemap generation | Auto-generates multilingual sitemaps with hreflang tags. Essential for international SEO. | HIGH |
| Schema.org (JSON-LD) | n/a | Structured data | Manual implementation for Review, Recipe, Article, and Product schemas. Critical for rich search results (star ratings, cook times, etc.). | HIGH |
| Pagefind | latest | Client-side search | Static search index built at build time. Zero server cost. Fast search across reviews/recipes/articles. ~100KB bundle for full search. | MEDIUM |
### Development Tools
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | 5.x | Type safety | Astro 6 has native TS support. Strapi v5 generates types automatically. Catches content schema mismatches at build time. | HIGH |
| Biome | latest | Linting + formatting | Replaces ESLint + Prettier with single tool. 10-100x faster. Consistent code style. | MEDIUM |
| Vitest | latest | Unit testing | Vite-native test runner. Same config as Astro's Vite setup. Fast. | MEDIUM |
| Playwright | latest | E2E testing | Cross-browser testing for animations, responsive design, i18n routing. | MEDIUM |
## Deployment Architecture
## Installation
# Astro frontend
# Paraglide for UI translations
# Strapi CMS (separate project)
# Then configure PostgreSQL for production in .env
# Docker Compose for production (Strapi + PostgreSQL)
# docker-compose.yml on Hetzner VPS
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | Astro 6 | Next.js 15 | Next.js ships React runtime on every page (~85KB min). Overkill for a content site with no app-like interactivity. Astro delivers same content with near-zero JS. |
| Frontend framework | Astro 6 | Nuxt 4 | Vue ecosystem is less relevant here. No advantage over Astro for static content. Matteo's stack is PHP/Python, not Vue. |
| Headless CMS | Strapi 5 | Sanity | Sanity's content lake is cloud-hosted (vendor lock-in). Free tier has limits. Strapi is self-hosted on existing Hetzner infra at zero marginal cost. Real-time collaboration irrelevant for single author. |
| Headless CMS | Strapi 5 | Ghost | Ghost is blog-focused, lacks flexible content modeling for structured reviews (scoring systems, spec sheets, category ratings). No custom content types. |
| Headless CMS | Strapi 5 | Payload CMS | Strong alternative but younger ecosystem. Strapi has larger community, more plugins, better docs. Payload worth watching. |
| Headless CMS | Strapi 5 | Directus | Good option but Strapi's dev community is larger and AI features (content-type builder, AI translations) give it an edge for solo developer workflow. |
| CSS | Tailwind 4 | Vanilla CSS / SCSS | Tailwind's utility-first approach is faster for building responsive layouts. Container queries built-in. Design tokens via CSS variables align with BBQ brand theming. |
| Animation | GSAP | Motion (Framer Motion) | Motion requires React. GSAP works with vanilla JS in Astro islands -- no framework dependency needed for animations. |
| Animation | GSAP | CSS animations only | CSS animations can't handle complex scroll-triggered sequences, staggered reveals, or coordinated timelines that make "WOW factor" designs. |
| Smooth scroll | Lenis | Locomotive Scroll | Locomotive Scroll is heavier, less maintained, and has more compatibility issues with modern frameworks. Lenis is lighter and pairs better with GSAP. |
| i18n | Paraglide | i18next | i18next is NOT compatible with Astro 5+. Paraglide is compiler-based (tree-shakes translations) resulting in 70% smaller bundles. |
| Search | Pagefind | Algolia | Algolia has a free tier but adds external dependency and API calls. Pagefind builds a static search index at build time -- zero runtime cost, fully self-hosted. |
| Database | PostgreSQL 16 | MySQL | Strapi recommends PostgreSQL for production. Better JSON support for flexible content. MySQL would work but PostgreSQL is the primary supported database. |
## What NOT to Use
| Technology | Why Not |
|------------|---------|
| WordPress | Explicitly ruled out in project constraints. Monolithic, slow, security headaches, no design freedom. |
| React/Next.js as full framework | Ships unnecessary JS runtime for a content site. Use React only inside specific Astro islands if needed for complex interactive components. |
| Contentful | Cloud-hosted with per-user pricing. Free tier limited to 5 users and 25k records. Self-hosted Strapi has no such limits and runs on existing infrastructure. |
| Webflow | No-code platform that limits custom animation and performance optimization. Can't achieve the technical performance targets (90+ Lighthouse). |
| jQuery | Dead weight. GSAP handles everything jQuery animations could, with better performance and modern API. |
| Sass/SCSS | Tailwind 4 eliminates the need for preprocessors. CSS-first config with native nesting support. |
| i18next | Incompatible with Astro 5+. Use Paraglide instead. |
| Locomotive Scroll | Heavier and less maintained than Lenis. Known compatibility issues with modern build tools. |
| Server-side rendering (SSR) for all pages | This is a content site, not an app. Static generation (SSG) is faster, cheaper, and more reliable. Use SSR only for dynamic endpoints like search or preview mode. |
## Stack Patterns
### Content Fetching Pattern
### i18n Routing Pattern
### GSAP Island Pattern
## Version Compatibility Matrix
| Component | Min Version | Tested With | Notes |
|-----------|-------------|-------------|-------|
| Node.js | 22.0.0 | 22 LTS | Astro 6 dropped Node 18/20 support |
| Astro | 6.0.0 | 6.1.2 | Current stable |
| Strapi | 5.0.0 | 5.40.0 | Current stable |
| Tailwind CSS | 4.0.0 | 4.x | Requires Vite plugin |
| PostgreSQL | 14 | 16 | Alpine Docker image |
| GSAP | 3.12+ | 3.x | Free tier includes ScrollTrigger |
| TypeScript | 5.0+ | 5.x | Auto-inferred by Astro |
## Budget Alignment
| Component | Cost | Notes |
|-----------|------|-------|
| Astro | Free | Open source, MIT |
| Strapi Community | Free | Open source, MIT, self-hosted |
| Tailwind CSS | Free | Open source, MIT |
| GSAP (free tier) | Free | ScrollTrigger included. Business license ($199/yr) only if monetizing later. |
| PostgreSQL | Free | Open source |
| Hetzner VPS | ~$7/mo | CX21 (2vCPU, 4GB RAM). Already running other projects -- marginal cost is near zero. |
| Cloudflare CDN | Free | Free tier covers editorial traffic volumes |
| Domain + DNS | ~$15/yr | Already managed via Cloudflare |
| **Total infrastructure** | **~$100/yr** | Leaves ~$29,900 of the $30k budget for design and development |
## Sources
- [Astro 6.0 Release Blog](https://astro.build/blog/astro-6/)
- [Astro 6 Beta Announcement](https://astro.build/blog/astro-6-beta/)
- [Astro i18n Documentation](https://docs.astro.build/en/guides/internationalization/)
- [Strapi 5 Features Page](https://strapi.io/five)
- [Strapi Docker Documentation](https://docs.strapi.io/cms/installation/docker)
- [Strapi npm (@strapi/strapi)](https://www.npmjs.com/package/@strapi/strapi) -- v5.40.0
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [GSAP Pricing](https://gsap.com/pricing/)
- [GSAP + Astro Integration Guide (LaunchFast)](https://www.launchfa.st/blog/gsap-astro/)
- [GSAP + Astro View Transitions](https://www.launchfa.st/blog/gsap-astro-view-transitions)
- [Paraglide-Astro Integration](https://inlang.com/m/iljlwzfs/paraglide-astro-i18n)
- [Astro vs Next.js Comparison (Pagepro)](https://pagepro.co/blog/astro-nextjs/)
- [Astro Image Optimization Guide](https://eastondev.com/blog/en/posts/dev/20251203-astro-image-optimization-guide/)
- [Strapi on Hetzner VPS (TurboCloud)](https://turbocloud.dev/book/deploying-strapi/)
- [Astro + Cloudflare Integration](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- **Lenis rimosso** — smooth scroll gestito dal browser nativo, non usare lenis
- **i18n custom** — JSON files in src/i18n/, NON Paraglide. Translation keys type-safe via src/i18n/types.ts
- **Rate limiting** — SQLite-based in src/lib/rate-limit.ts, non in-memory Map
- **Env vars** — TUTTE le env vars necessarie a runtime devono essere sia ARG nel Dockerfile che -e nel docker run
- **Strapi v5 localizzazioni** — PUT con ?locale=xx nel query param, sempre includere slug nel body
- **Contenuti Pitmaster** — score range 5.8-8.8, mai 9+. Tono diretto, no marketing BS
- **Deploy** — webhook auto su push. Per forzare: `--no-cache` nel docker build
- **Instagram bot** — NON modificare instagram_bot.py. Solo editorial_plan.py e moduli in integrations/
- **Container names** — PostgreSQL: "postgres" (non "bbqexperience-postgres")
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Vedi docs/architecture.md per diagrammi completi. Sintesi:

- **Request flow:** User → Cloudflare → Caddy → Astro SSR (:4321) → Strapi (:1337) → PostgreSQL
- **Deploy:** git push → GitHub webhook → Hetzner → rebuild-web.sh → Docker build → smoke test
- **IG sync:** Cron 6h → sync-instagram.mjs → Graph API → Strapi
- **IG agent:** Ubuntu locale (192.168.1.119) → instagram-bot/ → instagrapi + Ollama
- **Data bridge:** Cron 6h → site_bridge.py → site_content.json + link_map.json
- **Newsletter:** Cron dom 10 → weekly_newsletter.py → Brevo API
- **Dashboard:** Cron 21:00 → telegram_dashboard.py → Umami API + Strapi + IG state → Telegram
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
