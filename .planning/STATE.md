---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Content Depth & Growth Loop
status: executing
stopped_at: Completed 17-03-PLAN.md automated tasks (Task 5 dry-run + sample-review checkpoint pending Matteo verification before live Claude Opus content refresh)
last_updated: "2026-05-26T12:35:00Z"
last_activity: 2026-05-26
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 21
  completed_plans: 23
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15 after starting v1.1)

**Core value:** The most complete, visually striking, and trustworthy BBQ product review destination online.
**Current focus:** Phase 16 — a-b-headline-testing-infrastructure

## Current Position

Milestone: v1.1 Content Depth & Growth Loop (Phases 10–10.1, 11–17)
Phase: 17
Plan: 17-03 (automated tasks shipped; Task 5 dry-run + sample-review checkpoint awaiting Matteo verification)
Status: Executing Phase 17
Last activity: 2026-05-26 - Completed 17-03 automated tasks (7 commits, 45 new tests green / 129 full suite, gsc_refresh + gsc_refresh_review + strategist GSC digest)

Progress: v1.0 [██████████] 100% · v1.1 [█████░░░░░] ~50% (4/8 phases)

## Performance Metrics

**Velocity:**

- Total plans completed: 28 (v1.0 archive)
- Average duration: ~4 min/plan (v1.0)
- Total execution time: see milestones/v1.0-MILESTONE-AUDIT.md

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1–9 (v1.0) | 23 | shipped 2026-04-15 | ~4 min |
| 10–16 (v1.1) | TBD | — | — |
| 10 | 5 | - | - |

**Recent Trend:**

- Last 5 plans (v1.0 closeout): 06 P02 · 09 P02 · 09 P01 · …
- Trend: Stable (milestone complete, fresh start for v1.1)

*Updated after each plan completion*
| Phase 13 P02 | 7min | 2 tasks | 10 files |
| Phase 11 P03 | 5min | 3 tasks | 0 files |
| Phase 15 P01 | 3min | 2 tasks | 9 files |
| Phase 15 P02 | 3min | 1 tasks | 4 files |
| Phase 17 P01 | 9min | 4 tasks | 16 files |
| Phase 17 P02 | 16min | 4 tasks + 1 checkpoint | 20 files |
| Phase 17 P03 | 12min | 4 tasks + 1 checkpoint | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work (v1.1):

