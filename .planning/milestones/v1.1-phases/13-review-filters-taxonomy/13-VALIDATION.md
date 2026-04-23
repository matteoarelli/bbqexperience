---
phase: 13
slug: review-filters-taxonomy
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 13-01-T1 | 01 | 1 | FILT-01, FILT-03, FILT-04 | unit | `cd web && npx vitest run tests/filters.test.ts --reporter=verbose 2>&1 \| tail -30` | ✅ W0 (created in task) | ⬜ pending |
| 13-01-T2 | 01 | 1 | FILT-06 | static | `grep -c "noindex" web/src/components/common/SEOHead.astro && grep -c "noindex" web/src/layouts/BaseLayout.astro && node -e "const en=require('./web/src/i18n/en.json'); console.log(en.filters ? 'EN-OK' : 'EN-MISSING')"` | ✅ existing | ⬜ pending |
| 13-01-T3 | 01 | 1 | FILT-06 | unit | `cd web && npx vitest run tests/seo-head.test.ts --reporter=verbose 2>&1 \| tail -20` | ✅ W0 (created in task) | ⬜ pending |
| 13-03-T1 | 03 | 1 | FILT-01, FILT-03 | static | `cd C:/Users/Matteo/Desktop/Progetti/bbqexperience && python scripts/fix_review_data.py --dry-run 2>&1 \| tail -10` | ✅ created in task | ⬜ pending |
| 13-03-T2 | 03 | 1 | FILT-03 | manual | checkpoint:human-verify (Matteo verifies prices in Strapi admin) | N/A | ⬜ pending |
| 13-02-T1 | 02 | 3 | FILT-01, FILT-05, FILT-06, FILT-07 | static | `cd web && npx astro check 2>&1 \| tail -20 && grep -c "noindex" src/pages/en/reviews/index.astro && grep -c "Astro.redirect" src/pages/en/reviews/category/\[category\].astro` | ✅ existing | ⬜ pending |
| 13-02-T2 | 02 | 3 | FILT-01, FILT-06 | static | `grep -c "parseFilterParams" web/src/pages/it/recensioni/index.astro && grep -c "parseFilterParams" web/src/pages/es/resenas/index.astro && grep -c "noindex" web/src/pages/it/recensioni/index.astro && grep -c "noindex" web/src/pages/es/resenas/index.astro` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 test files are created as part of Plan 01 tasks themselves (tdd="true"):
- `web/tests/filters.test.ts` — created in Plan 01 Task 1 (RED before implementation)
- `web/tests/seo-head.test.ts` — created in Plan 01 Task 3 (RED before implementation)

*Both files are authored by the executor as part of the TDD cycle, not pre-existing stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price data accuracy in Strapi admin | FILT-03 | Estimated EUR prices need human judgment to correct | After running `python scripts/fix_review_data.py`, open Strapi admin -> Content Manager -> Product, verify and correct prices |
| Bottom-sheet drawer UX on mobile | FILT-07 | Visual/interaction behavior on real viewport | Open /en/reviews/ on <=768px device, tap filter icon, verify bottom-sheet with sticky "Apply (N)" button |
| Live count badges update | FILT-05 | Visual count accuracy needs human verification | Select brand filter, verify count badge matches actual filtered results |
| Deep-link reload reproduces state | FILT-01 | Browser reload behavior | Copy filtered URL, paste in new tab, verify same filters applied |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are checkpoint:human-verify (manually justified)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 test files created as TDD first step within Plan 01 tasks
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
