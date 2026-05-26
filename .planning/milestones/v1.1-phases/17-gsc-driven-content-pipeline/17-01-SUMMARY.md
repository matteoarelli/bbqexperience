---
phase: 17-gsc-driven-content-pipeline
plan: 01
subsystem: seo
tags: [gsc, indexing-api, indexnow, google-api-python-client, pytest, agents, retry-backoff]

# Dependency graph
requires:
  - phase: 16-a-b-headline-testing-infrastructure
    provides: claude_quality_gate pattern reused for meta_optimizer review (downstream 17-02)
  - phase: 15-growth-engine-v2-analytics-feedback-loop
    provides: umami_client pattern for retry/backoff stack mirrored here
provides:
  - lib/gsc_client.py — Search Console + Indexing API SDK wrapper (retry + timeout)
  - lib/indexnow_client.py — Bing/Yandex parallel ping helper
  - lib/atomic_io.py — atomic JSONL append + atomic_write_text/json for state files
  - lib/ctr_benchmark.py — single source of truth CTR_BENCHMARK + REWRITE_FACTOR + benchmark_for_position (B1 fix)
  - pytest infrastructure (pytest.ini, conftest.py, fixtures/) for all Phase 17 plans
  - post-publish Indexing API + IndexNow hook wired at claude_review_runner.py:129 (WIRE_SITE)
  - INDEXNOW_KEY=133e22d3c55db2ef97c9de8733025635 + key file web/public/<key>.txt (SOLE OWNER per m1)
affects: [17-02-meta-optimizer, 17-03-gsc-refresh, 17-04-schema-audit, translation_agent]

# Tech tracking
tech-stack:
  added: [google-api-python-client>=2.100.0, google-auth>=2.30.0, pytest>=7.0.0]
  patterns: [SDK service singleton with module-level cache, retry [1,2,4]s mirror strapi_client, best-effort soft-fail for indexing APIs, dimensionFilterGroups for page-scoped GSC queries]

key-files:
  created:
    - scripts/agents/lib/gsc_client.py
    - scripts/agents/lib/indexnow_client.py
    - scripts/agents/lib/atomic_io.py
    - scripts/agents/lib/ctr_benchmark.py
    - scripts/agents/pytest.ini
    - scripts/agents/tests/conftest.py
    - scripts/agents/tests/fixtures/gsc_search_analytics_sample.json
    - scripts/agents/tests/fixtures/gsc_url_inspection_sample.json
    - scripts/agents/tests/test_gsc_client.py
    - scripts/agents/tests/test_indexnow_client.py
    - scripts/agents/tests/test_publisher_indexing_hook.py
    - web/public/133e22d3c55db2ef97c9de8733025635.txt
  modified:
    - scripts/agents/claude_review_runner.py (WIRE_SITE — LOCALIZED_ROUTES + _canonical_url + _notify_search_engines + hook in apply_review)
    - scripts/agents/content_generator.py (cross-reference docstring on publish_article)
    - scripts/agents/requirements.txt (3 new deps)
    - .gitignore (exclude Phase 17 _reference snapshot dir)

key-decisions:
  - "WIRE_SITE = claude_review_runner.py:129 (strapi.publish in apply_review) — the ONLY draft->published promotion point in the BBQ pipeline. content_generator.py creates DRAFTS only; the gate decides promotion."
  - "Mirror strapi_client.py retry pattern exactly: 3x backoff [1,2,4]s; 4xx no-retry (except 429); 5xx + network retry. Module-level singleton service cache (lazy init)."
  - "request_indexing() is BEST-EFFORT: 403/404 returns {success:False, reason:...} without raising. Failures logged not raised so publish is never blocked."
  - "IndexNow as PARALLEL ping (not substitute) — Google doesn't participate but Bing/Yandex/Seznam/Naver do. Both fire after every EN promotion."
  - "EN-only indexing for v1 — IT/ES promotion path lives in translation_agent.py on .119; hook deferred to Phase 17 v2 (1-3gg natural sitemap lag acceptable at 35 click/week baseline)."
  - "Shared CTR_BENCHMARK module (B1 fix) prevents duplication + circular imports between meta_optimizer (17-02), keyword_scout (17-02), claude_strategist (17-03). Imports via `from agents.lib.ctr_benchmark import ...` — no try/except ImportError fallbacks allowed."
  - "INDEXNOW_KEY generated UNCONDITIONALLY here (Plan 17-04 only verifies existence per m1 lock). Single owner = single source of truth for the key file."

