#!/usr/bin/env python3
"""Giudica la qualita' della content queue: spazzatura + argomenti sovrapposti.

    python3 -m agents.queue_quality_audit            # solo report, non scrive
    python3 -m agents.queue_quality_audit --apply    # scarta le voci bocciate

Due criteri, entrambi ereditati da errori veri:

1. SPAZZATURA — ig_to_content usa la prima riga della caption Instagram come
   titolo. Cosi' sono finiti in coda "Deep Dive: ARTERIAL APOCALYPSE." e
   "Ever thought your brisket could dance Wiggle wiggle wiggle... Discover the".
   is_acceptable_topic() scartava solo chi FINISCE con "...", non chi ce l'ha in
   mezzo ne' chi finisce con un articolo/preposizione (segno di troncamento).

2. SOVRAPPOSIZIONE — due argomenti troppo simili diventano due articoli che si
   rubano le stesse ricerche. E' il motivo per cui Matteo ha fermato il blog
   ScattoPro l'11/09/2026 (16 pezzi sulla regola dei terzi). Qui si confronta
   ogni argomento in coda con gli articoli GIA' pubblicati e con gli altri
   argomenti in coda, usando gli embedding bge-m3 locali (:8082, gratis).
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi  # noqa: E402

EMBED_URL = os.environ.get("EMBED_URL", "http://192.168.1.124:8082/v1/embeddings")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "bge-m3")
# Soglie tarate sul corpus reale (vedi output del report prima di --apply)
SIM_PUBLISHED = 0.86   # troppo simile a un articolo gia' online -> scarta
# 0.80 tra candidati dello stesso giro: con 0.90 restavano in coda insieme
# "Smoking Wood Chips Types", "Smoking Meat Wood Types" e "Smoking Wood Types
# Chart" (misurato il 17/09/2026). Su ScattoPro la stessa soglia e' 0.70, ma li'
# si confrontano keyword corte in italiano; qui sono titoli in inglese.
SIM_QUEUE = 0.80

STOPWORD_FINALI = {
    "the", "a", "an", "and", "or", "of", "for", "with", "to", "in", "on", "at",
    "your", "you", "my", "this", "that", "is", "are", "was", "it", "as", "by",
    "from", "into", "when", "how", "what", "who", "why",
}
SEGNALI_CAPTION = [
    r"\.\.\.", r"…",              # troncature
    r"\bwiggle\b", r"\bomg\b",
    r"!{1,}",                     # esclamativi
    r"\bever (thought|wondered)\b",
    r"\bwho (needs|knew)\b",
    r"\btheres something\b",
    r"\bdiscover the\b$",
]


def motivo_scarto(titolo: str) -> str | None:
    """Ritorna il motivo per cui il titolo NON e' utilizzabile, o None se va bene."""
    t = (titolo or "").strip()
    if not t:
        return "titolo vuoto"
    # Il prefisso "Deep Dive:" lo mette ig_to_content quando incolla la prima
    # riga della caption Instagram come titolo: per costruzione NON e' una
    # ricerca. Report del 17/09: delle voci con questo prefisso nemmeno una era
    # usabile (pilaf uzbeko, cuy, "ARTERIAL APOCALYPSE."). Si scartano tutte;
    # i topic da Instagram vanno sintetizzati, non copiati.
    if re.match(r"^deep dive:\s*", t, flags=re.I):
        return "titolo copiato da una caption Instagram (prefisso 'Deep Dive:')"
    low = t.lower()
    tokens = low.split()
    if len(tokens) < 3:
        return "troppo corto (meno di 3 parole)"
    if len(tokens) > 12:
        return f"troppo lungo per essere una ricerca ({len(tokens)} parole)"
    if tokens[-1] in STOPWORD_FINALI:
        return f"finisce con '{tokens[-1]}' (frase troncata)"
    for pat in SEGNALI_CAPTION:
        if re.search(pat, low):
            return "sembra una didascalia Instagram, non una ricerca"
    if t.isupper():
        return "tutto maiuscolo"
    if sum(c.isalpha() for c in t) < len(t) * 0.6:
        return "troppa punteggiatura/simboli"
    return None


def _normalizza(t: str) -> str:
    """Minuscolo e spazi compattati PRIMA dell'embedding.

    Misurato su ScattoPro il 17/09/2026: le maiuscole spostano la somiglianza
    di 0.17 ("velocita' otturatore" ~ "Velocita' Otturatore Video" da' 0.734
    grezzo e 0.908 normalizzato). Senza questo, il confronto perde proprio i
    doppioni quando le due fonti scrivono i titoli in modo diverso.
    """
    return " ".join((t or "").lower().split())


