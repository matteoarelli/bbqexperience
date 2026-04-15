# Project Research Summary

**Project:** BBQ Experience — v1.1 Content Depth & Growth Loop
**Domain:** Editorial portal feature expansion (newsletter, faceted search, content taxonomy, analytics-driven agents, A/B testing) on a live Astro 6 + Strapi 5 production site
**Researched:** 2026-04-15
**Confidence:** HIGH (newsletter, filters, collections, architecture), MEDIUM (A/B statistical discipline, analytics loop at current traffic scale)

## Executive Summary

v1.1 is an additive milestone on top of a healthy v1.0 production stack (Astro 6 + Svelte 5 + Strapi 5.41 + Tailwind 4 + PostgreSQL 16, deployed on Hetzner via adnanh/webhook). The core architectural philosophy holds: minimal new dependencies, extend-not-rebuild, reuse every existing convention (SQLite rate-limit, custom i18n JSON, direct Brevo fetch, Strapi locale PUT with slug in body, atomic state writes via os.replace()). The only new runtime dependency is nanoid (118 bytes) for A/B visitor ID generation. Everything else — Growth Engine Python agents, Umami analytics, Brevo newsletter, Svelte 5 islands — is already live and tested.

The recommended build order is: debt closure first (VERIFICATION.md backfill + REQUIREMENTS.md traceability + Lighthouse re-measurement), then Strapi schema changes as a unified migration (product-category, recipe-collection, headline-variant, variant-impression content types), then reader-facing surfaces (newsletter, filters, collections), then Growth Engine v2 infrastructure (Umami feedback loop), and finally A/B testing as the last phase. This order is driven by hard dependencies: filters need the schema migration, A/B needs Umami events running, newsletter subjects A/B needs a real subscriber list. Skipping the schema migration phase first means mid-feature rework.

The three biggest risks in this milestone are: (1) faceted filter URLs creating an SEO crawl-budget explosion if canonical/noindex handling is not in the same PR as the feature, (2) newsletter signup without double opt-in creating a Brevo deliverability penalty and GDPR exposure with the Italian audience, and (3) A/B statistical invalidity — at ~400-500 visits/day across 3 locales, per-page A/B tests with a 2pp minimum detectable effect require 3,800+ visitors per variant, meaning weeks per experiment. The roadmap must enforce statistical guardrails before any A/B test is declared complete. A fourth operationally critical risk is the webhook rebuild cascade: A/B variant edits stored in Strapi will trigger full site rebuilds unless the webhook trigger list explicitly excludes A/B content types.

## Key Findings

### Recommended Stack

The v1.1 stack delta is deliberately minimal. The shipped stack (Astro 6, Svelte 5 islands, Strapi 5.41, Tailwind 4, GSAP, Pagefind, Docker/Caddy, Umami, Brevo, custom i18n JSON, SQLite rate-limit) requires no upgrades for v1.1 features. See `.planning/research/STACK.md` for full detail.

**New additions (only these):**
- nanoid 5.1.7: per-visitor A/B bucket ID (118-byte ESM, zero deps) — cookie-seeded, deterministic variant assignment without server lookup
- In-house `web/src/lib/exit-intent.ts` (~40 LOC): mouseleave + sessionStorage flag, desktop-only — DIY beats the published libs
- In-house `web/src/lib/ab-test.ts` (~60 LOC): crypto.subtle.digest hash bucket, emits Umami events — no SaaS A/B required
- In-house review filter logic (native Svelte 5 runes): URL-synced filter state with URLSearchParams + $state + $effect
- `scripts/agents/lib/umami_client.py` (~80 LOC): mirrors strapi_client.py pattern (retry, token cache, 10s timeout)
- 4 new Strapi content types: product-category, recipe-collection (both i18n), headline-variant, variant-impression (both non-i18n)
- 3 new Brevo contact attributes: SURFACE, AB_SUBJECT (must be provisioned in Brevo dashboard before first signup)

