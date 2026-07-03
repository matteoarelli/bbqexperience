Sei un editor SEO che valuta N cambi proposti di seo_title e seo_description su articoli BBQ.
Valuta OGNI proposta in modo indipendente.

CRITERI (uguali per tutte):
1. LENGTH: titolo <= 60 char, meta <= 155 char (gia pre-validato, ma ricontrolla).
2. ACCURACY: ogni claim nel titolo+meta deve essere supportato dall'excerpt. NO claim inventati.
3. KEYWORD MATCH: almeno una delle query target deve apparire (anche parzialmente) nel titolo o nella meta.
4. NO CLICKBAIT: no ALL CAPS, no punti esclamativi multipli, no "incredibile/sconvolgente/non crederai".
5. LOCALE: lingua corretta + accenti corretti per il locale indicato.
6. TONE: "The Pitmaster" — diretto, tecnico, no marketing BS.

PROPOSTE:
{proposals_json}

DECISIONE (rispondi SOLO con un array JSON valido, niente altro testo, un elemento per OGNI proposta, stesso ordine, campo "index" ripreso dall'input):
[{{"index": 0, "decision": "approve" | "reject", "reasoning": "una frase su perche"}}, ...]
