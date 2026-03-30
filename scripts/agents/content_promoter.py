#!/usr/bin/env python3
"""
Content Promoter — Ponte tra contenuti AI e Instagram bot.

Quando un articolo viene approvato da Claude Reviewer (status: published),
questo agente:
1. Aggiorna site_promo_queue.json con i nuovi articoli (letto dal recycler)
2. Aggiorna first_comments.json con link al nuovo contenuto (letto dall'editorial bot)
3. Aggiorna site_content.json (letto dal bridge e dall'editorial bot per caption AI)
4. Se il piano editoriale della settimana ha slot liberi, inietta un post "site_promo"

Gira su 192.168.1.119 dove sia bbqexperience/ che instagram-bot/ sono accessibili.
Cron: ogni 6 ore (dopo content_generator + claude_reviewer).
"""

import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram

# Paths dell'ecosistema Instagram bot
IG_BOT_DIR = Path.home() / "instagram-bot"
IG_INTEGRATIONS_DIR = IG_BOT_DIR / "integrations"
IG_STATE_DIR = IG_BOT_DIR / "state" if (IG_BOT_DIR / "state").exists() else IG_BOT_DIR
SITE_URL = "https://bbq-experience.com"

# File condivisi con il bot IG
SITE_CONTENT_FILE = IG_INTEGRATIONS_DIR / "site_content.json"
SITE_PROMO_FILE = IG_INTEGRATIONS_DIR / "site_promo_queue.json"
FIRST_COMMENTS_FILE = IG_INTEGRATIONS_DIR / "first_comments.json"
LINK_MAP_FILE = IG_INTEGRATIONS_DIR / "link_map.json"
EDITORIAL_PLAN_FILE = IG_STATE_DIR / "editorial_plan.json"

# Tracking locale per non promuovere due volte
PROMOTED_FILE = Path(__file__).parent.parent.parent / "state" / "promoted_articles.json"