**Explicitly NOT added:** GrowthBook/Optimizely/PostHog for A/B, Algolia/Meilisearch for filters, @getbrevo/brevo SDK, nuqs-svelte, Paraglide, Lenis, scipy, any React component, any new SaaS service. Infrastructure cost stays at ~$100/yr.

**Critical version note:** Strapi 5.41 requires `npm run build` in `cms/` before container rebuild after schema changes. Schema auto-syncs in dev; requires `docker compose up -d --build strapi` on production — a separate step from the web webhook deploy.

### Expected Features

v1.1 ships 5 feature buckets on top of the live v1.0 site (25 reviews, 23 recipes, 88 blog posts, EN/IT/ES). See `.planning/research/FEATURES.md` for the full priority matrix.

**Must have (table stakes for v1.1 core):**
- Newsletter inline form at end of every content page — extends existing Brevo backend-only integration to on-site capture
- Double opt-in via Brevo (list-level setting) — GDPR Art. 7, mandatory for EU/IT audience; Brevo handles confirmation email, zero custom code
- Dedicated /[locale]/newsletter/ landing page — 3 locales, required for IG bio link + social CTA
- Review brand + category + price bucket facets with URL persistence and canonical guard — needs product-category schema migration first
- Product counts next to each facet option — prevents dead-end zero-result UI
- Recipe collections as a first-class content type — curated groupings with own URL, listing, detail, 3-locale support
- Umami API pull into agent state file — raw material for all analytics-driven decisions
- A/B variant storage in Strapi (headline-variant type) — declarative experiment registry readable by frontend and Python agents
- Click-tracking via Umami custom events (ab-impression, ab-click)

**Should have (differentiators, target v1.1):**
- Exit-intent modal (desktop only, mouseleave, session frequency cap) with full WCAG 2.2 accessibility
- Sticky footer newsletter bar (mobile-primary CTA, dismissible with localStorage persistence)
- Mobile filter drawer (bottom sheet, "Apply (N)" sticky button)
- Facet counts updated live from cached JSON matrix
- Collection "Part of X collection" cross-links on Recipe detail pages
- Nightly analytics_feedback.py -> Telegram top-5 gainers/losers digest
- ab_tester.py weekly: Bayesian posterior, Telegram recommendation, Matteo confirms winner manually

**Defer to v1.1.x (post-validation):**
- Scroll-depth 60% newsletter trigger, content-specific lead magnets
- Score threshold facet + sort controls for reviews
- Seasonal collection metadata, author note, RSS, bookmark extension
- Multi-armed bandit (Thompson Sampling) — only after simple A/B proves ROI
- Newsletter subject-line A/B — only after subscriber list has real volume
- Refresh agent — only after analytics loop is validated
- A/B across Review + Recipe + Tutorial — only after BlogPost A/B proves the infrastructure works

**Hard anti-features (never in v1.1):**
- Popup on page load or within first 3 seconds — Google intrusive interstitial penalty
- Single opt-in newsletter — GDPR violation, Brevo deliverability penalty
- Price slider — mobile unusability, infinite URL combinations
- More than 4 facets with 25 reviews — NN/g: >7 facets fatigue users
- Fully autonomous content rewrite loop without Matteo approval — brand voice drift risk
- A/B testing on pages with <500 impressions/week — results are pure noise

### Architecture Approach

All v1.1 features slot into the existing production request flow (Cloudflare -> Caddy -> Astro SSR :4321 -> Strapi :1337 -> PostgreSQL :5432) without adding new services. Three key architectural decisions from the research:

**A/B testing:** Astro middleware-based bucket assignment (web/src/middleware.ts). Cookie set before page render, variant resolved in page frontmatter. Zero client-side flash, zero CLS, Googlebot gets consistent treatment (no cloaking risk). Only A/B-enabled pages flip to SSR; all other pages remain static.

**Newsletter:** Brevo handles DOI email entirely (list-level setting). Astro endpoint only POSTs to /v3/contacts. Zero custom email code. Existing /api/newsletter endpoint extended with source field only.

