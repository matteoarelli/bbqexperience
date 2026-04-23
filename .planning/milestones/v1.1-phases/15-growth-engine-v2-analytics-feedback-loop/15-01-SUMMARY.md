---
phase: 15-growth-engine-v2-analytics-feedback-loop
plan: 01
subsystem: growth-engine
tags: [umami, analytics, strapi-schema, python-agent, tdd]
dependency_graph:
  requires: []
  provides: [umami_client.py, umami_feedback.py, traffic_score_fields]
  affects: [telegram_bot, claude_strategist, strapi-schema]
tech_stack:
  added: [umami_client.py]
  patterns: [token-cache-with-ttl, retry-with-backoff, url-path-parsing, low-confidence-filter]
key_files:
  created:
    - scripts/agents/lib/umami_client.py
    - scripts/agents/umami_feedback.py
    - scripts/tests/__init__.py
    - scripts/tests/test_umami_client.py
    - scripts/tests/test_umami_feedback.py
  modified:
    - cms/src/api/blog-post/content-types/blog-post/schema.json
    - cms/src/api/review/content-types/review/schema.json
    - cms/src/api/recipe/content-types/recipe/schema.json
    - cms/src/api/tutorial/content-types/tutorial/schema.json
decisions:
  - "Umami API type=url (not type=path) for metrics endpoint — matches actual Umami v2 API"
  - "Token TTL 58 min (2 min margin on 60 min expiry) — same safety margin as strapi_client retry"
  - "is_high_confidence uses >= for thresholds (50 visits inclusive, 7 days inclusive)"
metrics:
  duration: 3min
  completed: 2026-04-21
  tasks_completed: 2
  tasks_total: 2
  files_changed: 9
  tests_added: 24
  tests_passing: 24
---

# Phase 15 Plan 01: Umami Analytics Client + Feedback Agent Summary

Umami REST client with 58-min token cache and 3x retry backoff, nightly feedback agent that maps URL paths to Strapi content types across EN/IT/ES and writes traffic_score with low-confidence filter (50 visits, 7 days minimum).

## What Was Done

### Task 1: umami_client.py + Strapi schema fields + tests (TDD)
- Created `scripts/agents/lib/umami_client.py` mirroring strapi_client.py conventions: urllib.request only, MAX_RETRIES=3, RETRY_BACKOFF=[1,2,4], TOKEN_TTL=58*60
- Exports: `get_metrics_by_path()`, `_get_token()`, `_request()` — all with proper type hints
- Added `traffic_score_7d` (integer, default 0), `traffic_score_30d` (integer, default 0), `traffic_last_updated` (datetime) to 4 Strapi content type schemas (blog-post, review, recipe, tutorial)
- No `pluginOptions.i18n.localized` on traffic fields — per-locale updates via query param
- 6 unit tests: token caching, TTL refresh, 500 retry, 400 no-retry, max-retry raise, URL construction
- **Commit:** `91ea61c`

### Task 2: umami_feedback.py agent + tests (TDD)
- Created `scripts/agents/umami_feedback.py` — nightly cron agent
- `parse_umami_path()` maps localized URL segments (blog/recensioni/recetas/guide/tutoriales) to Strapi API names
- `is_high_confidence()` filters content with <50 visits or <7 days since publish (ANLY-05)
- `run()` orchestrator: builds content index from Strapi, fetches 7d+30d Umami data, matches by path, updates Strapi with traffic_score, sends Telegram report
- Validates Umami response items have "x" and "y" keys (T-15-02 mitigation)
- Includes slug in Strapi update data for v5 locale PUT compatibility
- 18 unit tests: 12 URL parsing cases (EN/IT/ES routes + edge cases), 6 confidence filter cases
- **Commit:** `cc73bc4`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `python -m pytest scripts/tests/ -x -v` — 24/24 passed
- All 4 schema.json files contain `traffic_score_7d`, `traffic_score_30d`, `traffic_last_updated`
- No `pluginOptions.i18n.localized` on traffic fields

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-15-01 | All credentials via env vars (UMAMI_PASSWORD, STRAPI_API_TOKEN), never in code |
| T-15-02 | Umami response items validated for "x"/"y" keys before processing |
| T-15-04 | Token cached in-memory only (_cached_token module var), never persisted, 58-min TTL |

## Self-Check: PASSED

- All 5 created files exist on disk
- Both commits found: 91ea61c, cc73bc4
- 24/24 tests passing
