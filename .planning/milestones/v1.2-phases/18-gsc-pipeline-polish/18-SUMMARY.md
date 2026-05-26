---
phase: 18-gsc-pipeline-polish
plan: 01
subsystem: seo
tags: [faq-parser-v2, topical-relevance, indexing-api, indexnow, claude-quality-gate, v1.2-consolidation]
shipped: 2026-05-26
mode: autonomous
---

# Phase 18 — GSC Pipeline Polish

**Goal**: chiudere i 3 deferred-items emersi da Phase 17 (v1.1) execution — FAQ parser-v2 per recuperare ~19 pagine, topical_relevance dimension nel Claude quality gate, IndexNow re-ping su gsc_refresh promotion + doc enable Indexing API.

**Mode:** Autonomous inline (no separate plan-phase agent spawn — scope concentrato + Matteo ha autorizzato "procedi in autonomia").

## Requirements addressed

- ✓ **SEO-13** — FAQ parser-v2 con lookahead positivo per suffix legittimi
- ✓ **SEO-14** — topical_relevance dimension nel Claude review prompt
- ✓ **SEO-15** — IndexNow re-ping su gsc_refresh promotion verificato + doc Indexing API enable

## Changes Made

### SEO-13 — FAQ parser-v2 (`web/src/lib/structured-data.ts`)

**Prima:** `^##\s+(FAQ|Frequently Asked Questions)\s*$` — end-of-line strict. Bloccava `## FAQ at a barbecue` (false-positive guard) ma anche `## Frequently Asked Questions about Propane`, `## FAQ on Wireless Thermometers`, `## FAQ: Quick Tips`, etc.

**Dopo:** regex con suffix lookahead:
- end-of-line strict: `^##\s+(FAQs?|Frequently Asked Questions?)\s*$` → `## FAQ` / `## FAQs` / `## Frequently Asked Question`
- strong separator markers: `\s*[:—–-]\s*\S` → `## FAQ: X`, `## FAQ — X`, `## FAQ - X` (qualunque testo dopo separator)
- preposition whitelist per-locale: `\s+(about|on|for|regarding|concerning)\b` (EN), `\s+(sui|sull[oa]|sulle|riguardo|circa)\b` (IT), `\s+(sobre|acerca|para|de\s+los?)\b` (ES)

**Bloccato (intentionally):** `## FAQ at a barbecue` / `## Domande frequenti durante l'evento` — "at"/"durante" NON sono in whitelist preposizioni.

**Test coverage:** +8 nuovi test (test_detectFaq_en_suffix_about/on/em_dash/colon, test_detectFaq_it_suffix_sui, test_detectFaq_es_suffix_sobre, test_detectFaq_en_narrative_at_blocked, test_detectFaq_it_narrative_durante_blocked). Esistente `test_detectFaq_false_positive_guard` continua a passare correttamente.

**Expected sweep impact (post-deploy):** PASS rate 268/287 (93.4%) → atteso ≥282/287 (98.3%) recuperando i 19 articoli "Frequently Asked Questions about/on X". Da verificare post Hetzner rebuild.

### SEO-14 — topical_relevance dimension (`scripts/agents/prompts/claude_review.md` + `claude_refresh_review.md`)

`claude_review.md` aggiunge sezione **1.5 TOPICAL RELEVANCE** subito dopo FACT ACCURACY, con esempi concreti dal weber-kettle dry-run (sezioni "electric kettle"/"basketball"/"banjo" sono spurie GSC long-tail noise). Severity tiering: 2+ off-topic = critical, 1 prominent = major, 1 short tangent = minor. Verdict di default `needs_human` (autofix risk).

`claude_review.md` JSON schema `category` enum esteso: aggiunto `"topical_relevance"`.

`claude_refresh_review.md` (prompt al Qwen drafter): blocco di warning esplicito su queries GSC spurie con esempio basketball/banjo/electric kettle, regola "ogni H2 deve essere on-topic per current_title + dominio prodotto reale, IGNORA query incompatibili".

### SEO-15 — IndexNow re-ping verifica + doc

Verificato che entrambi i siti di promotion chiamano BOTH request_indexing AND indexnow.ping:
- `claude_review_runner.py:99-106` (Phase 17 publish hook): `_notify_search_engines(url)` → gsc_client.request_indexing(url) + indexnow_client.ping([url])
- `gsc_refresh_review.py:290-291` (Phase 18 refresh promotion): identical pattern, chiamato dopo successful publish

Per Indexing API enable (action manuale Matteo-side): doc `_reference/indexing_api_enabled_2026.md` con:
- Status attuale (NOT ENABLED — SERVICE_DISABLED 403)
- 4-step enable procedure (URL Cloud Console + verify test)
- Fallback path se Matteo decide di NON abilitare (IndexNow + natural crawl + sitemap già sufficienti per molti casi)

## Tests

- vitest `structured-data.test.ts`: **27/27 pass** (era 19, +8 nuovi SEO-13)
- pytest full suite agents: **140/140 pass + 12 skipped** (zero regression vs Phase 17 baseline)

## Files Modified/Created

### Modified
- `web/src/lib/structured-data.ts` (FAQ_HEADING_PATTERNS regex parser-v2)
- `web/src/lib/structured-data.test.ts` (+8 SEO-13 tests)
- `scripts/agents/prompts/claude_review.md` (TOPICAL RELEVANCE section + JSON enum)
- `scripts/agents/prompts/claude_refresh_review.md` (Qwen anti-spurious-query warning)

### Created
- `.planning/milestones/v1.2-phases/18-gsc-pipeline-polish/_reference/indexing_api_enabled_2026.md`
- `.planning/milestones/v1.2-phases/18-gsc-pipeline-polish/18-SUMMARY.md` (this file)

## Deploy

Pure git push → Hetzner webhook auto-rebuild (~3 min) → Astro static build serve nuovo FAQ_HEADING_PATTERNS. Python agent changes (prompts/) sono pickup-ati al prossimo cron run su `.119` (`git pull` daily 05:00 OR su Matteo invocazione manuale dopo push).

## Open follow-up

1. Matteo abilita Indexing API GCP (1-click, doc istruzioni). Dopo: update `_reference/indexing_api_enabled_2026.md` + flip SEO-15 Status → Complete.
2. Sweep `python scripts/sweep_pages.py --check schema` dopo deploy per validare recovery 19→0 FAQ-suffix fails.
3. Prossimo weber-kettle-style dry-run (probabile primo gsc_refresh_review live Sun 31/05) per verificare se topical_relevance dimension cattura correttamente sezioni off-topic.

## Self-Check: PASSED

All 3 requirements addressed in autonomous-mode inline:
- SEO-13 regex updated + 8 tests added + false-positive guard preserved (27/27 vitest pass)
- SEO-14 prompt updated in 2 files (review + refresh-review) + enum extended
- SEO-15 verified existing implementation correct + doc created for human-side action

Phase 18 sandbox: complete. Ready for Phase 19.