def embed(testi: list[str]) -> list[list[float]]:
    testi = [_normalizza(t) for t in testi]
    out: list[list[float]] = []
    for i in range(0, len(testi), 32):
        body = json.dumps({"model": EMBED_MODEL, "input": testi[i:i + 32]}).encode()
        req = urllib.request.Request(EMBED_URL, data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode())
        out.extend(d["embedding"] for d in data["data"])
    return out


def norm(v: list[float]) -> list[float]:
    n = sum(x * x for x in v) ** 0.5 or 1.0
    return [x / n for x in v]


def cos(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def dedup_tra_candidati(titoli: list[str], soglia: float = SIM_QUEUE) -> list[tuple[int, str]]:
    """Indici da scartare perche' doppioni di un altro candidato dello stesso giro.

    verifica_topic() confronta solo con gli articoli GIA' pubblicati: senza
    questo, nello stesso piano finivano "Smoking Wood Chips Types", "Smoking
    Meat Wood Types" e "Smoking Wood Types Chart" (17/09/2026). Ritorna
    [(indice, motivo)].
    """
    if len(titoli) < 2:
        return []
    try:
        emb = [norm(e) for e in embed(titoli)]
    except Exception as e:
        print(f"  [WARN] confronto tra candidati non eseguito ({e})")
        return []
    scartati: list[tuple[int, str]] = []
    tenuti: list[int] = []
    for i, e in enumerate(emb):
        doppio = None
        for j in tenuti:
            s = cos(e, emb[j])
            if s >= soglia:
                doppio = (j, s)
                break
        if doppio:
            scartati.append((i, f"doppione di '{titoli[doppio[0]][:40]}' ({doppio[1]:.2f})"))
        else:
            tenuti.append(i)
    return scartati


_CACHE_PUB: tuple[list[str], list[list[float]]] | None = None


def verifica_topic(titolo: str) -> str | None:
    """Controllo a monte della generazione: ritorna il motivo di scarto o None.

    Usato da content_generator prima di generare, cosi' un argomento scadente
    non consuma un giro di Qwen + gate Claude e soprattutto non diventa un
    articolo. Due livelli:
      - spazzatura: deterministico, sempre applicato;
      - sovrapposizione con articoli gia' pubblicati: se il server embedding
        non risponde, avvisa e lascia passare (meglio un doppione raro che la
        pipeline ferma per un servizio giu').
    """
    global _CACHE_PUB
    m = motivo_scarto(titolo)
    if m:
        return m
    try:
        if _CACHE_PUB is None:
            titoli = titoli_pubblicati()
            _CACHE_PUB = (titoli, [norm(e) for e in embed(titoli)] if titoli else [])
        titoli, emb_pub = _CACHE_PUB
        if not emb_pub:
            return None
        e = norm(embed([titolo])[0])
        i = max(range(len(emb_pub)), key=lambda k: cos(e, emb_pub[k]))
        s = cos(e, emb_pub[i])
        if s >= SIM_PUBLISHED:
            return f"gia' coperto da '{titoli[i][:50]}' (somiglianza {s:.2f})"
    except Exception as ex:
        print(f"  [WARN] controllo sovrapposizione non eseguito ({ex}): si prosegue")
    return None


def giudizio_llm(titoli: list[str]) -> dict[str, str]:
    """Chiede a Qwen quali titoli NON sono argomenti sensati per un sito BBQ.

    Serve perche' i filtri meccanici non sanno che "Smoking Pipe Wood Types"
    parla di pipe da fumo e non di barbecue, ne' che "The smell of barbecue
    never lies" e' uno slogan e non una ricerca. Ritorna {titolo: motivo} per i
    soli titoli bocciati. Una sola chiamata per tutti.
    """
    if not titoli:
        return {}
    from agents.lib import claude_client as llm
    elenco = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titoli))
    prompt = f"""Sei l'editor di bbq-experience.com, sito su barbecue, affumicatura e griglie.
Per ciascun titolo qui sotto dimmi se e' un argomento sensato per un articolo del sito:
deve riguardare barbecue/griglia/affumicatura E somigliare a qualcosa che una persona
cerca davvero su Google.

BOCCIA: argomenti di altri settori (pipe da fumo, sigari, cucina non barbecue), slogan e
frasi da social, titoli troppo vaghi, pura offerta commerciale senza contenuto.

{elenco}

Rispondi SOLO con JSON: {{"bocciati": [{{"n": <numero>, "motivo": "<max 8 parole in italiano>"}}]}}
Se vanno bene tutti: {{"bocciati": []}}"""
    try:
        raw = llm.ask(prompt, max_tokens=800, timeout=180)
        blocco = re.search(r"\{.*\}", raw, re.DOTALL)
        dati = json.loads(blocco.group(0)) if blocco else {"bocciati": []}
    except Exception as e:
        print(f"  (giudizio LLM non disponibile: {e} — si prosegue coi soli filtri meccanici)")
        return {}
    out: dict[str, str] = {}
    for b in dati.get("bocciati", []):
        try:
            out[titoli[int(b["n"]) - 1]] = str(b.get("motivo", "non pertinente"))[:60]
        except (ValueError, IndexError, KeyError):
            continue
    return out


