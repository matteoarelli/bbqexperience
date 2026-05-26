#!/usr/bin/env python3
"""
Keyword Scout — Scopre keyword BBQ e crea piano editoriale settimanale.
Scrape Google Suggest + analisi GSC + gap competitor.
Cron: Lunedi 05:00 su Hetzner.
"""

import os
import re
import sys
import json
import time
import random
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import gsc_client
from agents.lib.slugify import slugify
# B1 fix: import dal modulo condiviso (NON da meta_optimizer per evitare
# circular import). Single source of truth per CTR benchmark.
from agents.lib.ctr_benchmark import CTR_BENCHMARK, benchmark_for_position

# ─── Configurazione ──────────────────────────────────────────────────────────

CLUSTERS = {
    "smoking": [
        "how to smoke meat", "smoking wood types", "smoke ring",
        "cold smoking", "hot smoking", "smoker temperature",
        "electric smoker", "pellet smoker", "offset smoker",
    ],
    "grills": [
        "best bbq grill", "charcoal grill", "gas grill", "pellet grill",
        "portable grill", "grill maintenance", "grill accessories",
        "weber grill", "traeger grill", "kamado grill",
    ],
    "thermometers": [
        "best meat thermometer", "wireless thermometer", "instant read thermometer",
        "thermapen", "meater", "meat temperature chart",
        "bbq thermometer", "probe thermometer",
    ],
    "brisket": [
        "how to cook brisket", "smoked brisket", "brisket recipe",
        "brisket temperature", "brisket wrap", "brisket rub",
        "texas brisket", "brisket flat vs point",
    ],
    "sauces": [
        "bbq sauce recipe", "bbq rub recipe", "dry rub",
        "carolina bbq sauce", "kansas city bbq sauce", "texas bbq sauce",
        "injection marinade", "mop sauce",
    ],
}

# Mappe content_type suggerito per cluster
CLUSTER_CONTENT_TYPE = {
    "smoking": "tutorial",
    "grills": "blog",
    "thermometers": "blog",
    "brisket": "recipe",
    "sauces": "recipe",
}

# ─── Filtri qualità topic ─────────────────────────────────────────────────────

# Search modifier che Google Suggest restituisce come long-tail ma che NON sono
# utilizzabili come titolo articolo: l'utente vuole opinioni/dati di terze parti,
# non un articolo intitolato con il modifier. Es: "best meat thermometer reddit"
# → la persona cerca thread Reddit, non un nostro articolo.
# Scartati a monte. In futuro, possibile riformulazione via LLM ("Cosa dice
# Reddit sui termometri" → titolo decente), ma per ora drop and move on.
JUNK_TRAILING_MODIFIERS = {
    "reddit", "quora", "wiki", "wikipedia", "youtube", "tiktok",
    "uk", "usa", "us", "europe", "australia", "canada", "germany",
    "amazon", "walmart", "costco", "lidl", "ikea", "ebay",
    "near", "near me", "review", "reviews",
}

# Topic stagionali — accettati solo nei mesi elencati (1=Gen ... 12=Dic).
# "Thanksgiving turkey" pubblicato in maggio = zero traffico e dilution dell'authority.
# Le keyword Google Suggest sono indipendenti dal mese: il filtro vive qui.
SEASONAL_KEYWORDS: dict[str, list[int]] = {
    "thanksgiving": [9, 10, 11],
    "christmas": [10, 11, 12],
    "new year": [12, 1],
    "super bowl": [12, 1, 2],
    "easter": [2, 3, 4],
    "fourth of july": [5, 6, 7],
    "4th of july": [5, 6, 7],
    "memorial day": [4, 5],
    "labor day": [7, 8, 9],
    "halloween": [9, 10],
    "summer": [4, 5, 6, 7, 8],
    "winter": [11, 12, 1, 2],
    "fall ": [9, 10, 11],  # spazio per evitare match con "fall apart", "fall off"
    "autumn": [9, 10, 11],
}

# Year-modifier obsoleti: "best bbq grill 2025" pubblicato nel 2026 = topic stale.
# Manteniamo solo year corrente e prossimo (forward-looking ok).
STALE_YEAR_RE = re.compile(r"\b(20[12]\d)\b")

# ─── GSC striking-distance config (Phase 17) ──────────────────────────────

