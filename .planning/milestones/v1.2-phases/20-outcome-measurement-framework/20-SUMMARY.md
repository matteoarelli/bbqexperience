---
phase: 20-outcome-measurement-framework
plan: 01
subsystem: seo
tags: [outcome-measurement, ctr-lift, gsc, decision-tree, telegram-report, autonomous-mode, phase17-validation, v1.2-consolidation]
mode: autonomous
shipped: 2026-05-26

# Dependency graph
requires:
  - phase: 17-gsc-driven-content-pipeline
    plan: 01
    provides: "lib/gsc_client.top_pages (28d aggregation), lib/atomic_io.append_jsonl_atomic, lib/ctr_benchmark.benchmark_for_position (B1 shared), pytest scaffold"
  - phase: 17-gsc-driven-content-pipeline
    plan: 02
    provides: "state/meta_changes.jsonl (timestamp + url) — pipeline activity counter source"
  - phase: 17-gsc-driven-content-pipeline
    plan: 03
    provides: "state/gsc_refresh_success.jsonl + state/gsc_refresh_pending.jsonl — refresh activity counter sources"
  - phase: 18-gsc-pipeline-polish
    provides: "Phase 17 pipeline clean state per measurement (FAQ parser-v2, topical_relevance gate, IndexNow re-ping verified)"
provides:
  - "scripts/agents/phase17_outcome_tracker.py — weekly Mon 09:00 UTC tracker, GSC 28d aggregation vs baseline, top climbing/declining, pipeline activity counters, decision tree verdict"
  - "scripts/agents/state/phase17_outcome.jsonl — atomic-appended weekly snapshots (1 record per Mon run)"
  - ".planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md — 4 trigger ranges with explicit actions per verdict"
  - "Telegram weekly report 'Phase 17 Outcome Tracker' via send_agent_report"
affects: [future-phase-21-pipeline-tuning, translation_agent (potential GSC priming extension on success verdict)]

# Tech tracking
tech-stack:
  added: []  # zero new pip deps — full reuse of Phase 17 lib stack
  patterns:
    - "Hardcoded baseline locked at ship date (2026-05-25) — single source of truth, NON re-fetch from GSC (preserves historical comparison integrity)"
    - "Weighted position aggregation by impressions (weighted_pos = sum(pos*impr) / sum(impr)) — matches GSC UI calculation, not simple average"
    - "Decision tree as pure function `_decide_verdict(delta, weeks_elapsed) -> (verdict, actions)` — testable in isolation, priority order: degraded_rollback > success > on-track > revisit_prompts > monitoring"
    - "Top climbing/declining via ctr_vs_benchmark_x ratio (NOT raw CTR) — normalizes for position differences, catches articles outperforming their rank"
    - "Best-effort everything: GSC failure -> zeros (no raise), Strapi failure -> baseline fallback (no raise), corrupt JSONL line -> skip (no raise)"

key-files:
  created:
    - scripts/agents/phase17_outcome_tracker.py (313 lines)
    - scripts/agents/tests/test_phase17_outcome_tracker.py (20 tests, 6 test classes)
    - .planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md
    - .planning/milestones/v1.2-phases/20-outcome-measurement-framework/20-SUMMARY.md (this file)
  modified:
    - scripts/agents/state/cron_registry.md (Phase 20 row added)
    - scripts/agents/crontab.txt (Phase 20 cron block appended)

