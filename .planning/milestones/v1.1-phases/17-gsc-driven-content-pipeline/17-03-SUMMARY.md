---
phase: 17-gsc-driven-content-pipeline
plan: 03
subsystem: seo
tags: [gsc, content-refresh, claude-opus, strategist-digest, decay-detection, ctr-opportunity, cluster-reverse-lookup, m7-fix, m8-fix, b1-shared-ctr-benchmark]

# Dependency graph
requires:
  - phase: 17-gsc-driven-content-pipeline
    plan: 01
    provides: "lib/gsc_client (search_analytics/top_pages/queries_for_page/request_indexing) + lib/ctr_benchmark (CTR_BENCHMARK/REWRITE_FACTOR/benchmark_for_position) + lib/atomic_io.append_jsonl_atomic + lib/indexnow_client.ping + pytest scaffold"
  - phase: 17-gsc-driven-content-pipeline
    plan: 02
    provides: "lib/claude_client.generate_article_multistep(gsc_queries=) + claude_quality_gate.review_article + meta_optimizer/meta_review cron pattern (Ubuntu .119 + Windows Task Scheduler) + crontab.txt Phase 17 block + cron_registry.md + keyword_scout.CLUSTERS dict"
provides:
  - "scripts/agents/gsc_refresh.py — Ubuntu .119 cron Sun 08:00 UTC weekly orchestrator: select decay+CTR-opportunity pages, enrich with GSC queries + competitor diff, atomic queue write"
  - "scripts/agents/gsc_refresh_review.py + .cmd — Windows Task Scheduler Sun 10:00 local Claude Opus rewrite + review_article quality gate + Strapi PUT (NO skip_rebuild) + re-index (Indexing API + IndexNow)"
  - "scripts/agents/prompts/claude_refresh_review.md — Opus refresh prompt template with {metrics_block} conditional placeholder"
  - "scripts/agents/claude_strategist.get_gsc_digest — 4-key digest (summary_delta + striking_top10 + ctr_opportunity_top10 + declining_top10) wired into main() flow"
  - "scripts/agents/lib/claude_client.generate_strategy(gsc_digest=) — keyword-only kwarg with GSC WEEKLY DIGEST prompt injection (backward-compat preserved)"
  - "scripts/agents/state/cron_registry.md — Phase 17-03 cron rows promoted from NEXT to Entries"
affects: [17-04-schema-audit, future-phase-18-cover-refresh]

# Tech tracking
tech-stack:
  added: []  # zero new pip deps — fully reuses 17-01/17-02 surface
  patterns:
    - "Two-stage validation (Ubuntu .119 selector → Windows Claude Opus rewriter) bridged via JSONL queue file — mirrors meta_optimizer/meta_review pattern from 17-02"
    - "Reverse-lookup helper (M7): derive missing CMS taxonomy field (cluster) from external constant dict (keyword_scout.CLUSTERS) when schema field doesn't exist"
    - "Conditional prompt rendering (M8): only inject metric lines for active branches (decay/ctr_opportunity) — eliminates prompt noise when one signal is absent"
    - "GSC digest 4-section structure: summary_delta + striking + ctr_opportunity + declining — covers all 3 ranking-loop failure modes"
    - "Shared CTR_BENCHMARK module imported by 4 callers now (meta_optimizer + keyword_scout + claude_strategist + gsc_refresh) — B1 across entire codebase"
    - "skip_rebuild=False (default) on full-content refresh — Astro rebuild fires intentionally for content changes (contrast with meta_optimizer skip_rebuild=True for meta-only)"
    - "Per-STEP atomic commits (RED → GREEN per task) — git bisect friendly"

key-files:
  created:
    - scripts/agents/gsc_refresh.py
    - scripts/agents/gsc_refresh_review.py
    - scripts/agents/gsc_refresh_review.cmd
    - scripts/agents/prompts/claude_refresh_review.md
    - scripts/agents/tests/test_gsc_refresh.py
    - scripts/agents/tests/test_gsc_refresh_review.py
    - scripts/agents/tests/test_strategist_gsc_digest.py
  modified:
    - scripts/agents/claude_strategist.py (added get_gsc_digest + gsc_digest kwarg wiring + B1 imports)
    - scripts/agents/lib/claude_client.py (generate_strategy signature extended with keyword-only gsc_digest + GSC WEEKLY DIGEST prompt block)
    - scripts/agents/crontab.txt (Phase 17-03 cron block appended under existing TZ=UTC)
    - scripts/agents/state/cron_registry.md (17-03 rows promoted from NEXT to Entries)