# Striking-distance: query con posizione fuori top 10 ma sotto il limite della
# 2a SERP (20), con impressions sufficienti per essere segnale (>=30/28gg).
# Locked per il plan 17-02 (RESEARCH.md sezione E).
STRIKING_POSITION_RANGE = (8, 20)
STRIKING_MIN_IMPRESSIONS = 30


def is_acceptable_topic(keyword: str, today: datetime | None = None) -> tuple[bool, str]:
    """Verifica se il keyword è utilizzabile come titolo articolo.

    Ritorna (ok, motivo_se_rifiuto). Centralizza tutti i filtri qualità in un
    posto solo, così keyword_scout e ig_to_content possono entrambi usarlo.
    """
    today = today or datetime.now()
    kw = keyword.lower().strip()
    tokens = kw.split()
    if not tokens:
        return False, "empty"

    # Topic troncato con "..." (residuo di IG caption truncate o keyword_scout
    # bug pre-fix 734195d) — non utilizzabile come titolo, scarta a monte.
    if kw.endswith("...") or kw.endswith("…"):
        return False, "truncated-suffix"

    # Trailing modifier (1 o 2 token in coda)
    if tokens[-1] in JUNK_TRAILING_MODIFIERS:
        return False, f"trailing-modifier:{tokens[-1]}"
    if len(tokens) >= 2 and " ".join(tokens[-2:]) in JUNK_TRAILING_MODIFIERS:
        return False, f"trailing-modifier:{' '.join(tokens[-2:])}"

    # Year modifier: solo anno corrente o successivo. "Best BBQ 2024" nel 2026 = stale.
    year_match = STALE_YEAR_RE.search(kw)
    if year_match:
        year = int(year_match.group(1))
        if year < today.year:
            return False, f"stale-year:{year}"

    # Seasonality filter — mese corrente fuori dal range stagionale
    current_month = today.month
    for season_kw, allowed_months in SEASONAL_KEYWORDS.items():
        if season_kw in kw and current_month not in allowed_months:
            return False, f"off-season:{season_kw.strip()}@m{current_month}"

    return True, ""


def get_google_suggestions(query: str) -> list[str]:
    """Recupera suggerimenti da Google Suggest API."""
    url = f"http://suggestqueries.google.com/complete/search?client=firefox&q={quote_plus(query)}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data[1] if len(data) > 1 else []
    except Exception as e:
        print(f"[WARN] Google Suggest fallito per '{query}': {e}")
        return []


def get_existing_keywords() -> set[str]:
    """Recupera keyword gia presenti in ContentQueue e EditorialCalendar."""
    keywords: set[str] = set()

    # Da ContentQueue
    queue_items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        fields=["target_keyword"],
    )
    for item in queue_items:
        kw = item.get("target_keyword", "")
        if kw:
            keywords.add(kw.lower().strip())

    # Da EditorialCalendar
    cal_items = strapi.find_all_pages(
        "editorial-calendars",
        status="draft",
        fields=["target_keyword"],
    )
    for item in cal_items:
        kw = item.get("target_keyword", "")
        if kw:
            keywords.add(kw.lower().strip())

    return keywords


def get_existing_content_titles() -> set[str]:
    """Recupera titoli di contenuti gia pubblicati per evitare duplicati."""
    titles: set[str] = set()
    for ct in ["blog-posts", "tutorials", "recipes", "reviews"]:
        items = strapi.find_all_pages(ct, fields=["title", "slug"])
        for item in items:
            titles.add(item.get("title", "").lower().strip())
            titles.add(item.get("slug", "").lower().strip())
    return titles


def scout_keywords() -> list[dict]:
    """Esegue il scouting keyword per tutti i cluster."""
    existing_kw = get_existing_keywords()
    existing_titles = get_existing_content_titles()
    discoveries: list[dict] = []
    rejected: dict[str, int] = {}  # contatore reasons per Telegram report

    for cluster_name, seeds in CLUSTERS.items():
        for seed in seeds:
            suggestions = get_google_suggestions(seed)
            # Delay casuale per evitare rate limit
            time.sleep(random.uniform(1.0, 3.0))

            for suggestion in suggestions:
                kw = suggestion.lower().strip()
                # Filtra: gia presente, troppo corto, non BBQ-related
                if kw in existing_kw:
                    continue
                if len(kw.split()) < 2:
                    continue
                # Controlla che non sia gia un contenuto esistente.
                # Usa il vero slugify (allineato allo slug pubblicato da Strapi),
                # non il naïf replace(" ","-") che mancava punteggiatura/troncamento.
                slug_version = slugify(kw)
                if kw in existing_titles or slug_version in existing_titles:
                    continue

                # Filtri qualità: trailing modifier, year stale, stagione sbagliata
                ok, reason = is_acceptable_topic(kw)
                if not ok:
                    rejected[reason] = rejected.get(reason, 0) + 1
                    print(f"  [skip] {kw!r}: {reason}")
                    continue

                existing_kw.add(kw)
                discoveries.append({
                    "keyword": kw,
                    "cluster": cluster_name,
                    "source_seed": seed,
                    "content_type": CLUSTER_CONTENT_TYPE.get(cluster_name, "blog"),
                })

    if rejected:
        print(f"[quality-filter] scartate: {rejected}")

    return discoveries


