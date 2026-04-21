---
phase: 14
slug: recipe-collections
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | web/vitest.config.ts |
| **Quick run command** | `cd web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | COLL-01 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | COLL-02 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | COLL-03 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | COLL-04 | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | COLL-05 | integration | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- TBD — will be populated after planning

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Collection listing visual layout | COLL-02 | Visual/responsive design | Open /en/collections/ on desktop and mobile, verify card layout |
| Recipe badge on detail page | COLL-04 | Visual link rendering | Open a recipe in a collection, verify badge with collection link |
| Strapi admin workflow | COLL-01 | Admin panel UX | Create collection, add recipes, translate to IT/ES |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