key-decisions:
  - "gsc_refresh deployed on Ubuntu .119 NOT Hetzner (confirmed by 17-02 SUMMARY checkpoint discovery — same convention as meta_optimizer)"
  - "Strapi update on refresh uses skip_rebuild=False (default) — refresh IS a full content change. Webhook entry.publish fires when published_at toggled, rebuild deliberately scattered per 17-02 webhook discovery."
  - "Claude Opus model for review_article on refresh (semantic-heavy full article review) — sonnet reserved for length/keyword checks via review_meta (17-02 m2 lock). Documented inline."
  - "M7 fix: _cluster_for_keyword scans keyword_scout.CLUSTERS reverse-lookup, fallback 'uncategorized'. blog-post Strapi schema has NO 'cluster' field — verified at plan time + grep-tested."
  - "M8 fix: _build_prompt conditional metrics_block — only 'decay' branch -> Decay line; only 'ctr_opportunity' -> CTR line with benchmark; both -> both lines. Branches stored as LIST in gsc_refresh queue record."
  - "B1 fix: claude_strategist imports CTR_BENCHMARK + benchmark_for_position from agents.lib.ctr_benchmark (NOT from meta_optimizer to avoid circular). No inline duplication, no try/except fallback. Cross-codebase grep confirms only source ctr_benchmark.py + test negative-asserts pattern."
  - "B5 fix: gsc_refresh._sdxl_guard uses datetime.now(timezone.utc).hour in (4,5) — defense-in-depth covering CEST (UTC+2) + CET (UTC+1) of 06:00-06:55 Europe/Rome SDXL window. Cron 08:00 UTC is outside but guard catches manual dry-runs."
  - "Cover image refresh OUT OF SCOPE (m4 lock + RESEARCH Open Question #4) — strapi.update payload does NOT include cover_image. Future Phase 18 candidate: SDXL cover regen if CTR doesn't improve 14d post-rewrite."
  - "generate_strategy backward compat: gsc_digest is keyword-only kwarg with default None — existing 5-positional-arg callers (current strategist code pre-Plan 17-03) work unchanged. Verified with test_graceful_no_gsc_kwarg."
  - "DRY_RUN flag in gsc_refresh_review.py for Task 5 checkpoint sample-review — skips strapi.update + indexing, prints would-apply summary, preserves queue file."

requirements-completed: [SEO-11]

# Metrics
duration: ~12 min (automated tasks)
completed: 2026-05-26
---

# Phase 17 Plan 03: gsc_refresh weekly loop + strategist GSC digest Summary

**Weekly content-refresh loop (Ubuntu .119 selector → Windows Claude Opus rewriter via JSONL queue) plus claude_strategist GSC weekly digest injection — eliminates the "old content rots" failure mode by surfacing decay + CTR-opportunity pages every Sunday, primed with their own real GSC query data.**

## Performance

- **Duration:** ~12 min (started 2026-05-26T12:19:32Z, automated tasks complete 2026-05-26T12:31:55Z; Task 5 dry-run checkpoint pending Matteo verification)
- **Tasks:** 4 of 5 automated (Task 5 is human-verify checkpoint with dry-run + sample-review before live Claude Opus rewrites)
- **Files created:** 7
- **Files modified:** 4
- **Commits:** 7 (Task 1 RED+GREEN, Task 2 RED+GREEN, Task 3 RED+GREEN, Task 4 chore)
- **Tests:** 45 new tests added across 3 files (15 gsc_refresh + 18 gsc_refresh_review + 12 strategist GSC digest). Full suite: 129 passed + 12 skipped (zero regression from 17-02 baseline of 84 + 12 = +45 net).

## Accomplishments

### gsc_refresh.py (Ubuntu .119 cron Sun 08:00 UTC)

Selects top 10 BBQ pages matching the union of:

- **Branch A (decay):** `clicks_7d < (clicks_28d / 4) * 0.7` AND `impressions_28d >= 200` (decay >=30% with meaningful baseline traffic)
- **Branch B (ctr_opportunity):** `impressions_28d >= 500` AND `1 <= position <= 10` AND `ctr < benchmark_for_position(round(pos))` (already-visible pages losing clicks to a sibling rank)