def scout_gsc_striking(days: int = 28) -> list[dict]:
    """Pesca query GSC in striking-distance: pos 8-20, imp>=30, ctr<benchmark.

    Ritorna lista di dict pronti per merge con i risultati Google Suggest:
      {"query","clicks","impressions","ctr","position","source":"gsc"}

    Fallback graceful: se la GSC fetch fallisce (rete/auth/quota), ritorna []
    e l'agente continua col solo Google Suggest source — il scouting non deve
    mai bloccarsi su un errore GSC.
    """
    try:
        from datetime import date as _date, timedelta as _td
        end = _date.today() - _td(days=3)  # dataState=final ha 2-3gg di lag
        start = end - _td(days=days)
        rows = gsc_client.search_analytics(
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            dimensions=["query"],
            row_limit=5000,
        )
    except Exception as e:
        print(f"[scout_gsc] GSC fetch fallita, skip striking source: {e}")
        return []

    results: list[dict] = []
    lo, hi = STRIKING_POSITION_RANGE
    for row in rows:
        pos = row.get("position", 0)
        imp = row.get("impressions", 0)
        ctr = row.get("ctr", 0)
        if not (lo <= pos <= hi):
            continue
        if imp < STRIKING_MIN_IMPRESSIONS:
            continue
        # skip se gia converte sopra benchmark (non e striking-distance vera).
        # benchmark_for_position clampa pos a 1..10 — perfetto per pos 8-20.
        if ctr >= benchmark_for_position(pos):
            continue
        results.append({
            "query": row["keys"][0],
            "clicks": row.get("clicks", 0),
            "impressions": imp,
            "ctr": ctr,
            "position": pos,
            "source": "gsc",
        })
    results.sort(key=lambda r: r["impressions"], reverse=True)
    return results


def _dedup_candidates(suggest: list[dict], striking: list[dict]) -> list[dict]:
    """Dedup Suggest+GSC via slugify. Source unificato 'gsc+suggest' se overlap.

    Strategia: chiave = slugify(query). Se uno stesso slug compare sia in
    Suggest che in GSC striking, manteniamo l'entry Suggest (per preservare
    cluster/source_seed) ma sovrascriviamo metriche GSC e marchiamo
    source='gsc+suggest'. Pure GSC entries mantengono source='gsc'.
    Pure Suggest entries mantengono source='suggest'.
    """
    out: dict[str, dict] = {}
    for s in suggest:
        key = slugify(s.get("query", s.get("keyword", "")))
        out[key] = {**s, "source": "suggest"}
    for g in striking:
        key = slugify(g["query"])
        if key in out:
            out[key]["source"] = "gsc+suggest"
            # mantieni metriche GSC (utili per ranking + report)
            for k in ("clicks", "impressions", "ctr", "position"):
                if k in g:
                    out[key][k] = g[k]
        else:
            out[key] = g
    return list(out.values())


def build_report(merged: list[dict]) -> str:
    """Formatta i candidati per il Telegram report con source labels.

    Format:
        [GSC striking] "query" — pos 11.3, 47 imp, 0.0% CTR
        [Suggest] "query" — seed "best meat thermometer"
        [GSC+Suggest] "query" — pos 9.1, 124 imp, 1.6% CTR
    """
    lines: list[str] = []
    for c in merged:
        src = c.get("source", "suggest")
        q = c.get("query") or c.get("keyword", "?")
        if src == "gsc":
            lines.append(
                f"[GSC striking] \"{q}\" — pos {c.get('position', 0):.1f}, "
                f"{c.get('impressions', 0)} imp, {c.get('ctr', 0):.1%} CTR"
            )
        elif src == "gsc+suggest":
            lines.append(
                f"[GSC+Suggest] \"{q}\" — pos {c.get('position', 0):.1f}, "
                f"{c.get('impressions', 0)} imp, {c.get('ctr', 0):.1%} CTR"
            )
        else:  # 'suggest' o sconosciuto
            seed = c.get("source_seed", "?")
            lines.append(f"[Suggest] \"{q}\" — seed \"{seed}\"")
    return "\n".join(lines)


