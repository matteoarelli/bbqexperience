---
phase: 17-gsc-driven-content-pipeline
plan: 04
subsystem: seo
tags: [schema-org, faqpage, howto, speakable, ai-search-ready, m1-centralized-article-schema, m6-call-idempotent, m9-build-verify, sweep-audit, telegram-coverage]

# Dependency graph
requires:
  - phase: 17-gsc-driven-content-pipeline
    plan: 01
    provides: "IndexNow key file (web/public/133e22d3c55db2ef97c9de8733025635.txt) — 17-04 only verifies existence"
  - phase: 17-gsc-driven-content-pipeline
    plan: 02
    provides: "meta_optimizer.py + meta_review.py with telegram coverage baseline"
  - phase: 17-gsc-driven-content-pipeline
    plan: 03
    provides: "gsc_refresh.py + gsc_refresh_review.py with telegram coverage baseline"
provides:
  - "web/src/lib/structured-data.ts — detectFaqFromMarkdown + extractHowToSteps + buildSpeakableSpec (locale-aware, M6 call-idempotent via matchAll)"
  - "web/src/components/content/ArticleSchema.astro — M1 fix: emette CENTRALMENTE Article + speakable + FAQPage auto-detect + HowTo auto-detect (tutorials only). content + contentType optional props"
  - "web/src/components/content/FaqSection.astro — markdownContent prop per auto-detect; JSON-LD ora centralizzato in ArticleSchema (rende solo HTML visibile)"
  - "web/src/components/tutorial/HowToSchema.astro — standalone JSON-LD HowTo emitter (kept for ad-hoc use)"
  - "scripts/sweep_pages.py — --check {markdown,schema,all} CLI mode; check_schema() audits FAQPage/HowTo/speakable coerence con visible DOM"
  - "scripts/agents/tests/test_sweep_schema.py — 11 pytest tests per sweep schema validation (BeautifulSoup-based selector resolution)"
  - "scripts/agents/state/cron_registry.md — CANONICAL: tutti gli scheduled jobs across Hetzner/.119/Windows + m3 umami note + B5 SDXL window doc"
affects: [phase-18-future-cover-refresh-if-CTR-stays-flat-post-rewrite]

# Tech tracking
tech-stack:
  added:
    - "beautifulsoup4 (era gia' in requirements.txt — confermato installato per sweep_pages.py runtime)"
  patterns:
    - "M1 — centralized schema emission: tutte le pagine blog/tutorial detail (6 callsite EN/IT/ES) beneficiano automaticamente di nuovi schema types senza modifiche per-page"
    - "M6 — call-idempotent regex: .matchAll() invece di while+exec su pattern /g (no stale .lastIndex state tra chiamate consecutive in vitest)"
    - "M9 — Astro build verify: npm run build come final smoke (verifica zero TS errors regression nei file Plan 17-04)"
    - "Backward compat preservata: ArticleSchema content+contentType props OPTIONAL, FaqSection faqs prop legacy ancora supportato"
    - "Strict regex anti-false-positive: ^##\\s+(FAQ|...)\\s*$ richiede heading INTERA riga (catches '## FAQ' ma non '## FAQ at a barbecue')"
    - "Locale fallback uniformato: it/es nativi, tutto il resto -> 'en' (covers 'en-US' etc.)"

key-files:
  created:
    - web/src/lib/structured-data.ts
    - web/src/lib/structured-data.test.ts
    - web/src/components/tutorial/HowToSchema.astro
    - scripts/agents/tests/test_sweep_schema.py
    - .planning/milestones/v1.1-phases/17-gsc-driven-content-pipeline/deferred-items.md
  modified:
    - web/src/components/content/ArticleSchema.astro (M1 fix: speakable + FAQPage + HowTo auto-detect centralized; content + contentType props)
    - web/src/components/content/FaqSection.astro (markdownContent prop; JSON-LD emission rimossa qui — ora central in ArticleSchema)
    - web/src/pages/en/blog/[slug].astro (passa content+contentType ad ArticleSchema)
    - web/src/pages/it/blog/[slug].astro (idem)
    - web/src/pages/es/blog/[slug].astro (idem)
    - web/src/pages/en/tutorials/[slug].astro (passa content+contentType='tutorials')
    - web/src/pages/it/guide/[slug].astro (idem)
    - web/src/pages/es/tutoriales/[slug].astro (idem)
    - scripts/sweep_pages.py (argparse + check_schema + helpers + module-level constants)
    - scripts/agents/state/cron_registry.md (canonicalize all hosts + m3 umami note)

