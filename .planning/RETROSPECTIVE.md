# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — BBQ Experience Launch

**Shipped:** 2026-04-15
**Phases:** 9 | **Plans:** 23 | **Tasks:** 47 | **Commits:** 253 (2026-04-01 → 2026-04-14)

### What Was Built

- Full editorial portal live at `bbq-experience.com` in EN/IT/ES: 25 reviews (Pitmaster scoring 5.8–8.8), 23 recipes (Cook Mode, serving adjust, print), 88 blog posts, 8 tutorials, 25 products, 10 brands
- Strapi 5.41 CMS on Hetzner with PostgreSQL 16, dual-webhook pipeline (GitHub push → deploy, Strapi publish → rebuild), Caddy reverse proxy with auto-HTTPS
- Astro 6 SSR frontend with Svelte 5 islands, Tailwind 4, GSAP scroll animations, Pagefind search — Lighthouse-oriented static-first architecture
- 3-locale i18n with per-locale URLs, hreflang per localized slug, custom JSON translation system (not Paraglide)
- Instagram Graph API sync (6h cadence, 32 posts live), lite-embed YouTube/IG components, social share bar
- Product comparison tool, animated FlameGauge scoring, light/dark theme toggle with FOUC prevention
- Full SEO stack: per-locale sitemaps, JSON-LD (Product/Review/Recipe/Article/Breadcrumb/CollectionPage/Organization), OG/Twitter cards, branded 404

### What Worked

- **Milestone v1.0 shipped 3 months ahead of target** (July 2026 deadline)
- **Phase-based GSD workflow with parallel plan execution**: phases 4/5/6 ran in parallel once 2+3 were done, compressing timeline
- **Astro islands with Svelte 5 runes**: minimal JS default, surgical interactivity where needed (CookMode, comparison, serving adjuster)
- **Custom i18n JSON over Paraglide**: simpler DX, type-safe keys via `src/i18n/types.ts`, avoided Astro 5+ compat drama
- **Growth Engine AI (post-v1.0 addition)**: 10x content velocity with Claude Max CLI for generation + Ollama 7b for translations — zero API cost on Anthropic side

### What Was Inefficient

- **7 of 9 phases never got VERIFICATION.md** — formal verification skipped once execution momentum took over; audit artifacts now lag reality
- **REQUIREMENTS.md traceability drift**: 9 requirements marked Pending (REC-04,05,06,07 + CNT-02,03,07,08,10) despite live production evidence of implementation
- **Phase 01 initial verification flagged 3 gaps** (Strapi webhook, IT/ES locales, HMAC empty) — all resolved in production but never re-verified formally
- **Lighthouse DES-04 target** measured in Phase 9 but never re-measured after v3.1/v3.2 changes; PSI API quota exhausted when attempted today
- **SEO optimizer nested-anchor bug**: created `<a><a>` corruption on 150+ records over multiple runs — required v3.2 cleanup pass
- **Markdown rendering inconsistency**: content from CMS wasn't going through `renderMarkdown()` everywhere, caused soft-hyphen + nested-link artifacts

### Patterns Established

- **Dual DB config** (PostgreSQL prod / better-sqlite3 dev) for zero-friction local development
- **i18n JSON files with `loadTranslations(locale)`** + dot-notation access + type-safe keys — project convention
- **Svelte 5 runes in islands** (`$state`, `$derived`, `$effect`) for all reactive UI in Astro
- **Strapi v5 localization pattern**: `PUT ?locale=xx` with slug always in body (null-slug bug prevention)
- **`data-animate` attribute pattern** for GSAP scroll-triggered reveals — but ONLY in hero/structural sections, never content (invisibility bug)
- **Environment variables must be both ARG in Dockerfile AND -e at docker run** — Astro SSR resolves `import.meta.env` at build time
- **Mobile menu/overlay panels live at BaseLayout body-level**, never inside backdrop-filtered parents (Chrome containing-block bug)
- **All external fetches use `AbortSignal.timeout(10_000)`** — no hanging requests
- **Backup scripts use `set -eo pipefail`, separate dump from gzip, verify with `gunzip -t`** — no silent failures
- **Markdown rendering always through `renderMarkdown()`** (handles nested `<a>`, markdown-wrapping-HTML, soft hyphens)

### Key Lessons

1. **Verify formally as you go, not retro.** Skipping VERIFICATION.md during execution left 7 phases without audit trail. Cheap at the time, expensive at milestone close. Always run `/gsd:verify-work` before moving to next phase.
2. **Audit docs drift faster than code.** REQUIREMENTS.md traceability table became stale during execution because no one closed the checkbox loop. Next milestone should enforce traceability updates in phase summary gates.
3. **Production is source of truth when docs disagree.** 454 live content items + 32 IG posts + healthy containers prove integration works; chasing VERIFICATION.md for all 9 phases retro is low ROI. But: document the drift explicitly (done via v1.0-MILESTONE-AUDIT.md).
4. **SSH + curl audits catch what browser QA misses.** Default Umami password was exposed for days. Add credential rotation checklist to milestone close.
5. **AI agent separation of concerns pays off.** Claude Max for quality generation, Ollama 7b for field-by-field translation. Don't cross-use — qwen2.5:7b can't sustain 2000-word articles.
6. **Never pipe `pg_dump | gzip` directly.** Shell exit-code propagation lies; corrupted backup looks clean. Separate, verify integrity, rollback-ready.

### Cost Observations

- Model mix: Predominantly Claude (Opus + Sonnet) for planning + execution, Ollama 7b for translations (zero API cost), Claude Max CLI subscription for autonomous content generation
- Infrastructure: ~$100/yr (Hetzner CX21 shared with other Matteo projects, Cloudflare free, domain ~$15/yr)
- Budget used: Well under €30k allocation — most spend was time, not API/infra
- Notable: Growth Engine AI (post-v1.0) generates 2000+ word articles at Claude Max subscription cost, not per-token — strategic cost lever

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Sessions | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 9 | 23 | 14 days active | Initial GSD adoption; parallel plan execution for independent phases (4/5/6); milestone closed with known doc tech debt |

### Cumulative Quality

| Milestone | Tests | Lighthouse | Zero-Dep Additions |
|-----------|-------|------------|-------------------|
| v1.0 | Spot-check visual + CLI only | Target 90+ (measured at Phase 9, needs re-measurement post-v3.2) | Lite-embed YouTube/IG (no iframe lib), custom i18n (no Paraglide), Pagefind static search (no Algolia) |

### Top Lessons (Verified Across Milestones)

1. *(Accumulates as more milestones ship)*