key-decisions:
  - "Deployment target: Ubuntu .119 (mirrors meta_optimizer + gsc_refresh convention). NOT Hetzner. Cron weekly Mon 09:00 UTC under existing TZ=UTC block of Phase 17."
  - "Script location: scripts/agents/phase17_outcome_tracker.py (runnable agent, NOT lib/). Same level as meta_optimizer.py / gsc_refresh.py / claude_strategist.py."
  - "Baseline hardcoded as constant BASELINE dict — Matteo modifies only on conscious reset (e.g. after major refactor). NOT auto-recomputed from GSC (would lose historical comparison)."
  - "State output schema: full snapshot per run (baseline + current_28d + delta + activity counters + top_5 climbing/declining + verdict + actions). Atomic append via atomic_io.append_jsonl_atomic mirror Phase 17 pattern."
  - "Telegram report via lib.telegram.send_agent_report (existing API). Format: headline 1-liner + markdown bullet sections (Baseline / Articles / Pipeline / Climbing / Declining / Actions)."
  - "Decision tree 4 explicit trigger ranges (10x/3x/1.5x cutoffs + week gates 2/4) — locked in decision_tree.md. Priority order: degraded_rollback wins over revisit_prompts when both could match (defense vs panic-too-early via week_elapsed >= 4 gate)."
  - "Top climbing/declining via CTR_vs_benchmark ratio (NOT raw CTR) — normalizes for position bias. Filter impressions >= 50 to exclude long-tail noise."
  - "Live cron install DEFERRED post-merge — code+doc ready, install crontab on .119 is Matteo or autonomous-mode trigger. Crontab snippet documented in both crontab.txt and cron_registry.md with status 'to-install'."
  - "Autonomous-mode authorized: NO checkpoint, NO awaiting Matteo (per execution prompt) — equivalent flow to Phase 18 and Phase 19 (both autonomous-mode inline)."
  - "Italian code comments + 10s HTTP timeouts (via gsc_client) + atomic state writes — full Phase 17 convention compliance."

requirements-completed: [MEASURE-01, MEASURE-02, MEASURE-03]

# Metrics
duration: ~5 min
completed: 2026-05-26
---

# Phase 20: Outcome Measurement Framework Summary

**Weekly CTR lift measurement infrastructure shipping the decision-tree driven Telegram report that validates the Phase 17 GSC pipeline (meta_optimizer + gsc_refresh + GSC priming + Indexing API) lift atteso 10-30× CTR vs baseline 2026-05-25 in the next 30 days.**

## Mode

**Autonomous inline** — no separate plan-phase agent spawn. Single execution agent shipped all 3 requirements (MEASURE-01/02/03) per execution prompt's explicit "autonomous-mode authorized" directive. Mirrors Phase 18 and Phase 19 pattern.

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-26T15:31:36Z
- **Completed:** 2026-05-26T15:36:46Z
- **Files created:** 4 (313-line tracker + 20-test suite + decision_tree.md + this SUMMARY)
- **Files modified:** 2 (cron_registry.md + crontab.txt)
- **Commits:** 1 code commit (`ed9499d`) + 1 metadata commit (pending after this SUMMARY)
- **Tests:** 20 new tests added across 6 test classes; full pytest suite 160 passed + 12 skipped (vs Phase 19 baseline 140 + 12, +20 net new). Zero regression.

## Requirements Addressed

- ✓ **MEASURE-01** — `scripts/agents/phase17_outcome_tracker.py` exists, weekly Mon 09:00 UTC cron snippet documented for .119 install, reads GSC top_pages 28d + traffic via Strapi `find_all_pages` + `state/meta_changes.jsonl` + `state/gsc_refresh_success.jsonl` + `state/gsc_refresh_pending.jsonl`, compares vs hardcoded baseline 2026-05-25, atomic appends to `state/phase17_outcome.jsonl`
- ✓ **MEASURE-02** — Telegram weekly report via `lib.telegram.send_agent_report("Phase 17 Outcome Tracker", headline, details=[...])`. Headline includes lift × + verdict. Details bullet sections: Vs Baseline (delta clicks/impressions/CTR%/position) + Articles Live + Pipeline Activity (meta_changes + refresh counts this week) + Top 5 Climbing + Top 5 Declining + Action Recommendations from decision tree
- ✓ **MEASURE-03** — `_reference/decision_tree.md` documents 4 trigger ranges: success (≥10× / week ≤2), on-track (3-10× / week ≤2), revisit_prompts (<3× / week ≥2), degraded_rollback (<1.5× / week ≥4). Plus 5th catch-all `monitoring` for early-phase non-trigger. Linked from tracker docstring + crontab.txt comment. Linked from cron_registry.md.