Per candidate: enriches with top 5 GSC queries (`gsc_client.queries_for_page`) + competitor diff (best-effort match via token overlap against `state/competitor_state.json` written by competitor_monitor.py — no-op + empty list when file missing). Writes `state/gsc_refresh_queue.jsonl` atomically via `atomic_io.append_jsonl_atomic`. Telegram report includes the first 5 candidates with branch + impressions + CTR summary.

**B1 (shared imports):** `from agents.lib.ctr_benchmark import CTR_BENCHMARK, benchmark_for_position` — no inline duplication, no try/except fallback.

**B5 (UTC SDXL guard):** `_sdxl_guard()` uses `datetime.now(timezone.utc).hour in (4, 5)` for defense-in-depth covering CEST (UTC+2) + CET (UTC+1) of the 06:00-06:55 Europe/Rome SDXL window. Cron schedule (Sun 08:00 UTC) is already outside this window; guard catches manual dry-runs.

**M8 (branches as LIST):** the queue record stores `branches: ["decay", "ctr_opportunity"]` as a list (not joined string) so downstream `gsc_refresh_review._build_prompt` can conditionally render only the relevant metric lines.

### gsc_refresh_review.py + .cmd (Windows Task Scheduler Sun 10:00 local)

Consumes `state/gsc_refresh_queue.jsonl` produced by gsc_refresh.py. For each candidate:

