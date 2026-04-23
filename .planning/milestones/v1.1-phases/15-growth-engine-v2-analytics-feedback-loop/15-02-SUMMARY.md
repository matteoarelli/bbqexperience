---
phase: 15-growth-engine-v2-analytics-feedback-loop
plan: 02
subsystem: agents
tags: [telegram, claude-strategist, umami, analytics, cron]

requires:
  - phase: 15-01
    provides: umami_client.py, umami_feedback.py, traffic_score Strapi fields
provides:
  - Traffic digest in daily Telegram report (Top 5/Bottom 5 per locale)
  - Per-article traffic_score consumption in Claude strategist prompt
  - Crontab entry for umami_feedback.py at 04:00 UTC
affects: [phase-16-ab-testing]

tech-stack:
  added: []
  patterns: [strapi-traffic-score-consumption, per-locale-traffic-digest]

key-files:
  created: []
  modified:
    - scripts/agents/telegram_bot.py
    - scripts/agents/claude_strategist.py
    - scripts/agents/lib/claude_client.py
    - scripts/agents/crontab.txt

key-decisions:
  - "Traffic digest grouped by locale (EN/IT/ES) with Top 5 and Bottom 5 non-zero items"
  - "Strategist prompt includes traffic decline detection heuristic (30d >> 7d*4)"

patterns-established:
  - "Traffic digest pattern: fetch traffic_score_7d from Strapi, sort, Top/Bottom N per locale"
  - "Strategist data enrichment: pass additional data sources as optional kwargs to generate_strategy()"

requirements-completed: [ANLY-03, ANLY-04]

duration: 3min
completed: 2026-04-21
---

# Phase 15 Plan 02: Agent Integration Summary

**Wired Umami traffic_score into Telegram daily digest (Top 5/Bottom 5 per locale) and Claude strategist prompt with decline detection heuristic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-21T15:37:31Z
- **Completed:** 2026-04-21T15:40:38Z
- **Tasks:** 1 completed, 1 checkpoint pending
- **Files modified:** 4

## Accomplishments
- Added `get_traffic_digest()` to telegram_bot.py: per-locale Top 5/Bottom 5 by 7d traffic in daily report
- Added `get_traffic_scores()` to claude_strategist.py: top 10 performers and bottom 10 underperformers fed into strategy prompt
- Extended `generate_strategy()` in claude_client.py with optional traffic_scores parameter and traffic-based prioritization instructions
- Added 04:00 UTC cron entry for umami_feedback.py in crontab.txt

## Task Commits

Each task was committed atomically:

1. **Task 1: Add traffic digest + strategist consumption + cron** - `c97df9d` (feat)
2. **Task 2: Deploy and verify** - checkpoint:human-verify (pending)

## Files Created/Modified
- `scripts/agents/telegram_bot.py` - Added get_traffic_digest() and integration in daily_report()
- `scripts/agents/claude_strategist.py` - Added get_traffic_scores() and wired into main() data flow
- `scripts/agents/lib/claude_client.py` - Extended generate_strategy() with traffic_scores param and prompt instructions
- `scripts/agents/crontab.txt` - Added 04:00 UTC cron for umami_feedback.py

## Decisions Made
- Traffic digest grouped by locale (EN/IT/ES) rather than globally, matching the content structure
- Bottom 5 only shown if there are more than 5 non-zero items (avoids showing same items in both lists)
- Strategist prompt includes traffic decline detection heuristic (30d >> 7d*4 indicates downtrend)
- generate_strategy() uses optional kwarg for backward compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated claude_client.py generate_strategy signature**
- **Found during:** Task 1 (strategist integration)
- **Issue:** Plan called for passing traffic_scores to generate_strategy() but didn't specify updating the function signature in claude_client.py
- **Fix:** Added traffic_scores optional parameter to generate_strategy() and included per-article data section in prompt
- **Files modified:** scripts/agents/lib/claude_client.py
- **Verification:** ast.parse() passes, parameter accepted
- **Committed in:** c97df9d

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for the strategist to actually receive traffic data. No scope creep.

## Issues Encountered
None

## User Setup Required
None - crontab must be installed on Hetzner server manually (Task 2 checkpoint).

## Next Phase Readiness
- Analytics feedback loop code complete, pending deploy verification (Task 2 checkpoint)
- After deploy: traffic data flows Umami -> Strapi -> Telegram + Strategist
- Phase 16 (A/B testing) can begin after 1 week of traffic baseline data

---
*Phase: 15-growth-engine-v2-analytics-feedback-loop*
*Completed: 2026-04-21*

## Self-Check: PASSED