## Accomplishments

### phase17_outcome_tracker.py (313 lines)

Weekly cron orchestrator. 7 helper functions + 1 entry point + 1 build_outcome_record (testable separately from main()):

| Function | Purpose |
|----------|---------|
| `_compute_delta(current, baseline)` | Delta % + abs pp, safe vs division by zero, lift_ctr_x rounded 2 dp |
| `_aggregate_gsc_28d()` | GSC top_pages 28d → totals (clicks/impr/ctr/weighted_position) + raw rows |
| `_count_articles_live()` | Sum `find_all_pages` over 4 content types × 3 locales |
| `_select_top_climbing_declining(rows)` | Sort by ctr_vs_benchmark_x ratio (uses `benchmark_for_position` B1 shared), filter impr ≥50 |
| `_count_jsonl_records_since(path, since)` | Generic counter for state/meta_changes.jsonl + state/gsc_refresh_*.jsonl, handles missing file + corrupt lines |
| `_count_pipeline_activity_this_week()` | (meta_count, refresh_count) tuple for last 7gg |
| `_decide_verdict(delta, weeks_elapsed)` | Pure function applying decision tree; (verdict, actions) tuple |
| `_format_telegram_report(record)` | (headline, details) for send_agent_report; markdown bullets |
| `_weeks_since_baseline(today=None)` | floor((today - 2026-05-25) / 7); accepts today arg for tests |
| `build_outcome_record()` | Orchestrator: aggregates all signals into full record dict |
| `main()` | Atomic JSONL write + Telegram send + error catch-all |

**B1 (shared CTR_BENCHMARK):** `from agents.lib.ctr_benchmark import benchmark_for_position` (used in `_select_top_climbing_declining`). No inline duplication.

**Convention compliance:**
- Italian code comments
- 10s HTTP timeouts (delegated to gsc_client + strapi_client)
- atomic_io.append_jsonl_atomic for state writes
- send_agent_report for Telegram
- Best-effort GSC: errors logged not raised
- Strapi find_all_pages for article count (mirror claude_strategist.get_content_performance)
- Encoding fix for Windows stdout (mirror meta_optimizer.py lines 25-28)
- .env loader (mirror meta_optimizer.py lines 32-39)

### test_phase17_outcome_tracker.py (20 tests, 6 test classes)

| Class | Tests | Coverage |
|-------|-------|----------|
| `TestDecideVerdict` | 6 | Decision tree all 4 verdicts + priority order (degraded > revisit) + monitoring (early phase no panic) |
| `TestComputeDelta` | 3 | Happy path (lift 2.5x, +157% clicks, +0.18pp CTR), zero-baseline safe (no ZeroDivisionError), lift rounding (2.92) |
| `TestSelectTopClimbingDeclining` | 2 | Sort by ratio desc/asc, filter impressions <50 |
| `TestWeeksSinceBaseline` | 3 | Week 0 (today=baseline), week 1 (day +7), week floor (day +10 = 1, not 1.42) |
| `TestAggregateGSC` | 2 | Empty rows → zeros (no ZeroDivisionError), weighted position by impressions |
| `TestCountJsonlRecordsSince` | 3 | Filter old records, missing file (0), corrupt line (skip not raise) |
| `TestBuildOutcomeRecord` | 1 | Smoke test: full pipeline produces dict with all expected keys |

All 20 tests pass on first run. No iterations needed.

### decision_tree.md (162 lines)

4 trigger ranges + monitoring catch-all, each documented with:
- Trigger condition (lift_ctr_x range + weeks_elapsed gate)
- Significato (what the lift means in context)
- Azioni (auto-recommendations + manual steps)
- Decisione umana required (when applicable)