key-decisions:
  - "M1 fix: schema emission centralizzata in ArticleSchema.astro (NOT in 6 individual page templates). Tutte le pagine blog/tutorial che importano ArticleSchema beneficiano automaticamente di speakable + FAQPage + HowTo auto-detect. Riduce drift; un solo wiring point per nuovi schema types futuri."
  - "M6 fix: structured-data.ts usa .matchAll() invece di while + RegExp.exec() su pattern /g (regex con flag /g mantiene .lastIndex tra chiamate, causando false-negative al 2o invoke in vitest). 2 test idempotence (test_detectFaq_called_twice + test_extractHowTo_called_twice) verificano il fix."
  - "M9 fix: aggiunto npm run build come verifica manuale post-Task-2 — copre componente render-time issues che tsc --noEmit non beccia (es. malformed Astro template syntax). Build PASS confermato pre-commit."
  - "FAQPage + HowTo schemas EMESSI anche se Google deprecated rich results (FAQ 7 May 2026, HowTo Sep 2023). Rationale documentato in code: AI engines (Perplexity, ChatGPT browse, Gemini, Bing) consumano ancora — zero-cost AI-search signal."
  - "speakable cssSelectors STRUTTURALI ('article > p:first-of-type', 'article h2'), NON class-based. Resistente a refactor Astro/Tailwind class names. Same selectors esposti come Python constant in sweep_pages.SPEAKABLE_SELECTORS per single source of truth."
  - "HowTo emesso SOLO per contentType='tutorials' (gate in ArticleSchema). Recipes hanno gia Recipe schema (conflict evitato); reviews/blog non sono 'how to' structurally. sweep_pages.py flag-ga se trovate HowTo su recipe."
  - "FAQ detection richiede >=2 Q-A pairs (single Q non e' FAQ). HowTo richiede >=3 steps (Schema.org spec)."
  - "Locale-specific FAQ headings: EN ('FAQ'|'Frequently Asked Questions'), IT ('Domande frequenti'), ES ('Preguntas frecuentes')."
  - "Locale-specific HowTo step headings: EN ('Step N'), IT ('Passo N'), ES ('Paso N'). Pattern 2 fallback: <ol><li> con >=3 items."
  - "m3 fix: cron_registry.md include esplicito NOTE che umami_feedback @ 04:00 UTC e' DENTRO la finestra SDXL ma SAFE (HTTP-only, no Qwen). Regola generale: solo i cron Qwen-dipendenti devono evitare la finestra."
  - "Telegram coverage Phase 17: 12 chiamate send_agent_report distribuite ~3/agente (meta_optimizer, meta_review, gsc_refresh, gsc_refresh_review) — copertura success+empty+error paths (>=8 required, esceed)."
  - "m1 fix: IndexNow key file owned by Plan 17-01 Task 4 Step B. Plan 17-04 Task 5 (checkpoint) si limita a verificare HTTP 200 via curl HEAD — NON ricrea."

requirements-completed: [SEO-12]

# Metrics
duration: ~12 min (automated tasks)
completed: 2026-05-26
---

# Phase 17 Plan 04: schema markup audit + canonical cron registry Summary

**Centralized AI-search-ready schema emission (FAQPage + HowTo + speakable) via single ArticleSchema.astro wiring point, plus extended sweep_pages.py --check schema audit and canonical cron registry.**

## Performance

- **Duration:** ~12 min (started 2026-05-26T12:55:59Z, automated tasks complete ~13:08; Task 5 checkpoint pending Matteo deploy + verify)
- **Tasks:** 4 of 5 automated (Task 5 is human-verify checkpoint — git push + live sweep)
- **Files created:** 5 (3 TS/Astro + 1 pytest + 1 deferred-items.md)
- **Files modified:** 11 (2 Astro components + 6 page templates + sweep_pages.py + cron_registry.md + structured-data tracking)
- **Commits:** 7 (Task 1 RED+GREEN, Task 2 GREEN+wire+component, Task 3 RED+GREEN, Task 4 chore)
- **Tests:** 19 vitest GREEN (structured-data.ts) + 11 pytest GREEN (test_sweep_schema.py) — net 140 pytest passed (was 129, +11, zero regression); web vitest 117 passed across full suite

## Accomplishments

### web/src/lib/structured-data.ts (NEW)

Lightweight parser library, no external dependencies (pure regex on markdown):

