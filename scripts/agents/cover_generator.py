#!/usr/bin/env python3
"""Copertine per gli articoli BBQ: foto Pexels -> upload Strapi -> cover_image.

    python3 scripts/agents/cover_generator.py            # report, non scrive
    python3 scripts/agents/cover_generator.py --apply    # assegna le copertine
    python3 scripts/agents/cover_generator.py --apply --max 5

Perche' esiste (17/09/2026): il vecchio cover_generator generava le immagini con
SDXL sulla 3090. SDXL e' spento dal 2 settembre (girava a vuoto) e il log delle
copertine era fermo al 12 maggio: 48 pagine su 152 erano senza immagine, e ogni
articolo nuovo usciva nudo. ScattoPro invece ha la copertina su tutti i 188
articoli perche' le prende da Pexels: qui si fa la stessa cosa. Gratis, foto
vere, licenza Pexels (uso libero, attribuzione non obbligatoria ma gradita: il
fotografo viene salvato nel nome del file).

Ogni foto viene usata UNA volta sola: gli id gia' usati stanno in
state/pexels_used.json.
"""
import argparse
import json
import os
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi  # noqa: E402
from agents.lib import telegram  # noqa: E402

PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
STATO = pathlib.Path(__file__).parent / "state" / "pexels_used.json"
# "reviews" e' escluso di proposito: quel tipo NON ha un campo immagine in
# Strapi (verificato il 17/09/2026), le sue pagine usano le foto del prodotto.
TIPI = ("blog-posts", "recipes", "tutorials")
# Termine di contesto per tipo: senza, "brisket" tira fuori foto di macelleria
CONTESTO = {
    "recipes": "barbecue food",
    "reviews": "barbecue grill",
    "tutorials": "barbecue grilling",
    "blog-posts": "barbecue smoker",
}
STOP = {
    "the", "a", "an", "and", "or", "of", "for", "with", "to", "in", "on", "at",
    "your", "you", "how", "what", "why", "when", "best", "guide", "vs", "is",
    "are", "it", "this", "that", "from", "into", "can", "do", "does", "make",
    "made", "use", "using", "get", "got", "need", "should", "must", "real",
    "truth", "ultimate", "complete", "step", "tips", "tricks",
}


def query_da_titolo(titolo: str, tipo: str) -> str:
    pulito = re.sub(r"[^a-z0-9\s]", " ", (titolo or "").lower())
    parole = [p for p in pulito.split() if len(p) > 2 and p not in STOP][:3]
    return (" ".join(parole) + " " + CONTESTO.get(tipo, "barbecue")).strip()


def cerca_foto(query: str, usati: set) -> dict | None:
    if not PEXELS_KEY:
        print("[pexels] manca PEXELS_API_KEY nell'ambiente")
        return None
    url = ("https://api.pexels.com/v1/search?"
           + urllib.parse.urlencode({"query": query, "per_page": 15,
                                     "orientation": "landscape", "size": "large"}))
    req = urllib.request.Request(url, headers={
        "Authorization": PEXELS_KEY,
        "User-Agent": "BBQExperience-CoverGen/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            dati = json.loads(r.read().decode())
    except Exception as e:
        print(f"  [pexels] ricerca fallita: {e}")
        return None
    for foto in dati.get("photos", []):
        if foto.get("id") not in usati:
            return {"id": foto["id"],
                    "url": foto["src"]["landscape"],
                    "autore": foto.get("photographer", "Pexels")}
    return None


def scarica(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BBQExperience-CoverGen/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except Exception as e:
        print(f"  [pexels] download fallito: {e}")
        return None


def senza_copertina() -> list[dict]:
    fuori: list[dict] = []
    for tipo in TIPI:
        try:
            voci = strapi.find_all_pages(tipo, locale="en", page_size=100,
                                         populate="cover_image",
                                         fields=["title", "slug"])
        except Exception as e:
            print(f"  [strapi] {tipo} non leggibile: {e}")
            continue
        for v in voci:
            if not v.get("cover_image"):
                fuori.append({"tipo": tipo, "documentId": v["documentId"],
                              "title": v.get("title", ""), "slug": v.get("slug", "")})
    return fuori


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="scrive davvero su Strapi")
    ap.add_argument("--max", type=int, default=60, help="quante copertine per giro")
    args = ap.parse_args()

    usati = set(json.loads(STATO.read_text())) if STATO.exists() else set()
    mancanti = senza_copertina()
    print(f"articoli senza copertina: {len(mancanti)}")
    for m in mancanti[:8]:
        print(f"  [{m['tipo']}] {m['title'][:60]} -> pexels: '{query_da_titolo(m['title'], m['tipo'])}'")
    if not args.apply:
        print("\n(report soltanto: nessuna modifica. Rilancia con --apply)")
        return 0

    fatti, falliti = [], []
    for m in mancanti[:args.max]:
        q = query_da_titolo(m["title"], m["tipo"])
        foto = cerca_foto(q, usati)
        if not foto:
            falliti.append(f"{m['title'][:40]}: nessuna foto per '{q}'")
            continue
        dati = scarica(foto["url"])
        if not dati:
            falliti.append(f"{m['title'][:40]}: download fallito")
            continue
        nome = f"{m['slug'][:60]}-pexels-{foto['id']}.jpg"
        try:
            media = strapi.upload_file(dati, nome, mime="image/jpeg")
            media_id = media[0]["id"] if isinstance(media, list) else media["id"]
            strapi.update(m["tipo"], m["documentId"], {"cover_image": media_id})
        except Exception as e:
            falliti.append(f"{m['title'][:40]}: upload/aggancio fallito ({e})")
            continue
        usati.add(foto["id"])
        fatti.append(f"{m['title'][:45]} <- {foto['autore']}")
        print(f"  OK  {m['title'][:52]:<52} foto di {foto['autore']}")
        time.sleep(1.0)

    STATO.parent.mkdir(exist_ok=True)
    STATO.write_text(json.dumps(sorted(usati)))
    print(f"\ncopertine assegnate: {len(fatti)} | non riuscite: {len(falliti)}")
    for f in falliti[:10]:
        print(f"  KO  {f}")
    if fatti:
        telegram.send_agent_report(
            "Cover Generator",
            f"{len(fatti)} copertine assegnate (Pexels), {len(falliti)} non riuscite",
            [f"<b>{t}</b>" for t in fatti[:10]],
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
