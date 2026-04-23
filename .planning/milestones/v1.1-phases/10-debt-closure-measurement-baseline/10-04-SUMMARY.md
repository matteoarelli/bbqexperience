---
phase: 10-debt-closure-measurement-baseline
plan: 04
subsystem: measurement / performance-audit
tags: [lighthouse, performance, measurement, baseline, debt-closure]
status: gaps_found
requirements_completed: [DEBT-03-measurement]
dependency_graph:
  requires:
    - "Phase 10 Plan 02 (VERIFICATION.md retroactive) completed, including the 09-VERIFICATION.md that flagged DES-04 as deferred to this plan"
    - "Production site reachable at https://bbq-experience.com (all 15 target URLs returned HTTP 200)"
    - "Strapi CMS reachable at https://cms.bbq-experience.com for slug discovery"
  provides:
    - ".planning/artifacts/lighthouse-v1.1-baseline/ --- 15 Lighthouse JSON reports + SUMMARY.md + selected-slugs.json"
    - "DEBT-03 measurement baseline established (7/15 pass, 8/15 sub-90 on Performance)"
    - "Sub-90 fix target list for Plan 10-05 (LCP optimization scope)"
  affects:
    - "Plan 10-05 (conditional) --- now required due to gaps_found status"
    - "REQUIREMENTS.md DEBT-03 row --- marked partial; closed after Plan 10-05 ships"
tech_stack:
  added:
    - "Lighthouse 13.1.0 (npx, transient --- no dependency added to package.json)"
  patterns:
    - "Mobile form-factor + simulated throttling for DES-04-aligned Lighthouse measurement"
    - "File + score validation instead of exit-code check (works around Windows chrome-launcher EPERM tmp cleanup)"
    - "Skip-cache on valid reports (safe partial re-runs via run-audits.mjs)"
    - "Manifest-driven URL selection (selected-slugs.json as canonical input) for reproducibility"
key_files:
  created:
    - .planning/artifacts/lighthouse-v1.1-baseline/selected-slugs.json
    - .planning/artifacts/lighthouse-v1.1-baseline/build-manifest.mjs
    - .planning/artifacts/lighthouse-v1.1-baseline/run-audits.mjs
    - .planning/artifacts/lighthouse-v1.1-baseline/build-summary.mjs
    - .planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md
    - .planning/artifacts/lighthouse-v1.1-baseline/home-en.json
    - .planning/artifacts/lighthouse-v1.1-baseline/home-it.json
    - .planning/artifacts/lighthouse-v1.1-baseline/home-es.json
    - .planning/artifacts/lighthouse-v1.1-baseline/review-en.json
    - .planning/artifacts/lighthouse-v1.1-baseline/review-it.json
    - .planning/artifacts/lighthouse-v1.1-baseline/review-es.json
    - .planning/artifacts/lighthouse-v1.1-baseline/recipe-en.json
    - .planning/artifacts/lighthouse-v1.1-baseline/recipe-it.json
    - .planning/artifacts/lighthouse-v1.1-baseline/recipe-es.json
    - .planning/artifacts/lighthouse-v1.1-baseline/tutorial-en.json
    - .planning/artifacts/lighthouse-v1.1-baseline/tutorial-it.json
    - .planning/artifacts/lighthouse-v1.1-baseline/tutorial-es.json
    - .planning/artifacts/lighthouse-v1.1-baseline/blog-en.json
    - .planning/artifacts/lighthouse-v1.1-baseline/blog-it.json
    - .planning/artifacts/lighthouse-v1.1-baseline/blog-es.json
  modified: []
decisions:
  - "Mobile form-factor + simulated throttling chosen over desktop preset to match DES-04 original Lighthouse measurement context and the live mobile-first audience."
  - "Skip-on-valid logic in run-audits.mjs (cache by file existence + score != null) enables safe partial re-runs without a state file."
  - "Slug selection pulls 'latest published per locale' per content type from Strapi, with HTTP-200 validation on the production URL before committing. Avoids manual slug-list drift."
  - "Windows EPERM tmp cleanup in chrome-launcher treated as non-fatal --- validation is done on the written JSON file + categories.performance.score field, not on the CLI exit code."
  - "Split build-manifest.mjs / run-audits.mjs / build-summary.mjs --- each stage is independently re-runnable, which will matter for Plan 10-05 re-measurement cycles."
metrics:
  duration_minutes: 26
  tasks_completed: 3
  completed_date: 2026-04-15
---

# Phase 10 Plan 04: Lighthouse v1.1 Baseline Summary

Re-measure Lighthouse 90+ across 15 representative pages (5 types x 3 locales) to close the DEBT-03 measurement debt left by the post-v1.0 v3.2 UI/SEO changes --- Accessibility / Best Practices / SEO pass everywhere (>=95), but **Performance scores 86-89 on 8 of 15 pages** (mobile LCP 3.4-3.8 s), so DEBT-03 is split into a measurement half (closed here) and a fix half (now required via Plan 10-05).

## One-Liner

Lighthouse v1.1 baseline: 7/15 pages fully >=90, 8/15 sub-90 on Performance only --- all driven by mobile LCP 3.4-3.8 s; fix targets handed off to Plan 10-05.

## Scope Delivered

