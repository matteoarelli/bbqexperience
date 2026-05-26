# Cron Registry (BBQ Experience)

Single source of truth per tutti gli scheduled jobs across Hetzner + Windows + Ubuntu .119.
Canonicalizzato 2026-05-26 da Phase 17 Plan 17-04 (Task 4).

## Convenzioni

- **TZ**: tutti i cron .119 / Hetzner sono in UTC (prefix `TZ=UTC` in crontab).
- **Windows Task Scheduler**: gli orari sono in LOCAL Europe/Rome (CET inverno / CEST estate).
- **Host**: dove gira il cron, NON dove sta il codice (il codice e' git-tracked qui).
- **Discovery**: nuovi cron vanno SEMPRE registrati qui per evitare timing collisions
  (es. SDXL VRAM swap window 04:00-05:00 UTC summer, 05:00-06:00 UTC winter su Windows .124).

## Hetzner cron (matteo crontab + system /etc/cron.d)

| Schedule (UTC) | Script | Purpose | Added | Phase |
|---------------|--------|---------|-------|-------|
| `0 9,15 * * *` | scripts/agents/seo_optimizer.py | Daily internal linking | original | — |
| `0 */12 * * *` | scripts/agents/competitor_monitor.py | Competitor RSS poll | original | — |
| `0 8 * * 1` | scripts/agents/partnership_outreach.py | Mon partnership email batch | original | — |
| `0 4 * * *` | scripts/agents/umami_feedback.py | Daily traffic_score update | 15 | 15 |
| `0 10 * * 0` | scripts/agents/weekly_newsletter.py | Sun newsletter via Brevo | original | — |

## Ubuntu 192.168.1.119 (instagram-bot + agenti Phase 17)

| Schedule (UTC) | Script | Purpose | Added | Phase |
|---------------|--------|---------|-------|-------|
| `0 5 * * 1` | scripts/agents/keyword_scout.py | Weekly keyword scout (Mon 05:00 UTC); Phase 17: merges GSC striking-distance | original | 17 (modified) |
| `*/6h` | site_bridge.py | Strapi -> JSON per IG bot | original | — |
| `30 3 * * *` (daily 03:30) | scripts/agents/meta_optimizer.py | GSC CTR scan + Qwen meta draft -> state/meta_changes_pending.jsonl | 2026-05-26 | 17-02 |
| `0 8 * * 0` (Sun 08:00) | scripts/agents/gsc_refresh.py | Sun decay+CTR-opportunity selection -> state/gsc_refresh_queue.jsonl | 2026-05-26 | 17-03 |
| `0 9 * * 1` (Mon 09:00) | scripts/agents/phase17_outcome_tracker.py | Weekly CTR lift measurement vs baseline 2026-05-25 -> state/phase17_outcome.jsonl + Telegram. **to-install** (Matteo or autonomous-mode trigger post-merge) | 2026-05-26 | 20 |
| Various | instagram-bot/* | IG automation (Phase 17 NOT touched) | original | — |

## Windows .124 Task Scheduler (Matteo user)

| Schedule (LOCAL) | Task Name | Script | Purpose | Phase |
|-----------------|-----------|--------|---------|-------|
| DAILY 06:00 | BBQ content_generator | content_generator.py | Daily article generation (multistep) | original |
| DAILY 07:00 | BBQ claude_review_runner | claude_review_runner.py | Daily quality gate on drafts | original |
| SUN 07:00 | BBQ Strategist | claude_strategist.py | Weekly strategy + pillar; Phase 17: GSC digest section | 17-03 (modified) |
| DAILY 06:10 | BBQ cover_generator | cover_generator.py | SDXL cover gen + Strapi attach | 6 mag setup |
| DAILY 06:00 | switch-to-sd | C:\AI\sd-server\switch-to-sd.cmd | SDXL VRAM swap (KILLS Qwen) | 6 mag setup |
| DAILY 06:50 | switch-to-qwen | C:\AI\sd-server\switch-to-qwen.cmd | Restore Qwen after SDXL window | 6 mag setup |
| DAILY 09:00 | BBQ Meta Review | meta_review.cmd | Claude sonnet gate per pending meta_optimizer proposals | 17-02 |
| SUN 10:00 | BBQ GSC Refresh Review | gsc_refresh_review.cmd | Claude Opus rewrite per gsc_refresh queue + reindex | 17-03 |

## SDXL VRAM Swap Window — CRITICAL

Su Windows .124 (NON un cron Linux ma scheduled task):
- `switch-to-sd` daily 06:00 LOCAL (Europe/Rome)
- `switch-to-qwen` daily 06:50 LOCAL

Translation in UTC:
- CEST (estate, UTC+2): **04:00-04:55 UTC**
- CET (inverno, UTC+1): **05:00-05:55 UTC**

Durante questa finestra, **Qwen :8080 e' DOWN** (VRAM swapped a SDXL :8085).
Qualsiasi nuovo cron che chiama Qwen MUST:
1. Schedule outside this window (preferenza: pre-window UTC 03:30 OR post-window UTC 06:00+), OR
2. Include un `_sdxl_guard()` UTC-explicit hour check
   (`datetime.now(timezone.utc).hour in (4, 5)` — copre BOTH CEST + CET).

Tutti i cron Phase 17 che chiamano Qwen sono SCHEDULED FUORI dalla finestra:
- meta_optimizer @ 03:30 UTC (pre-window) + `_sdxl_guard` defense-in-depth (B5 Phase 17-02)
- gsc_refresh @ Sun 08:00 UTC (post-window) + `_sdxl_guard` defense-in-depth (B5 Phase 17-03)

### Eccezioni sicure dentro la finestra SDXL (m3 fix Phase 17-04)

**NOTE (m3 fix):** `umami_feedback.py @ 04:00 UTC` runs **DENTRO la finestra SDXL** ma
NON chiama Qwen (solo HTTP Umami API + Strapi write) — quindi e' **sicuro**.

Regola generale m3: SOLO i cron Qwen-dipendenti devono evitare la finestra.
Cron HTTP-only o read-only su Strapi/Postgres/Umami sono safe-in-window.
Stessa logica vale per qualsiasi futuro cron data-fetch / DB-only / API-only.

## Phase 17 status (post Plan 17-04)

| Plan | Status | Cron entries aggiunti |
|------|--------|----------------------|
| 17-01 | shipped | (none — solo libreria + content_generator publish hook indexing) |
| 17-02 | shipped | meta_optimizer (.119) + meta_review (Windows) |
| 17-03 | shipped | gsc_refresh (.119) + gsc_refresh_review (Windows) |
| 17-04 | shipping | (none — solo schema audit + canonicalize registry + per-agent telegram) |

Tutti i 4 cron Phase 17 hanno `send_agent_report` su success + empty + error paths
(verificato Plan 17-04 Task 4 — 12 chiamate totali su 4 file).

## Phase 20 status (Outcome Measurement Framework)

| Cron | Status | Install command (.119) |
|------|--------|------------------------|
| phase17_outcome_tracker (Mon 09:00 UTC) | code shipped, **to-install** | `ssh matteo@192.168.1.119 'crontab -e'` -> append: `0 9 * * 1 /home/matteo/bbqexperience/run-agent.sh phase17_outcome_tracker.py >> /home/matteo/bbqexperience/logs/phase17_outcome.log 2>&1` (sotto blocco `TZ=UTC` esistente Phase 17) |

Telegram report weekly: "📈 Phase 17 Outcome — Week N (lift CTR Nx, VERDICT)".
Decision tree: `.planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md`
