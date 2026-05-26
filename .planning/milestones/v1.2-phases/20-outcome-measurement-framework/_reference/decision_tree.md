# Phase 17 Outcome Decision Tree

**Owner:** scripts/agents/phase17_outcome_tracker.py
**Linked from:** weekly Telegram report `📈 Phase 17 Outcome — Week N`
**Baseline (locked 2026-05-25, v1.1 Phase 17 ship):**
- 35 clicks / 29.000 impressions / 28gg
- CTR aggregato: **0.12%**
- Posizione media: **6.7**
- Articoli BBQ live: ~50 (blog + reviews + recipes + tutorials EN+IT+ES)

## Scopo

Validare il lift CTR atteso dal Phase 17 GSC pipeline (meta_optimizer + gsc_refresh + GSC priming) nei 30 giorni successivi al ship. Decision tree esplicito perché Matteo non deve interpretare a sentimento.

## Trigger ranges (4 verdetti)

I verdetti sono calcolati da `_decide_verdict(delta_dict, weeks_elapsed)` dentro `phase17_outcome_tracker.py`. Logica binaria sui due assi:
- **lift_ctr_x** = `current_ctr / baseline_ctr` (es. 0.0030 / 0.0012 = 2.5x)
- **weeks_elapsed** = settimane intere dal ship (2026-05-25)

### 1. `success` — Lift ≥ 10× entro 14gg (week 1 o 2)

**Trigger:** `lift_ctr_x >= 10.0` AND `weeks_elapsed <= 2`

**Significato:** Pipeline performa OLTRE le aspettative. CTR aggregato ≥ 1.2% (vs baseline 0.12%), in linea con benchmark FirstPageSage per posizione 6-7.

**Azioni automatiche raccomandate (snippet):**
- Aumentare frequenza `gsc_refresh`: weekly → daily (`0 8 * * *` invece di `0 8 * * 0`). Più refresh = più lift compounding.
- Estendere `meta_optimizer` batch da `MAX_PROPOSALS_PER_RUN=20` → `30` (più cicli per saturare il quota Qwen).
- Considerare estensione del pattern Indexing API + GSC priming a IT/ES (translation_agent.py su .119 — Phase 17 v2 deferred fino a misurazione, ORA sbloccato).

**Decisione umana richiesta:** scalare i due cron sopra (Matteo modifica crontab .119 + Windows Task Scheduler frequency).

### 2. `on-track` — Lift 3-10× entro 14gg (week 1 o 2)

**Trigger:** `3.0 <= lift_ctr_x < 10.0` AND `weeks_elapsed <= 2`

**Significato:** Pipeline funziona come progettato (range conservativo del target 10-30× — assumiamo che il 30× sia top-end ottimistico per stack maturo). CTR ~0.36-1.2%.

**Azioni:** Nessuna modifica. Continuare a monitorare ogni settimana. Verdict si stabilizzerà su `success` o `revisit_prompts` man mano che il pipeline accumula refresh + meta rewrites.

### 3. `revisit_prompts` — Lift < 3× entro 14gg (week 2 o oltre)

**Trigger:** `lift_ctr_x < 3.0` AND `weeks_elapsed >= 2`

**Significato:** Pipeline non sta producendo lift atteso. La causa più probabile è qualità dei prompt o power-words IT/ES insufficienti. Differenza vs `degraded_rollback`: c'è LIFT, solo non sufficiente.

**Azioni umane richieste (Matteo):**
1. Review qualitativo `state/meta_changes.jsonl` ultimi 14gg — verifica:
   - Le meta proposte hanno power words distintivi? (non "Best Grill" generico)
   - I title sfruttano le top GSC queries reali della pagina? (deve essere visibile nel campo `query_targets`)
   - Le proposte respinte avevano un reason credibile dal Claude sonnet review? (segnale di overfit del prompt verso clickbait)
2. Tune `scripts/agents/state/power_words_it.txt` + `power_words_es.txt`:
   - Aggiungere domain-specific BBQ IT/ES (es. "Brace", "Affumicatura", "Pitmaster", "Parrillada", "Asado")
   - Rimuovere generici noise (es. "Migliore" senza qualificatore)
3. Considerare tuning del `prompts/qwen_meta_draft.md` — aggiungere ESEMPI concreti (gold standard rewrites) per Qwen few-shot.

**Cron continua a girare.** Si fa tuning, non rollback.

