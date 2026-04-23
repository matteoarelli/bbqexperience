---
phase: 16-a-b-headline-testing-infrastructure
plan: 03
subsystem: agents
tags: [python, statistics, z-test, brevo, umami, telegram, a-b-testing]

requires:
  - phase: 16-01
    provides: ab-experiment Strapi content type and web variant assignment library
  - phase: 15
    provides: umami_client.py with get_metrics_by_path and token caching
provides:
  - ab_tester.py weekly analysis agent with statistical z-test
  - brevo_client.py for A/B email campaign results
  - umami_client.py get_event_data() for custom event retrieval
  - webhook exclusion for ab-experiment to prevent rebuild storms
affects: [growth-engine, cron-scheduling]

tech-stack:
  added: [brevo-api-v3]
  patterns: [two-proportion-ztest-without-scipy, weekly-agent-with-dry-run]

key-files:
  created:
    - scripts/agents/ab_tester.py
    - scripts/agents/lib/brevo_client.py
    - scripts/agents/tests/__init__.py
    - scripts/agents/tests/test_ab_tester.py
  modified:
    - scripts/agents/lib/umami_client.py

key-decisions:
  - "Webhook exclusion applied to bbqexperience-rebuild hook (Strapi content changes), not the GitHub push hook"
  - "z-test uses math.erfc (stdlib) instead of scipy for zero-dependency footprint"

patterns-established:
  - "Agent TDD: pytest tests in scripts/agents/tests/ with sys.path.insert for import resolution"
  - "Brevo client: api-key header auth with retry backoff matching strapi_client pattern"

requirements-completed: [AB-04, AB-06, AB-07]

duration: 4min
completed: 2026-04-21
---

# Phase 16 Plan 03: A/B Analysis Agent Summary

**Weekly A/B test analysis agent with two-proportion z-test (math.erfc), Brevo email A/B reporting, and webhook exclusion for ab-experiment model**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T17:13:05Z
- **Completed:** 2026-04-21T17:16:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ab_tester.py with statistical z-test, 500-impression/7-day/p<0.05 thresholds, one-active-per-post constraint, --dry-run flag
- brevo_client.py with get_ab_campaign_results and list_recent_ab_campaigns (retry 3x, timeout 10s)
- umami_client.py extended with get_event_data() for custom event retrieval
- 7 unit tests all passing (z-test math correctness + threshold enforcement)
- Webhook hooks.json on Hetzner updated to exclude ab-experiment from rebuild trigger

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `3f08591` (test)
2. **Task 1 (GREEN): Implementation** - `38ad41a` (feat)
3. **Task 2: Webhook exclusion** - server-side only, no local commit

## Files Created/Modified
- `scripts/agents/ab_tester.py` - Weekly A/B analysis agent with z-test, Telegram reporting, --dry-run
- `scripts/agents/lib/brevo_client.py` - Brevo API client for A/B email campaign results
- `scripts/agents/lib/umami_client.py` - Extended with get_event_data() for custom events
- `scripts/agents/tests/__init__.py` - Test package init
- `scripts/agents/tests/test_ab_tester.py` - 7 unit tests for z-test and threshold logic
- `/opt/webhooks/hooks.json` (server) - bbqexperience-rebuild hook now excludes ab-experiment model

## Decisions Made
- Webhook exclusion applied to `bbqexperience-rebuild` hook (Strapi content changes) rather than the GitHub push hook, since that is the one triggered by CMS edits
- z-test implemented with `math.erfc` from stdlib to avoid scipy dependency (zero-dependency agent)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. BREVO_API_KEY env var already expected in .env (existing pattern from newsletter agent).

## Next Phase Readiness
- A/B analysis feedback loop complete: experiments created in Strapi, variants assigned in frontend, statistics analyzed by ab_tester.py
- Agent needs to be scheduled as weekly cron on Hetzner (separate ops task)
- Cloudflare cache-status verification pending (cf-cache-status must be DYNAMIC/BYPASS for SSR pages)

---
*Phase: 16-a-b-headline-testing-infrastructure*
*Completed: 2026-04-21*
