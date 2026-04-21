---
phase: 13
slug: review-filters-taxonomy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | web/vitest.config.ts or "none — Wave 0 installs" |
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
| 13-01-01 | 01 | 1 | FILT-01 | integration | `curl -s "localhost:4321/en/reviews/?brand=weber" \| grep noindex` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | FILT-03 | integration | `curl -s "localhost:4321/en/reviews/?price=300-800" \| grep noindex` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | FILT-04 | integration | `curl -s "localhost:4321/en/reviews/?score=7" \| grep noindex` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | FILT-05 | e2e | Mobile bottom-sheet drawer opens on ≤768px | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | FILT-06 | integration | `curl -s "localhost:4321/en/reviews/?brand=weber" \| grep 'rel="canonical"'` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | FILT-07 | integration | Zero-match state renders "Clear filters" button | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for filter URL query parameter handling
- [ ] Test stubs for canonical/noindex meta tag verification
- [ ] Existing infrastructure covers most phase requirements via curl integration tests

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom-sheet drawer UX on mobile | FILT-05 | Visual/interaction behavior on real viewport | Open /en/reviews/ on ≤768px device, tap filter icon, verify bottom-sheet with sticky "Apply (N)" button |
| Live count badges update | FILT-01 | Visual count accuracy needs human verification | Select brand filter, verify count badge matches actual filtered results |
| Deep-link reload reproduces state | FILT-04 | Browser reload behavior | Copy filtered URL, paste in new tab, verify same filters applied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
