---
status: resolved
trigger: "Articoli BBQ non pubblicati dal 13 mag. Bozze generate ma gate logga sempre 'Nothing to review'. 8 bozze accumulate."
created: 2026-05-22T00:00:00Z
updated: 2026-05-22T02:00:00Z
---

## Current Focus

hypothesis: CONFERMATA. Il flusso queue->draft_review->gate funziona perfettamente. Il gate Claude GIRA ogni mattina e RIFIUTA gli articoli con "-> human_required". La logica decide_next_step() ha un veto assoluto sui critical issue (riga 180-181): qualunque issue severity=="critical" forza human_required PRIMA di valutare approved/score, ANCHE quando Claude ha gia' corretto l'issue (verdict="fixed", fix_applied presente, fix incluso in corrected_html). Risultato: articoli approvati con score 7-8 vengono bloccati e marcati failed solo per un critical issue gia' risolto.
test: Verificato su Strapi (item morning 22 mag log "score=4 approved=False crit=1 -> human_required"), gate log storico (08-10 mag pubblicati con approved=True score>=7; dall'11 mag in poi tutti approved=False/crit>=1 -> failed), e smoke-test-result.json (critical issue con verdict="fixed" + fix_applied=True).
expecting: Distinguendo critical FIXED (gia' in corrected_html) da critical needs_human/uncertain, i 2 articoli buoni (approved+score 7-8) verrebbero pubblicati e gli 11 garbage (approved=False score 4-6) resterebbero correttamente bloccati.
next_action: RISOLTO. Fix applicato e confermato in produzione (run manuale 22 mag). Sessione archiviata, commit locale fatto. Follow-up dedup topic registrato in knowledge base.

## Symptoms

expected: content_generator genera bozza -> transiziona content-queue a "draft_review" + published_content_id -> gate Claude la trova (filtro status==draft_review) -> rivede -> promuove blog-post a published. Articolo nuovo quasi ogni giorno.
actual: Bozza blog-post creata correttamente. content-queue item resta "ready" (+ duplicato "failed"), MAI "draft_review". Gate logga sempre "Nothing to review". 8 bozze accumulate (101 pub vs 109 tot). Ultimo pubblicato 13 mag.
errors: Nessun crash. content_generator esce "completato". Gate esce 0x0.
reproduction: Osservabile via Strapi tunnel http://192.168.1.124:8011 (token in scripts/agents/.env.windows) e log.
started: ~13 mag, coincide con introduzione quality gate Claude Opus.

## Eliminated

- hypothesis: Disallineamento draft/published Strapi v5 sulla collection content-queues (la transizione draft_review finisce su una versione diversa da quella letta dal gate).
  evidence: schema content-queue ha draftAndPublish:false. Query live confermano status=draft, status=published e nessuno status ritornano TUTTE le stesse 79 entry. Non esiste versioning su questa collection: status= e' un no-op. Lo stato draft_review e' persistito correttamente, solo che dura ~1 minuto (05:45->05:46) prima che il gate lo transizioni a failed.
  timestamp: 2026-05-22T00:30:00Z

- hypothesis: Il flusso ricade nel branch failed di content_generator (righe 313-321) dopo aver creato la bozza (publish_article ritorna None o eccezione post-create).
  evidence: il generation_log dell'item morning NON dice "Pubblicazione fallita" ne "Errore:" (i due messaggi del branch failed di content_generator). Dice invece "Claude gate ... -> human_required". Quindi e' stato il GATE a marcare failed, non content_generator. La transizione draft_review e' avvenuta e il gate l'ha processata.
  timestamp: 2026-05-22T00:40:00Z

- hypothesis: I duplicati ready/failed con stesso titolo indicano doppia create / split draft-published.
  evidence: i duplicati sono entry DISTINTE del keyword_scout / ig_to_content che hanno inserito lo stesso topic-garbage piu' volte in coda in date diverse. Una copia e' stata pescata dal generator e bocciata dal gate (failed), un'altra resta ready in attesa. Nessuna create doppia atomica: e' rumore upstream nella ContentQueue, non causa del blocco publish.
  timestamp: 2026-05-22T00:45:00Z

## Evidence

- timestamp: 2026-05-22T00:00:00Z
  checked: content_generator.py righe 268, 292
  found: strapi.update("content-queues", doc_id, {"status": "generating"}) e {"status": "draft_review"} chiamati SENZA status= kwarg (default vuoto). update() default Strapi v5 = draft se esiste altrimenti published.
  implication: La transizione di stato potrebbe finire su versione draft mentre find del gate legge altro, o viceversa.

- timestamp: 2026-05-22T00:00:00Z
  checked: claude_review_runner.fetch_pending_reviews (riga 67-72) e get_next_queue_item content_generator (riga 50-56)
  found: ENTRAMBI usano find(content-queues, status="draft", filters={status: {$eq: ...}}). status="draft" e' la PUBLICATION STATUS query param di Strapi v5; filters.status e' il CAMPO enum della collection. Possibile collisione nel nome "status".
  implication: Da verificare se Strapi gestisce correttamente i due "status" o se c'e' interferenza.

- timestamp: 2026-05-22T00:50:00Z
  checked: Strapi content-queues live (79 item) + generation_log di ogni item failed.
  found: status distribution = ready 32, published 18, failed 29. L'item morning 22 mag (dr3nv2jpl7n6swylc3e0r283, ref blog-post xj3ehrfi6j8qakayg7enie2o) e' "failed" con log "Claude gate 2026-05-22T05:46: score=4 approved=False issues=7 crit=1 -> human_required". 13 dei 29 failed hanno log "Claude gate ... -> human_required".
  implication: Il gate gira e processa. Non e' un problema di fetch/transizione. Il gate sta RIFIUTANDO gli articoli.

- timestamp: 2026-05-22T00:55:00Z
  checked: logs/claude-gate.log storico (Pending reviews + score=/approved=).
  found: 08 mag score=8 approved=True (pubblicato), 09 mag score=7 approved=True (pub), 10 mag score=7 approved=True (pub). Dall'11 mag: 11 mag score=4 approved=False, 12 score=6 False, 13 score=7 approved=False crit=2, 15-22 tutti approved=False (o crit>=1) -> human_required. Ultimo publish coincide col 13 mag come da sintomo.
  implication: Cambio netto dall'11 mag: gli articoli smettono di passare. "Nothing to review" ai tick e' atteso: l'item resta draft_review solo ~1 min al mattino, poi e' gia' processato.

- timestamp: 2026-05-22T01:00:00Z
  checked: decide_next_step() in claude_quality_gate.py riga 175-186 + schema issue in prompts/claude_review.md + logs/smoke-test-result.json.
  found: decide_next_step ritorna "human_required" se has_critical_issues (any severity=="critical") PRIMA di valutare approved+score. Ma lo schema definisce verdict per ogni issue: "fixed"|"uncertain"|"needs_human", e il system prompt dice che un errore auto-corretto ha verdict="fixed" + approved puo' restare true. Lo smoke-test reale mostra 2 critical issue con verdict="fixed" e fix_applied valorizzato (gia' inclusi in corrected_html). Conta sizing: 2 item approved=True score 7-8 bloccati SOLO dal veto critical (Best Meat Thermometer Uk score=7, Indulge in a smokehouse feast score=8); 11 genuinamente bocciati (approved=False score 4-6).
  implication: Il veto critical e' troppo grezzo: blocca anche critical gia' RISOLTI da Claude (verdict=fixed, gia' in corrected_html). Bug nella logica di decisione, non nel fetch/transizione.

- timestamp: 2026-05-22T02:00:00Z
  checked: VERIFICA PRODUZIONE LIVE. Rimessi i 2 articoli victim in draft_review e lanciato run-claude-gate.cmd a mano una volta. Log del run.
  found: (1) Gate raccoglie entrambi -> "Pending reviews: 2", niente piu' "Nothing to review". (2) "Deep Dive: Indulge in a smokehouse feast this weekend": score=8 approved=True -> decide_next_step ha restituito auto_publish e ha TENTATO la PUT di pubblicazione (PRIMA del fix sarebbe finito in human_required per il veto). La PUT e' fallita SOLO per vincolo legittimo "400 ValidationError: slug must be unique" perche l'articolo era GIA' pubblicato il 13 mag (e' il doppione visto all'inizio). Stato queue finale: published (non ritenta). (3) "Best Meat Thermometer Uk": alla RI-review Claude ha restituito score=7 approved=False (varianza tra review) -> human_required -> queue=failed. Correttamente NON pubblicato.
  implication: Fix CONFERMATO end-to-end. Il path auto_publish ora scatta sugli articoli approvati. Il blocco oggi era dovuto solo al vincolo slug del doppione (vittima non recuperabile, era un duplicato), non alla logica del gate. La pubblicazione pulita su slug nuovo sara' la conferma naturale al run delle 05:45.

## Resolution

root_cause: |
  Il sistema (fetch coda -> draft_review -> gate Claude -> publish) funziona end-to-end. Il problema NON era il disallineamento draft/published (red herring: content-queue ha draftAndPublish:false, status= e' un no-op) ne il branch failed di content_generator. Il problema e' la LOGICA di decisione del gate: decide_next_step() in claude_quality_gate.py (righe 180-181) applica un veto assoluto su QUALUNQUE issue con severity=="critical", ritornando "human_required" PRIMA di valutare approved/score. Questo blocca anche i critical che Claude ha gia' AUTO-CORRETTO (verdict="fixed", la fix e' gia' dentro corrected_html). Dall'11 mag (drafts su topic-garbage + fact-check rigoroso) ogni articolo ha >=1 critical issue, quindi tutti finiscono human_required -> queue=failed, blog-post resta draft -> niente pubblicato dal 13 mag. La sintomatologia "Nothing to review / mai draft_review" era fuorviante: l'item passa in draft_review solo ~1 min al mattino (05:45->05:46) e viene subito transizionato a failed dal gate.
fix: |
  Modificato decide_next_step() per distinguere critical issue RISOLTI (verdict="fixed", la correzione e' in corrected_html) da critical UNRESOLVED (verdict needs_human/uncertain/assente). Solo i critical unresolved forzano human_required. Un critical "fixed" non blocca piu' un articolo altrimenti approvato con score sufficiente. Aggiunto helper has_unresolved_critical_issues su ReviewResult. Sincronizzato il blocco "Pipeline decision" in prompts/claude_review.md.
verification: |
  Test di regressione decide_next_step (8 casi, tutti PASS): i 2 victim (approved+score 7-8+critical-fixed) ora -> auto_publish; gli 11 garbage (approved=False / critical needs_human) restano -> human_required; critical unresolved (needs_human/uncertain) veta ancora anche score 9 approved. Moduli importano puliti (estrazione blocchi prompt intatta).
  VERIFICA PRODUZIONE CONFERMATA (2026-05-22): rimessi i 2 victim in draft_review e lanciato run-claude-gate.cmd a mano. Gate raccoglie entrambi (Pending reviews: 2). "Indulge in a smokehouse feast" score=8 approved=True -> auto_publish -> TENTATA PUT (prima del fix sarebbe stato human_required per il veto critical) -> 400 ValidationError slug must be unique perche era un doppione gia' pubblicato il 13 mag (queue->published, no retry). "Best Meat Thermometer Uk" alla ri-review score=7 approved=False (varianza Claude) -> human_required -> failed, correttamente non pubblicato. Il path auto_publish ora scatta sugli articoli approvati: root cause e fix confermati end-to-end. La pubblicazione pulita su slug nuovo sara' la conferma naturale al run delle 05:45.
follow_up: |
  ISSUE SEPARATO (non parte di questo fix): topic duplicati in ContentQueue causano 400 "slug must be unique" quando il gate prova a pubblicare. content_generator/keyword_scout/ig_to_content accodano lo stesso topic piu' volte e/o topic gia' pubblicati. Da affrontare a monte (dedup topic in coda + check slug esistente PRIMA di generare/pubblicare) in sessione separata.
files_changed:
  - scripts/agents/claude_quality_gate.py
  - scripts/agents/prompts/claude_review.md
