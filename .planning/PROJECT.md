# BBQ Experience

## What This Is

A live, production editorial portal for the BBQ Experience brand (74k Instagram followers) at [bbq-experience.com](https://bbq-experience.com), serving as the authoritative online hub for BBQ product reviews, recipes, tutorials, and news in EN/IT/ES. v1.0 shipped 2026-04-15 with an AI-assisted content pipeline (Growth Engine AI, 9 agents) that extends brand reach autonomously. The site is the deep, structured counterpart to the Instagram community — what IG can't deliver.

## Core Value

When someone searches for a BBQ product review, BBQ Experience must be the most complete, visually striking, and trustworthy result they find — the undisputed reference point for the BBQ community.

**Post-v1.0 check:** still valid. Production data confirms the editorial angle (25 reviews with Pitmaster scoring, 23 recipes with structured data, 88 blog posts) is the core differentiator against generic food/BBQ sites.

## Current State

**Shipped:** v1.0 on 2026-04-15
**Scale:** 454+ content items across EN/IT/ES, 32 IG posts synced via Graph API
**Tech:** Astro 6 + Svelte 5 islands · Strapi 5.41 + PostgreSQL 16 · Tailwind 4 · GSAP · Docker + Caddy on Hetzner · Cloudflare Image Transformations (Phase 10.1)
**Code volume:** ~253 commits between 2026-04-01 and 2026-04-14
**Infrastructure:** Containers all healthy (web, strapi, postgres, caddy). Sitemap regenerating daily. Deploy via adnanh/webhook on push to main. Zone `bbq-experience.com` orange-cloud on Cloudflare with Image Transformations + Sources allowlist (cms.bbq-experience.com, bbq-experience.com).
**v1.1 progress:** Phases 10, 10.1, 11, 12 complete — DEBT-03 CLOSED, Strapi v1.1 schema migrated, Newsletter On-Site Signup shipped (4 surfaces: inline, exit-intent, sticky footer, landing pages + Brevo DOI + honeypot + rate-limit). Next: Phase 13 (Review Filters & Taxonomy).

## Current Milestone: v1.1 Content Depth & Growth Loop

**Goal:** Close v1.0 documentation/measurement debt, expand reader-facing content features (newsletter capture, review filters, recipe collections), and upgrade Growth Engine with a measurable analytics → A/B feedback loop.

**Target features:**
- Debt closure (sequenced first): retroactive VERIFICATION.md for phases 03–09, REQUIREMENTS.md traceability reconciliation, Lighthouse 90+ re-measurement
- Newsletter on-site signup across 4 surfaces (inline, exit-intent, dedicated page, sticky footer) with Brevo integration
- Review filters & taxonomy (brand, category, price range, score threshold) with Product category schema extension
- Recipe collections (new Strapi content type, curated groupings, 3-locale pages)
- Growth Engine v2: Umami analytics loop feeding agents + A/B headline testing infrastructure (blog + reviews + recipes + newsletter)

**Sequencing:** Debt phases complete before feature phases. No parallel debt/feature work.

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

### Active (v1.1)

**Debt closure (sequenced first):**
- [x] Retroactive VERIFICATION.md for phases 03–09 (7 phases, tech debt from v1.0 audit) — Validated in Phase 10
- [x] REQUIREMENTS.md traceability reconciliation (REC-04,05,06,07 + CNT-02,03,07,08,10 marked Pending despite live production evidence) — Validated in Phase 10
- [x] Lighthouse 90+ formal re-measurement post-v3.2 (DES-04 not re-measured after UI/SEO changes) + fixes if below target — Validated in Phase 10 + **Phase 10.1** (image-delivery via Cloudflare Transformations): 15/15 pages ≥0.90 Perf (median 0.97), DEBT-03 CLOSED

**Content features:**
- [x] Newsletter on-site signup — inline end-of-article + exit-intent modal + `/newsletter` landing page + sticky footer bar (Brevo DOI + honeypot + rate-limit + surface attribution) — Validated in Phase 12
- [ ] Review filters & taxonomy — brand + product category + price range + score threshold (extends Product content type with category taxonomy)
- [ ] Recipe collections — curated groupings (new Strapi content type + collection listing/detail pages, 3 locales)

**Growth Engine v2:**
- [ ] Analytics feedback loop — Umami traffic data piped into agents to inform content decisions
- [ ] A/B headline testing infrastructure — click-tracking + variant selection across blog posts, reviews, recipes, and newsletter subject lines

### Out of Scope

- E-commerce / direct product sales — still valid, brand building priority
- User-generated content / forum — community lives on Instagram (74k)
- User accounts / login — no change; single author, readers consume
- Monetization (ads) — affiliate links already wired via Growth Engine; broader monetization deferred
- Mobile app — web-first responsive covers mobile; no app demand signal
- AI chatbot on-site — Growth Engine handles backend AI; on-site chatbot adds no editorial value

## Context

- **Single author** (Matteo) still the content model, now amplified by Growth Engine AI for drafts/translations/SEO linking
- **Instagram remains primary funnel** — bidirectional sync operational, first-comment deep links auto-posted
- **Budget:** ~$100/yr infrastructure (Hetzner CX21 shared with other projects) — well under €30k allocation
- **Timeline:** launched 2026-04-15, ~3 months before July 2026 target
- **Known tech debt:** 7 phases without VERIFICATION.md, DES-04 not re-measured post-v3.2, 9 requirements marked Pending in traceability despite live implementation
- **Monitoring:** UptimeRobot (site + CMS), Umami analytics, Sentry error tracking, Telegram daily dashboard

## Constraints

- **Tech stack:** Custom/headless — no WordPress ✓ respected
- **Lighthouse:** 90+ target — needs fresh measurement post-v3.2
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
| Milestone v1.0 accepted with documentation tech debt | Production-proven, re-verifying retro is low ROI | ⚠️ Revisit in v1.1 cleanup phase |

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
*Last updated: 2026-04-16 after Phase 10.1 completion (DEBT-03 CLOSED, image-delivery via Cloudflare Transformations)*