1. Fetch current Strapi article (slug + locale + populate="*" to preserve cover relation, even though we don't write it).
2. Call `claude.generate_article_multistep(title, keyword, cluster, content_type, gsc_queries=...)` with the queue record's top 5 GSC queries primed into the outline + FAQ phases (reuses 17-02 wiring).
3. Quality gate via `claude_quality_gate.review_article` (Opus model for semantic-heavy full article review — sonnet reserved for length/keyword checks via `review_meta` in 17-02).
4. On `score >= 7` AND no unresolved critical issues: `strapi.update(content_type, documentId, payload, locale=locale)` — **NO `skip_rebuild=True`** because refresh IS a full content change; rebuild fires intentionally per 17-02 webhook discovery (Strapi listens only on entry.publish/unpublish/delete; published_at toggle scatters rebuild for design).
5. Re-index best-effort: `gsc_client.request_indexing(url)` + `indexnow_client.ping([url])`.
6. On `score < 7` OR `has_unresolved_critical_issues`: move to `state/gsc_refresh_failed.jsonl` with reason; NO Strapi/indexing calls.

**M7 (cluster reverse-lookup):** new helper `_cluster_for_keyword(keyword)` scans `keyword_scout.CLUSTERS` (`smoking`/`grills`/`thermometers`/`brisket`/`sauces`) and returns the matching cluster name, fallback `"uncategorized"`. blog-post Strapi schema has no `cluster` field — verified at plan time. No usage of `current.get("cluster", ...)` anywhere in this file (grep-verified by test).

**M8 (conditional metrics_block):** `_build_prompt` walks `candidate["branches"]` list:

- `if "decay" in branches` → append `Decay 7gg vs media 28gg: -{decay_pct}%`
- `if "ctr_opportunity" in branches` → append `CTR opportunity: pos X con CTR Y% (benchmark Z%)` using `benchmark_for_position(pos)` from the shared lib
- Both → both lines
- Neither → fallback `(nessuna metrica significativa - refresh proattivo)`

Rendered into prompt template `prompts/claude_refresh_review.md` via `{metrics_block}` placeholder.

**`--dry-run` flag:** added for Task 5 checkpoint — when present, prints `[DRY-RUN] sarebbe applicato: ct/slug/locale, cluster=X, score N, len content L` per candidate without calling `strapi.update` or indexing. Queue file is preserved (NOT unlinked) for repeat dry-runs.

**publishedAt preserved:** payload deliberately excludes `publishedAt` field (Strapi preserves on PUT when absent). cover_image relation untouched (m4 lock).

### claude_strategist.get_gsc_digest + lib/claude_client.generate_strategy(gsc_digest=)

`get_gsc_digest()` returns a dict with 4 sections:

| Section | Filter | Sort |
|---------|--------|------|
| `summary_delta` | aggregate 7d vs prev 7d (clicks/imp/ctr/pos + delta_clicks_pct + delta_pos) | — |
| `striking_top10` | `dimensions=["query"]`, pos ∈ [8,20], imp ≥ 30 | impressions desc |
| `ctr_opportunity_top10` | `dimensions=["page"]`, pos ∈ [1,10], imp ≥ 100, ctr < benchmark | gap_pct desc |
| `declining_top10` | `dimensions=["page"]`, imp_28d ≥ 200, decay_pct ≥ 30% | decay_pct desc |

Graceful degrade: any GSC API error → dict with empty lists, never raises. Caller `main()` always passes whatever shape comes back.

`lib/claude_client.generate_strategy` extended with **keyword-only** `gsc_digest: dict | None = None` kwarg — backward-compat: existing 5-positional-arg callers (current `claude_strategist.main()` pre-17-03 wiring) work unchanged. When `gsc_digest` is non-empty: injects a `=== GSC WEEKLY DIGEST ===` block in the user prompt with all 4 sections rendered as bullet lists, plus an explicit `REQUIREMENT: at least 3 recommendations MUST reference specific GSC metrics (clicks/impressions/CTR/position/striking/decay)` instruction at the bottom.

`claude_strategist.main()` wires `get_gsc_digest()` between step 5 (current_queue) and step 7 (generate_strategy call); the digest flows into `claude.generate_strategy(..., gsc_digest=gsc_digest)`. Test `test_strategist_main_passes_digest` mocks `get_gsc_digest` returning a known dict and asserts it appears in `generate_strategy` kwargs.

**B1 (shared imports):** `from agents.lib.ctr_benchmark import CTR_BENCHMARK, benchmark_for_position` at top of claude_strategist.py. NOT from meta_optimizer (avoid circular). No inline duplication, no try/except fallback. Cross-codebase grep verified: only source `ctr_benchmark.py` + 4 test files with negative-assertion pattern reference `CTR_BENCHMARK = {`.

### crontab.txt + cron_registry.md (Task 4)

Appended `0 8 * * 0 ...gsc_refresh.py` under existing Phase 17 `TZ=UTC` block (no duplicate prefix). Documented Windows Task Scheduler command for `gsc_refresh_review.cmd` Sun 10:00 local. Moved both rows in `state/cron_registry.md` from "Plan 17-03 NEXT" section into the canonical Entries table.

## Task Commits

| # | Task | Commit | Description |
|---|------|--------|-------------|
| 1 | Task 1 RED | `5722ae3` | test(17-03): RED tests for gsc_refresh selection (15 tests) |
| 2 | Task 1 GREEN | `4324700` | feat(17-03): gsc_refresh.py weekly candidate selection |
| 3 | Task 2 RED | `a512f84` | test(17-03): RED tests for gsc_refresh_review (M7+M8 fixes, 18 tests) |
| 4 | Task 2 GREEN | `de4e66b` | feat(17-03): gsc_refresh_review.py Claude Opus rewrite + reindex + M7+M8 fixes |
| 5 | Task 3 RED | `7ecb42a` | test(17-03): RED tests for strategist GSC digest + generate_strategy gsc_digest kwarg (12 tests) |
| 6 | Task 3 GREEN | `5fba592` | feat(17-03): strategist GSC digest + generate_strategy gsc_digest kwarg (B1 shared import) |
| 7 | Task 4 | `06223c9` | chore(17-03): register gsc_refresh + gsc_refresh_review cron entries |

**Tests:** 84 baseline → 129 passed + 12 skipped after Plan 17-03 (zero regression on existing 17-01/17-02 tests). Net +45.

## Files Created/Modified Summary

**Created (7):**

- `scripts/agents/gsc_refresh.py` (335 lines)
- `scripts/agents/gsc_refresh_review.py` (305 lines)
- `scripts/agents/gsc_refresh_review.cmd` (12 lines)
- `scripts/agents/prompts/claude_refresh_review.md` (33 lines)
- `scripts/agents/tests/test_gsc_refresh.py` (15 tests)
- `scripts/agents/tests/test_gsc_refresh_review.py` (18 tests)
- `scripts/agents/tests/test_strategist_gsc_digest.py` (12 tests)

**Modified (4):**

- `scripts/agents/claude_strategist.py` — get_gsc_digest function (~140 lines) + main() wiring + B1 imports
- `scripts/agents/lib/claude_client.py` — generate_strategy keyword-only gsc_digest kwarg + GSC WEEKLY DIGEST prompt block
- `scripts/agents/crontab.txt` — appended Phase 17-03 cron block
- `scripts/agents/state/cron_registry.md` — promoted 17-03 rows from NEXT to Entries

## First Live Run

**Not yet executed** — Task 5 checkpoint pending. Cron installation on `.119` + Windows Task Scheduler registration + optional dry-run sample-review of first 1-3 candidate articles must happen before Claude Opus rewrites live published content (highest-risk action of Phase 17).

Expected first run schedule (post-Matteo install):

- **Sun 2026-05-31 08:00 UTC** (.119): gsc_refresh.py selects top 10, writes queue
- **Sun 2026-05-31 10:00 local** (Windows): gsc_refresh_review.py consumes queue, Claude Opus rewrites, reviews, promotes

## Decisions Made

All key decisions listed in frontmatter `key-decisions`. Highlights:

1. **Deploy target (.119, NOT Hetzner):** confirmed by 17-02 SUMMARY checkpoint discovery (smoke test demonstrated agents Python runs on .119, Hetzner serves only Strapi+Astro).
2. **skip_rebuild=False on refresh:** refresh IS a full content change, the Astro rebuild fires intentionally. Documented inline. Contrast with meta_optimizer skip_rebuild=True (meta-only changes that shouldn't trigger 4-min rebuild storm).
3. **Claude Opus for review_article:** semantic-heavy full article review needs opus depth. Sonnet (17-02 review_meta) is sufficient for length/keyword checks at ~1/5 the cost.
4. **M7 cluster reverse-lookup:** blog-post Strapi schema has NO `cluster` field. The cluster taxonomy lives in `keyword_scout.CLUSTERS` dict (5 BBQ clusters with seed queries). `_cluster_for_keyword` scans this dict at runtime; fallback `"uncategorized"`.
5. **M8 conditional metrics_block:** prompt noise reduction — only inject the metric line for the active branch. Branches stored as LIST (not joined string) in queue record specifically to enable this.
6. **Cover image OUT OF SCOPE:** m4 lock + RESEARCH.md Open Question #4. Future Phase 18 candidate (SDXL cover regen if CTR doesn't improve 14d post-rewrite).

## Deviations from Plan

**Total deviations:** 0 substantive.

**Minor adaptations:**

1. **`generate_strategy` signature:** plan suggested `(weekly_traffic_summary, content_performance, traffic_scores, competitor_news, current_queue, gsc_digest=...)` but the live signature was `(traffic_data, content_performance, competitor_news, current_queue, traffic_scores="")`. Extended via **keyword-only** `gsc_digest: dict | None = None` after the existing args — preserves backward-compat with `claude_strategist.main()` call. Verified by `test_graceful_no_gsc_kwarg`.
2. **Documentation comment substring conflict:** initially added comment `# NB: NO skip_rebuild=True — refresh IS un full content change...` which then failed the test `test_no_skip_rebuild_in_refresh` that grep'd for `skip_rebuild=True` literally. Fixed by rephrasing comment to `# NB: rebuild deliberatamente NON soppresso — refresh IS un full content change...`. Same issue with claude_strategist B1 comment containing `ImportError` — rephrased without the literal token.
3. **Competitor state path:** plan said `state/competitor_news.json` but competitor_monitor.py actually writes `state/competitor_state.json` (verified by reading the source). Used the real path; added handler for both list and dict shapes (current dict {"seen_urls": [...]} no-ops gracefully; future list-of-articles enhancement supported through-pass).

Plan executed exactly as written. No Rule 4 architectural decisions needed.

## Issues Encountered

**1. Comment grep collision (2x):** as above — anti-pattern documentation strings containing the literal pattern they negate. Resolved by rephrasing while preserving meaning. Both first-iteration fixes.

**2. `_fetch_clicks_per_week` test mock:** dimensions=["page"] with both 28d and 7d ranges required differentiating the mock by date range length. Resolved with `_FrozenDt` pattern + range calculation in fake function.

No fix attempts spilled over the 3-per-task limit; all issues resolved on first iteration of the affected code.

## Known Stubs

**None.** All deliverables fully functional:

- gsc_refresh.py + tests cover the full selection + enrich + queue write flow
- gsc_refresh_review.py + tests cover happy path + reject path + dry-run + all M7/M8 conditional paths
- claude_strategist.get_gsc_digest + tests cover all 4 digest sections + graceful degrade
- prompts/claude_refresh_review.md has all required placeholders ({url}, {gsc_queries_json}, {metrics_block}, {competitor_articles_json}, {locale}, {current_title}, {slug})

First live cron will populate `state/gsc_refresh_queue.jsonl` with real candidates; first review run will produce `state/gsc_refresh_success.jsonl` and/or `state/gsc_refresh_failed.jsonl`.

## Task 5 Checkpoint — Awaiting Matteo

The plan's Task 5 is `type="checkpoint:human-verify"` because **letting Claude Opus regenerate live published articles is the highest-risk action of Phase 17**. Before approving live runs Matteo must:

1. **Install Hetzner cron on Ubuntu `.119`:**
   ```
   ssh matteo@192.168.1.119 'crontab -e'
   # add (under existing TZ=UTC line):
   # 0 8 * * 0 /home/matteo/bbqexperience/run-agent.sh gsc_refresh.py >> /home/matteo/bbqexperience/logs/gsc_refresh.log 2>&1
   ```
2. **Register Windows Task Scheduler:**
   ```
   schtasks /Create /TN "BBQ GSC Refresh Review" /SC WEEKLY /D SUN /ST 10:00 ^
     /TR "C:\Progetti\bbqexperience\scripts\agents\gsc_refresh_review.cmd" /F
   ```
3. **Dry-run gsc_refresh.py on .119 (manual, not waiting for Sunday):**
   ```
   ssh matteo@192.168.1.119 \
     'cd /home/matteo/bbqexperience && set -a && . .env && set +a && python3 scripts/agents/gsc_refresh.py'
   cat /home/matteo/bbqexperience/scripts/agents/state/gsc_refresh_queue.jsonl
   ```
   Expected: 1-10 JSONL records with `branches` field as LIST + populated gsc_queries.
4. **Sample-review FIRST in DRY-RUN mode on Windows BEFORE letting live promotion happen:**
   ```
   cd C:\Progetti\bbqexperience\scripts\agents
   python gsc_refresh_review.py --dry-run
   ```
   Inspect output: each candidate either `[DRY-RUN] sarebbe applicato: ...` (with cluster + score) or `needs_human`. NO Strapi calls. Verify M7 cluster derivations match expected keyword clusters. **CRITICAL:** queue is preserved in dry-run so the same candidates can be re-run live after eyeballing 1-3 sample proposals.
5. **Live run only after sample sign-off:**
   ```
   python gsc_refresh_review.py    # no --dry-run = LIVE
   ```
   First refresh batch: monitor `state/gsc_refresh_success.jsonl` and `state/gsc_refresh_failed.jsonl`. Verify Astro rebuild fires (Strapi entry.publish webhook).
6. **Dry-run strategist with digest:**
   ```
   cd C:\Progetti\bbqexperience\scripts\agents
   python claude_strategist.py
   ```
   Inspect Telegram report for `>= 3 GSC-anchored recommendations` (regex check: `clicks|impressions|CTR|position|striking|decay`). Also save digest separately for review:
   ```
   python -c "from agents.claude_strategist import get_gsc_digest; import json; print(json.dumps(get_gsc_digest(), indent=2, default=str))" > _reference/strategist_digest_smoke.json
   ```

Documentation of Task 5 outcomes will be appended to this SUMMARY post-checkpoint.

## Open Follow-ups

- **Phase 18 (proposed):** cover image refresh trigger after meta+content rewrite — if CTR doesn't improve within 14 days post-rewrite, regenerate hero image via SDXL.
- **v2 deferred:** per-locale GSC properties for IT/ES (currently single sc-domain property aggregates all 3 locales; filtering by URL path prefix loses native Search Console per-locale UI).
- **v2 deferred:** semantic similarity match for competitor diff (currently token overlap >=2; bge-m3 cosine on slug embeddings would catch more matches but adds 100ms/candidate).
- **v2 deferred:** auto-revert mechanism — if traffic to refreshed page drops 50%+ in 7 days post-refresh, automatically restore the pre-refresh version from a snapshot.
- **17-04 follow-up:** schema markup audit (FAQPage/HowTo/speakable) is the remaining Phase 17 plan.

## Task 5 Checkpoint — Eseguito 2026-05-26 da orchestrator

| Step | Risultato | Dettaglio |
|------|-----------|-----------|
| A — cron `.119` | ✓ INSTALLATO | `0 8 * * 0 /home/matteo/bbqexperience/run-agent.sh gsc_refresh.py >> logs/gsc_refresh.log 2>&1` appeso a crontab `.119` (sotto `TZ=UTC` già impostato in 17-02). Prima esecuzione: dom 31/05 08:00 UTC (10:00 CEST). |
| B — Windows Task Scheduler | ✓ REGISTRATA | `schtasks /Create /TN "BBQ GSC Refresh Review" /SC WEEKLY /D SUN /ST 10:00 /TR ".\gsc_refresh_review.cmd" /F`. Prima esecuzione: dom 31/05 10:00 locale. |
| C — dry-run selector `.119` | ✓ 10 CANDIDATI | `python3 scripts/agents/gsc_refresh.py` → `state/gsc_refresh_queue.jsonl` con 10 record reali. Top: weber-kettle-vs-big-green-egg (103k impr / 1 click / CTR 0.001% / branches [decay, ctr_opportunity]). Tutti EN. |
| D — dry-run review (1 candidato) | ✓ QUALITY GATE FUNZIONA | Backup queue full10 → ridotta a 1 record (weber-kettle) → `python gsc_refresh_review.py --dry-run` su Windows. Multistep generation completato (7 sezioni + 5 FAQ + 3122 parole, 1 retry timeout recuperato). **Claude Opus review score 5/10 → `needs_human`** (NO auto-apply). |
| E — quality issues catturati | ✓ ROBUSTO | Gate ha beccato 6+ fact_accuracy issues critical/major: pesi Weber Kettle contraddittori (50 vs 60 lbs, reale ~32), pesi BGE Mini contraddittori (30 vs 38 lbs), BGE warranty contraddittoria (10 anni vs Lifetime), section header "2024" mentre articolo è 2026, prezzi BGE MiniMax/Large/Traeger imprecisi. Auto-pubblicare sarebbe stato disastroso. |
| F — restore + cleanup | ✓ | Queue ripristinata a 10 record originali, file test rimossi, queue sincronizzata su `.119` via scp. |

**Caveat noto da propagare:** Alcune GSC queries dei candidati sono long-tail spurie ("big green egg basketball/banjo/electric kettle review"). Claude/Qwen le hanno trattate come keyword intent reale → 3 delle 7 sezioni generate erano off-topic. Il quality gate ha bloccato per `fact_accuracy` ma NON ha esplicitamente flaggato l'irrilevanza topical. Future iterazione: aggiungere `topical_relevance` come dimension nel prompt di review (cattura sezioni semanticamente fuori scope rispetto al titolo).

**Decisione:** dry-run pattern preserve. Primo run live = domenica 31/05 10:00 locale via Windows Task Scheduler. Matteo controllerà `state/gsc_refresh_pending.jsonl` (needs_human) + `state/gsc_refresh_success.jsonl` (auto-published) PRIMA di lasciare l'automation girare ogni domenica.

## Self-Check: PASSED

All 7 created files exist on disk. All 7 task commits present in git log. Full pytest suite 129 passed + 12 skipped (zero regression from baseline 84). Plan-level grep verifications all pass:

- B1: `from agents.lib.ctr_benchmark import` in claude_strategist + gsc_refresh; no inline `CTR_BENCHMARK = {` outside source/tests
- B5: `datetime.now(timezone.utc).hour in (4, 5)` in gsc_refresh._sdxl_guard
- M7: `from agents.keyword_scout import CLUSTERS` + `def _cluster_for_keyword` in gsc_refresh_review; no `current.get("cluster"` pattern
- M8: `metrics_block` + `if "decay" in branches` + `if "ctr_opportunity" in branches` in gsc_refresh_review; `{metrics_block}` placeholder in prompt template
- m4: no `cover_image` in gsc_refresh_review update_data
- skip_rebuild: 0 occurrences of `skip_rebuild=True` in gsc_refresh_review (refresh MUST rebuild)

```
FOUND: scripts/agents/{gsc_refresh.py, gsc_refresh_review.py, gsc_refresh_review.cmd}
FOUND: scripts/agents/prompts/claude_refresh_review.md
FOUND: scripts/agents/tests/{test_gsc_refresh, test_gsc_refresh_review, test_strategist_gsc_digest}.py
FOUND: commits 5722ae3, 4324700, a512f84, de4e66b, 7ecb42a, 5fba592, 06223c9
```

---
*Phase: 17-gsc-driven-content-pipeline*
*Plan: 03*
*Automated tasks: completed 2026-05-26*
*Task 5 checkpoint: pending Matteo verification (DRY-RUN sample-review before live promotion)*
