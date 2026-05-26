# Power Words per meta_optimizer

Matteo aggiorna `power_words_{it,es}.txt` dopo aver visto i primi 5 proposal IT/ES
in `state/meta_changes.jsonl`. Il file e re-letto a ogni run di meta_optimizer.py.

Formato: una power word per riga, righe vuote o `#` ignorate. Accenti preservati
(file scritti in UTF-8). EN power words sono embedded nel prompt qwen_meta_draft.md.

## Convenzioni

- IT: usare accenti corretti (è/à/ò/ù/é) — il file e' UTF-8.
- ES: usare ñ/í/ó/ú/á — UTF-8.
- Max 10-15 power words per locale. Oltre, Qwen si confonde nel prompt.
- BBQ-specifici sono preferibili a generici. Es: "Smoke ring" > "Migliori".
