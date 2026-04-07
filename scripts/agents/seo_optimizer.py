#!/usr/bin/env python3
"""
SEO Optimizer — Ottimizza meta tags e inserisce internal link nei contenuti pubblicati.
Cron: 2x/giorno (09:00, 15:00) su Hetzner.
"""

import os
import sys
import re
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram


def get_recent_content(hours: int = 24) -> list[dict]:
    """Recupera contenuti pubblicati nelle ultime N ore."""
    all_recent: list[dict] = []
    for ct in ["blog-posts", "tutorials", "reviews", "recipes"]:
        items = strapi.find_all_pages(
            ct,
            populate="*",
            sort="updatedAt:desc",
            page_size=50,
        )
        # Filtra per data aggiornamento
        cutoff = datetime.now() - timedelta(hours=hours)
        for item in items:
            updated = item.get("updatedAt", "")
            if updated:
                try:
                    item_date = datetime.fromisoformat(updated.replace("Z", "+00:00")).replace(tzinfo=None)
                    if item_date > cutoff:
                        item["_content_type"] = ct
                        all_recent.append(item)
                except ValueError:
                    pass
    return all_recent


def get_all_content_for_linking() -> list[dict]:
    """Recupera tutti i contenuti pubblicati per costruire la mappa internal link."""
    all_content: list[dict] = []
    for ct in ["blog-posts", "tutorials", "reviews", "recipes"]:
        items = strapi.find_all_pages(
            ct,
            fields=["title", "slug", "excerpt", "seo_title"],
        )
        for item in items:
            item["_content_type"] = ct
            all_content.append(item)
    return all_content


def build_link_map(all_content: list[dict]) -> dict[str, dict]:
    """Costruisce mappa keyword → URL per internal linking."""
    link_map: dict[str, dict] = {}
    route_map = {
        "blog-posts": "blog",
        "tutorials": "tutorials",
        "reviews": "reviews",
        "recipes": "recipes",
    }
    for item in all_content:
        slug = item.get("slug", "")
        title = item.get("title", "")
        ct = item.get("_content_type", "")
        route = route_map.get(ct, "blog")
        url = f"/en/{route}/{slug}/"

        # Usa parole chiave dal titolo come anchor
        keywords = extract_keywords(title)
        for kw in keywords:
            if kw not in link_map:
                link_map[kw] = {"url": url, "title": title, "slug": slug}

    return link_map


def extract_keywords(title: str) -> list[str]:
    """Estrae keyword significative dal titolo (2-3 word phrases)."""
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "for",
                  "to", "and", "or", "but", "with", "by", "at", "from", "how", "what",
                  "why", "when", "best", "top", "vs", "your", "our", "this", "that"}
    words = re.findall(r'[a-z]+', title.lower())
    words = [w for w in words if w not in stop_words and len(w) > 2]

    phrases: list[str] = []
    # Bigram e trigram
    for i in range(len(words)):
        if i + 1 < len(words):
            phrases.append(f"{words[i]} {words[i+1]}")
        if i + 2 < len(words):
            phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")

    return phrases[:5]  # Max 5 keyword per titolo


def add_internal_links(content: str, link_map: dict[str, dict], own_slug: str, max_links: int = 5) -> tuple[str, int]:
    """Aggiunge internal link al contenuto HTML. Ritorna (contenuto, num_link_aggiunti)."""
    added = 0
    used_urls: set[str] = set()

    for keyword, link_info in link_map.items():
        if added >= max_links:
            break
        if link_info["slug"] == own_slug:
            continue
        if link_info["url"] in used_urls:
            continue

        # Cerca la keyword nel testo (case insensitive, solo in paragrafi, non in tag)
        pattern = re.compile(
            rf'(?<![<\w/])({re.escape(keyword)})(?![^<]*>)',
            re.IGNORECASE
        )
        # Sostituisci solo la prima occorrenza
        new_content, count = pattern.subn(
            rf'<a href="{link_info["url"]}">\1</a>',
            content,
            count=1,
        )
        if count > 0:
            content = new_content
            used_urls.add(link_info["url"])
            added += 1

    return content, added


def optimize_content(item: dict, link_map: dict[str, dict]) -> dict | None:
    """Ottimizza un singolo contenuto. Ritorna i dati da aggiornare o None."""
    ct = item.get("_content_type", "")
    slug = item.get("slug", "")
    doc_id = item.get("documentId", "")

    # Campo contenuto varia per tipo
    content_field = "content" if ct in ("blog-posts", "tutorials") else "editorial_content" if ct == "reviews" else "editorial_intro"
    content = item.get(content_field, "") or ""

    if not content or not doc_id:
        return None

    # Aggiungi internal links
    updated_content, links_added = add_internal_links(content, link_map, slug)

    if links_added == 0:
        return None

    return {
        "doc_id": doc_id,
        "content_type": ct,
        "data": {content_field: updated_content},
        "links_added": links_added,
    }


def main():
    print(f"[{datetime.now().isoformat()}] SEO Optimizer avviato")

    # Recupera contenuti recenti e mappa link
    recent = get_recent_content(hours=24)
    print(f"Contenuti recenti (24h): {len(recent)}")

    all_content = get_all_content_for_linking()
    print(f"Contenuti totali per linking: {len(all_content)}")

    link_map = build_link_map(all_content)
    print(f"Keyword nella link map: {len(link_map)}")

    # Ottimizza ogni contenuto recente
    optimized: list[str] = []
    total_links = 0

    for item in recent:
        result = optimize_content(item, link_map)
        if result:
            try:
                strapi.update(result["content_type"], result["doc_id"], result["data"])
                optimized.append(f"{item.get('title', '?')} (+{result['links_added']} link)")
                total_links += result["links_added"]
            except Exception as e:
                print(f"[WARN] Aggiornamento fallito per {item.get('title', '?')}: {e}")

    # Report
    if optimized:
        telegram.send_agent_report(
            "SEO Optimizer",
            f"Ottimizzati {len(optimized)} contenuti, {total_links} internal link aggiunti",
            optimized[:10],  # Max 10 nel report
        )
    else:
        print("Nessun contenuto da ottimizzare")

    print(f"[{datetime.now().isoformat()}] SEO Optimizer completato")


if __name__ == "__main__":
    main()