Plus sections:
- Soglie di confidence (rationale per 10×/3×/1.5×)
- Frequenza misurazione (Mon 09:00 UTC, 2026-06-01 first run, 2026-06-29 verdict di chiusura attesa)
- Caveats (GSC 3gg lag week 1 = early signal, BBQ stagionalità maggio-giugno, article volume drift)
- Crontab snippet (ready-to-paste for .119 install)

## Task Commits

| # | Task | Commit | Description |
|---|------|--------|-------------|
| 1 | Code + tests + decision_tree + cron_registry update | `ed9499d` | feat(20): Outcome Measurement Framework — phase17_outcome_tracker.py weekly CTR lift vs baseline 2026-05-25 + decision tree (MEASURE-01/02/03 complete) |
| 2 | Metadata (SUMMARY + STATE + ROADMAP + REQUIREMENTS) | (pending) | docs(20): complete Outcome Measurement Framework plan |

## Files Created/Modified Summary

**Created (4):**

- `scripts/agents/phase17_outcome_tracker.py` (313 lines)
- `scripts/agents/tests/test_phase17_outcome_tracker.py` (20 tests, 6 classes)
- `.planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md`
- `.planning/milestones/v1.2-phases/20-outcome-measurement-framework/20-SUMMARY.md` (this file)

**Modified (2):**

- `scripts/agents/state/cron_registry.md` — Phase 20 row added (status `to-install`) + dedicated Phase 20 section with install command
- `scripts/agents/crontab.txt` — Phase 20 cron block appended under existing TZ=UTC

## First Live Run

**Not yet executed** — cron installation deferred to post-merge. Per locked decision (point 9 in critical_decisions_locked), live cron install on .119 is Matteo or autonomous-mode trigger, NOT this plan's responsibility.

Expected first run schedule (post-Matteo install):

- **Mon 2026-06-01 09:00 UTC** (.119): first phase17_outcome_tracker run — Week 1, early-signal verdict (4gg only post-ship due to GSC 3gg lag)
- **Mon 2026-06-29 09:00 UTC** (.119): Week 5 — verdict di chiusura attesa per Phase 17 measurement window

Install command (single line):

```bash
ssh matteo@192.168.1.119 'crontab -e'
# Append under existing TZ=UTC block of Phase 17:
0 9 * * 1 /home/matteo/bbqexperience/run-agent.sh phase17_outcome_tracker.py >> /home/matteo/bbqexperience/logs/phase17_outcome.log 2>&1
```

Verify post-install:

```bash
ssh matteo@192.168.1.119 'crontab -l | grep phase17_outcome'
# Expected: 0 9 * * 1 ... phase17_outcome_tracker.py ...
```

Manual smoke test (optional, before first cron run):

```bash
ssh matteo@192.168.1.119 \
  'cd /home/matteo/bbqexperience && set -a && . .env && set +a && python3 scripts/agents/phase17_outcome_tracker.py'
# Expected: writes state/phase17_outcome.jsonl record + sends Telegram report
cat /home/matteo/bbqexperience/scripts/agents/state/phase17_outcome.jsonl | tail -1 | python3 -m json.tool
```

## Decisions Made

All key decisions listed in frontmatter `key-decisions`. Highlights:

1. **Deployment target .119 (NOT Hetzner):** mirror Phase 17 P02/P03 convention discovered in Phase 17 smoke test. cron entry under existing TZ=UTC block.
2. **Baseline hardcoded as constant:** NOT auto-fetched from GSC. Preserves historical comparison integrity across cron runs (otherwise "baseline" drifts as data backfills).
3. **Decision tree as pure function:** `_decide_verdict(delta, weeks)` is side-effect-free, easily testable. Priority order locked: degraded_rollback wins over revisit_prompts when both could match (defense vs panic-too-early via week_elapsed ≥4 gate).
4. **Top climbing/declining via ratio (NOT raw CTR):** normalizes for position bias. A page at pos 8 with CTR 5% is performing BETTER than a page at pos 2 with CTR 10% (5%/2.5% bench vs 10%/30% bench).
5. **Live cron install deferred:** code + doc ready, install is post-merge action. Status `to-install` documented in cron_registry.md + crontab.txt.
6. **Autonomous-mode authorized:** equivalent flow to Phase 18 and Phase 19 (both autonomous-mode inline). Single execution, single commit, single SUMMARY.

