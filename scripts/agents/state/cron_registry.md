# Cron Registry (Phase 17 entries)

Single source of truth per i cron schedule degli agents Phase 17.
Plan 17-04 canonicalizzera' questo registry estendendolo con tutte le voci
storiche (Phase 10-16); per ora documenta solo le voci Phase 17.

## Convenzioni

- **TZ**: tutti gli schedule sono in UTC (prefix `TZ=UTC` su .119 crontab).
- **Host**: dove gira il cron, non dove sta il codice (il codice e' git-tracked qui).
- **Discovery**: nuovi cron vanno SEMPRE registrati qui per evitare timing collisions
  (es. SDXL window 04:00-05:00 UTC summer, 05:00-06:00 UTC winter su Windows .124).

## Entries

| Schedule (UTC) | Host | Script | Purpose | Added | Plan |
|---------------|------|--------|---------|-------|------|
| `30 3 * * *` (daily 03:30) | Ubuntu .119 | meta_optimizer.py | GSC CTR scan + Qwen draft -> meta_changes_pending.jsonl | 2026-05-26 | 17-02 |
| `DAILY 09:00 local` | Windows .124 (Task Scheduler) | meta_review.cmd | Claude sonnet gate -> Strapi PUT skip_rebuild=True | 2026-05-26 | 17-02 |
| `0 8 * * 0` (Sun 08:00) | Ubuntu .119 | gsc_refresh.py | Sun: select decay+CTR-opportunity pages, write state/gsc_refresh_queue.jsonl | 2026-05-26 | 17-03 |
| `WEEKLY SUN 10:00 local` | Windows .124 (Task Scheduler) | gsc_refresh_review.cmd | Claude Opus rewrite + quality gate + Strapi PUT (rebuild fires) + re-index | 2026-05-26 | 17-03 |

## SDXL window (NON cron, FYI)

Su Windows .124 (NON un cron Linux ma scheduled task):
- `switch-to-sd` daily 06:00 local (LOCAL Europe/Rome)
- `switch-to-qwen` daily 06:50 local

Translation in UTC:
- CEST (estate, UTC+2): 04:00-04:55 UTC
- CET (inverno, UTC+1): 05:00-05:55 UTC

Tutti i cron sopra schedulati a 03:30 UTC OR Sun 08:00 UTC sono CHIARAMENTE
fuori da questa finestra. meta_optimizer ha anche `_sdxl_guard()` come
defense-in-depth UTC-explicit (B5 fix Phase 17-02).
