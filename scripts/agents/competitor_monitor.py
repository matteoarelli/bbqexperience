#!/usr/bin/env python3
"""
Competitor Monitor — Monitora RSS/sitemap di blog BBQ competitor per nuovi articoli.
Cron: ogni 12h su Hetzner.
"""

import os
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import telegram

# ─── Competitor da monitorare ─────────────────────────────────────────────────

COMPETITORS = [
    {"name": "Hey Grill Hey", "rss": "https://heygrillhey.com/feed/"},
    {"name": "Vindulge", "rss": "https://vindulge.com/feed/"},
    {"name": "Girls Can Grill", "rss": "https://girlscangrill.com/feed/"},
    {"name": "ThermoWorks Blog", "rss": "https://blog.thermoworks.com/feed/"},
    {"name": "Angry BBQ", "rss": "https://angrybbq.com/feed/"},
    {"name": "Smoked BBQ Source", "rss": "https://smokedbbqsource.com/feed/"},
    {"name": "Jess Pryles", "rss": "https://jesspryles.com/feed/"},
    {"name": "How to BBQ Right", "rss": "https://howtobbqright.com/feed/"},
]

STATE_FILE = Path(__file__).parent.parent.parent / "state" / "competitor_state.json"


def load_state() -> dict:
    """Carica stato precedente (URL gia visti)."""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"seen_urls": []}


def save_state(state: dict) -> None:
    """Salva stato aggiornato con scrittura atomica (temp + rename)."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = STATE_FILE.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    os.replace(str(tmp_path), str(STATE_FILE))


def fetch_rss(url: str) -> list[dict]:
    """Scarica e parsa un feed RSS. Ritorna lista di articoli."""
    articles: list[dict] = []
    try:
        req = Request(url, headers={"User-Agent": "BBQExperience-Monitor/1.0"})
        with urlopen(req, timeout=15) as resp:
            content = resp.read()

        root = ET.fromstring(content)
        # Supporta sia RSS 2.0 che Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        # RSS 2.0
        for item in root.findall(".//item"):
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            description = item.findtext("description", "").strip()
            if title and link:
                articles.append({
                    "title": title,
                    "url": link,
                    "date": pub_date,
                    "description": description[:200],
                })

        # Atom
        for entry in root.findall(".//atom:entry", ns):
            title = entry.findtext("atom:title", "", ns).strip()
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href", "") if link_el is not None else ""
            pub_date = entry.findtext("atom:published", "", ns).strip()
            summary = entry.findtext("atom:summary", "", ns).strip()
            if title and link:
                articles.append({
                    "title": title,
                    "url": link,
                    "date": pub_date,
                    "description": summary[:200],
                })

    except (HTTPError, ET.ParseError) as e:
        print(f"[WARN] RSS fetch fallito per {url}: {e}")
    except (URLError, TimeoutError, OSError) as e:
        print(f"[WARN] RSS connessione fallita per {url}: {e}")

    return articles


def main():
    print(f"[{datetime.now().isoformat()}] Competitor Monitor avviato")

    state = load_state()
    seen_urls = set(state.get("seen_urls", []))
    new_articles: list[dict] = []

    for competitor in COMPETITORS:
        articles = fetch_rss(competitor["rss"])
        for article in articles:
            if article["url"] not in seen_urls:
                article["source"] = competitor["name"]
                new_articles.append(article)
                seen_urls.add(article["url"])

    # Aggiorna stato
    # Mantieni solo gli ultimi 1000 URL per non far crescere il file
    state["seen_urls"] = list(seen_urls)[-1000:]
    state["last_check"] = datetime.now().isoformat()
    save_state(state)

    print(f"Nuovi articoli competitor: {len(new_articles)}")

    # Report Telegram se ci sono novita
    if new_articles:
        details = [
            f'<a href="{a["url"]}">{a["title"]}</a> ({a["source"]})'
            for a in new_articles[:10]  # Max 10 nel report
        ]
        telegram.send_agent_report(
            "Competitor Monitor",
            f"{len(new_articles)} nuovi articoli rilevati",
            details,
        )
    else:
        print("Nessun nuovo articolo competitor")

    print(f"[{datetime.now().isoformat()}] Competitor Monitor completato")


if __name__ == "__main__":
    main()