**Review filters:** SSR filter state (not client-side manifest). 25-review dataset is small (<100ms SSR fetch), Strapi stays single source of truth, Cloudflare caches per query string, and SSR keeps pages crawlable without JS.

**Modal mounting:** Exit-intent modal and sticky footer bar mount in BaseLayout body root — same pattern as MobileMenuPanel — to avoid the backdrop-filter containing-block Chrome bug documented in CLAUDE.md.

See `.planning/research/ARCHITECTURE.md` for component file lists, data flow diagrams, and full Strapi schema definitions.

**Major new components and responsibilities:**
1. `web/src/middleware.ts` — A/B bucket cookie before every render; no UA branching
2. `web/src/islands/NewsletterExitIntent.svelte` + `NewsletterStickyBar.svelte` — BaseLayout body root mount
3. `web/src/islands/ReviewFilters.svelte` — URL-synced facets; SSR helper getReviewFacets(locale) cached 5 min
4. 4 new Strapi content types — require npm run build in cms/ before any production deploy
5. `scripts/agents/umami_feedback.py` — nightly 04:00 UTC, 7-day rolling window, percentile-normalized traffic_score
6. `scripts/agents/ab_tester.py` — weekly Sunday, Bayesian comparison, Telegram recommendation, no auto-promotion

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for complete detail including warning signs and the "looks done but isn't" checklist.

1. **Faceted filter URL explosion** — 4 filters x enumerated values = 640+ crawlable combinations for 25 reviews. Prevention: canonical pointing to unfiltered index + noindex meta on every filtered URL. Must ship in same PR as the filter feature.

2. **Newsletter single opt-in = GDPR violation + Brevo deliverability penalty** — Brevo's "DOI not required" statement is a trap; Italian Garante has rejected server-log-only consent proof. Prevention: Brevo list-level DOI from day one, localized consent text in EN/IT/ES, honeypot field, SQLite rate-limit, server-side consent record in Strapi.

3. **Exit-intent modal accessibility failure + mobile false-positive flood** — visibilitychange fires on every iOS notification-center pull. Prevention: desktop-only mouseleave, mobile gets sticky footer only, full WCAG 2.2 dialog (role, aria-modal, focus trap, Escape). EU Accessibility Act in force since June 2025.

4. **A/B cloaking / CLS via client-side H1 swap** — Googlebot executes JS; different H1 from SSR response = cloaking risk. Client swap after paint = CLS spike. Prevention: middleware assigns bucket before render; identical canonical URL + meta tags across all variants; OG meta reflects assigned variant.

5. **A/B statistical invalidity at editorial traffic volumes** — ~500 visits/day x 3 locales, 2pp MDE = 3,842 visitors per variant = ~15 days minimum. Peeking at day 5 produces false winners 30% of the time. Prevention: AB_MIN_IMPRESSIONS=500 + 7 days minimum enforced by ab_tester.py; test headline patterns across categories (pool traffic), not per individual article.

6. **Webhook rebuild cascade on A/B variant edits** — Every Strapi save triggers a 4-minute full site rebuild. Editor iterating on variants stacks rebuilds with race conditions. Prevention: configure adnanh/webhook to exclude headline-variant and variant-impression content types. Pagefind rebuild similarly excluded.

7. **Strapi v5 i18n slug omission on recipe collections** — Convention from CLAUDE.md ("PUT con ?locale=xx, sempre includere slug nel body") was learned from v1.0 bugs. Every new i18n content type repeats the risk. Prevention: shared helper update_localized(id, locale, data) enforced for all agents.

8. **Umami -> agents noise amplification** — At 400 visits/week per page, 24h windows have high variance. Prevention: 7-day rolling windows, percentile thresholds ("bottom 20% of catalog"), 500-visit minimum before any rewrite flag, multi-signal decisioning, UTC standardized in all cron jobs.

## Implications for Roadmap

Based on combined research, the recommended phase structure has 8 phases (including debt closure). Hard dependencies, SEO protection requirements, statistical validity gates, and the webhook rebuild cascade all drive the ordering.

