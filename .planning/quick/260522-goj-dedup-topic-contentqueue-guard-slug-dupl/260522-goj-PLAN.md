---
quick_id: 260522-goj
title: "Dedup topic ContentQueue — guard slug duplicati"
created: 2026-05-22
status: ready
---

# Quick Task 260522-goj — Dedup topic ContentQueue (guard slug duplicati)

## Problema

Topic duplicati nella ContentQueue causano `400 ValidationError: slug must be unique`
quando il quality gate prova a promuovere a `published` un articolo il cui slug
coincide con uno già pubblicato. Registrato come follow-up in
`.planning/debug/knowledge-base.md` (issue del fix gate `7059c4e`).

Lo slug del blog-post nasce da `generate_slug(title)` in `scripts/agents/content_generator.py`.
I duplicati arrivano da:
- `ig_to_content.py` — titoli "Deep Dive: ..." deduplicati SOLO su `instagram_id` (nessun check slug/titolo).
- `keyword_scout.py` — dedup su slug naïf `kw.replace(" ","-")` invece del vero `generate_slug`.
- `content_generator.py` — nessun guard slug prima di generare → spreca ciclo Qwen+Claude + 400 al gate.

## Vincoli

- Tutto in `scripts/agents/`. NON modificare `instagram_bot.py`.
- I check Strapi passano SEMPRE per `agents.lib.strapi_client` (gestisce URL via env `STRAPI_URL` + token). NON hardcodare URL.
- Stile esistente: commenti/log in italiano, pattern strapi_client, niente retry custom.
- `status="failed"` deve essere un valore valido dell'enum del content type `content-queue`
  (verificare nello schema Strapi; un commit recente ha sistemato proprio l'enum del gate).
  Se non valido, usare un valore esistente — NON inventare enum senza modificare lo schema.
- Idempotente: il guard marca-failed-e-continua (riusa il pattern `max_attempts` esistente).

## Task 1 — Shared slugify module

**files:** `scripts/agents/lib/slugify.py` (new), `scripts/agents/content_generator.py`,
`scripts/agents/ig_to_content.py`, `scripts/agents/keyword_scout.py`

**action:**
- Creare `scripts/agents/lib/slugify.py` con `def slugify(title: str) -> str` che replica
  ESATTAMENTE la logica attuale di `content_generator.generate_slug`:
  lower → strip → rimuovi `[^a-z0-9\s-]` → spazi→`-` → collapse `-+` → `[:80]` → `.strip("-")`.
- In `content_generator.py`: far delegare `generate_slug` a `lib.slugify.slugify`
  (mantenere il nome `generate_slug` per non rompere i call site, o sostituire gli usi).
- ATTENZIONE import circolare: `content_generator` fa già
  `from agents.keyword_scout import is_acceptable_topic`; quindi `slugify` DEVE stare in `lib/`,
  importata indipendentemente da tutti e tre i file.

**verify:** `python -m py_compile` sui 4 file; `slugify("Deep Dive: Indulge in a smokehouse feast this weekend") == "deep-dive-indulge-in-a-smokehouse-feast-this-weekend"`.

**done:** un'unica funzione slugify condivisa, nessuna duplicazione della logica, import non circolari.

## Task 2 — Guard slug in content_generator (chokepoint, fix definitivo)

**files:** `scripts/agents/content_generator.py`

**action:**
- Helper `published_slug_exists(content_type_strapi: str, slug: str) -> bool`:
  `strapi.find(content_type_strapi, filters={"slug": {"$eq": slug}}, page_size=1)`
  (stato published di default) → ritorna `meta.pagination.total > 0`.
  Difensivo: se la chiamata solleva, loggare e ritornare `False` (non bloccare la pipeline).
- In `get_next_acceptable_queue_item()`, DOPO che `is_acceptable_topic` passa:
  calcolare `slug = slugify(title_item)` e `ct = STRAPI_CONTENT_TYPES.get(content_type_item, "blog-posts")`,
  e se `published_slug_exists(ct, slug)`:
  marcare l'item `status="failed"` con
  `generation_log="Duplicate slug (already published): <slug>"` e CONTINUARE al prossimo item
  (stesso pattern del filtro is_acceptable_topic già presente, dentro il loop `max_attempts`).

**verify:** logico — un item "ready" con slug già pubblicato viene marcato failed SENZA generare,
e si passa al prossimo. `py_compile` pulito.

**done:** nessun articolo viene generato/pubblicato se lo slug esiste già pubblicato; nessun 400 al gate da quella sorgente.

## Task 3 — Dedup a monte (ridurre garbage in coda)

**files:** `scripts/agents/ig_to_content.py`, `scripts/agents/keyword_scout.py`

**action:**
- `ig_to_content.py` (`_create_queue_item`, ~riga 128-145): prima di `strapi.create`,
  calcolare `slug = slugify(title)` e skippare (`return None` con log chiaro) se lo slug
  esiste già pubblicato (riusare la stessa logica di `published_slug_exists`; se serve,
  estrarre il check in un punto importabile o duplicare la query minimale via strapi_client).
- `keyword_scout.py` (`scout_keywords`, ~riga 214): sostituire
  `slug_version = kw.replace(" ", "-")` con `slugify(kw)` per il confronto contro
  `existing_titles` (che già contiene gli slug pubblicati raccolti da `get_existing_content_titles`).

**verify:** `py_compile` pulito; logicamente un IG topic il cui slug è già live non viene accodato.

**done:** le due sorgenti principali non accodano più doppioni di articoli già pubblicati.

## Task 4 — Test

**files:** `scripts/agents/tests/` (o dove risiedono i test esistenti — verificare)

**action:** aggiungere unit test minimi:
- `slugify` su casi chiave (incluso il caso "Deep Dive: Indulge..." → slug atteso, punteggiatura, troncamento 80).
- logica di skip duplicati in `get_next_acceptable_queue_item` mockando `strapi.find`
  (un item con slug "esistente" → marcato failed e skippato; un item con slug nuovo → ritornato).
  Se non esiste già un'infrastruttura di test in scripts/agents, creare un test standalone
  eseguibile con `python -m pytest` o `python <test>.py` senza dipendenze di rete.

**verify:** i test passano localmente.

**done:** copertura sulla funzione pura slugify + sulla decisione di skip.

## Note finali
- Commit atomici per task (o un commit coerente se i task sono strettamente interdipendenti).
- NON fare `git push` (lo decide l'utente).
- A fine lavoro, aggiornare la entry follow-up in `.planning/debug/knowledge-base.md` da OPEN a RESOLVED
  con riferimento al commit.