def prioritize_and_create_queue(discoveries: list[dict], max_items: int = 7) -> list[dict]:
    """Seleziona le top keyword e crea entry in ContentQueue."""
    # Priorita: distribuisci equamente tra cluster
    by_cluster: dict[str, list[dict]] = {}
    for d in discoveries:
        by_cluster.setdefault(d["cluster"], []).append(d)

    selected: list[dict] = []
    cluster_names = list(by_cluster.keys())
    idx = 0
    while len(selected) < max_items and any(by_cluster.values()):
        cluster = cluster_names[idx % len(cluster_names)]
        if by_cluster.get(cluster):
            selected.append(by_cluster[cluster].pop(0))
        idx += 1

    # Crea entry in ContentQueue e EditorialCalendar
    created: list[dict] = []
    today = datetime.now()
    for i, item in enumerate(selected):
        scheduled = today + timedelta(days=i + 1)
        title = item["keyword"].title()

        # ContentQueue
        strapi.create("content-queues", {
            "title": title,
            "content_type": item["content_type"],
            "status": "ready",
            "scheduled_date": scheduled.strftime("%Y-%m-%d"),
            "cluster": item["cluster"],
            "target_keyword": item["keyword"],
            "difficulty": "medium",
            "priority": i + 1,
            "ai_generated": True,
        })

        # EditorialCalendar
        strapi.create("editorial-calendars", {
            "title": title,
            "content_type": item["content_type"],
            "status": "research",
            "target_date": scheduled.strftime("%Y-%m-%d"),
            "target_keyword": item["keyword"],
            "target_locale": "en",
            "priority": "medium",
            "cluster": item["cluster"],
            "ai_generated": True,
            "source_agent": "keyword_scout",
        })

        created.append(item)

    return created


def main():
    print(f"[{datetime.now().isoformat()}] Keyword Scout avviato")

    # 1) Suggest source (path storico)
    discoveries = scout_keywords()
    # Normalizza shape per dedup helper (keyword -> query)
    suggest_candidates = [
        {**d, "query": d.get("keyword", "")}
        for d in discoveries
    ]
    print(f"Scoperte {len(suggest_candidates)} keyword candidate (Google Suggest)")

    # 2) GSC striking-distance source (Phase 17 — fusione prima del dedup)
    striking = scout_gsc_striking(days=28)
    print(f"Striking-distance GSC: {len(striking)} query candidate")

    # 3) Fusione + dedup via slugify
    merged = _dedup_candidates(suggest_candidates, striking)
    print(f"Merged (dopo dedup Suggest+GSC): {len(merged)} candidati totali")

    # Per backward-compat con prioritize_and_create_queue: assicurati che
    # ogni candidato abbia 'keyword' + 'cluster' + 'content_type'. I candidati
    # pure-GSC potrebbero non averli; assegna cluster 'gsc-striking' di default
    # e content_type 'blog' (Matteo riassegna in editing).
    for m in merged:
        if "keyword" not in m:
            m["keyword"] = m.get("query", "")
        if "cluster" not in m:
            m["cluster"] = "gsc-striking"
        if "content_type" not in m:
            m["content_type"] = "blog"

    created = prioritize_and_create_queue(merged, max_items=7)
    print(f"Create {len(created)} entry in ContentQueue")

    # Report Telegram con source labels
    report_lines = build_report(merged[:15])  # top 15 per non saturare il msg
    summary = (
        f"Piano settimanale: {len(created)} nuovi topic ContentQueue | "
        f"Candidati: {len(merged)} (Suggest {len(suggest_candidates)} + "
        f"GSC striking {len(striking)})"
    )
    if created:
        telegram.send_agent_report(
            "Keyword Scout",
            summary,
            details=[report_lines] if report_lines else None,
        )
    else:
        telegram.send_agent_report(
            "Keyword Scout",
            "Nessuna nuova keyword trovata questa settimana.",
        )

    print(f"[{datetime.now().isoformat()}] Keyword Scout completato")


if __name__ == "__main__":
    main()