### Phase 1 (Debt): Retroactive VERIFICATION + REQUIREMENTS Reconciliation
**Rationale:** PROJECT.md explicitly sequences debt closure before feature phases. 7 phases lack VERIFICATION.md; 9 requirements marked Pending despite live implementation.
**Delivers:** VERIFICATION.md for phases 03-09, REQUIREMENTS.md with REC-04/05/06/07 + CNT-02/03/07/08/10 resolved, Lighthouse 90+ re-measurement post-v3.2 (DES-04).
**Avoids:** Starting feature phases with undefined acceptance baselines.
**Research flag:** Standard documentation/measurement work — no phase research needed.

### Phase 2 (Foundation): Strapi Schema Migration
**Rationale:** Product-category relation, price_range enum, recipe-collection type, headline-variant + variant-impression types, and traffic_score fields must ALL migrate before any feature phase. One CMS rebuild window beats four.
**Delivers:** 4 new content types on production, 25 products backfilled with category + price_range, 6 default categories seeded, Strapi admin rebuild complete.
**Avoids:** Mid-feature schema rework; CMS restart during active editorial period.
**Research flag:** Well-established Strapi 5 pattern — no phase research needed. Apply CLAUDE.md i18n field conventions on day one.

### Phase 3: Newsletter On-Site Signup
**Rationale:** Most independent feature bucket. Brevo DOI must be configured before any signup reaches production — GDPR exposure starts from the first non-DOI subscription.
**Delivers:** NewsletterInlineForm.svelte (reusable across surfaces), inline end-of-article on all content types, exit-intent modal (desktop, WCAG 2.2), sticky footer bar (mobile), /[locale]/newsletter/ landing pages (3 locales), Brevo DOI + locale-matched emails + welcome automation, SURFACE tracking, localized consent text.
**Avoids:** Pitfalls 2 (DOI) and 3 (exit-intent accessibility) — both in same PR. Non-code deliverable: Matteo must create IT and ES Brevo DOI templates before phase closes.
**Research flag:** Standard newsletter pattern — no phase research needed.

### Phase 4: Review Filters & Taxonomy
**Rationale:** Depends on Phase 2. SSR approach confirmed over client-side manifest. SEO canonical/noindex protection non-negotiable and must ship in same PR as filters.
**Delivers:** ReviewFilters.svelte island with brand/category/price facets, URL-synced state, SSR facet count helper, mobile filter drawer, canonical + noindex on all filtered URLs, robots.txt pattern.
**Avoids:** Pitfall 1 (crawl budget explosion).
**Research flag:** Run /gsd:research-phase — confirm canonical vs. noindex vs. robots.txt strategy for this editorial site with a small corpus; identify which filter combinations merit real indexable taxonomy landing pages.

### Phase 5: Recipe Collections
**Rationale:** Independent of filters. Depends on Phase 2. High internal linking value. Strapi i18n convention must be applied precisely.
**Delivers:** /[locale]/[localized-route]/ index + detail pages (EN: collections, IT: raccolte, ES: colecciones), CollectionBadges on recipe detail pages, CollectionPage JSON-LD, sitemap inclusion with >=3 recipes guard, hreflang only when locale version exists.
**Avoids:** Pitfall 6 (slug omission, orphan references) — lifecycle hook + null filter + Sentry alert must ship with feature.
**Research flag:** Standard Strapi + Astro pattern — no phase research needed. Localization unit test from PITFALLS.md is acceptance criterion.

### Phase 6: Growth Engine v2 — Umami Analytics Feedback Loop
**Rationale:** Must precede A/B phase. Validates umami_client.py in production before ab_tester.py depends on it. Provides traffic baseline data needed to size A/B experiments.
**Delivers:** umami_client.py library, umami_feedback.py nightly cron (04:00 UTC, 7-day window, percentile-normalized traffic_score), Strapi traffic_score fields on 4 content types, Telegram /content_report command extension, agent decisions log.
**Avoids:** Pitfall 7 (noise amplification) — 7-day windows, percentile thresholds, 500-visit minimum, UTC standardization, multi-signal decisioning enforced from day one.
**Research flag:** No phase research needed — direct port of strapi_client.py pattern.

