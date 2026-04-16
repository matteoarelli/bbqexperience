# Requirements: BBQ Experience — v1.1 Content Depth & Growth Loop

**Defined:** 2026-04-15
**Milestone:** v1.1
**Core Value:** The most complete, visually striking, and trustworthy BBQ product review destination online

## v1.1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase. Debt closure phases complete before feature phases.

### Debt Closure

<!-- Sequenced first per PROJECT.md: close v1.0 measurement/documentation gaps before building new features. -->

- [x] **DEBT-01**: Phases 03–09 have retroactive VERIFICATION.md artifacts reconciled against live production evidence
- [x] **DEBT-02**: REQUIREMENTS.md traceability for v1.0 marks all shipped requirements Complete (REC-04, REC-05, REC-06, REC-07, CNT-02, CNT-03, CNT-07, CNT-08, CNT-10) instead of Pending
- [~] **DEBT-03**: Author obtains a fresh Lighthouse 90+ measurement across Performance, Accessibility, Best Practices, and SEO for home, a review, a recipe, a tutorial, and a blog post in each locale, with fixes applied if any score falls below 90 — *measurement complete (15/15), 4 fix commits shipped (9/15 ≥90); residual 6 pages need Cloudflare Image Resizing → deferred to Phase 10.1*

### Newsletter Signup (Brevo)

<!-- Multi-surface capture feeding the existing Brevo list. Double opt-in mandatory for EU compliance. -->

- [ ] **NEWS-01**: Visitor can submit email via an inline signup block at the end of every article (blog, review, recipe, tutorial) with value proposition copy and per-locale translation
- [ ] **NEWS-02**: Visitor can submit email via a dedicated `/newsletter` landing page (EN/IT/ES) with full value proposition, past issues preview, and privacy/consent copy
- [ ] **NEWS-03**: Visitor can submit email via a sticky footer bar shown on first visit, dismissible with suppression cookie (30 days)
- [ ] **NEWS-04**: Visitor can submit email via an exit-intent modal on desktop (tab switch excluded on mobile) with accessibility (focus trap, ESC to close, screen-reader announcement) and frequency cap (1 per session, 14-day suppression after dismiss)
- [ ] **NEWS-05**: System records signup source (inline / landing / footer / exit-intent / legacy) as a Brevo contact attribute and a Strapi `subscriber.source` field for attribution reporting
- [ ] **NEWS-06**: System enforces Brevo double opt-in: visitor receives a confirmation email, remains unconfirmed in Brevo until the link is clicked, and sees a locale-specific "please confirm" success state
- [ ] **NEWS-07**: System rate-limits signup submissions via the shared SQLite rate-limit (5 attempts per IP per hour) and rejects bot submissions via a hidden honey-pot field
- [ ] **NEWS-08**: Visitor receives a welcome email (Brevo automation) immediately after confirming, in their signup locale (EN/IT/ES)

### Review Filters & Taxonomy

<!-- Faceted filtering on the reviews index. SEO guardrails are a hard requirement of the same phase (not follow-up). -->

- [ ] **FILT-01**: Reader can filter reviews by brand (from existing `brand_relation`) on the reviews index page in each locale
- [ ] **FILT-02**: Reader can filter reviews by product category (grill / smoker / pellet / thermometer / accessory) via a new localized `product-category` taxonomy that replaces the string enum
- [ ] **FILT-03**: Reader can filter reviews by price range bucket (<€300, €300–€800, €800–€1500, >€1500) derived from the existing product price field
- [ ] **FILT-04**: Reader can filter reviews by Pitmaster score threshold (8+, 7+, 6+) across categories
- [ ] **FILT-05**: Reader sees per-facet count badges and an empty-state with "clear filters" affordance when no review matches
- [ ] **FILT-06**: Filter state persists in the URL via query params (shareable), with a canonical tag pointing to the un-filtered index and `noindex, follow` on any filtered URL to prevent crawl-budget drain
- [ ] **FILT-07**: On mobile, filters open in a bottom-sheet drawer with "Apply" confirmation, keeping the primary viewport uncluttered
- [ ] **FILT-08**: Data migration tags all 25 existing reviewed products with the new `product-category` relation before the filter UI goes live