- **`detectFaqFromMarkdown(markdown, locale)`** — Locale-aware FAQ section detector. Regex `^##\s+(FAQ|...)\s*$` con flag `/im` (non-global, no stale state). Trova Q-A pairs `### Q\nA` via `.matchAll(qaRegex)` (M6 idempotente). Richiede >=2 pairs. Locale: en/it/es.
- **`extractHowToSteps(markdown, locale, name)`** — Estrae step da heading "## Step N" (EN/IT/ES variants — Passo/Paso) OR `<ol><li>` con >=3 items. Step body truncated a 500 chars. Richiede >=3 step. Usa `.matchAll()` (M6).
- **`buildSpeakableSpec()`** — Ritorna SpeakableSpecification con cssSelector STRUTTURALI (`article > p:first-of-type`, `article h2`). NO xPath (Schema.org spec: cssSelector OR xPath, mai entrambi).

19/19 vitest pass (16 spec'd + 2 M6 idempotence + 1 export contract).

### web/src/components/content/ArticleSchema.astro (M1 — centralized)

Estesa Props con `content?: string` + `contentType?: 'blog-posts'|'reviews'|'recipes'|'tutorials'` (entrambi OPTIONAL — backward compat preservata).

Emette ora 1-3 `<script type="application/ld+json">` blocks:

1. **Article** (sempre) — extended con `speakable: buildSpeakableSpec()` universale.
2. **FAQPage** (conditional) — quando `content` passato AND `detectFaqFromMarkdown()` ritorna >=2 Q-A.
3. **HowTo** (conditional) — quando `content` passato AND `contentType === 'tutorials'` AND `extractHowToSteps()` ritorna >=3 step.

Locale fallback: it/es nativi, tutto il resto -> 'en' per i parser (covers en-US, en-GB).

### web/src/components/content/FaqSection.astro (modified)

JSON-LD FAQPage emission RIMOSSA qui (ora centralizzata in ArticleSchema — evita doppia emission). Aggiunto prop `markdownContent` + `locale` per auto-detect via `detectFaqFromMarkdown()`. Backward compat: prop `faqs` esplicito ancora supportato.

### web/src/components/tutorial/HowToSchema.astro (NEW)

Standalone JSON-LD HowTo emitter — escape hatch per pagine ad-hoc che NON usano ArticleSchema. Uso preferito documentato in comment: pass `content` + `contentType="tutorials"` ad ArticleSchema.

### 6 page templates wired (EN/IT/ES x blog/tutorial)

Passano ora `content={post.content}` (o `tutorial.content`) + `contentType="blog-posts"` (o `tutorials"`) ad ArticleSchema. Nessuna logica aggiuntiva nei template — la modifica e' isolata al singolo blocco ArticleSchema.

### scripts/sweep_pages.py (extended)

Argparse CLI: `--check {markdown,schema,all}` (default `markdown` = legacy behavior preservato), `--limit N`. NUOVO `check_schema(url)` audita FAQPage/HowTo/speakable coerenza con DOM visibile:

- Visible FAQ heading XOR FAQPage JSON-LD -> regression.
- Tutorial con step structure senza HowTo -> regression.
- Recipe con HowTo -> conflict (Recipe schema dominante).
- Article senza speakable -> missing.
- Speakable cssSelectors che NON risolvono a real DOM nodes -> broken.

Helpers `_has_visible_faq`, `_has_step_structure`, `_jsonld_blocks`, `_has_schema_type`, `_speakable_selectors_resolve` esposti come module-level (testabili).

Constants module-level: `FAQ_VISIBLE_HEADINGS`, `HOWTO_STEP_PATTERNS`, `SPEAKABLE_SELECTORS` — single source of truth (SPEAKABLE_SELECTORS deve matchare `buildSpeakableSpec()` di structured-data.ts).

### scripts/agents/state/cron_registry.md (CANONICAL)

Espansione completa da "solo Phase 17" a "tutti gli host + tutte le fonti":

- Hetzner cron (5 entries — seo_optimizer, competitor_monitor, partnership_outreach, umami_feedback, weekly_newsletter)
- Ubuntu .119 (5 entries — keyword_scout, site_bridge, meta_optimizer, gsc_refresh, instagram-bot)
- Windows .124 Task Scheduler (8 entries — content_generator, claude_review_runner, claude_strategist, cover_generator, switch-to-sd/qwen, meta_review, gsc_refresh_review)

**m3 fix:** NOTE esplicita "Eccezioni sicure dentro finestra SDXL" documenta che `umami_feedback @ 04:00 UTC` e' DENTRO la finestra ma SAFE (HTTP-only, no Qwen). Regola generale: solo Qwen-dipendenti evitano la finestra.

Phase 17 status table riassume i 4 plan + telegram coverage assertion result.

### Telegram coverage (B3)

Verifica cross-platform Python (no bash awk pipes):

```
python -c "import pathlib,re; total=sum(len(re.findall(r'send_agent_report', pathlib.Path(f).read_text(encoding='utf-8'))) for f in [...4 agents...])"
```

Output: **12 chiamate totali** (3 per agente — meta_optimizer/meta_review/gsc_refresh/gsc_refresh_review), >= 8 required. Coverage success+empty+error paths confirmed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] beautifulsoup4 not in active Python environment**
- **Found during:** Task 3 (pytest test_sweep_schema.py first run)
- **Issue:** Module `bs4` not importable from system Python — sweep_pages.py import fail. beautifulsoup4 era listato in requirements.txt ma non installato nell'env attivo del worktree.
- **Fix:** `pip install beautifulsoup4` (installed 4.14.3 + soupsieve-2.8.4).
- **Files modified:** none (deps already in requirements.txt — solo install).
- **Commit:** n/a — install non commitable.