### Phase 7: A/B Headline Testing Infrastructure
**Rationale:** Last feature phase. Depends on Umami events running (Phase 6), subscriber list with volume (Phase 3), and schema migration (Phase 2). Statistical validity gates must be in design spec before any test runs.
**Delivers:** web/src/middleware.ts (bucket cookie, no UA branching), web/src/lib/ab.ts, AbTracker.svelte, ab_tester.py weekly Bayesian agent, webhook rebuild exclusion for A/B content types, AB_TEST_ENABLED + AB_MIN_IMPRESSIONS env vars. BlogPost-only in v1.1.
**Avoids:** Pitfall 4 (cloaking/CLS — middleware-before-render), Pitfall 5 (statistical invalidity — N+days gate enforced by agent), Pitfall 8 (webhook cascade — content type exclusion).
**Research flag:** Run /gsd:research-phase — validate adnanh/webhook content-type-level exclusion syntax in hooks.json; confirm Astro middleware cookie behavior with Cloudflare CDN cache layer.

### Phase 8: Deployment Hardening + Smoke Tests
**Rationale:** v1.1 adds 4 content types, new API endpoints, new crons, and new env vars. Many integration points fail silently (missing env vars, locale DOI template fallback, hreflang for non-existent locales).
**Delivers:** End-to-end verification of: Brevo contact creation within 30s, IT/ES DOI emails in correct locale, review filter canonical headers, recipe collection IT pages with IT titles, Umami timezone audit, A/B OG meta consistency, WCAG modal audit.
**Avoids:** Silent failures in the PITFALLS.md "Looks Done But Isn't" checklist.
**Research flag:** No research needed — execution of the PITFALLS.md checklist.

### Phase Ordering Rationale

- **Debt first:** PROJECT.md requires it. Non-negotiable sequencing.
- **Schema migration second:** Filters, collections, and A/B all depend on new Strapi content types. One CMS rebuild window beats four separate interruptions.
- **Newsletter third:** Independent of schema migration. Ships quickly and starts building subscriber list before A/B subject-line testing needs volume.
- **Filters before collections:** Both depend on Phase 2. Filters have higher reader impact and an active SEO risk. Collections follow cleanly.
- **Analytics loop before A/B:** umami_client.py validated in production before ab_tester.py depends on it; traffic baseline informs which pages to A/B test.
- **A/B last:** Accumulates all dependencies. Statistical validity requires traffic baseline from Phase 6; subject-line testing requires subscriber list from Phase 3.
- **Smoke tests as explicit phase:** v1.1 has too many silent-failure integration points to treat verification as implicit.

### Research Flags

Phases needing /gsd:research-phase during planning:
- **Phase 4 (Review Filters):** Canonical vs. noindex vs. robots.txt for editorial faceted navigation with small corpus; which filter combinations merit real indexable taxonomy pages.
- **Phase 7 (A/B):** adnanh/webhook content-type-level exclusion syntax; Astro middleware + Cloudflare CDN cookie behavior validation.

