# Milestones

## v1.2 Consolidation & Outcome Measurement (Shipped: 2026-05-26)

**Phases completed:** 3 phases (18, 19, 20), 9 requirements (SEO-13/14/15, DEBT-04/05/06, MEASURE-01/02/03)
**Mode:** Autonomous-mode end-to-end (open → ship in single session 2026-05-26 post v1.1 close)

**Key accomplishments:**

- **Phase 18 GSC Pipeline Polish** — FAQ parser-v2 con suffix lookahead positivo per `about|on|for|regarding|sui|sull[oa]|sulle|sobre|acerca` + strong separators `:|—|–|-` (recupera ~19 pagine FAQ-suffix non rilevate da Phase 17 strict regex). `topical_relevance` dimension aggiunta al Claude quality gate prompt (cattura sezioni off-topic da query GSC spurie). IndexNow re-ping verificato già in entrambi i siti promotion (Phase 17 publish hook + gsc_refresh_review). Doc `indexing_api_enabled_2026.md` per Matteo-side GCP enable 1-click. 27/27 vitest pass (8 nuovi test SEO-13).
- **Phase 19 Tech Debt Cleanup** — Pre-existing TS errors chiusi (`@ts-expect-error` su i18n.test:81 + `npm i -D @types/better-sqlite3`). Phase 10 missing VERIFICATION.md consolidato retroattivamente da 5 plan SUMMARYs. Phase 14-02-PLAN checkbox flip (SUMMARY esisteva, era solo tracking error). State file orphan `gsc_refresh_queue.jsonl` rimosso. `cd web && npx tsc --noEmit` → exit 0.
- **Phase 20 Outcome Measurement Framework** — `scripts/agents/phase17_outcome_tracker.py` (313 LOC) shipped, cron `.119` Lun 09:00 UTC installato + smoke-tested (week 0 baseline registrato: lift_ctr_x 0.71, verdict `monitoring`, traffic clicks +191%/impr +315%/CTR -29% pre-meta-operation). Decision tree 4 trigger ranges (success ≥10×, on-track 3-10×, revisit_prompts <3×@14gg, degraded_rollback <1.5×@30gg) + monitoring catch-all. Telegram report weekly via `lib.telegram.send_agent_report`. 20 nuovi unit test.

---

## v1.1 Content Depth & Growth Loop (Shipped: 2026-05-26)

**Phases completed:** 9 phases (10, 10.1, 11–17), 27 plans

**Key accomplishments:**

- Cloudflare Image Transformations + srcset → Lighthouse Performance median 0.89 → 0.97 (+8 pts). Min 0.86 → 0.91. 15/15 pages ≥0.90 across all 4 categories. DEBT-03 CLOSED.
- Strapi schema migration window: product-category taxonomy (5 categories EN/IT/ES), subscriber.source attribution field, recipe-collection content type scaffold, shared `update-localized` PUT helper. All 25 reviewed products backfilled.
- Newsletter on-site signup (Brevo): 4 surfaces (inline + landing /newsletter/ + sticky footer + desktop exit-intent), DOI mandatory, 5/IP/hr rate-limit SQLite, honeypot, surface attribution, welcome email automation EN/IT/ES.
- Multi-facet filter UI (brand, category, price, score) — desktop filter bar, mobile bottom-sheet drawer, count badges, empty state, SEO noindex/canonical, 301 redirects from old category routes across all 3 locales. 25 product prices populated (5 buckets), 12 missing brand relations linked, 2 pellet grills recategorized.
- Recipe collections: Strapi schema evolution with description/author_note, StrapiRecipeCollection TS interface, 3-locale i18n routes (`/en/collections/`, `/it/raccolte/`, `/es/colecciones/`), CollectionCard + CollectionBadge components, hreflang sitemap extension.
- Growth Engine v2 — Analytics Feedback Loop: `umami_client.py` mirroring strapi_client retry/timeout pattern, nightly `analytics_loop.py` writes `traffic_score` to Strapi for blog/review/recipe/tutorial in each locale, Telegram top 5 + bottom 5 daily digest, strategist consumes signal with ≥7d/≥50-visit confidence filter.
- A/B Headline Testing Infrastructure: Strapi `ab-experiment` content type, FNV-1a variant assignment with nanoid cookie 30d TTL, Astro middleware injection, Umami custom events (ab-impression / ab-click), weekly `ab_tester.py` z-test agent ≥500 impr / ≥7d gate, Brevo native A/B subject-line + Telegram digest, bot UA exclusion, webhook rebuild whitelist.
- **GSC-Driven Content Pipeline (Phase 17, 2026-05-26)**: Pipeline smette di essere cieca su query reali. `lib/gsc_client.py` (port da IG bot, sc-domain:bbq-experience.com), `meta_optimizer.py` daily cron `.119` 03:30 UTC con CTR_BENCHMARK per-position FirstPageSage 2026 + Qwen drafter + Claude sonnet gate Windows. `gsc_refresh.py` weekly Sun 08:00 UTC con Claude Opus quality gate (test live: blocco corretto su 6 fact_accuracy issues critical, score 5/10). `keyword_scout` striking-distance source da GSC. `content_generator` GSC priming. `claude_strategist` GSC weekly digest. `ArticleSchema.astro` centralizza FAQPage/HowTo/speakable JSON-LD per AI search (Perplexity/Gemini/Bing/ChatGPT). X-Skip-Rebuild header + Hetzner hooks.json rule (protezione preventiva — Strapi config attuale ascolta solo entry.publish). IndexNow fallback per Indexing API soft-fail. Schema sweep PASS 268/287 (93.4%). Tutti i 5 SEO-08..12 requirements verified.

---

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
