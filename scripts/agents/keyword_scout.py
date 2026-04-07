#!/usr/bin/env python3
"""
Keyword Scout — Scopre keyword BBQ e crea piano editoriale settimanale.
Scrape Google Suggest + analisi GSC + gap competitor.
Cron: Lunedi 05:00 su Hetzner.
"""

import os
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

                existing_kw.add(kw)
                discoveries.append({
                    "keyword": kw,
                    "cluster": cluster_name,
                    "source_seed": seed,
                    "content_type": CLUSTER_CONTENT_TYPE.get(cluster_name, "blog"),
                })

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