- **Measurement harness** --- 3 small Node scripts (build-manifest, run-audits, build-summary) that can be re-run end-to-end in ~5 min (or only the changed pages via skip-cache). No runtime dependency added to `package.json` --- Lighthouse is invoked via `npx --yes lighthouse@latest` so re-running on CI or another workstation needs nothing beyond Node 22 and Chrome.
- **15 JSON reports + SUMMARY.md** --- one Lighthouse JSON per (type,locale) + a human-readable 15-row score matrix with pass/fail annotation + sub-90 diagnostics.
- **Fix target list for Plan 10-05** --- concrete audit IDs (`largest-contentful-paint`, `render-blocking-insight`, `lcp-discovery-insight`, `image-delivery-insight`, `unused-javascript`, `unsized-images`, `document-latency-insight`) with the pages each one affects and recommended remediation bullets.

## Score Summary

| Category | Min | Max | Median | Pages >=90 |
|----------|-----|-----|--------|------------|
| Performance | 86 | 93 | 89 | 7 / 15 |
| Accessibility | 95 | 100 | 100 | 15 / 15 |
| Best Practices | 96 | 96 | 96 | 15 / 15 |
| SEO | 100 | 100 | 100 | 15 / 15 |

Sub-90 pages (Performance only): home-en (86), home-it (87), home-es (87), review-en (86), review-it (87), review-es (87), tutorial-it (89), blog-en (89).

## DEBT-03 Disposition

**Partial closure (measurement half).** DEBT-03 in REQUIREMENTS.md remains open until Plan 10-05 ships fixes and re-runs Lighthouse to confirm every page >=90 on every category. The trigger for Plan 10-05 is the `status: gaps_found` frontmatter on `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` --- the orchestrator reads this directly.

## Deviations from Plan

**[Rule 3 - Blocking] Windows chrome-launcher EPERM tmp cleanup**
- **Found during:** Task 2 (first run wrote 15 error-stub files even though the JSON reports were valid)
- **Issue:** On Windows, `chrome-launcher` fails its post-run temp-dir cleanup with EPERM on `C:\Users\...\AppData\Local\Temp\lighthouse.<pid>`, causing Lighthouse to exit with code 1 AFTER writing a complete JSON report. The original runner treated non-zero exit as failure and wrote error stubs, clobbering valid reports.
- **Fix:** Changed `run-audits.mjs` to validate the output file + `categories.performance.score` field directly and ignore the exit code. Cleaned up already-stubbed files and re-ran; all 15 produced valid reports.
- **Files modified:** `.planning/artifacts/lighthouse-v1.1-baseline/run-audits.mjs`
- **Commit:** `1934c94`

**[Rule 3 - Blocking] Concurrent runners racing on output files**
- **Found during:** Task 2 (mid-run --- a prior background invocation of run-audits.mjs from the first attempt was still alive and overwrote files written by the fixed re-run)
- **Issue:** Two `node run-audits.mjs` processes running simultaneously produced a race where one would write a valid report, the other would retry and overwrite with a stub.
- **Fix:** Killed the stale PID tree, cleaned error stubs (kept valid reports via the skip-cache check), re-ran exclusively. 15/15 passed.
- **Files modified:** None (runtime-only fix)
- **Commit:** N/A

**[Rule 3 - Blocking] jq unavailable on Windows host**
- **Found during:** Task 1 preflight
- **Issue:** Plan's score-extraction snippet uses `jq`, which is not installed on the Windows host.
- **Fix:** Replaced all `jq` invocations with equivalent Node one-liners. Documented the substitution in SUMMARY.md "Reproducibility" section so future re-runs don't re-trip the same problem.
- **Files modified:** `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` (Reproducibility section)
- **Commit:** `a1d1f9d`

## Artifacts Produced

All under `.planning/artifacts/lighthouse-v1.1-baseline/`:

| Artifact | Purpose |
|----------|---------|
| `selected-slugs.json` | Canonical manifest of 15 validated URLs (reproducibility) |
| `build-manifest.mjs` | Regenerates selected-slugs.json from Strapi + 200-check |
| `run-audits.mjs` | Runs Lighthouse for every target, skips cached valid reports |
| `build-summary.mjs` | Generates SUMMARY.md from the 15 JSON reports |
| `SUMMARY.md` | Human-readable score matrix + sub-90 diagnostics + fix targets |
| `<id>.json` x 15 | Raw Lighthouse reports (home/review/recipe/tutorial/blog x en/it/es) |

## Next Step

**Plan 10-05 is required** (triggered by `status: gaps_found`). Its scope is the Sub-90 Findings -> Fix Targets table in SUMMARY.md: lift mobile LCP on home / review / tutorial-it / blog-en, then re-run `run-audits.mjs` + `build-summary.mjs` to confirm every page hits >=90. At that point DEBT-03 closes fully in REQUIREMENTS.md.

## Self-Check: PASSED

- `.planning/artifacts/lighthouse-v1.1-baseline/SUMMARY.md` --- FOUND (status: gaps_found confirmed)
- `.planning/artifacts/lighthouse-v1.1-baseline/selected-slugs.json` --- FOUND (15 targets)
- `.planning/artifacts/lighthouse-v1.1-baseline/<id>.json` x 15 --- all FOUND and valid (categories.performance.score present)
- Commits `7d64a0c` (Task 1), `1934c94` (Task 2), `a1d1f9d` (Task 3) --- all in git log