### Recipe Collections

<!-- Curated editorial groupings as a new Strapi content type, with 3-locale routing. -->

- [ ] **COLL-01**: Author can create a recipe collection in Strapi with title, slug, hero image, intro copy (editorial note), and an ordered list of recipes, localized in EN/IT/ES
- [ ] **COLL-02**: Reader can browse all collections on `/collections` (per locale) with cover imagery, title, recipe count, and short description
- [ ] **COLL-03**: Reader can open a collection detail page at `/collections/[slug]` showing the editorial intro, ordered recipes with thumbnail/title/time, and author's note
- [ ] **COLL-04**: Recipe detail pages show a "Part of [Collection]" badge linking back to the collection when the recipe belongs to one
- [ ] **COLL-05**: Collection URLs are included in the per-locale sitemap with correct hreflang tags to sibling-locale collections
- [ ] **COLL-06**: Collections support Strapi v5 localization (PUT with `?locale=xx` + slug in body) using a shared helper that replaces ad-hoc calls in existing content-type code

### Growth Engine v2 — Analytics Feedback Loop

<!-- Umami traffic data feeds Python agents to inform content decisions. Must precede A/B so events are validated first. -->

- [ ] **ANLY-01**: Nightly Python agent fetches 7d and 30d unique-visit counts per article from the Umami API and writes a `traffic_score` field back to the corresponding Strapi content (blog, review, recipe, tutorial) in each locale
- [ ] **ANLY-02**: System provides `scripts/agents/lib/umami_client.py` mirroring the retry/timeout/auth patterns of `strapi_client.py` with a cached session token (≤58-minute TTL)
- [ ] **ANLY-03**: Daily Telegram dashboard surfaces top 5 and bottom 5 content items by 7d traffic per locale, so Matteo can act on signal without dashboard-diving
- [ ] **ANLY-04**: Existing Claude strategist agent consumes the traffic_score field to prioritize refresh/expansion candidates in the content queue
- [ ] **ANLY-05**: System rejects low-confidence signals (fewer than 50 visits in the window or <7 days of data) to prevent noise-driven decisions

### A/B Headline Testing

<!-- Middleware-based variant assignment (no CLS, no cloaking). BlogPost first; reviews/recipes/newsletter graduate once infra validates. -->

- [ ] **AB-01**: Author can define 2 or 3 headline variants on any BlogPost via Strapi, stored as a separate `ab-experiment` content type linked to the post
- [ ] **AB-02**: Astro middleware assigns each visitor a sticky variant via a `ab_id` cookie (30-day TTL, hash-based deterministic assignment via `nanoid`) without client-side content swap
- [ ] **AB-03**: System tracks variant impressions and clicks via Umami custom events, attributing clicks from listing/card/social surfaces to the variant shown, while the article's detail `<h1>` and URL slug remain stable (SEO-safe)
- [ ] **AB-04**: Weekly Python agent computes variant performance with a two-proportion z-test, enforces minimum thresholds (≥500 impressions per variant, ≥7 days, one active test per post), and posts a winner recommendation to Telegram for Matteo to confirm manually
- [ ] **AB-05**: System excludes bot and crawler user-agents from A/B allocation, returning the control variant, to avoid cloaking signals and protect Googlebot consistency
- [ ] **AB-06**: Webhook rebuild pipeline is whitelisted so edits to `ab-experiment` content do NOT trigger an Astro rebuild cascade
- [ ] **AB-07**: Newsletter subject-line A/B uses Brevo's native A/B feature driven by the same weekly agent, reporting results into the same Telegram digest

## v1.2+ Requirements (Deferred)

Deferred to a future milestone. Tracked but not in current roadmap.

### A/B Expansion

- **AB2-01**: Reviews headline A/B (requires per-category traffic pooling — needs bigger sample)
- **AB2-02**: Recipes headline A/B (same constraint)
- **AB2-03**: Multi-armed bandit (Thompson sampling) replacing fixed z-test winner selection

### Growth Engine v3

- **GRO-01**: Algorithmic recipe collection suggestions (after editorial curation is validated)
- **GRO-02**: Per-reader content recommendations using traffic_score + similarity