patterns-established:
  - "GSC SDK wrapper: lazy singleton + service_account.from_service_account_file + cache_discovery=False + execute(num_retries=0) so we control retry"
  - "Soft-fail dict pattern: best-effort helpers return {success: bool, reason|code|response: ...} instead of raising — caller logs but proceeds"
  - "Atomic file writes: tempfile.mkstemp(dir=target.parent) + os.replace for cross-platform atomicity (Windows + Linux)"
  - "Test mocking strategy: monkeypatch module-level _service singletons + use MagicMock chain for SDK method-chain simulation; importlib.reload for env-var-dependent modules (indexnow_client)"
  - "Canonical URL builder: LOCALIZED_ROUTES dict mirrors web/scripts/sweep_pages.py (shared source-of-truth across web and agents)"

requirements-completed: [SEO-08]

# Metrics
duration: 9min
completed: 2026-05-26
---

# Phase 17 Plan 01: GSC + Indexing Foundation Summary

**SDK-backed GSC client + IndexNow parallel ping + shared CTR benchmark + atomic I/O lib + pytest scaffold, wired into the Claude-gate promotion path so every published article auto-pings Google Indexing API + Bing/Yandex.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-26T07:49:47Z
- **Completed:** 2026-05-26T07:58:46Z (Task 4 SSH smoke awaiting Matteo)
- **Tasks:** 3 of 4 automated (Task 4 is human-verify checkpoint on Hetzner)
- **Files created:** 12
- **Files modified:** 4
- **Commits:** 5 (Wave 0 + RED + GREEN libs + wire hook + key file)
- **Tests:** 42 passed, 12 skip-stubs (legacy compat names) — 100% green

## Accomplishments

