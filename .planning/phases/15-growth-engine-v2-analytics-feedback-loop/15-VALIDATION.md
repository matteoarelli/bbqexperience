---
phase: 15
slug: growth-engine-v2-analytics-feedback-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + vitest |
| **Config file** | pytest: scripts/tests/ / vitest: web/vitest.config.ts |
| **Quick run command** | `python -m pytest scripts/tests/ -q --tb=short` |
| **Full suite command** | `python -m pytest scripts/tests/ -v && cd web && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ANLY-01 | unit | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | ANLY-02 | unit | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | ANLY-03 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | ANLY-04 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | ANLY-05 | unit | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- TBD — will be populated after planning

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Telegram dashboard shows Top/Bottom 5 | ANLY-03 | Telegram message rendering | Check Telegram bot output after cron run |
| Cron schedule active on Hetzner | ANLY-01 | Server config | `crontab -l` on Hetzner, verify 04:00 UTC entry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
