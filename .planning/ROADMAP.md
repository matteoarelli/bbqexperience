# Roadmap: BBQ Experience

## Milestones

- ✅ **v1.0 BBQ Experience Launch** — Phases 1–9 (shipped 2026-04-15) · [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Content Depth & Growth Loop** — Phases 10–16 (planned 2026-04-15)

## Overview

v1.1 is an additive milestone on the live v1.0 production stack. It starts by closing documentation and measurement debt (phase 10), lands one unified Strapi schema migration (phase 11) so every feature phase can rely on a stable CMS, then ships three reader-facing surfaces in parallel-safe order (newsletter 12 → filters 13 → collections 14). The final two phases turn Growth Engine from a content producer into a measurable feedback loop: Umami traffic data piped into agents (15), then A/B headline testing on BlogPost (16). Debt closure and schema migration are hard prerequisites for the feature wave; analytics precedes A/B because ab_tester.py depends on umami_client.py and needs a live traffic baseline.

## Phases

**Phase Numbering:**
- Integer phases (10, 11, 12): Planned milestone work (v1.0 ended at 9, v1.1 continues at 10)
- Decimal phases (11.1, 11.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>✅ v1.0 BBQ Experience Launch (Phases 1–9) — SHIPPED 2026-04-15</summary>

- [x] Phase 1: Infrastructure & Deploy Pipeline (2/2 plans)
- [x] Phase 2: Design System & Frontend Scaffold (3/3 plans)
- [x] Phase 3: CMS Authoring Workflow (2/2 plans)
- [x] Phase 4: Review Pages (2/2 plans)
- [x] Phase 5: Recipe Pages (3/3 plans)
- [x] Phase 6: Content Pages & Discovery (4/4 plans)
- [x] Phase 7: Instagram & Social Integration (2/2 plans)
- [x] Phase 8: Product Comparison & Advanced Interactions (3/3 plans)
- [x] Phase 9: SEO Audit, Performance & Launch (2/2 plans)

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 Content Depth & Growth Loop (Planned 2026-04-15)

**Milestone Goal:** Close v1.0 debt, expand reader-facing content features (newsletter, filters, collections), and upgrade Growth Engine with a measurable analytics → A/B feedback loop.

**Sequencing rule (from PROJECT.md):** Debt phase 10 must complete before any feature phase begins. Schema migration (phase 11) must complete before the feature wave (12–14). Analytics loop (15) must validate before A/B (16) depends on it.

- [x] **Phase 10: Debt Closure & Measurement Baseline** — Backfill VERIFICATION.md for phases 03–09, reconcile v1.0 traceability, fresh Lighthouse 90+ measurement. (completed 2026-04-16, partial DEBT-03 closure — image-delivery deferred to 10.1)
- [x] **Phase 10.1: Image Delivery via Cloudflare Resizing** *(INSERTED)* — Close residual DEBT-03 gap: route Strapi media URLs through Cloudflare Image Resizing (or equivalent CDN transformation) so the 6 pages still scoring sub-90 on Lighthouse Performance reach ≥90; re-measure all 15 baseline pages → status=pass. (completed 2026-04-16, 15/15 ≥90 Perf median 0.97, DEBT-03 CLOSED)
- [x] **Phase 11: Strapi Schema Migration & Localization Helper** — Land all v1.1 schema changes in one CMS rebuild window (product-category taxonomy, subscriber.source, recipe-collection scaffold, shared locale PUT helper) and migrate existing product data.
- [x] **Phase 12: Newsletter On-Site Signup (Brevo)** — Multi-surface capture (inline, exit-intent, sticky footer, dedicated page) with DOI, rate-limit, honeypot, localized welcome email. (completed 2026-04-21)
- [x] **Phase 13: Review Filters & Taxonomy** — Faceted browse on reviews index (brand, category, price, score) with SEO crawl-budget guardrails. (completed 2026-04-21)
- [ ] **Phase 14: Recipe Collections** — Curated editorial groupings as a new i18n content type with listing, detail, cross-linking, sitemap, hreflang.
- [ ] **Phase 15: Growth Engine v2 — Analytics Feedback Loop** — Umami → traffic_score on content, Telegram top/bottom digest, strategist consumes signal, noise guardrails.
- [ ] **Phase 16: A/B Headline Testing Infrastructure** — Astro middleware bucket assignment, Umami event attribution, weekly stats agent, webhook rebuild exclusion, newsletter subject-line A/B via Brevo native.

## Phase Details

### Phase 10: Debt Closure & Measurement Baseline
**Goal**: v1.0 acceptance baseline is fully documented and measured so v1.1 feature work starts on firm ground.
**Depends on**: v1.0 (complete)
**Requirements**: DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):
  1. Phases 03–09 each have a VERIFICATION.md file reconciled against live production evidence (URLs, Strapi content counts, commit references).
  2. REQUIREMENTS.md (v1.0 archive) shows REC-04, REC-05, REC-06, REC-07, CNT-02, CNT-03, CNT-07, CNT-08, CNT-10 as Complete with phase attribution — no stale "Pending" rows.
  3. A fresh Lighthouse report (Performance, Accessibility, Best Practices, SEO) for home, a review, a recipe, a tutorial, and a blog post in each of EN/IT/ES scores 90+ and is committed under `.planning/artifacts/lighthouse-v1.1-baseline/`.
  4. Any page scoring below 90 has a fix shipped to production and a re-measured report included in the baseline folder.
**Plans**: 5 plans
Plans:
- [x] 10-01-PLAN.md — Backfill VERIFICATION.md for v1.0 phases 03, 04, 05 (DEBT-01)
- [x] 10-02-PLAN.md — Backfill VERIFICATION.md for v1.0 phases 06, 07, 08, 09 (DEBT-01)
- [x] 10-03-PLAN.md — Reconcile v1.0 REQUIREMENTS.md traceability (DEBT-02)
- [x] 10-04-PLAN.md — Fresh Lighthouse 90+ baseline across 15 pages (DEBT-03 measurement)
- [x] 10-05-PLAN.md — CONDITIONAL: ship fixes + re-measure if Plan 04 reports sub-90 (DEBT-03 fixes)

### Phase 10.1: Image Delivery via Cloudflare Resizing *(INSERTED)*
**Goal**: Every page in the v1.1 Lighthouse baseline scores ≥90 on Performance by routing Strapi media through CDN-side image transformation, closing the residual DEBT-03 gap left after Plan 10-05.
**Depends on**: Phase 10 (baseline + LCP/CSS/JS fixes already shipped; this phase only addresses image-delivery payload).
**Requirements**: DEBT-03 (residual portion — image-delivery savings ~624 KB/page on home & review pages)
**Success Criteria** (what must be TRUE):
  1. `getStrapiMediaURL()` (or its callers) emits CDN-transformed URLs that produce responsive sizes (AVIF/WebP, width-clamped to viewport) instead of raw Strapi originals.
  2. The 6 pages still scoring sub-90 after Plan 10-05 (home-en/it/es, review-en/es, blog-en) re-measure to ≥90 on Performance with all other categories unchanged (Accessibility/BP/SEO already ≥95).
  3. `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` updates to `status: pass` with all 15 baseline pages ≥90 in all 4 categories; DEBT-03 final disposition flips to **CLOSED**.
  4. No regression on the 9 pages already passing (review-it 93, tutorial-it 90, recipe-*, tutorial-en/es, blog-it/es) — re-measurement confirms each stays ≥90.
  5. Implementation respects CLAUDE.md: no new dependency where Cloudflare account-level config suffices, Italian code comments, deploy via webhook (no GH Actions).
**Plans**: 2 plans
Plans:
- [x] 10.1-01-PLAN.md — Cloudflare dashboard prerequisites: orange-cloud flip, enable Transformations, Sources allowlist (human-gated checkpoint + edge smoke probes)
- [x] 10.1-02-PLAN.md — Rewrite getStrapiMediaURL + buildStrapiSrcset, wire 12 hot templates, deploy via webhook, re-measure 15 Lighthouse pages, flip DEBT-03 to CLOSED

### Phase 11: Strapi Schema Migration & Localization Helper
**Goal**: A single CMS rebuild window lands every v1.1 schema change the feature wave depends on, and 25 existing products are migrated to the new taxonomy.
**Depends on**: Phase 10
**Requirements**: FILT-02, FILT-08, NEWS-05, COLL-06
**Success Criteria** (what must be TRUE):
  1. Strapi in production exposes a new localized `product-category` taxonomy (EN/IT/ES) with the 5 seeded categories (grill, smoker, pellet, thermometer, accessory) and the Product content type has a `product_category` relation replacing the string enum.
  2. All 25 existing reviewed products are backfilled with a non-null `product_category` relation; a SQL/REST audit returns zero null rows.
  3. The Subscriber content type has a `source` field (enum: inline, landing, footer, exit-intent, legacy) and the Recipe content type carries a `collection` relation to the new (empty) recipe-collection type.
  4. A shared helper (e.g. `scripts/agents/lib/strapi_locale.py` and/or `cms/src/lib/update-localized.ts`) performs every PUT with `?locale=xx` + slug in body; existing ad-hoc locale PUTs in Growth Engine agents are refactored to use it.
  5. Production `cms` container rebuilds cleanly (`npm run build` + `docker compose up -d --build strapi`) with zero editorial downtime windowed outside peak publish hours.
**Plans**: 3 plans
Plans:
- [x] 11-01-PLAN.md — Create product-category + recipe-collection content types, modify Product/Subscriber/Recipe schemas
- [x] 11-02-PLAN.md — Migration script (seed categories, backfill products, tag subscribers) + TS locale helper + Python agent audit
- [x] 11-03-PLAN.md — Deploy to Hetzner, run migration, SQL/REST audits, Matteo admin verification

### Phase 12: Newsletter On-Site Signup (Brevo)
**Goal**: Readers can subscribe to the newsletter from 4 on-site surfaces with GDPR-compliant double opt-in, and every signup is attributed to a surface for conversion reporting.
**Depends on**: Phase 11
**Requirements**: NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-06, NEWS-07, NEWS-08
**Success Criteria** (what must be TRUE):
  1. Every published article (blog, review, recipe, tutorial) in each locale renders an inline NewsletterInlineForm at the end with locale-matched copy, and a submission from any of them produces a Brevo contact in the unconfirmed state.
  2. `/en/newsletter/`, `/it/newsletter/`, and `/es/newsletter/` each return 200 with full value proposition copy, consent text, and a working form that feeds the same endpoint as the inline surface.
  3. A first-time desktop visitor sees the exit-intent modal on mouseleave (not on tab switch, not on mobile), the modal traps focus, closes on Escape, is announced to screen readers, and respects a 1/session cap and 14-day dismiss suppression.
  4. A first-time visitor on any device sees the sticky footer bar, can dismiss it, and does not see it again for 30 days (suppression cookie verified).
  5. Every confirmed signup receives a welcome email in its signup locale (EN/IT/ES) via Brevo automation, and Brevo contact list shows the SURFACE attribute populated correctly per origin.
  6. The signup endpoint enforces 5 attempts/IP/hour via the shared SQLite rate-limit and rejects any POST with a non-empty honeypot field (403 response, no Brevo call).
**Plans**: TBD

### Phase 13: Review Filters & Taxonomy
**Goal**: Readers can narrow the reviews index by brand, category, price bucket, and score threshold without leaking crawl budget.
**Depends on**: Phase 11
**Requirements**: FILT-01, FILT-03, FILT-04, FILT-05, FILT-06, FILT-07
**Success Criteria** (what must be TRUE):
  1. `/en/reviews/`, `/it/reviews/`, `/es/reviews/` each expose brand, category, price-bucket (<EUR300, EUR300-EUR800, EUR800-EUR1500, >EUR1500), and score-threshold (6+, 7+, 8+) filters with live count badges per option.
  2. Selecting any filter combination updates the URL query string, is shareable (deep-link reload reproduces the state), and returns server-rendered filtered results in <200 ms p95.
  3. Every filtered URL (`?brand=weber&category=pellet`) emits `<link rel="canonical" href="/{locale}/reviews/">` and `<meta name="robots" content="noindex, follow">` while the unfiltered index stays `index, follow`; verified via curl in all 3 locales.
  4. On viewports <=768 px, the filter UI opens as a bottom-sheet drawer with a sticky "Apply (N)" button; count reflects pending selections before apply.
  5. Zero-match combinations render an empty state with a "Clear filters" button that resets to the canonical index in one click.
  6. Research confirmed: canonical+noindex is the correct policy for small-corpus editorial facets (25 reviews). No filter combinations warrant indexable taxonomy pages at this scale.
**Plans**: 3 plans
Plans:
- [x] 13-01-PLAN.md — Foundation: update TS types, create filter utility lib, add noindex to SEOHead/BaseLayout, add i18n keys, unit tests
- [x] 13-02-PLAN.md — Reviews pages: filter bar + mobile drawer + empty state for EN/IT/ES, remove old category route
- [x] 13-03-PLAN.md — Data remediation: populate product prices, fix brand relations, recategorize pellet grills + Matteo verification

### Phase 14: Recipe Collections
**Goal**: The author can curate themed recipe groupings that readers browse as a first-class section of the site in all three locales.
**Depends on**: Phase 11
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04, COLL-05
**Success Criteria** (what must be TRUE):
  1. In Strapi, Matteo can create a RecipeCollection with title, slug, hero image, editorial intro, ordered recipe list, and translate every field to IT and ES using the shared locale helper (PUT ?locale=xx + slug in body).
  2. `/en/collections/`, `/it/raccolte/`, `/es/colecciones/` each list every published collection with cover image, title, recipe count, and short description; unpublished or empty (<1 recipe) collections are excluded.
  3. `/{locale}/{collections-route}/{slug}/` renders the editorial intro, ordered recipes (thumbnail + title + cook time), and an author's note; hreflang links point only to sibling locales where a translation actually exists.
  4. Any recipe that belongs to a collection renders a "Part of [Collection Name]" badge on its detail page linking back to that collection in the same locale.
  5. All published collection URLs appear in the per-locale sitemap with correct `<xhtml:link rel="alternate" hreflang="...">` entries and a CollectionPage JSON-LD block on each detail page.
**Plans**: 3 plans
Plans:
- [ ] 14-01-PLAN.md — Foundation: Strapi schema evolution, TS types, i18n keys, CollectionCard + CollectionBadge components
- [ ] 14-02-PLAN.md — Collection listing + detail pages (EN/IT/ES) + CollectionBadge on recipe detail
- [ ] 14-03-PLAN.md — Sitemap hreflang extension, navigation link, deploy verification

### Phase 15: Growth Engine v2 — Analytics Feedback Loop
**Goal**: Umami traffic data flows into Python agents as a normalized `traffic_score`, Matteo sees the top/bottom performers in his Telegram digest, and the strategist agent uses the signal to prioritize content decisions.
**Depends on**: Phase 11 (schema ready), independent of 12–14 for execution order (planning can start after 11; ship after 14 to avoid editorial contention)
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05
**Success Criteria** (what must be TRUE):
  1. A nightly cron on Hetzner runs `scripts/agents/umami_feedback.py` at 04:00 UTC, fetches 7-day and 30-day unique-visit counts per article from the Umami API, and writes `traffic_score` onto every blog-post, review, recipe, and tutorial in Strapi for each locale.
  2. `scripts/agents/lib/umami_client.py` exists and mirrors `strapi_client.py`: retry with exponential backoff, `AbortSignal.timeout(10_000)` equivalent (10 s), cached session token with ≤58-minute TTL, structured error logs.
  3. The daily Telegram dashboard includes a "Top 5 / Bottom 5 by 7-day traffic per locale" section that updates each morning with correct slugs and links to the content in the CMS.
  4. The Claude strategist agent reads `traffic_score` when building the content queue and its decision log records which items were prioritized for refresh/expansion based on the score.
  5. Content with fewer than 50 visits in the measurement window or less than 7 days since first publish is explicitly excluded from any agent action (low-confidence filter verified in a unit test).
**Plans**: TBD

### Phase 16: A/B Headline Testing Infrastructure
**Goal**: Blog post headlines can be tested with statistically valid assignment and measurement, without triggering SEO cloaking penalties, rebuild cascades, or client-side flicker; newsletter subject lines ride the same feedback loop via Brevo.
**Depends on**: Phase 15 (umami_client.py + traffic baseline), Phase 12 (subscriber list for subject-line A/B)
**Requirements**: AB-01, AB-02, AB-03, AB-04, AB-05, AB-06, AB-07
**Success Criteria** (what must be TRUE):
  1. Matteo can define 2 or 3 headline variants for any BlogPost via a new `ab-experiment` Strapi content type linked to the post; the editor flow is documented and works end-to-end in all 3 locales.
  2. Every visitor to a post with an active experiment receives a sticky `ab_id` cookie (30-day TTL, nanoid-generated) set by `web/src/middleware.ts` before render; the variant shown in listing cards / social OG tags is deterministic for that cookie and the article's detail `<h1>` and canonical URL slug stay stable across variants.
  3. Umami custom events (`ab-impression`, `ab-click`) are emitted with variant identifiers; a query to Umami returns non-zero impressions for both variants within 24 hours of a test going live.
  4. The weekly agent `scripts/agents/ab_tester.py` runs each Sunday, computes a two-proportion z-test per active experiment, refuses to recommend a winner unless ≥500 impressions/variant AND ≥7 days have elapsed AND only one active test exists on the post, and posts a recommendation to Telegram for Matteo to confirm manually.
  5. Requests with bot/crawler User-Agent (Googlebot, Bingbot, etc.) always receive the control variant and are excluded from impression/click counts — verified with a curl spoof in the smoke test.
  6. Editing an `ab-experiment` or `variant-impression` entry in Strapi does NOT trigger an Astro site rebuild (adnanh/webhook `hooks.json` excludes these content types); verified by editing a variant and confirming no new entry in `/opt/webhooks/logs/bbqexperience.log`.
  7. A newsletter campaign scheduled through Brevo's native A/B feature (subject-line test) gets a winner recommendation surfaced in the same Telegram weekly digest as on-site experiments.
  8. `may need /gsd:research-phase before planning` — validate adnanh/webhook content-type-level exclusion syntax in `hooks.json`, and confirm Astro middleware cookie behavior behind Cloudflare CDN (cache bypass on Set-Cookie, no edge cache poisoning).
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12 → 13 → 14 → 15 → 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure & Deploy Pipeline | v1.0 | 2/2 | Complete | 2026-04-01 |
| 2. Design System & Frontend Scaffold | v1.0 | 3/3 | Complete | 2026-04-01 |
| 3. CMS Authoring Workflow | v1.0 | 2/2 | Complete | 2026-04-01 |
| 4. Review Pages | v1.0 | 2/2 | Complete | 2026-04-01 |
| 5. Recipe Pages | v1.0 | 3/3 | Complete | 2026-04-01 |
| 6. Content Pages & Discovery | v1.0 | 4/4 | Complete | 2026-04-01 |
| 7. Instagram & Social Integration | v1.0 | 2/2 | Complete | 2026-04-01 |
| 8. Product Comparison & Advanced Interactions | v1.0 | 3/3 | Complete | 2026-04-01 |
| 9. SEO Audit, Performance & Launch | v1.0 | 2/2 | Complete | 2026-04-01 |
| 10. Debt Closure & Measurement Baseline | v1.1 | 5/5 | Complete    | 2026-04-16 |
| 11. Strapi Schema Migration & Localization Helper | v1.1 | 3/3 | Complete | 2026-04-21 |
| 12. Newsletter On-Site Signup (Brevo) | v1.1 | 0/TBD | Complete    | 2026-04-21 |
| 13. Review Filters & Taxonomy | v1.1 | 3/3 | Complete    | 2026-04-21 |
| 14. Recipe Collections | v1.1 | 0/3 | Planned | - |
| 15. Growth Engine v2 — Analytics Feedback Loop | v1.1 | 0/TBD | Not started | - |
| 16. A/B Headline Testing Infrastructure | v1.1 | 0/TBD | Not started | - |