## Deviations from Plan

**Total deviations:** 0 substantive.

**Minor adaptations (not deviations):**

- **monitoring verdict added (5th):** Plan critical_decisions_locked specifies 4 verdicts (success/on-track/revisit_prompts/degraded_rollback). Added `monitoring` as catch-all for early phase (week 0-1) where lift < 3× but week_elapsed < 2 (revisit_prompts not yet triggered). Without this, low-lift in week 1 would return one of the 4 verdicts incorrectly. Rationale documented in decision_tree.md ("Significato" of each verdict) + test_decide_verdict_monitoring_early covers the case.
- **build_outcome_record extracted from main():** plan implied single main() function; separated build_outcome_record for testability (TestBuildOutcomeRecord smoke test). main() handles only atomic write + Telegram send + error catch-all.
- **fallback Strapi baseline articles_count:** plan didn't specify behavior when Strapi unreachable. Added fallback to BASELINE["articles_count"] (50) with [WARN] log — keeps report non-broken even if Strapi outage. Documented inline.

Plan executed exactly as locked. No Rule 4 architectural decisions needed.

## Issues Encountered

**None.** All 20 tests passed on first run. No iterations needed on the script. The full pytest suite ran in 0.39s with 160/172 passing (12 legacy stubs skipped, as in Phase 17/18/19 baseline).

## Known Stubs

**None.** All deliverables fully functional:

- phase17_outcome_tracker.py: complete pipeline from GSC pull → delta → verdict → Telegram
- All public functions covered by unit tests
- Decision tree documented with explicit actions per verdict
- Crontab snippet ready-to-paste

The first live cron run on .119 will populate `state/phase17_outcome.jsonl` with the first weekly record.

## Open Follow-ups

- **Live cron install on .119** (Matteo or autonomous-mode trigger post-merge — non-blocking for Phase 20 close)
- **Manual smoke test post-install** (run script once locally before first cron Mon, verify Telegram message receivable)
- **Phase 21 candidate:** if Week 4-5 verdict is `success`, implement scale actions (gsc_refresh weekly → daily, MAX_PROPOSALS_PER_RUN 20 → 30, extend GSC priming to IT/ES via translation_agent on .119)
- **Phase 21 candidate (alt):** if Week 4-5 verdict is `revisit_prompts`, implement power_words tuning workflow + qwen_meta_draft.md few-shot examples
- **v1.3 milestone trigger:** Verdict di chiusura 2026-06-29 informa quale tier di action prendere — `success` justifies expansion (v1.3 GSC v2), `degraded_rollback` triggers postmortem + rebuild

## Self-Check: PASSED

All 4 created files exist on disk. All commits present in git log. Full pytest suite 160 passed + 12 skipped (zero regression from Phase 19 baseline 140 + 12, +20 net new).

```
FOUND: scripts/agents/phase17_outcome_tracker.py
FOUND: scripts/agents/tests/test_phase17_outcome_tracker.py
FOUND: .planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md
FOUND: .planning/milestones/v1.2-phases/20-outcome-measurement-framework/20-SUMMARY.md (this file)
FOUND: commit ed9499d
```

---
*Phase: 20-outcome-measurement-framework*
*Mode: autonomous-mode inline (equivalent to Phase 18/19)*
*Completed: 2026-05-26*
*v1.2 milestone status: 3/3 phases complete (18 + 19 + 20) — closure ready*