**2. [Rule 1 - Bug] test fixture `_check_howto_absent_on_recipe` non aveva h2 in body**
- **Found during:** Task 3 (test_sweep_schema.py first GREEN run)
- **Issue:** Recipe fixture body `<p>Intro</p><ol>...` non aveva `<h2>` quindi speakable selector `article h2` matched 0 nodes, causando il check fail.
- **Fix:** Aggiunto `<h2>Ingredients</h2>` / `<h2>Instructions</h2>` nei 2 test recipe fixtures per renderli realistici (vere recipe pages hanno sezioni).
- **Files modified:** scripts/agents/tests/test_sweep_schema.py
- **Commit:** 7f0d7c0 (incluso nel commit GREEN Task 3).

### Out-of-scope items logged (deferred-items.md)

Pre-existing TypeScript errors discoverati durante `npx tsc --noEmit` per Task 2 (verificati pre-existenti via `git stash` re-check):

1. `web/src/lib/i18n.test.ts:81` — `"nonexistent.key"` not assignable to translation key union. Test intenzionale check del type system; necessita `// @ts-expect-error`.
2. `web/src/lib/rate-limit.ts:2` — `better-sqlite3` missing TypeScript declaration. Fix: `npm i -D @types/better-sqlite3`.

Loggati in `.planning/milestones/v1.1-phases/17-gsc-driven-content-pipeline/deferred-items.md`. Da affrontare in quick-task — NON blocking per v1.1.

## Files

### Created

| File | Lines | Purpose |
|------|-------|---------|
| web/src/lib/structured-data.ts | 154 | FAQ/HowTo parser + speakable builder (M6 idempotent) |
| web/src/lib/structured-data.test.ts | 161 | 19 vitest tests (16 spec + 2 M6 + 1 contract) |
| web/src/components/tutorial/HowToSchema.astro | 53 | Standalone HowTo JSON-LD emitter |
| scripts/agents/tests/test_sweep_schema.py | 200 | 11 pytest sweep schema validator tests |
| .planning/milestones/v1.1-phases/17-gsc-driven-content-pipeline/deferred-items.md | 12 | Out-of-scope TypeScript pre-existing errors |

### Modified

| File | Change | Commit |
|------|--------|--------|
| web/src/components/content/ArticleSchema.astro | M1 fix: speakable + FAQPage + HowTo auto-detect centralized | e78b039 |
| web/src/components/content/FaqSection.astro | markdownContent prop; JSON-LD rimossa (ora in ArticleSchema) | a1a9816 |
| web/src/pages/{en,it,es}/blog/[slug].astro | passa content+contentType="blog-posts" ad ArticleSchema | a1a9816 |
| web/src/pages/{en,it,es}/{tutorials,guide,tutoriales}/[slug].astro | passa content+contentType="tutorials" | a1a9816 |
| scripts/sweep_pages.py | argparse + check_schema + 5 helpers + 3 module constants | 7f0d7c0 |
| scripts/agents/state/cron_registry.md | canonical: tutti gli host + m3 umami note + B5 SDXL refs | 1c06fde |

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 4e8148a | test(17-04): RED tests for structured-data parsers |
| 2 | d956e2e | feat(17-04): structured-data.ts parsers + M6 idempotence |
| 3 | e78b039 | feat(17-04): ArticleSchema centralizes speakable + FAQ + HowTo auto-detect (M1) |
| 4 | a1a9816 | feat(17-04): FaqSection markdown auto-detect + HowToSchema standalone + wire pages |
| 5 | de3b041 | test(17-04): RED tests for sweep_pages schema audit |
| 6 | 7f0d7c0 | feat(17-04): sweep_pages.py --check schema mode + 11 tests GREEN |
| 7 | 1c06fde | chore(17-04): canonicalize cron_registry.md (Phase 17 + m3 umami note) |