### Newsletter

- **NEWS2-01**: Preference center (frequency + topic) for subscribers
- **NEWS2-02**: Automated re-engagement flow for inactive subscribers

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-armed bandit for A/B | Fixed z-test is statistically sufficient at current traffic; bandit adds complexity without payoff at this scale |
| A/B test on review/recipe headlines in v1.1 | Low per-page traffic needs ~20 weeks for significance; pool in later milestone |
| Fullscreen exit-intent interstitial | Hurts Core Web Vitals, Google penalty risk on intrusive interstitials |
| Multi-field newsletter form (name, interests) | Each added field drops conversion 15–25%; collect later via preference center |
| Algorithmic recipe collection generation | Editorial curation IS the differentiator vs NYT/Bon Appetit; defer algorithmic to v1.2+ |
| Per-reader content personalization | Adds cookie/privacy surface area; defer until traffic justifies |
| URL parameter tool in Google Search Console | Google removed the tool in 2025; handled at code time via canonical + noindex |
| Server-side A/B via Cloudflare Worker | Middleware-at-origin is sufficient; edge worker adds complexity and moving parts |
| Price slider (vs buckets) | Buckets are clearer for decision-making and avoid empty-state frustration |
| Sub-collections / nested collections | Flat hierarchy sufficient under 50 recipes; revisit at scale |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 10 | Complete |
| DEBT-02 | Phase 10 | Complete |
| DEBT-03 | Phase 10 / Phase 10.1 | Partial — measurement+fixes shipped (9/15 ≥90); image-delivery deferred to 10.1 |
| NEWS-01 | Phase 12 | Pending |
| NEWS-02 | Phase 12 | Pending |
| NEWS-03 | Phase 12 | Pending |
| NEWS-04 | Phase 12 | Pending |
| NEWS-05 | Phase 11 | Pending |
| NEWS-06 | Phase 12 | Pending |
| NEWS-07 | Phase 12 | Pending |
| NEWS-08 | Phase 12 | Pending |
| FILT-01 | Phase 13 | Pending |
| FILT-02 | Phase 11 | Pending |
| FILT-03 | Phase 13 | Pending |
| FILT-04 | Phase 13 | Pending |
| FILT-05 | Phase 13 | Pending |
| FILT-06 | Phase 13 | Pending |
| FILT-07 | Phase 13 | Pending |
| FILT-08 | Phase 11 | Pending |
| COLL-01 | Phase 14 | Pending |
| COLL-02 | Phase 14 | Pending |
| COLL-03 | Phase 14 | Pending |
| COLL-04 | Phase 14 | Pending |
| COLL-05 | Phase 14 | Pending |
| COLL-06 | Phase 11 | Pending |
| ANLY-01 | Phase 15 | Pending |
| ANLY-02 | Phase 15 | Pending |
| ANLY-03 | Phase 15 | Pending |
| ANLY-04 | Phase 15 | Pending |
| ANLY-05 | Phase 15 | Pending |
| AB-01 | Phase 16 | Pending |
| AB-02 | Phase 16 | Pending |
| AB-03 | Phase 16 | Pending |
| AB-04 | Phase 16 | Pending |
| AB-05 | Phase 16 | Pending |
| AB-06 | Phase 16 | Pending |
| AB-07 | Phase 16 | Pending |

**Coverage:**
- v1.1 requirements: 37 total
- Mapped to phases: 37 (100%)
- Unmapped: 0

**Phase-to-requirement counts:**
- Phase 10 (Debt Closure): 3 (DEBT-01..03)
- Phase 11 (Strapi Schema Migration): 4 (FILT-02, FILT-08, NEWS-05, COLL-06)
- Phase 12 (Newsletter On-Site Signup): 7 (NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-06, NEWS-07, NEWS-08)
- Phase 13 (Review Filters): 6 (FILT-01, FILT-03, FILT-04, FILT-05, FILT-06, FILT-07)
- Phase 14 (Recipe Collections): 5 (COLL-01..05)
- Phase 15 (Analytics Feedback Loop): 5 (ANLY-01..05)
- Phase 16 (A/B Headline Testing): 7 (AB-01..07)

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 after roadmap creation (traceability populated)*
