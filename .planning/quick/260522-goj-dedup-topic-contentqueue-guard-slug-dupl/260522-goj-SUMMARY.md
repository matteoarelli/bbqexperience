---
quick_id: 260522-goj
title: "Dedup topic ContentQueue — guard slug duplicati"
completed: 2026-05-22
status: done
---

# Quick Task 260522-goj — Dedup topic ContentQueue (guard slug duplicati) Summary

Centralizzato lo slugify in un unico modulo condiviso e aggiunto un guard difensivo che evita di generare/accodare articoli con slug già pubblicato, eliminando il `400 ValidationError: slug must be unique` al quality gate.

## Cosa è stato fatto

### Task 1 — Shared slugify module
- Nuovo `scripts/agents/lib/slugify.py` con `slugify(title) -> str` che replica esattamente la pipeline storica di `content_generator.generate_slug` (lower → strip → `[^a-z0-9\s-]` → spazi→`-` → collapse `-+` → `[:80]` → `.strip("-")`).
- `content_generator.generate_slug` ora delega a `lib.slugify.slugify`; rimosso l'import `re` ormai inutilizzato.
- Collocato in `lib/` per evitare import circolari (`content_generator` già importa `keyword_scout`): tutti e tre i file lo importano indipendentemente.

### Task 2 — Guard slug in content_generator (chokepoint)
- `published_slug_exists(content_type_strapi, slug) -> bool`: `strapi.find(ct, filters={"slug": {"$eq": slug}}, page_size=1)` → `meta.pagination.total > 0`.
- **Difensivo**: se la query Strapi solleva (timeout/rete), logga e ritorna `False` — non blocca mai la pipeline notturna non presidiata. Slug vuoto → `False`.
- In `get_next_acceptable_queue_item`, dopo il pass di `is_acceptable_topic`: calcola `slug = slugify(title)`, `ct = STRAPI_CONTENT_TYPES.get(...)` e se lo slug è già pubblicato marca l'item `status="failed"` con `generation_log="Duplicate slug (already published): <slug>"` e prosegue al prossimo (dentro il loop `max_attempts` esistente).

### Task 3 — Dedup a monte
- `ig_to_content.py`: helper locale `_published_slug_exists` (stesso pattern difensivo) + mappa `STRAPI_CONTENT_TYPES`. Prima di `strapi.create` calcola lo slug e `return None` con log se già pubblicato. Helper locale (non import da content_generator) per non trascinare la catena `claude_client`.
- `keyword_scout.py`: `slug_version = kw.replace(" ", "-")` → `slug_version = slugify(kw)`, allineato allo slug reale generato da Strapi (gli `existing_titles` contengono gli slug pubblicati).

### Task 4 — Test
- Nuovo `scripts/agents/tests/test_slugify_dedup.py` (12 test, nessuna dipendenza di rete, `strapi.find`/`update` mockati via `monkeypatch`):
  - `slugify`: caso "Deep Dive: Indulge…", punteggiatura, collapse, troncamento 80, no trailing dash post-troncamento, stringa vuota.
  - `published_slug_exists`: total>0 → True, total=0 → False, errore rete → False (difensivo), slug vuoto → False.
  - `get_next_acceptable_queue_item`: item con slug duplicato → marcato failed e skippato + prossimo item nuovo ritornato; item con slug nuovo → ritornato subito.

## Verifica (esiti reali)

- **py_compile**: pulito su tutti i 5 file Python toccati (`lib/slugify.py`, `content_generator.py`, `ig_to_content.py`, `keyword_scout.py`, `tests/test_slugify_dedup.py`).
- **Test**: `python -m pytest scripts/agents/tests/test_slugify_dedup.py scripts/agents/tests/test_ab_tester.py -q` → **19 passed in 0.06s** (12 nuovi + 7 esistenti, nessuna regressione). Nota: pytest non era installato nel Python 3.12 su PATH; installato per eseguire i test (la suite usa il fixture `monkeypatch`).

## Enum status usato per lo skip duplicati

`status="failed"` — **valore valido** dell'enum `status` del content type `content-queue` (schema: `["idea", "research", "ready", "generating", "draft_review", "published", "failed"]`, file `cms/src/api/content-queue/content-types/content-queue/schema.json`). Nessuna modifica di schema necessaria. È lo stesso valore già usato dal filtro `is_acceptable_topic` e dal gate per gli scarti.

## Deviazioni dal piano

- **[Rule 3] Installato `pytest`** nel Python 3.12 su PATH: il cache dei test esistenti indicava Python 3.14 + pytest 9.0.2, ma sul PATH c'è solo 3.12 senza pytest. Installato `pytest 9.0.3` per eseguire realmente i test (la suite richiede il fixture `monkeypatch`). Nessun file di progetto modificato per questo.
- **[Rule 1] Rimosso import `re` inutilizzato** in `content_generator.py` dopo che `generate_slug` delega a `lib.slugify`. Mantiene py_compile/lint pulito.

## File toccati

Created:
- `scripts/agents/lib/slugify.py`
- `scripts/agents/tests/test_slugify_dedup.py`

Modified:
- `scripts/agents/content_generator.py`
- `scripts/agents/ig_to_content.py`
- `scripts/agents/keyword_scout.py`
- `.planning/debug/knowledge-base.md` (follow-up duplicati: OPEN → RESOLVED)

## Commit

- `3a71930` feat(agents): shared slugify + guard slug duplicati in content_generator (Task 1+2)
- `63e8d99` fix(agents): dedup a monte slug duplicati in ig_to_content e keyword_scout (Task 3)
- `ad2b58b` test(agents): unit test slugify + skip duplicati get_next_acceptable_queue_item (Task 4)

Nessun `git push` effettuato (lo decide l'utente).

## Self-Check: PASSED