- **lib/gsc_client.py**: 7 functions (search_analytics, top_queries, top_pages, queries_for_page, request_indexing, inspect_url, _retry) + SDK auth + module-level service cache. Retry mirrors strapi_client exactly. request_indexing is best-effort (soft-fail 403/404 without raise).
- **lib/indexnow_client.py**: ping(urls) POSTs IndexNow protocol payload to api.indexnow.org. Missing key → noop; HTTP errors → {success:False, code}. 10s timeout.
- **lib/atomic_io.py**: append_jsonl_atomic + atomic_write_text + atomic_write_json — all via tempfile.mkstemp + os.replace (cross-platform atomic). Ready for meta_changes.jsonl in 17-02.
- **lib/ctr_benchmark.py**: CTR_BENCHMARK (FirstPageSage 2026, pos 1-10) + REWRITE_FACTOR=0.6 + benchmark_for_position with round+clamp. Single source — verified zero duplicates outside this module.
- **pytest infrastructure**: pytest.ini @ scripts/agents/, conftest with 5 fixtures (mock_gsc_service, mock_indexing_service, mock_strapi, frozen_today, gsc_sample_rows), 2 JSON fixtures matching real BBQ data shape.
- **Publish hook wired** at claude_review_runner.py:129 — every successful strapi.publish() triggers _notify_search_engines(canonical_en_url). Failures logged not raised; quota preserved on non-auto_publish paths.
- **INDEXNOW_KEY generated**: 133e22d3c55db2ef97c9de8733025635 (32-char hex). Key file web/public/<key>.txt deployed (will be served at https://bbq-experience.com/<key>.txt after next webhook rebuild).

## Task Commits

Each task committed atomically:

1. **Task 1: Wave 0 scaffold + discovery** — `92882bb` (chore) — pytest.ini, conftest, fixtures, 3 test stub files, requirements.txt updates, .gitignore, SSH-read of IG bot reference (191 lines captured to _reference/, gitignored)
2. **Task 2 RED: Tests** — `142e884` (test) — lib/ctr_benchmark.py (GREEN immediately, no lib needed for RED) + real test bodies for gsc_client + indexnow_client (RED — ImportError until Task 2 GREEN)
3. **Task 2 GREEN: Libs** — `e8a1f89` (feat) — lib/gsc_client.py + lib/indexnow_client.py + lib/atomic_io.py implementations. All tests green.
4. **Task 3: Wire hook** — `23151ba` (feat) — LOCALIZED_ROUTES + _canonical_url + _notify_search_engines in claude_review_runner.py; hooked after strapi.publish at line ~129. content_generator.py cross-reference. web/public/.gitkeep. 8 new tests (3 hook + 5 canonical URL).
5. **Task 4 Step B: IndexNow key** — `0833b88` (chore) — generate key file (SOLE OWNER per locked decision m1).

**Plan metadata commit (pending):** final commit after Task 4 SSH-checkpoint approval — will include SUMMARY.md + STATE.md + v1.1-ROADMAP.md updates.

_Note: Task 2 followed strict RED-then-GREEN cycle (test commit failed builds before lib commit)._

## Files Created/Modified

**Created (12):**

- `scripts/agents/lib/gsc_client.py` — GSC + Indexing API wrapper (227 lines)
- `scripts/agents/lib/indexnow_client.py` — IndexNow ping (76 lines)
- `scripts/agents/lib/atomic_io.py` — atomic file helpers (75 lines)
- `scripts/agents/lib/ctr_benchmark.py` — shared CTR thresholds (51 lines)
- `scripts/agents/pytest.ini` — pytest config (5 lines)
- `scripts/agents/tests/conftest.py` — shared fixtures (98 lines)
- `scripts/agents/tests/fixtures/gsc_search_analytics_sample.json`
- `scripts/agents/tests/fixtures/gsc_url_inspection_sample.json`
- `scripts/agents/tests/test_gsc_client.py` — 12 active + 7 stub tests
- `scripts/agents/tests/test_indexnow_client.py` — 3 active + 3 stub tests
- `scripts/agents/tests/test_publisher_indexing_hook.py` — 8 active + 2 stub tests
- `web/public/133e22d3c55db2ef97c9de8733025635.txt` — IndexNow key file
- `web/public/.gitkeep` — directory marker (idempotent if dir already tracked)

**Modified (4):**

- `scripts/agents/claude_review_runner.py` — added LOCALIZED_ROUTES + _canonical_url + _notify_search_engines + call after strapi.publish in apply_review
- `scripts/agents/content_generator.py` — cross-reference docstring on publish_article noting WIRE_SITE
- `scripts/agents/requirements.txt` — +3 deps (google-api-python-client, google-auth, pytest)
- `.gitignore` — exclude `.planning/milestones/*/17-*/_reference/`

## Final API Surface (gsc_client.py)

For consumption by 17-02 and 17-03:

```python
from agents.lib import gsc_client

# Bulk pulls
rows = gsc_client.top_queries(days=28, row_limit=1000)
# rows = [{"keys":["query text"], "clicks":N, "impressions":N, "ctr":F, "position":F}, ...]

rows = gsc_client.top_pages(days=28, row_limit=1000)
# rows = [{"keys":["https://..."], "clicks":N, ...}, ...]

# Page-scoped query
rows = gsc_client.queries_for_page(
    "https://bbq-experience.com/en/blog/best-pellet-grill-2026",
    days=28, top_n=5,
)

# Indexing API (best-effort)
result = gsc_client.request_indexing("https://...")
# result = {"success": True, "response": {...}} | {"success": False, "reason": "..."}

# Inspection (raise on error)
status = gsc_client.inspect_url("https://...")
# status = {"indexStatusResult": {"verdict": "PASS", ...}, ...}
```

```python
from agents.lib.ctr_benchmark import CTR_BENCHMARK, REWRITE_FACTOR, benchmark_for_position
# CTR_BENCHMARK[1..10] = FirstPageSage 2026 values
# REWRITE_FACTOR = 0.6
# benchmark_for_position(6.4) -> CTR_BENCHMARK[6] (round + clamp 1-10)
```

```python
from agents.lib import indexnow_client
result = indexnow_client.ping(["https://..."])
# {"success": True, "code": 200} | {"success": False, "reason": "INDEXNOW_KEY non impostata"}
```

## WIRE_SITE Discovered (M2 fix)

**`scripts/agents/claude_review_runner.py:129`** — line `strapi.publish(ct, doc_id)` inside `apply_review()` after `next_step == "auto_publish"`.

This is the SOLE promotion-to-published moment in the BBQ pipeline. `content_generator.py` creates entries as DRAFT (status="draft") and the Claude quality gate decides publish authority. Both content_generator and claude_review_runner are noted via cross-reference docstrings for grep-discoverability.

## IG Bot Reference Comparison (signature drift)

Captured via SSH from `matteo@192.168.1.119:~/instagram-bot/gsc_client.py` (191 lines, saved to gitignored `_reference/`):

| Aspect | IG bot (.119) | BBQ (this plan) | Decision |
|---|---|---|---|
| Env var | `GSC_KEY_PATH` | `GSC_SERVICE_ACCOUNT_KEY` | LOCKED per plan — BBQ uses more explicit name |
| Retry | None | 3x [1,2,4]s mirror strapi | BBQ adds — IG bot too lax |
| Timeout | None (SDK default) | 10s explicit | BBQ adds |
| top_queries shape | Processed dict (query, clicks%) | Raw rows (keys, clicks) | BBQ keeps raw — meta_optimizer needs raw fields |
| Site URL | Per-call argument | Module-level env | BBQ singleton — less repetition for daily cron |
| request_indexing | Raises on error | Soft-fail dict | BBQ best-effort — never blocks publish |

No code changes propagated back to IG bot (per locked decision — leave .119 stable).

## Smoke Test Results (Task 4 — to be filled post-checkpoint)

**Step B (auto):** INDEXNOW_KEY generated (133e22d3c55db2ef97c9de8733025635), key file deployed to `web/public/<key>.txt`. Will resolve to `https://bbq-experience.com/<key>.txt` after next webhook rebuild.

**Steps A, C, D, E, F (awaiting Matteo SSH):** see CHECKPOINT REACHED section below.

## INDEXNOW_KEY Rotation Procedure

When rotating (e.g., suspected leak or scheduled refresh):

1. Generate new key: `python -c "import secrets; print(secrets.token_hex(16))"`
2. Create `web/public/<new>.txt` containing the new key on one line
3. Update env vars on Windows (`.env.windows`) AND Hetzner (`/opt/services/bbqexperience/app/.env`):
   - `INDEXNOW_KEY=<new>`
4. Commit + push — webhook rebuild deploys both old + new key files
5. After 1 week (transition window for in-flight pings), remove old key file + commit

## Decisions Made

All key decisions are listed in frontmatter `key-decisions`. Two highlights:

1. **WIRE_SITE consolidation**: Single hook in claude_review_runner.apply_review rather than fan-out across content_generator.publish_article (which only creates drafts). This matches the actual data flow and avoids double-pings.
2. **EN-only v1 indexing**: IT/ES translation promotion runs in a separate agent on .119 (translation_agent.py) — not touched by this plan. Documented as TODO Phase 17 v2. At 35 click/week baseline the 1-3day natural sitemap lag is non-impactful.

## Deviations from Plan

**Total deviations:** 0 substantive.

**Minor adaptations (not deviations):**

- **Existing tests/__init__.py kept** — Plan said "create if absent"; file already existed (empty) from Phase 16 (`test_ab_tester.py`). No overwrite needed.
- **web/public/ already populated** — Plan said create `.gitkeep`; the dir already tracked via favicon.svg etc. .gitkeep added for explicit intent.
- **Smoke test step delegated** — Task 4 Steps A, C, D, E, F require SSH to Hetzner (192.168.1.43 / 204.168.153.43); executor (Windows worktree) does NOT have interactive SSH credentials to Hetzner production. Returned as `## CHECKPOINT REACHED` per orchestrator's `<checkpoint_behavior>` block.

Plan executed exactly as written. No Rule 1/2/3 auto-fixes triggered.

## Issues Encountered

None. The plan's pre-locked decisions (import convention, retry pattern reference, WIRE_SITE discovery procedure) made execution mechanical. Tests passed on first run of each step after writing the corresponding implementation.

## TODO Handoff to 17-02 and 17-03

For Plan 17-02 (meta_optimizer):
- Import `from agents.lib.ctr_benchmark import CTR_BENCHMARK, REWRITE_FACTOR, benchmark_for_position` (do NOT duplicate)
- Import `from agents.lib import gsc_client` for `queries_for_page(url, top_n=5)` calls
- Import `from agents.lib.atomic_io import append_jsonl_atomic` for `state/meta_changes.jsonl` writes
- Mock pattern reference: `tests/test_publisher_indexing_hook.py` shows how to monkeypatch module-level singletons + apply_review

For Plan 17-03 (gsc_refresh + claude_strategist GSC digest):
- Same imports as 17-02 (gsc_client + ctr_benchmark + atomic_io)
- `gsc_client.search_analytics(dimensions=["date"], days=N)` for time-series delta detection
- `inspect_url()` is `raise`-on-error (use it for audit/health, not for publish hot path)

For Plan 17-04 (schema audit):
- IndexNow key file is ALREADY deployed (this plan owns it per m1); 17-04 only `curl`-verifies `https://bbq-experience.com/<key>.txt` returns 200
- pytest infrastructure ready; add tests to existing `scripts/agents/tests/` dir using the same conftest fixtures

For Phase 17 v2 (follow-up):
- Hook `_notify_search_engines` in `translation_agent.py` on .119 after IT/ES draft → published promotion (currently uses 1-3day natural sitemap lag)

## User Setup Required

**Two env-var updates needed by Matteo:**

```bash
# Windows (.env.windows or scripts/agents/.env.windows):
INDEXNOW_KEY=133e22d3c55db2ef97c9de8733025635
INDEXNOW_HOST=bbq-experience.com
GSC_SERVICE_ACCOUNT_KEY=C:\path\to\local\copy\of\gsc-merchant-sync.json
GSC_SITE_URL=https://bbq-experience.com/

# Hetzner (/opt/services/bbqexperience/app/.env via SSH):
INDEXNOW_KEY=133e22d3c55db2ef97c9de8733025635
INDEXNOW_HOST=bbq-experience.com
GSC_SERVICE_ACCOUNT_KEY=/opt/services/bbqexperience/app/secrets/gsc-merchant-sync.json
GSC_SITE_URL=https://bbq-experience.com/
```

The SA key file on Hetzner is **already present** (per 2026-05-25 IG bot hardening session — same shared key with merchant-sync@reflexmania-2025 service account, Owner on BBQ GSC property).

## Next Plan Readiness

- Plans 17-02, 17-03, 17-04 unblocked: all required libs + pytest infrastructure shipped.
- Promotion hook live: every `claude_review_runner` cycle in production will start pinging GSC + IndexNow on auto_publish verdicts.
- Smoke verification pending (Task 4) before declaring full SEO-08 completion.

---
*Phase: 17-gsc-driven-content-pipeline*
*Plan: 01*
*Completed: 2026-05-26 (Task 4 checkpoint pending Matteo)*

## Self-Check: PASSED

All 14 created files exist on disk. All 5 task commits present in git log.

```
FOUND: scripts/agents/lib/{gsc_client,indexnow_client,atomic_io,ctr_benchmark}.py
FOUND: scripts/agents/pytest.ini + tests/conftest.py + tests/fixtures/*.json
FOUND: scripts/agents/tests/test_{gsc_client,indexnow_client,publisher_indexing_hook}.py
FOUND: web/public/{INDEXNOW_KEY}.txt + .gitkeep
FOUND: 92882bb, 142e884, e8a1f89, 23151ba, 0833b88
```
