# BBQ Experience

## What This Is

A live, production editorial portal for the BBQ Experience brand (74k Instagram followers) at [bbq-experience.com](https://bbq-experience.com), serving as the authoritative online hub for BBQ product reviews, recipes, tutorials, and news in EN/IT/ES. v1.1 shipped 2026-04-23 with reader-facing content features (newsletter, review filters, recipe collections) and a measurable Growth Engine v2 (analytics feedback loop + A/B headline testing). The site is the deep, structured counterpart to the Instagram community — what IG can't deliver.

## Core Value

When someone searches for a BBQ product review, BBQ Experience must be the most complete, visually striking, and trustworthy result they find — the undisputed reference point for the BBQ community.

**Post-v1.0 check:** still valid. Production data confirms the editorial angle (25 reviews with Pitmaster scoring, 23 recipes with structured data, 88 blog posts) is the core differentiator against generic food/BBQ sites.

## Current State

**Shipped:** v1.2 on 2026-05-26 (v1.1 same day, v1.0 on 2026-04-15) — 12 phases total across 3 milestones
**Scale:** 454+ content items across EN/IT/ES, 32 IG posts synced via Graph API
**Tech:** Astro 6 + Svelte 5 islands · Strapi 5.41 + PostgreSQL 16 · Tailwind 4 · GSAP · Docker + Caddy on Hetzner · Cloudflare Image Transformations · Umami analytics · GSC Search Console API + IndexNow + Web Search Indexing API best-effort (Phase 17/18)
**Code volume:** ~430+ commits (253 v1.0 + 167 v1.1 + 10 v1.2)
**Infrastructure:** Containers all healthy (web, strapi, postgres, caddy, umami). Sitemap regenerating daily. Deploy via adnanh/webhook on push to main. Webhook X-Skip-Rebuild rule attivo. 3 cron `.119` Phase 17+20 active (meta_optimizer daily 03:30 UTC, gsc_refresh Sun 08:00 UTC, phase17_outcome_tracker Mon 09:00 UTC). 2 Windows Task Scheduler (BBQ Meta Review daily 09:00, BBQ GSC Refresh Review Sun 10:00).
**v1.1+v1.2 delivered:** 12 phases. v1.1 (9 phases, 27 plans): debt closure, schema migration, newsletter, filters, collections, Growth Engine v2 analytics+A/B, GSC pipeline. v1.2 (3 phases, 3 plans autonomous): GSC polish FAQ-v2 + topical_relevance + Indexing API enable doc, tech debt closure (TS errors + Phase 10 VERIFICATION backfill), outcome measurement framework (phase17_outcome_tracker weekly cron + decision tree 4 trigger ranges).

## Completed Milestone: v1.2 Consolidation & Outcome Measurement (shipped 2026-05-26)

**Delivered:** Polish del Phase 17 GSC pipeline (FAQ parser-v2, topical_relevance gate), tech debt cleanup (TS errors + Phase 10 VERIFICATION + state cleanup), outcome measurement framework con phase17_outcome_tracker.py weekly + decision tree 4 trigger ranges. **Mode:** autonomous end-to-end in single session. See [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) for full details.

**Phase 17 outcome trajectory (measure +30 days, ~2026-06-25):** baseline 2026-05-25 = 35 clicks / 29k impressions / CTR 0.12% / pos 6.7. Target lift: 10–30× CTR su ~50 articoli live, +30–50% search-intent fit nuovi articoli. **T0 measurement live (2026-05-26 week 0):** lift_ctr_x 0.71 (pre-meta-operation), verdict `monitoring` — tracker funziona end-to-end, attende prima esecuzione meta_optimizer (domani 03:30 UTC) e gsc_refresh (dom 31/05 08:00 UTC).

## Next Milestone: TBD

Planning next milestone. Run `/gsd:new-milestone` to start.

## Requirements

### Validated (v1.0)

- ✓ Product reviews with scoring system (overall + 5 per-category), editorial deep-dive, tech specs — v1.0
- ✓ Recipe section with step-by-step guides, photos, difficulty, cook times — v1.0
- ✓ Tutorial/guide section — v1.0
- ✓ Blog/news section — v1.0
- ✓ Bidirectional Instagram integration (embeds + drive-to-site) — v1.0
- ✓ Multilingual EN/IT/ES with clean URL structure + hreflang — v1.0
- ✓ Bold/street BBQ design with GSAP micro-interactions — v1.0
- ✓ Headless CMS (Strapi) with custom Astro frontend — v1.0
- ✓ SEO optimization (sitemaps, JSON-LD Product/Review/Recipe/Article/Organization) — v1.0
- ✓ Responsive mobile-first design — v1.0
- ✓ Product comparison tool (side-by-side) — v1.0
- ✓ Media-rich pages with optimized images (WebP, lazy, srcset) — v1.0
- ✓ Dark/light theme toggle — v1.0
- ✓ Branded 404 page with search — v1.0

### Validated (post-v1.0, out-of-roadmap extensions)

- ✓ Growth Engine AI: 9 autonomous agents (content gen, translation, SEO linking, keyword scout, competitor monitor, partnership outreach, IG↔site bridge, strategist) — v2.x
- ✓ Security hardening: code review P0–P3, backup/restore with integrity verification, DB SSL correction, secret rotation — v3.1
- ✓ UI/SEO quality pass: hreflang per localized slug, CollectionPage JSON-LD, nested anchor cleanup, mobile menu Chrome fix, Umami admin password rotated — v3.2

### Validated (v1.1)

- ✓ Debt closure: retroactive VERIFICATION.md (phases 03–09), traceability reconciliation, Lighthouse 90+ (15/15 pages ≥0.90, median 0.97) — v1.1 Phases 10, 10.1
- ✓ Newsletter on-site signup: 4 surfaces (inline, exit-intent, landing page, sticky footer) with Brevo DOI, rate-limit, honeypot, surface attribution — v1.1 Phase 12
- ✓ Review filters & taxonomy: brand, product category, price range, score threshold with SEO guardrails (noindex/canonical) — v1.1 Phase 13
- ✓ Recipe collections: curated editorial groupings, 3-locale listing/detail pages, collection badge on recipes — v1.1 Phase 14
- ✓ Analytics feedback loop: Umami → traffic_score on content, Telegram top/bottom digest, strategist integration — v1.1 Phase 15
- ✓ A/B headline testing: middleware variant assignment, Umami event tracking, weekly z-test agent, Brevo subject-line A/B — v1.1 Phase 16

### Active

(No active requirements — next milestone not yet planned)

### Out of Scope

- E-commerce / direct product sales — still valid, brand building priority
- User-generated content / forum — community lives on Instagram (74k)
- User accounts / login — no change; single author, readers consume
- Monetization (ads) — affiliate links already wired via Growth Engine; broader monetization deferred
- Mobile app — web-first responsive covers mobile; no app demand signal
- AI chatbot on-site — Growth Engine handles backend AI; on-site chatbot adds no editorial value

## Context

- **Single author** (Matteo) still the content model, amplified by Growth Engine AI v2 (10 agents, analytics-driven prioritization)
- **Instagram remains primary funnel** — bidirectional sync operational, first-comment deep links auto-posted
- **Budget:** ~$100/yr infrastructure (Hetzner CX21 shared with other projects) — well under €30k allocation
- **Timeline:** launched 2026-04-15, v1.1 shipped 2026-04-23, ahead of July 2026 target
- **Known tech debt:** v1.0 documentation debt CLOSED in Phase 10. Minor: ROADMAP SC6 wording inconsistency (variant-impression reference), some summary one-liners missing
- **Monitoring:** UptimeRobot (site + CMS), Umami analytics (healthcheck added), Sentry error tracking, Telegram daily dashboard + weekly A/B digest

## Constraints

- **Tech stack:** Custom/headless — no WordPress ✓ respected
- **Lighthouse:** 90+ target — ✓ achieved (15/15 pages ��90, median 0.97)
- **Multilingual:** EN/IT/ES from day one — ✓ delivered with per-locale sitemaps + hreflang
- **Instagram API:** Graph API rate limits managed via 6h cron cadence
- **Solo author workflow:** Streamlined admin + AI augmentation — ✓ delivered

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom/headless (Astro + Strapi) over WordPress | Performance + design freedom | ✓ Good — Lighthouse targets achievable, design is distinctive |
| English as primary language | International BBQ reach | ✓ Good — content strategy proves EN-first works |
| No user accounts in v1 | Community on Instagram | ✓ Good — zero auth complexity, zero GDPR burden |
| No monetization in v1 | Brand authority first | ✓ Good — affiliate hooks added post-v1.0 via Growth Engine, not distracting |
| Bold/street design direction | Differentiate from generic food blogs | ✓ Good — design validated by live site |
| Astro 6 + Svelte 5 islands (hybrid) | Content-first, zero JS default | ✓ Good — performance + interactivity where needed |
| PostgreSQL over MySQL for Strapi | Strapi's recommended production DB | ✓ Good — no issues |
| i18n custom JSON files over Paraglide JS | Astro 5+ compat issues with Paraglide, simpler DX | ✓ Good — type-safe keys, no compat drama |
| Lenis smooth-scroll removed | Browser-native smoother on modern devices | ✓ Good — one less dep, no UX regression |
| Growth Engine AI added post-v1.0 (out-of-roadmap) | Single-author scale constraint | ✓ Good — content velocity 10x, EN→IT/ES auto |
| Claude Max (CLI) over Anthropic API for generation | Subscription cost control + quality | ✓ Good — 2000+ word articles vs 670 with Ollama 7b |
| Ollama 7b for translations only | Field-per-field pattern reliable, bulk cost zero | ✓ Good — separation of concerns |
| SQLite rate-limit over in-memory Map | Survive container restart | ✓ Good — hardened in v3.1 |
| Dual DB config (PG prod / SQLite dev) | Dev ergonomics | ✓ Good — no setup friction |
| Milestone v1.0 accepted with documentation tech debt | Production-proven, re-verifying retro is low ROI | ✓ Resolved — Phase 10 closed all debt |
| Cloudflare Image Transformations over self-hosted Sharp | CDN-side resizing, zero compute cost | ✓ Good — +8 pts Lighthouse Performance median |
| FNV-1a hash for A/B variant assignment | Deterministic, fast, no external dependency | ✓ Good — consistent assignment, 13 tests passing |
| Umami custom events for A/B tracking | No new Strapi content type for impressions | ✓ Good — simpler architecture, fewer webhook exclusions |
| docker image prune over docker system prune | Prevent accidental container removal | ✓ Good — fixed Umami data loss root cause |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after v1.2 milestone completion (autonomous-mode end-to-end: v1.1 archive → v1.2 plan+ship in single session)*
