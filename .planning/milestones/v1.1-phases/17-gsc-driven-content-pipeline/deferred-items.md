# Deferred Items - Phase 17

## Pre-existing TypeScript errors (out of scope for Plan 17-04)

Discovered during `npx tsc --noEmit` verification for Plan 17-04 Task 2.
Both errors exist on main branch BEFORE Plan 17-04 changes (verified via git stash + re-check).

1. `web/src/lib/i18n.test.ts:81` — `"nonexistent.key"` not assignable to translation key union type. This is an INTENTIONAL test for the i18n type-safety system (test is checking the type system catches invalid keys). Likely needs `// @ts-expect-error` comment or `as never` cast.

2. `web/src/lib/rate-limit.ts:2` — `better-sqlite3` missing TypeScript declaration. Fix: `npm i -D @types/better-sqlite3`.

Both should be addressed in a quick-task (`/gsd:quick`) — not blocking for v1.1.

## FAQ heading suffix non rilevato (scoperto 2026-05-26 da sweep schema live)

Sweep live `python scripts/sweep_pages.py --check schema --limit 30` post Phase 17-04 deploy ha rilevato 12 pagine EN flaggate "Visible FAQ section but NO FAQPage JSON-LD":
- `/en/blog/best-bbq-grills-propane/`
- `/en/blog/charcoal-vs-gas-vs-pellet-grill-the-definitive-comparison/`
- `/en/blog/best-meat-thermometer-for-grilling/`
- `/en/blog/best-meat-thermometer-wireless/`
- `/en/blog/best-meat-thermometer-uk/`
- `/en/blog/best-bbq-grill/`
- `/en/blog/best-meat-thermometer/`
- `/en/blog/deep-dive-indulge-in-a-smokehouse-feast-this-weekend/`
- `/en/blog/instant-read-vs-leave-in-probe-vs-wireless-which-thermometer-do-you-need/`
- `/en/blog/deep-dive-when-you-marinate-pork-in-dr-pepper-and-smoke-it-until-it-turns-into-p/`
- (+ 2 altri)

**Causa:** `FAQ_HEADING_PATTERNS.en` in `web/src/lib/structured-data.ts` richiede end-of-line strict (`^##\s+(FAQ|Frequently Asked Questions)\s*$`). Articoli reali usano forme con suffix tipo:
- `## Frequently Asked Questions about Propane Grills`
- `## Frequently Asked Questions on Wireless Thermometers`
- `## FAQ — Best Practices`

**Trade-off attuale:** Pattern strict evita false-positive `## FAQ at a barbecue` (narrative, non Q-A section). Pattern permissivo (`\b` word boundary) lo cattura ma rompe il test `test_detectFaq_false_positive_guard`.

**Fix proposto (Phase 18 o quick-task):** regex con lookahead positivo per suffix legittimi:
```ts
en: /^##\s+(FAQs?|Frequently Asked Questions?)(\s*$|[\s:]+(about|on|for|regarding|—)\b)/im,
```
+ aggiornare test_detectFaq_false_positive_guard con casi più rigorosi.

**Impatto:** 12/101 pagine (12%) non emettono FAQPage JSON-LD ma hanno FAQ visibile. Non causano SEO penalty (FAQ rich result deprecato da Google il 7/5/2026 comunque); l'impatto è solo su consumo AI search engines che continuano a leggerlo. Acceptable trade-off per Phase 17 ship; tracked per follow-up.

## Quality gate topical_relevance dimension (scoperto 2026-05-26 da 17-03 dry-run weber-kettle)

Dry-run `gsc_refresh_review.py --dry-run` su weber-kettle-vs-big-green-egg ha generato 7 sezioni di cui 3 off-topic (basket/banjo/electric kettle review) perché Claude/Qwen hanno trattato GSC queries spurie long-tail come keyword intent reale. Il Claude quality gate ha bloccato per `fact_accuracy` issues (peso/prezzo contraddittori) ma NON ha esplicitamente flaggato `topical_relevance`. Future iterazione: aggiungere `topical_relevance` come dimension nel prompt `claude_refresh_review.md` per catturare sezioni semanticamente fuori scope rispetto al titolo.

## Speakable selectors fix history (scoperto 2026-05-26 — risolto in-place)

Prima iterazione 17-04 ha hardcodato `['article > p:first-of-type', 'article h2']` come selectors strutturali per speakable. Sweep live ha rilevato che il DOM BBQ ha:
- `<p>` diretti di `<article>` = solo meta info (`.last-updated`), non content
- `<h2>` esistono solo annidati in `<div class="content-body">` (NON direct children di `<article>`)

→ 101/101 PASS rate iniziale = 0% (tutti i selectors matchavano 0 nodes).

**Fix applicato** (commit `a268365`): selectors aggiornati a `['.content-body p:first-of-type', '.content-body h2']` su entrambi `structured-data.ts` + `sweep_pages.py` (mantenute in sync). PASS rate post-fix: ~89/101 (88%).

**Fix supplementare** (questo commit): logica `_speakable_selectors_resolve` cambiata da "tutti devono matchare" → "almeno uno deve matchare" (Schema.org cssSelector array spec). Permette agli articoli short senza h2 di passare. PASS rate finale atteso: ~89/101 (88%) → ~94/101 (93%, recuperando i 5 fail "h2 matched 0").
