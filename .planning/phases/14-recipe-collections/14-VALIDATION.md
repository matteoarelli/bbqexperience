---
phase: 14
slug: recipe-collections
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 01-T1 | 01 | 1 | COLL-01 | behavioral grep | `grep -q "author_note" schema.json && grep -q "StrapiRecipeCollection" types.ts && grep -q "raccolte" i18n.ts` + tsc --noEmit | yes (existing files) | pending |
| 01-T2 | 01 | 1 | COLL-01 | behavioral grep | `test -f CollectionCard.astro && test -f CollectionBadge.astro && grep -q "getStrapiMediaURL" CollectionCard.astro` + tsc --noEmit | yes (new files) | pending |
| 02-T1 | 02 | 2 | COLL-02 | behavioral grep | `grep -q "availableLocales" SEOHead.astro && grep -q "hreflangLocales" SEOHead.astro && test -f collections/index.astro` + tsc --noEmit | yes | pending |
| 02-T2 | 02 | 2 | COLL-03 | behavioral grep | `test -f collections/[slug].astro && grep -q "availableLocales" [slug].astro && grep -q "renderMarkdown" [slug].astro` + tsc --noEmit | yes | pending |
| 02-T3 | 02 | 2 | COLL-04 | behavioral grep | `grep -q "CollectionBadge" recipes/[slug].astro && grep -q "collection?" types.ts` + tsc --noEmit | yes | pending |
| 03-T1 | 03 | 2 | COLL-05 | behavioral grep | `grep -q "recipe-collections" sitemap.xml.ts && grep -q "xmlns:xhtml" sitemap.xml.ts && grep -q "xhtml:link" sitemap.xml.ts` + tsc --noEmit | yes | pending |
| 03-T2 | 03 | 2 | COLL-05 | unit test | `npx vitest run tests/sitemap-collections.test.ts` | web/tests/sitemap-collections.test.ts (created in task) | pending |
| 03-T3 | 03 | 2 | ALL | human verify | Human approves 7-step checklist | n/a | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- Plan 03 Task 2 creates `web/tests/sitemap-collections.test.ts` (sitemap hreflang unit test)
- All other tasks use behavioral grep + tsc --noEmit for automated verification (no separate Wave 0 test scaffold needed -- grep checks assert specific patterns exist in output files)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Collection listing visual layout | COLL-02 | Visual/responsive design | Open /en/collections/ on desktop and mobile, verify card layout |
| Recipe badge on detail page | COLL-04 | Visual link rendering | Open a recipe in a collection, verify badge with collection link |
| Strapi admin workflow | COLL-01 | Admin panel UX | Create collection, add recipes, translate to IT/ES |
| SEOHead backward compatibility | COLL-03 | Regression check | Open any existing page (e.g. /en/recipes/), view source, confirm 3 hreflang links still emitted |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify with behavioral checks (not tsc-only)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers test file creation (sitemap-collections.test.ts in Plan 03 Task 2)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
