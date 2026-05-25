---
phase: 17
slug: gsc-driven-content-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> See `17-RESEARCH.md` `## Validation Architecture` for the source-of-truth design.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (Python agents) + vitest (web/ TS schema audit) |
| **Config file** | `scripts/agents/pytest.ini` (Wave 0 creates) · `web/vitest.config.ts` (exists) |
| **Quick run command** | `cd scripts/agents && python -m pytest tests/test_<module>.py -x -q` |
| **Full suite command** | `cd scripts/agents && python -m pytest tests/ -q && cd web && npm run test:unit` |
| **Estimated runtime** | ~25 s (agents) + ~12 s (web schema unit) |

---

## Sampling Rate

- **After every task commit:** Run the quick command scoped to the touched module
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite must be green AND sweep_pages.py schema audit must report 0 regressions
- **Max feedback latency:** 30 s (Hetzner Python agents) · 15 s (web vitest)

---

## Per-Task Verification Map

> Filled by the planner. Each row maps a plan task to a verification command. The planner copies REQ-IDs from `17-RESEARCH.md` `## Requirements Mapping`.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-XX | 01 | A | SEO-08 | unit | `pytest tests/test_gsc_client.py -x -q` | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | A | SEO-08 | unit | `pytest tests/test_indexnow_client.py -x -q` | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | A | SEO-08 | integration | `pytest tests/test_publisher_indexing_hook.py -x -q` | ❌ W0 | ⬜ pending |
| 17-02-XX | 02 | B | SEO-09 | unit | `pytest tests/test_meta_optimizer.py -x -q` | ❌ W0 | ⬜ pending |
| 17-02-XX | 02 | B | SEO-10 | unit | `pytest tests/test_keyword_scout_gsc.py -x -q` | ❌ W0 | ⬜ pending |
| 17-02-XX | 02 | B | SEO-10 | unit | `pytest tests/test_content_generator_gsc_priming.py -x -q` | ❌ W0 | ⬜ pending |
| 17-03-XX | 03 | B | SEO-11 | unit | `pytest tests/test_gsc_refresh.py -x -q` | ❌ W0 | ⬜ pending |
| 17-03-XX | 03 | B | SEO-11 | unit | `pytest tests/test_strategist_gsc_digest.py -x -q` | ❌ W0 | ⬜ pending |
| 17-04-XX | 04 | C | SEO-12 | unit | `cd web && npm run test:unit -- structured-data` | ⚠️ partial | ⬜ pending |
| 17-04-XX | 04 | C | SEO-12 | integration | `python web/scripts/sweep_pages.py --check schema` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/agents/pytest.ini` — pytest config (rootdir, conftest discovery, testpaths)
- [ ] `scripts/agents/tests/conftest.py` — shared fixtures (mock GSC SA, fake Strapi, frozen clock)
- [ ] `scripts/agents/tests/fixtures/gsc_search_analytics_sample.json` — GSC API response fixture
- [ ] `scripts/agents/tests/fixtures/gsc_url_inspection_sample.json` — URL Inspection API fixture
- [ ] `scripts/agents/tests/test_gsc_client.py` — stub for SEO-08
- [ ] `scripts/agents/tests/test_indexnow_client.py` — stub for SEO-08
- [ ] `scripts/agents/tests/test_meta_optimizer.py` — stub for SEO-09
- [ ] `scripts/agents/tests/test_keyword_scout_gsc.py` — stub for SEO-10
- [ ] `scripts/agents/tests/test_content_generator_gsc_priming.py` — stub for SEO-10
- [ ] `scripts/agents/tests/test_gsc_refresh.py` — stub for SEO-11
- [ ] `scripts/agents/tests/test_strategist_gsc_digest.py` — stub for SEO-11
- [ ] `pip install google-api-python-client>=2.100.0 google-auth>=2.30.0 pytest>=7.0.0` (Wave 0 installs)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Italian/Spanish power-words selection in meta_optimizer prompt | SEO-09 | Matteo provides 5-10 BBQ-vertical IT power words; cannot be auto-verified | Matteo reviews `state/meta_changes.jsonl` for first 5 IT proposals; sign-off in `17-VERIFICATION.md` |
| Indexing API submission accepted for non-JobPosting URL (best-effort viability) | SEO-08 | Google returns success for many publishers despite official scope; confirm on production property | After Plan 17-01 deploy, manually call `request_indexing()` on 1 blog URL and inspect response code + GSC Coverage report within 48 h |
| GSC Search Analytics query returns IT/ES rows correctly when sc-domain property is filtered by hostingLanguage | SEO-08 | Locale aggregation depends on actual GSC data shape | First execution of `meta_optimizer.py` on Hetzner; inspect output JSONL for IT+ES rows |
| Telegram digest formatting renders correctly in Matteo's client | SEO-11, SEO-12 | Markdown rendering varies per Telegram client | Matteo screenshots first weekly digest; confirms striking-distance + CTR-opportunity sections readable |
| FAQ section auto-detection on existing blog posts (regex heading match) | SEO-12 | Locale-specific heading variants (`## FAQ`, `## Domande frequenti`, `## Preguntas frecuentes`) | After Plan 17-04 deploy, spot-check 5 articles per locale via `sweep_pages.py` output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (pytest.ini, conftest, fixtures, 7 test files, pip deps)
- [ ] No watch-mode flags (CI-safe non-interactive runs only)
- [ ] Feedback latency < 30 s for agent suite, < 15 s for web
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
