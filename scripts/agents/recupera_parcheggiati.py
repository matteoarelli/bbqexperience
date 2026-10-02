#!/usr/bin/env python3
"""Rimette in coda gli articoli parcheggiati dal gate, pochi per volta.

    python3 scripts/agents/recupera_parcheggiati.py           # report
    python3 scripts/agents/recupera_parcheggiati.py --apply [--quanti 2]

Perche' (2 ott 2026): il gate CORREGGE il testo e poi lo giudica. Se trova un
rilievo critico nel testo ORIGINALE parcheggia l'articolo, ma le correzioni
restano scritte sulla bozza e nessuno la riguarda piu'. Rivalutando a mano gli
stessi testi: "How To Smoke Pork With Dr Pepper Glaze" da 6 a 8 approvato,
"How to Achieve a Perfect Smoke Ring" da 5 a 9 approvato. Erano 26 articoli
finiti, corretti e invisibili.

Il ciclo normale ora fa una seconda passata da solo (claude_review_runner); qui
si recupera l'arretrato, due per volta per non riempire il blog in un giorno.
Prima si scartano i doppioni: tra i 26 c'erano tre "Dr Pepper" e due "sausages".
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi  # noqa: E402
from agents import queue_quality_audit as audit  # noqa: E402


def parcheggiati() -> list[dict]:
    q = strapi.find_all_pages("content-queues", status="published", page_size=100)
    return [i for i in q
            if i.get("status") == "failed"
            and "Claude gate" in (i.get("generation_log") or "")
            and i.get("published_content_id")]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--quanti", type=int, default=2, help="quanti rimetterne in coda")
    args = ap.parse_args()

    voci = parcheggiati()
    print(f"articoli parcheggiati dal gate: {len(voci)}")
    if not voci:
        return 0

    # 1) doppioni tra loro (il piu' recente vince: e' quello con piu' correzioni)
    voci = sorted(voci, key=lambda i: i.get("updatedAt") or "", reverse=True)
    titoli = [(i.get("title") or "") for i in voci]
    scarti = dict(audit.dedup_tra_candidati(titoli))
    # 2) doppioni di articoli gia' online
    tenuti: list[dict] = []
    for n, v in enumerate(voci):
        if n in scarti:
            print(f"  doppione interno  {titoli[n][:46]:<46} {scarti[n]}")
            continue
        motivo = audit.verifica_topic(titoli[n])
        if motivo:
            print(f"  gia' coperto      {titoli[n][:46]:<46} {motivo[:50]}")
            continue
        tenuti.append(v)

    # 3) pertinenza: tra i parcheggiati c'era "Vintagestory Smoke Meat", che e'
    # un videogioco. I filtri meccanici non lo sanno, il modello si'.
    if tenuti:
        bocciati = audit.giudizio_llm([(v.get("title") or "") for v in tenuti])
        if bocciati:
            for v in list(tenuti):
                t = v.get("title") or ""
                if t in bocciati:
                    print(f"  non pertinente    {t[:46]:<46} {bocciati[t][:40]}")
                    tenuti.remove(v)

    print(f"\nrecuperabili: {len(tenuti)} | scartati: {len(voci) - len(tenuti)}")
    for v in tenuti[:12]:
        print(f"  OK  {(v.get('title') or '')[:60]}")

    if not args.apply:
        print("\n(report soltanto: niente rimesso in coda. Rilancia con --apply)")
        return 0

    for v in tenuti[:args.quanti]:
        strapi.update("content-queues", v["documentId"], {
            "status": "draft_review",
            "generation_log": ("recuperato il 2026-10-02: il gate aveva corretto il testo"
                               " e poi parcheggiato l'articolo. Seconda valutazione."),
        })
        print(f"rimesso in coda: {(v.get('title') or '')[:60]}")
    print(f"\nil gate li rivede entro 15 minuti e pubblica quelli che passano.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