### 4. `degraded_rollback` — Lift < 1.5× entro 30gg (week 4+)

**Trigger:** `lift_ctr_x < 1.5` AND `weeks_elapsed >= 4`

**Significato:** Pipeline ha avuto 30gg per dimostrare valore e ha sostanzialmente fallito. Worst-case: CTR aggregato peggiorato vs baseline (clickbait rejection, off-topic refresh). Risk: continuare costa Qwen + Claude quota senza ROI.

**Azioni umane richieste (Matteo) — IN ORDINE:**
1. **Pause meta_optimizer cron:** `ssh matteo@192.168.1.119 'crontab -e'` → commenta riga `30 3 * * * .../meta_optimizer.py`. Stop generazione nuove proposte.
2. **Pause gsc_refresh cron:** commenta riga `0 8 * * 0 .../gsc_refresh.py`. Stop weekly refresh.
3. **Manual review:** ispeziona `state/meta_changes.jsonl` ultimi 30gg. Per ogni proposta apply'd con `decision="apply"`:
   - Confronta CTR pre vs post tramite GSC URL Inspection — se CTR è peggiorato di >20% per >5 URL → segnale di regression sistematica
4. **Rollback selettivo (se segnali confermati):** ripristina i `before.seo_title` + `before.seo_description` originali per ogni URL peggiorato via `strapi.update(..., skip_rebuild=True)` (lo stesso path che ha applicato il cambio).
5. **Postmortem:** Scrivere `_reference/phase17_postmortem.md` con root cause + lezioni. Decidere se rinnovare il pipeline con cambi architetturali (es. Opus invece di Qwen per drafter) o disattivare definitivamente.

**Il pipeline è in pausa durante il rollback** — non re-attivare finché postmortem completo.

## Soglie di confidence

Le soglie sopra (10×, 3×, 1.5×) sono basate su:
- **Range target user-stated**: 10-30× CTR lift atteso dal Phase 17 ship (vedi v1.2-ROADMAP Phase 20 goal)
- **Lower bound minimo**: 3× è il minimo "ROI evidente" dato 28 gg di lavoro Phase 17 (~70k token Claude + Qwen)
- **Failure floor**: 1.5× dopo 30 gg = stack non riesce a battere noise baseline, ipotesi di funzionamento smentita

## Frequenza misurazione

- **Cron:** Lun 09:00 UTC (`0 9 * * 1`) su `.119` — primo run 2026-06-01 09:00 UTC
- **Durata misurazione:** Da 2026-06-01 (week 1) a 2026-06-29 (week 5). Verdict di chiusura Phase 17 attesa: **2026-06-29** (settimana 5 dopo ship 2026-05-25).
- **Dopo 2026-06-29:** Se verdict stabile `success` o `on-track`, il cron può essere demote-ato a monthly (1° del mese) per long-term monitoring.

## Caveats

- **GSC lag (3gg):** `gsc_client.top_pages(days=28)` usa `dataState=final` (vedi lib/gsc_client.py:174-178), quindi week 1 (2026-06-01) include dati fino a ~2026-05-29 — ovvero solo 4gg post-ship. Verdict di week 1 sarà rumoroso e dovrebbe essere considerato "early signal" non determinante.
- **Stagionalità BBQ:** Maggio-Giugno è alta stagione BBQ in EN. Lift atteso ESCLUDE stagionalità (baseline 2026-05-25 era già alta stagione). Se misurazione comincia mid-June, considerare effetto Father's Day spike (16 giugno US) — può inflazionare clicks di 30-50% senza relazione con pipeline.
- **Article volume drift:** Se durante misurazione si pubblicano >5 nuovi articoli/settimana, il delta CTR aggregato può essere diluito da articoli zero-impression. Lo script logga `articles_count` per detective questa fonte di rumore — Matteo deve cross-referenziare manualmente se vede CTR flat ma articles_count cresce.

## Crontab snippet (da installare manualmente su .119)

```cron
# Phase 17 Outcome Tracker — Lun 09:00 UTC (sotto blocco TZ=UTC esistente di Phase 17)
0 9 * * 1 /home/matteo/bbqexperience/run-agent.sh phase17_outcome_tracker.py >> /home/matteo/bbqexperience/logs/phase17_outcome.log 2>&1
```

**Status installazione:** to-install (Matteo or autonomous-mode trigger after Phase 20 merge).