## Task 5 Checkpoint — Awaiting Matteo deploy + live verify

Le modifiche schema sono READY-TO-DEPLOY. Workflow Task 5:

```bash
# A. Push to trigger Hetzner webhook rebuild (~2-4 min)
cd C:\Progetti\bbqexperience
git push origin main

# Wait for webhook deploy:
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" \
    root@204.168.153.43 'tail -30 /opt/webhooks/logs/bbqexperience.log'
# Expected: "build success"

# B. Live sweep with --check schema:
python scripts/sweep_pages.py --check schema --limit 50 \
  > .planning/milestones/v1.1-phases/17-gsc-driven-content-pipeline/_reference/sweep_schema_initial.txt 2>&1

# C. Spot-check 3-5 URLs:
curl -s "https://bbq-experience.com/en/blog/[SLUG]" | \
  grep -E '"@type":"(Article|FAQPage|HowTo|SpeakableSpecification)"|"speakable"' | head

# D. IndexNow key file health (m1 fix — Plan 17-01 owner verify):
curl -sI https://bbq-experience.com/133e22d3c55db2ef97c9de8733025635.txt | head -1
# Expected: HTTP/2 200. If 404, go back to Plan 17-01 Task 4 Step B.

# E. Document outcome in _reference/phase17_schema_audit_notes.md
```

**Resume signal:** Type "approved" once sweep PASS rate >= 95% AND IndexNow key file returns 200.

## Phase 17 status

| Plan | Status |
|------|--------|
| 17-01 — Foundation (GSC client + IndexNow + atomic IO + pytest scaffold) | shipped |
| 17-02 — meta_optimizer + GSC priming + X-Skip-Rebuild | shipped |
| 17-03 — gsc_refresh weekly loop + strategist GSC digest | shipped |
| 17-04 — Schema markup audit + cron registry + telegram coverage | shipping (Task 5 checkpoint) |

Phase 17 success criteria status post-17-04 (subject to gsd-verifier final pass):

1. Indexing API + IndexNow best-effort non-blocking — SHIPPED (17-01)
2. meta_optimizer + Claude gate auto-apply — SHIPPED (17-02)
3. keyword_scout striking-distance fusion — SHIPPED (17-02)
4. content_generator GSC priming — SHIPPED (17-02)
5. content_generator publish-hook indexing — SHIPPED (17-01)
6. gsc_refresh + claude_strategist GSC digest — SHIPPED (17-03)
7. Strategist >=3 GSC-anchored recommendations — SHIPPED (17-03 prompt requirement)
8. Schema markup audit (FAQPage/HowTo/speakable) — SHIPPED (17-04)
9. Per-agent Telegram coverage + cron registry — SHIPPED (17-04)

## Known Stubs

None — Plan 17-04 emette schema markup direttamente dal markdown content esistente
(non hardcoded placeholder). Auto-detect "no FAQ section -> no FAQPage emitted" e'
behavior corretto, NON stub.

## Self-Check: PASSED

- web/src/lib/structured-data.ts — FOUND
- web/src/lib/structured-data.test.ts — FOUND
- web/src/components/content/ArticleSchema.astro — FOUND (modified, M1 fix applied)
- web/src/components/content/FaqSection.astro — FOUND (modified, markdownContent prop)
- web/src/components/tutorial/HowToSchema.astro — FOUND
- scripts/sweep_pages.py — FOUND (modified, --check schema mode)
- scripts/agents/tests/test_sweep_schema.py — FOUND (11 tests)
- scripts/agents/state/cron_registry.md — FOUND (canonical, m3 fix)
- web/src/pages/{en,it,es}/blog/[slug].astro — FOUND (modified, content+contentType wired)
- web/src/pages/{en,it,es}/{tutorials,guide,tutoriales}/[slug].astro — FOUND (modified)
- 4e8148a (RED tests structured-data) — FOUND
- d956e2e (GREEN structured-data) — FOUND
- e78b039 (ArticleSchema M1) — FOUND
- a1a9816 (FaqSection + HowToSchema + wire) — FOUND
- de3b041 (RED tests sweep) — FOUND
- 7f0d7c0 (GREEN sweep) — FOUND
- 1c06fde (cron_registry canonical) — FOUND
