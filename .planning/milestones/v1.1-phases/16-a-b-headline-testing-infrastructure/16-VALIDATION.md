---
phase: 16
slug: a-b-headline-testing-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + vitest |
| **Config file** | pytest: scripts/tests/ / vitest: web/vitest.config.ts |
| **Quick run command** | `python -m pytest scripts/tests/ -q --tb=short && cd web && npx vitest run` |
| **Full suite command** | `python -m pytest scripts/tests/ -v && cd web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AB-01 | integration | TBD | TBD | pending |
| TBD | TBD | TBD | AB-02 | unit | TBD | TBD | pending |
| TBD | TBD | TBD | AB-03 | integration | TBD | TBD | pending |
| TBD | TBD | TBD | AB-04 | unit | TBD | TBD | pending |
| TBD | TBD | TBD | AB-05 | unit | TBD | TBD | pending |
| TBD | TBD | TBD | AB-06 | integration | TBD | TBD | pending |
| TBD | TBD | TBD | AB-07 | integration | TBD | TBD | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- TBD — will be populated after planning

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Strapi editor creates experiment | AB-01 | Admin panel UX | Create ab-experiment, link to blog post, add 2 variants |
| Bot UA gets control variant | AB-05 | curl spoof test | `curl -H "User-Agent: Googlebot" site/blog/post` |
| Webhook exclusion | AB-06 | Server log check | Edit ab-experiment, verify no deploy triggered |
| Brevo A/B campaign | AB-07 | External service | Schedule A/B campaign, verify winner in Telegram |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
