# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## gate-articoli-non-pubblicati — Articoli BBQ non pubblicati dal 13 mag: il quality gate Claude rifiutava ogni articolo
- **Date:** 2026-05-22
- **Error patterns:** Nothing to review, draft_review, content-queue, quality gate, human_required, critical issue, decide_next_step, articoli non pubblicati, score approved, claude gate, auto_publish
- **Root cause:** Il flusso fetch coda -> draft_review -> gate Claude -> publish funzionava end-to-end. Il bug era nella LOGICA di decisione: decide_next_step() in claude_quality_gate.py applicava un veto assoluto su QUALUNQUE issue con severity=="critical" (ritornando human_required PRIMA di valutare approved/score), inclusi i critical che Claude aveva gia' AUTO-CORRETTO (verdict="fixed", fix gia' dentro corrected_html). Dall'11 mag ogni articolo aveva >=1 critical issue -> tutti finivano human_required -> queue=failed -> blog-post resta draft -> niente pubblicato dal 13 mag. Sintomo fuorviante "Nothing to review / mai draft_review": l'item passa in draft_review solo ~1 min al mattino (05:45->05:46) e viene subito transizionato a failed dal gate.
- **Fix:** decide_next_step() ora distingue critical RISOLTI (verdict="fixed", correzione in corrected_html) da critical UNRESOLVED (verdict needs_human/uncertain/assente). Solo i critical unresolved forzano human_required. Aggiunto helper has_unresolved_critical_issues su ReviewResult. Sincronizzato il blocco "Pipeline decision" in prompts/claude_review.md. Verificato in produzione (run manuale 22 mag): path auto_publish scatta sugli articoli approvati.
- **Files changed:** scripts/agents/claude_quality_gate.py, scripts/agents/prompts/claude_review.md
---

## FOLLOW-UP (non risolto, sessione separata) — Topic duplicati in ContentQueue -> 400 slug must be unique al publish
- **Date:** 2026-05-22
- **Error patterns:** 400 ValidationError, slug must be unique, topic duplicati, content-queue dedup, doppioni articoli
- **Sintomo:** quando il gate prova a pubblicare un articolo il cui topic e' gia' stato pubblicato, Strapi rifiuta con `400 ValidationError: slug must be unique`. content_generator/keyword_scout/ig_to_content accodano lo stesso topic piu' volte e/o topic gia' pubblicati.
- **Direzione fix (da fare):** dedup topic in ContentQueue + check slug esistente PRIMA di generare/pubblicare. Affrontare a monte nella pipeline di accodamento, non nel gate.
- **Status:** OPEN — registrato come follow-up dalla sessione gate-articoli-non-pubblicati.
---

