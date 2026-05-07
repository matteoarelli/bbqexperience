# Legacy agent files (archived)

## claude_reviewer.py + run-claude-reviewer.sh

Sostituiti il 2026-05-07 dal nuovo Claude Opus 4.7 quality gate:

- `scripts/agents/claude_quality_gate.py` — modulo `review_article()` + `decide_next_step()`, pattern mirror di `C:/Progetti/reflexmania-blog-pipeline/modules/claude_review.py`
- `scripts/agents/claude_review_runner.py` — orchestrator polling Strapi
- `scripts/agents/prompts/claude_review.md` — system prompt + JSON schema (BBQ-specific: brand grill, temperature, ricette)
- `scripts/agents/lib/whitelist.py` — catalogo prodotti + blog/recipes/tutorials per validare link
- `scripts/agents/run-claude-gate.cmd` + `setup-claude-gate-task.ps1` — Windows scheduled task ogni 15 min

Differenze chiave dal vecchio:
- Output JSON strict validato schema (vs vecchio `===QUALITY_SCORE===` testuale)
- Whitelist catalogo + articoli published (vs nessuna whitelist)
- Categorie issue: fact_accuracy, consistency, tone, repetition, vagueness, cta_structure, length
- decide_next_step a 3 livelli: auto_publish (≥7), preview_first (5-6), human_required (critical)
- Status flow: content_generator → status=draft_review → gate (15 min poll) → published / preview_pending / needs_human

Il vecchio reviewer cercava status=draft_review ma il content_generator nel frattempo era cambiato per pubblicare direttamente — quindi era effettivamente off da tempo. Mantengo il file qui come riferimento storico.
