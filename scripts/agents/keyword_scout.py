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
                # Controlla che non sia gia un contenuto esistente
                slug_version = kw.replace(" ", "-")
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

    discoveries = scout_keywords()
    print(f"Scoperte {len(discoveries)} keyword candidate")

    created = prioritize_and_create_queue(discoveries, max_items=7)
    print(f"Create {len(created)} entry in ContentQueue")

    # Report Telegram
    if created:
        details = [
            f"<b>{item['keyword']}</b> ({item['cluster']}, {item['content_type']})"
            for item in created
        ]
        telegram.send_agent_report(
            "Keyword Scout",
            f"Piano settimanale: {len(created)} nuovi topic scoperti da {len(discoveries)} candidati",
            details,
        )
    else:
        telegram.send_agent_report(
            "Keyword Scout",
            "Nessuna nuova keyword trovata questa settimana.",
        )

    print(f"[{datetime.now().isoformat()}] Keyword Scout completato")


if __name__ == "__main__":
    main()
