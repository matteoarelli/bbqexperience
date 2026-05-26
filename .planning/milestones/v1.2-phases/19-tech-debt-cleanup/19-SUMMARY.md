---
phase: 19-tech-debt-cleanup
plan: 01
subsystem: housekeeping
tags: [typescript, debt-closure, retroactive-verification, v1.2-consolidation]
shipped: 2026-05-26
mode: autonomous
---

# Phase 19 — Tech Debt Cleanup

**Goal:** chiudere il backlog di tech debt accumulato attraverso v1.0+v1.1 — niente critico ma niente è bello da lasciare.

**Mode:** Autonomous inline (no plan-phase agent spawn — 3 piccoli fix, ~10 min total).

## Requirements addressed

- ✓ **DEBT-04** — TypeScript errors pre-existing risolti
- ✓ **DEBT-05** — Phase 10 missing VERIFICATION.md backfilled
- ✓ **DEBT-06** — Phase 14 plan-02 status corretto + state file orphan cleanup

## Changes Made

### DEBT-04 — TypeScript errors

**Prima:** `cd web && npx tsc --noEmit` exitcode 1 con 2 errori:
1. `src/lib/i18n.test.ts:81` — `Argument of type '"nonexistent.key"' is not assignable to TranslationKey union`
2. `src/lib/rate-limit.ts:2` — `Could not find a declaration file for module 'better-sqlite3'`

**Dopo:**
1. `i18n.test.ts:81` — aggiunto `// @ts-expect-error` directive con commento spiegativo (è un test INTENTIONAL del fallback runtime per chiavi invalide; il type system correttamente cattura, il test verifica la behavior runtime).
2. `npm i -D @types/better-sqlite3` installato in web/package-lock.json. Type declaration ora available.

**Verify:** `cd web && npx tsc --noEmit` → exit code 0. Zero TS errors.

### DEBT-05 — Phase 10 missing VERIFICATION.md

**Prima:** `v1.1-MILESTONE-AUDIT.md` (datato 2026-04-16) flaggava:
> "Missing phase-level 10-VERIFICATION.md (evidence distributed across 5 plan SUMMARYs; asymmetric with 10.1-VERIFICATION.md which is complete)"

**Dopo:** `.planning/milestones/v1.1-phases/10-debt-closure-measurement-baseline/10-VERIFICATION.md` creato retroattivamente. Consolida evidence da:
- Plan 10-01 SUMMARY (backfill VERIFICATION phases 03-05)
- Plan 10-02 SUMMARY (backfill VERIFICATION phases 06-09)
- Plan 10-03 SUMMARY (REQUIREMENTS traceability reconcile v1.0)
- Plan 10-04 SUMMARY (Lighthouse baseline initial)
- Plan 10-05 SUMMARY (Lighthouse fixes Plan 04)
- Phase 10.1 SUMMARY (Cloudflare image transformations — DEBT-03 residual closure)

**Status frontmatter:** `passed` (goal achievement 100%). 4/4 success criteria PASS. Marked `backfilled: true`.

### DEBT-06 — Phase 14-02 status + state cleanup

**Phase 14-02 status fix:**
- ROADMAP line 145 era `- [ ] 14-02-PLAN.md` (Not done) ma `14-02-SUMMARY.md` esiste e Phase 14 è marcato Complete nel ROADMAP progress table — incoherenza.
- Verificato via `ls`: SUMMARY presente. Flipped checkbox a `[x]`.

**State file orphan cleanup:**
- `scripts/agents/state/gsc_refresh_queue.jsonl` (10 records, dry-run testing Phase 17) presente locally ma già gitignored (state/* in .gitignore). Rimosso da filesystem locale (non era committato).
- Resto di `state/` (cron_registry.md, power_words_*, README) tracked legittimamente (via git add -f durante Phase 17).

## Tests

- `cd web && npx tsc --noEmit` → **exit 0** (zero errors, vs precedente 2 errors)
- `cd web && npx vitest run` → tutto verde (i18n.test.ts continua a passare con `@ts-expect-error`)
- pytest agents full suite: nessuna modifica al code Python → no re-test needed

## Files Modified/Created

### Modified
- `web/src/lib/i18n.test.ts` (@ts-expect-error directive + comment)
- `web/package.json` + `package-lock.json` (devDep `@types/better-sqlite3`)
- `.planning/milestones/v1.1-ROADMAP.md` (14-02-PLAN.md `[ ]` → `[x]`)

### Created
- `.planning/milestones/v1.1-phases/10-debt-closure-measurement-baseline/10-VERIFICATION.md` (retroactive backfill)
- `.planning/milestones/v1.2-phases/19-tech-debt-cleanup/19-SUMMARY.md` (this file)

### Removed
- `scripts/agents/state/gsc_refresh_queue.jsonl` (local-only, was gitignored)

## Self-Check: PASSED

All 3 requirements (DEBT-04, DEBT-05, DEBT-06) addressed in autonomous-mode inline. Zero regressions. TypeScript build clean. v1.1-MILESTONE-AUDIT tech_debt item su missing 10-VERIFICATION can now flip to `resolved` (left for next milestone audit cycle).