- [Roadmap v1.1]: Debt closure (Phase 10) is a hard prerequisite for any feature phase — no parallelization.
- [Roadmap v1.1]: Single unified Strapi schema migration in Phase 11 (product-category, subscriber.source, recipe-collection scaffold, shared locale helper) to avoid four separate CMS rebuild windows.
- [Roadmap v1.1]: Newsletter double opt-in from day one (Phase 12) — GDPR non-negotiable for IT audience.
- [Roadmap v1.1]: Filter phase (13) ships canonical + noindex SEO guardrails in the same PR as the feature — not as a follow-up.
- [Roadmap v1.1]: Analytics loop (Phase 15) precedes A/B (Phase 16) so umami_client.py is production-validated before ab_tester.py depends on it, and so A/B experiments can be sized against a real traffic baseline.
- [Roadmap v1.1]: A/B variant edits excluded from the adnanh/webhook rebuild cascade (Phase 16) to prevent 4-minute rebuilds on every editor iteration.
- [Phase 13]: Pre-build filter URLs server-side in Astro, pass to Svelte island as props to avoid URL logic duplication
- [Phase 13]: Toggle behavior on filter pills (clicking active filter deselects it) for intuitive UX
- [Phase 15]: Umami API type=url for metrics endpoint; token TTL 58min; is_high_confidence >= thresholds (50 visits, 7 days)
- [Phase 15]: Traffic digest grouped by locale with Top/Bottom 5; strategist prompt includes decline detection heuristic
- [Phase 17 P01]: WIRE_SITE for post-publish indexing = claude_review_runner.py:129 (strapi.publish in apply_review). content_generator only creates DRAFTS; gate decides promotion.
- [Phase 17 P01]: GSC client mirrors strapi_client retry [1,2,4]s + 4xx no-retry (except 429); request_indexing is best-effort soft-fail (never blocks publish).
- [Phase 17 P01]: Shared CTR_BENCHMARK in lib/ctr_benchmark.py (single source of truth) — meta_optimizer + keyword_scout + claude_strategist import via `from agents.lib.ctr_benchmark`. No try/except ImportError fallbacks; no inline duplicates.
- [Phase 17 P01]: INDEXNOW_KEY=133e22d3c55db2ef97c9de8733025635 generated; key file at web/public/<key>.txt is SOLE OWNER (Plan 17-04 only verifies existence).
- [Phase 17 P01]: EN-only indexing for v1 — IT/ES promotion via translation_agent on .119 deferred to Phase 17 v2 (1-3day natural sitemap lag acceptable at 35 click/week baseline).
- [Phase 17 P02]: meta_optimizer cron on .119 (NOT Hetzner) — Plan 17-01 smoke test discovered agents Python run on .119, Hetzner only Strapi+Astro. crontab.txt + cron_registry.md document the convention.
- [Phase 17 P02]: X-Skip-Rebuild HTTP header pattern locked over Strapi lifecycle hooks. Header-match in adnanh/webhook is debuggable + reversible (Phase 16 ab-experiment exclusion precedent reused).
- [Phase 17 P02]: Claude sonnet for review_meta (m2 lock) — opus reserved for full article semantic review. Length/keyword/claim check on metas sufficient with sonnet at ~1/5 cost.
- [Phase 17 P02]: Direct slug-match dedup between Suggest and GSC striking; semantic similarity (bge-m3 cosine) deferred to v2.
- [Phase 17 P03]: gsc_refresh weekly loop deployed on Ubuntu .119 (Sun 08:00 UTC) -> Windows Task Scheduler gsc_refresh_review (Sun 10:00 local). JSONL queue bridges the two hosts (atomic_io.append_jsonl_atomic).
- [Phase 17 P03]: skip_rebuild=False (default) on gsc_refresh_review Strapi update — refresh IS full content change, rebuild fires per design (contrast with meta_optimizer skip_rebuild=True for meta-only).
- [Phase 17 P03]: Cover image refresh OUT OF SCOPE (m4 lock); deferred to Phase 18 candidate (SDXL cover regen if CTR doesn't improve 14d post-rewrite).
- [Phase 17 P03]: M7 cluster reverse-lookup — blog-post Strapi schema has NO 'cluster' field; gsc_refresh_review._cluster_for_keyword scans keyword_scout.CLUSTERS at runtime, fallback 'uncategorized'.
- [Phase 17 P03]: M8 conditional metrics_block — branches stored as LIST in queue record; _build_prompt only injects 'Decay' line if 'decay' in branches, only 'CTR opportunity' line if 'ctr_opportunity' in branches.
- [Phase 17 P03]: claude_strategist.get_gsc_digest 4-section dict (summary_delta + striking_top10 + ctr_opportunity_top10 + declining_top10) — graceful degrade on GSC API errors.
- [Phase 17 P03]: lib/claude_client.generate_strategy gsc_digest as keyword-only kwarg with default None — backward-compat with pre-Phase-17 callers; prompt injects GSC WEEKLY DIGEST block + REQUIREMENT for >=3 GSC-anchored recs.

### Roadmap Evolution

- 2026-04-16: Phase 10.1 inserted after Phase 10 (URGENT) — image-delivery via Cloudflare Resizing, closes residual DEBT-03 gap (6/15 baseline pages still sub-90 after Plan 10-05 LCP/CSS/JS fixes; root cause = Strapi serves originals, savings ~624 KB/page).
- 2026-04-16: Phase 10.1 closed — Cloudflare Image Transformations + responsive srcset shipped via web/src/lib/media.ts rewrite + 12 template wiring. 15/15 pages ≥90 Lighthouse (median Perf 0.97, +8 pts over baseline). DEBT-03 CLOSED.

Key v1.0 decisions still in force:

- i18n custom JSON (NOT Paraglide) · SQLite rate-limit for all endpoints · PostgreSQL for Strapi production · dark theme default · Svelte 5 runes for islands · Strapi v5 locale PUT with ?locale=xx and slug in body.

### Pending Todos

None yet. Todos captured during execution land in `.planning/todos/pending/`.

### Blockers/Concerns

- **Phase 12 non-code prerequisite:** Matteo must create IT and ES Brevo DOI templates + welcome automations in the Brevo dashboard before Phase 12 ships.
- **Phase 13 research flag:** Run `/gsd:research-phase` before planning — canonical vs noindex vs robots.txt strategy for small-corpus editorial facets.
- **Phase 16 research flag:** Run `/gsd:research-phase` before planning — adnanh/webhook content-type exclusion syntax in `hooks.json` + Astro middleware cookie behavior behind Cloudflare CDN.
- **Phase 16 baseline:** Needs a 1-week traffic measurement after Phase 15 goes live before committing to AB_MIN_IMPRESSIONS thresholds.
- **Carried v1.0 debt (addressed by Phase 10):** 7 phases missing VERIFICATION.md (03–09), REQUIREMENTS.md traceability drift (9 entries Pending despite live implementation), DES-04 Lighthouse not re-measured after v3.2 UI/SEO changes.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260522-goj | Dedup topic ContentQueue — guard slug duplicati (evita 400 slug must be unique al gate) | 2026-05-22 | 3a71930 | [260522-goj-dedup-topic-contentqueue-guard-slug-dupl](./quick/260522-goj-dedup-topic-contentqueue-guard-slug-dupl/) |

## Session Continuity

Last session: 2026-05-26T12:35:00Z
Stopped at: Completed 17-03-PLAN.md automated tasks (Task 5 dry-run + sample-review checkpoint pending Matteo verification before live Claude Opus content refresh)
Resume file: .planning/milestones/v1.1-phases/17-gsc-driven-content-pipeline/17-03-SUMMARY.md (see "Task 5 Checkpoint — Awaiting Matteo" section for install + dry-run commands)