Phases with standard patterns (skip /gsd:research-phase):
- **Phase 1:** Documentation review + Lighthouse CLI — fully established workflow.
- **Phase 2:** Strapi 5 content type creation — fully documented, practiced in v1.0.
- **Phase 3:** Brevo + Astro + Svelte 5 newsletter — mapped in STACK.md with working code samples.
- **Phase 5:** Strapi + Astro i18n collection pattern — risk is in execution discipline, not unknowns.
- **Phase 6:** umami_client.py is a direct port of strapi_client.py; Umami REST is straightforward.
- **Phase 8:** Execution of PITFALLS.md checklist.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions verified against existing codebase conventions and official docs. nanoid v5 ESM compatibility with Astro 6 confirmed. No speculative technology choices. |
| Features | HIGH / MEDIUM | Newsletter/filters/collections are industry-standard patterns on a known stack (HIGH). A/B and analytics loop are MEDIUM — statistical validity at current traffic volumes is genuinely uncertain; editorial sites at 400-500 visits/day are below the comfortable operating range for most A/B guidance. |
| Architecture | HIGH | Built from direct inspection of the production codebase. File paths are specific and verified against live files. Architectural decisions match existing CLAUDE.md-documented patterns. |
| Pitfalls | HIGH / MEDIUM | SEO facet explosion, GDPR DOI, Strapi slug omission, and webhook cascade are derived from documented production experience or established industry patterns (HIGH). A/B flicker prevention via middleware is well-reasoned but untested on this specific Cloudflare + Caddy + Astro setup (MEDIUM). |

**Overall confidence:** HIGH

### Gaps to Address

- **Brevo rate limits (Feb 2026 changelog):** Specific per-endpoint limits for /v3/contacts batch mode need confirmation before Phase 3 load test. Address in Phase 3 planning.
- **Umami token TTL on self-hosted version:** Research notes 1-hour TTL; umami_client.py caches 58 minutes. Verify against the specific version running in production. Address in Phase 6 planning.
- **Traffic baseline before A/B test sizing:** Current per-page CTR baseline is unknown. Phase 7 must include a 1-week measurement window before committing to experiment durations. AB_MIN_IMPRESSIONS=500 is a conservative starting gate; adjust after baseline is known.
- **Webhook trigger exclusion for A/B content types:** adnanh/webhook hooks.json syntax for content-type-level filtering needs validation. Strapi lifecycle hook is the fallback. Address in Phase 7 research.
- **Brevo IT/ES DOI email templates:** Non-code deliverable — Matteo must create these in Brevo dashboard before Phase 3 ships. Flag as blocking prerequisite in Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- Existing production codebase (web/src/, scripts/agents/, cms/src/api/) — direct inspection; all STACK.md patterns verified against live files
- CLAUDE.md conventions — project-specific rules derived from v1.0 production experience
- docs/architecture.md — verified service topology
- Strapi 5 i18n docs (https://docs.strapi.io/cms/features/internationalization) — locale PUT + slug body convention
- Strapi 5 relations docs (https://docs.strapi.io/cms/api/rest/relations) — locale-aware relation resolution
- Umami API docs (https://docs.umami.is/docs/api) — auth + Bearer token pattern, endpoint list
- Brevo API docs (https://developers.brevo.com/) — /v3/contacts, api-key header auth
- nanoid npm (https://www.npmjs.com/package/nanoid) — v5.1.7, ESM-only, 96M weekly downloads confirmed
- Astro i18n routing (https://docs.astro.build/en/guides/internationalization/) — already implemented in v1.0

### Secondary (MEDIUM confidence)
- Cloudflare Pages A/B pattern (https://developers.cloudflare.com/pages/how-to/use-worker-for-ab-testing-in-pages/) — cookie-based variant reference
- WCAG 2.2 dialog pattern + TPGi/Claspo exit-intent guidance — modal accessibility baseline
- Omnisend 2026 email benchmark — newsletter conversion rate baselines (4.82% inline, 19.77% exit-intent)
- NN/g faceted navigation research — >7 facets cause fatigue; small corpora do not benefit from complex faceting
- arXiv 1908.06256 — Thompson Sampling vs. A/B for news headline optimization (3.69% CTR lift)
- SearchEngineLand 2025 — Google A/B testing guidance, cloaking definition

### Tertiary (LOW confidence — inferred or single-source)
- Sample size calculation for 2pp MDE at 10% baseline CTR — standard formula, not domain-specific; validate against actual CTR before Phase 7 commitment
- Brevo sender reputation decay timeline with single opt-in — industry rule of thumb, not Brevo-specific data; non-negotiable regardless

---
*Research completed: 2026-04-15*
*Ready for roadmap: yes*