def load_json(path: Path) -> dict | list:
    """Carica un file JSON, ritorna {} se non esiste."""
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def save_json(path: Path, data: dict | list) -> None:
    """Salva dati in un file JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_recently_published() -> list[dict]:
    """Recupera articoli approvati da Claude Reviewer nelle ultime 24h."""
    # Cerca nella ContentQueue gli articoli pubblicati di recente
    items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "published"}, "ai_generated": {"$eq": "true"}},
        sort="updatedAt:desc",
        page_size=20,
    )

    # Carica tracking per evitare duplicati
    promoted = load_json(PROMOTED_FILE)
    promoted_ids = set(promoted.get("promoted_ids", []))

    new_articles: list[dict] = []
    for item in items:
        content_id = item.get("published_content_id", "")
        if content_id and content_id not in promoted_ids:
            # Recupera dati completi dall'articolo pubblicato
            ct_map = {"blog": "blog-posts", "tutorial": "tutorials", "recipe": "recipes", "comparison": "blog-posts"}
            ct = ct_map.get(item.get("content_type", "blog"), "blog-posts")
            route_map = {"blog-posts": "blog", "tutorials": "tutorials", "recipes": "recipes"}
            route = route_map.get(ct, "blog")

            try:
                resp = strapi.find_one(ct, content_id)
                data = resp.get("data", {})
                slug = data.get("slug", "")
                if slug:
                    new_articles.append({
                        "title": data.get("title", item.get("title", "")),
                        "slug": slug,
                        "excerpt": data.get("excerpt", ""),
                        "content_type": item.get("content_type", "blog"),
                        "cluster": item.get("cluster", ""),
                        "keyword": item.get("target_keyword", ""),
                        "url": f"{SITE_URL}/en/{route}/{slug}/",
                        "content_id": content_id,
                        "queue_doc_id": item.get("documentId", ""),
                    })
            except Exception as e:
                print(f"[WARN] Contenuto {content_id} non recuperato: {e}")

    return new_articles


def update_site_content(articles: list[dict]) -> int:
    """Aggiorna site_content.json con i nuovi articoli."""
    site_content = load_json(SITE_CONTENT_FILE)
    if not isinstance(site_content, dict):
        site_content = {"fetched_at": "", "articles": [], "reviews": [], "recipes": []}

    existing_urls = set()
    for key in ("articles", "reviews", "recipes"):
        for item in site_content.get(key, []):
            existing_urls.add(item.get("url", ""))

    added = 0
    for article in articles:
        if article["url"] in existing_urls:
            continue

        entry = {
            "title": article["title"],
            "slug": article["slug"],
            "excerpt": article["excerpt"],
            "category": article["cluster"],
            "date": datetime.now().strftime("%Y-%m-%d"),
            "url": article["url"],
        }

        ct = article["content_type"]
        if ct in ("blog", "comparison"):
            site_content.setdefault("articles", []).insert(0, entry)
        elif ct == "recipe":
            site_content.setdefault("recipes", []).insert(0, entry)
        elif ct in ("tutorial",):
            site_content.setdefault("articles", []).insert(0, entry)

        added += 1

    if added > 0:
        site_content["fetched_at"] = datetime.now().isoformat()
        save_json(SITE_CONTENT_FILE, site_content)

    return added


def update_promo_queue(articles: list[dict]) -> int:
    """Aggiorna site_promo_queue.json con caption IG pronte."""
    promo = load_json(SITE_PROMO_FILE)
    if not isinstance(promo, dict):
        promo = {"updated": "", "promo_posts": []}

    existing_urls = {p.get("url", "") for p in promo.get("promo_posts", [])}
    added = 0

    for article in articles:
        if article["url"] in existing_urls:
            continue

        # Genera hashtag basati su cluster
        cluster_hashtags = {
            "smoking": "#smoking #smokedmeat #bbqsmoker",
            "grills": "#grilling #bbqgrill #outdoorcooking",
            "thermometers": "#meatthermometer #bbqtools #cookingtemp",
            "brisket": "#brisket #smokedbrisket #texasbbq",
            "sauces": "#bbqsauce #bbqrub #homemade",
        }
        hashtags = cluster_hashtags.get(article["cluster"], "#bbq #grilling")

        caption = (
            f"🔥 NEW on the blog: {article['title']}\n\n"
            f"{article['excerpt'][:150]}\n\n"
            f"Full article — link in bio!\n\n"
            f"#bbqexperience {hashtags} #bbqlife"
        )

        promo.setdefault("promo_posts", []).append({
            "title": article["title"],
            "url": article["url"],
            "caption": caption,
            "story": f"New article: {article['title']} — link in bio!",
            "content_id": article["content_id"],
        })
        added += 1

    if added > 0:
        promo["updated"] = datetime.now().isoformat()
        save_json(SITE_PROMO_FILE, promo)

    return added


def update_first_comments(articles: list[dict]) -> int:
    """Aggiorna first_comments.json con link ai nuovi articoli."""
    fc = load_json(FIRST_COMMENTS_FILE)
    if not isinstance(fc, dict):
        fc = {"generated_at": "", "topic_links": {}, "templates": []}

    topic_links = fc.get("topic_links", {})
    added = 0

    for article in articles:
        # Estrai keyword principali dal titolo per il matching nei commenti
        title_words = re.findall(r'[a-z]+', article["title"].lower())
        stop = {"the", "a", "an", "is", "are", "for", "to", "and", "or", "in", "on", "of", "how", "what", "best", "vs"}
        keywords = [w for w in title_words if w not in stop and len(w) > 3]

        for kw in keywords[:3]:
            if kw not in topic_links:
                topic_links[kw] = {
                    "url": article["url"],
                    "title": article["title"],
                    "template": f"Great question! We wrote a full guide on this: {article['url']}",
                }
                added += 1

    if added > 0:
        fc["topic_links"] = topic_links
        fc["generated_at"] = datetime.now().isoformat()
        save_json(FIRST_COMMENTS_FILE, fc)

    return added


def update_link_map(articles: list[dict]) -> int:
    """Aggiorna link_map.json con nuove keyword → URL."""
    link_map = load_json(LINK_MAP_FILE)
    if not isinstance(link_map, dict):
        link_map = {}

    added = 0
    for article in articles:
        keyword = article.get("keyword", "")
        if keyword and keyword not in link_map:
            link_map[keyword] = article["url"]
            added += 1
        # Aggiungi anche varianti dal titolo
        slug_words = article["slug"].replace("-", " ")
        if slug_words and slug_words not in link_map:
            link_map[slug_words] = article["url"]
            added += 1

    if added > 0:
        save_json(LINK_MAP_FILE, link_map)

    return added


def mark_as_promoted(articles: list[dict]) -> None:
    """Segna gli articoli come promossi per evitare duplicati."""
    promoted = load_json(PROMOTED_FILE)
    if not isinstance(promoted, dict):
        promoted = {"promoted_ids": []}

    ids = set(promoted.get("promoted_ids", []))
    for article in articles:
        ids.add(article["content_id"])

    promoted["promoted_ids"] = list(ids)[-200]  # Mantieni ultimi 200
    promoted["last_updated"] = datetime.now().isoformat()
    save_json(PROMOTED_FILE, promoted)


def main():
    print(f"[{datetime.now().isoformat()}] Content Promoter avviato")

    # Verifica che la directory IG bot esista
    if not IG_BOT_DIR.exists():
        print(f"[ERRORE] Directory Instagram bot non trovata: {IG_BOT_DIR}")
        return

    # Recupera articoli nuovi non ancora promossi
    articles = get_recently_published()
    print(f"Nuovi articoli da promuovere: {len(articles)}")

    if not articles:
        print("Nessun nuovo contenuto da promuovere")
        return

    # Aggiorna tutti i file condivisi
    sc = update_site_content(articles)
    pq = update_promo_queue(articles)
    fc = update_first_comments(articles)
    lm = update_link_map(articles)

    # Segna come promossi
    mark_as_promoted(articles)

    details = [
        f"site_content.json: +{sc} articoli",
        f"site_promo_queue.json: +{pq} caption IG pronte",
        f"first_comments.json: +{fc} keyword link",
        f"link_map.json: +{lm} URL mapping",
    ]
    for article in articles:
        details.append(f"📄 <b>{article['title']}</b> → {article['url']}")

    telegram.send_agent_report(
        "Content Promoter",
        f"{len(articles)} nuovi articoli collegati all'ecosistema Instagram",
        details,
    )

    print(f"[{datetime.now().isoformat()}] Content Promoter completato")


if __name__ == "__main__":
    main()