def titoli_pubblicati() -> list[str]:
    titoli: list[str] = []
    for ct in ("blog-posts", "recipes", "reviews", "tutorials"):
        try:
            for it in strapi.find_all_pages(ct, locale="en", page_size=100,
                                            fields=["title", "slug"]):
                if it.get("title"):
                    titoli.append(it["title"])
        except Exception as e:
            print(f"  (attenzione: {ct} non leggibile: {e})")
    return titoli


def main() -> int:
    apply_ = "--apply" in sys.argv
    voci = strapi.find_all_pages("content-queues", status="published", page_size=100)
    ready = [v for v in voci if v.get("status") == "ready"]
    print(f"voci in coda: {len(voci)} | pronte: {len(ready)}")

    pubblicati = titoli_pubblicati()
    print(f"articoli gia' pubblicati (EN): {len(pubblicati)}")

    scarti: list[tuple[dict, str]] = []
    buone: list[dict] = []
    for v in ready:
        m = motivo_scarto(v.get("title", ""))
        (scarti.append((v, m)) if m else buone.append(v))

    print(f"\n--- 1) SPAZZATURA: {len(scarti)} da scartare, {len(buone)} superano il filtro")
    for v, m in scarti:
        print(f"  SCARTO  {(v.get('title') or '')[:62]:<62} <- {m}")

    if buone and pubblicati:
        print("\n--- 2) SOVRAPPOSIZIONE (embedding bge-m3)")
        emb_pub = [norm(e) for e in embed(pubblicati)]
        emb_q = [norm(e) for e in embed([v.get("title", "") for v in buone])]
        tenute: list[dict] = []
        tenute_emb: list[list[float]] = []
        for v, e in zip(buone, emb_q):
            best_i = max(range(len(emb_pub)), key=lambda i: cos(e, emb_pub[i]))
            best = cos(e, emb_pub[best_i])
            if best >= SIM_PUBLISHED:
                scarti.append((v, f"gia' coperto da '{pubblicati[best_i][:45]}' ({best:.2f})"))
                print(f"  DOPPIONE {(v.get('title') or '')[:52]:<52} ~ {pubblicati[best_i][:38]} ({best:.2f})")
                continue
            if tenute_emb:
                j = max(range(len(tenute_emb)), key=lambda i: cos(e, tenute_emb[i]))
                s = cos(e, tenute_emb[j])
                if s >= SIM_QUEUE:
                    scarti.append((v, f"quasi identico ad altra voce in coda ({s:.2f})"))
                    print(f"  IN CODA  {(v.get('title') or '')[:52]:<52} ~ {tenute[j].get('title','')[:38]} ({s:.2f})")
                    continue
            tenute.append(v)
            tenute_emb.append(e)
        buone = tenute

    if buone:
        print("\n--- 3) PERTINENZA (giudizio Qwen)")
        bocciati = giudizio_llm([v.get("title", "") for v in buone])
        if bocciati:
            restano = []
            for v in buone:
                t = v.get("title", "")
                if t in bocciati:
                    scarti.append((v, f"non pertinente: {bocciati[t]}"))
                    print(f"  BOCCIATO {t[:55]:<55} <- {bocciati[t]}")
                else:
                    restano.append(v)
            buone = restano
        else:
            print("  nessun titolo bocciato")

    print(f"\n=== RISULTATO: {len(buone)} argomenti buoni, {len(scarti)} da scartare")
    print("Primi 12 argomenti che resterebbero in coda:")
    for v in buone[:12]:
        print(f"  OK  {(v.get('title') or '')[:70]}")

    if not apply_:
        print("\n(report soltanto: nessuna modifica. Rilancia con --apply per scartare)")
        return 0

    for v, m in scarti:
        strapi.update("content-queues", v["documentId"], {
            "status": "failed",
            "generation_log": f"scartato da queue_quality_audit: {m}",
        })
    print(f"\nscartate {len(scarti)} voci (status=failed con motivo nel log)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
