#!/usr/bin/env python3
"""
SEO Optimizer — Inserisce internal link nei contenuti pubblicati.
Cron: 2x/giorno (09:00, 15:00) su Hetzner.

Itera per locale e usa slug di route localizzati per evitare link cross-locale
(es. mai /en/recipes/ in un contenuto IT). Skippa testo gia dentro <a>...</a>
per evitare anchor annidati.
"""

import os
import sys
import re
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram


LOCALES = ["en", "it", "es"]

# Slug di route per content type e locale (deve restare sincronizzato con
# web/src/lib/i18n.ts: localizedRoutes)
ROUTE_BY_LOCALE: dict[str, dict[str, str]] = {
    "blog-posts": {"en": "blog", "it": "blog", "es": "blog"},
    "tutorials": {"en": "tutorials", "it": "guide", "es": "tutoriales"},
    "reviews": {"en": "reviews", "it": "recensioni", "es": "resenas"},
    "recipes": {"en": "recipes", "it": "ricette", "es": "recetas"},
}

# Campo testo principale per content type
CONTENT_FIELD: dict[str, str] = {
    "blog-posts": "content",
    "tutorials": "content",
    "reviews": "editorial_content",
    "recipes": "editorial_intro",
}

# Stop words per estrazione keyword
STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "for",
    "to", "and", "or", "but", "with", "by", "at", "from", "how", "what",
    "why", "when", "best", "top", "vs", "your", "our", "this", "that",
    # IT
    "il", "lo", "la", "i", "gli", "le", "un", "una", "uno", "del", "della",
    "che", "come", "per", "con", "tra", "fra", "alla", "allo",
    # ES
    "el", "los", "las", "una", "unos", "unas", "del", "que", "como",
    "para", "con", "entre", "por",
}


def get_recent_content_by_locale(locale: str, hours: int = 24) -> list[dict]:
    """Recupera contenuti pubblicati nel locale dato, aggiornati nelle ultime N ore."""
    cutoff = datetime.now() - timedelta(hours=hours)
    out: list[dict] = []
    for ct in CONTENT_FIELD.keys():
        items = strapi.find_all_pages(
            ct,
            locale=locale,
            sort="updatedAt:desc",
            page_size=50,
            populate="*",
        )
        for item in items:
            updated = item.get("updatedAt", "")
            if not updated:
                continue
            try:
                dt = datetime.fromisoformat(updated.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                continue
            if dt > cutoff:
                item["_content_type"] = ct
                out.append(item)
    return out


def get_all_titles_by_locale(locale: str) -> list[dict]:
    """Recupera titolo+slug+content_type di tutti i contenuti pubblicati per linking."""
    out: list[dict] = []
    for ct in CONTENT_FIELD.keys():
        items = strapi.find_all_pages(
            ct,
            locale=locale,
            fields=["title", "slug"],
        )
        for item in items:
            item["_content_type"] = ct
            out.append(item)
    return out


def extract_keywords(title: str) -> list[str]:
    """Estrae bigram/trigram significativi dal titolo."""
    words = re.findall(r'[A-Za-zÀ-ÿ]+', title.lower())
    words = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    phrases: list[str] = []
    for i in range(len(words)):
        if i + 1 < len(words):
            phrases.append(f"{words[i]} {words[i+1]}")
        if i + 2 < len(words):
            phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")
    return phrases[:5]


def build_link_map(items: list[dict], locale: str) -> dict[str, dict]:
    """Mappa keyword -> {url, slug, title} per il locale dato."""
    link_map: dict[str, dict] = {}
    for item in items:
        slug = item.get("slug", "")
        title = item.get("title", "")
        ct = item.get("_content_type", "")
        if not slug or ct not in ROUTE_BY_LOCALE:
            continue
        route = ROUTE_BY_LOCALE[ct][locale]
        url = f"/{locale}/{route}/{slug}/"
        for kw in extract_keywords(title):
            if kw not in link_map:
                link_map[kw] = {"url": url, "title": title, "slug": slug}
    return link_map


# Range di indici (inizio, fine) di blocchi <a ...>...</a> nel testo.
# Usato per skippare match dentro anchor esistenti.
ANCHOR_BLOCK_RE = re.compile(r'<a\s[^>]*>.*?</a>', re.IGNORECASE | re.DOTALL)


def find_anchor_ranges(text: str) -> list[tuple[int, int]]:
    return [(m.start(), m.end()) for m in ANCHOR_BLOCK_RE.finditer(text)]


def is_inside(pos: int, ranges: list[tuple[int, int]]) -> bool:
    for s, e in ranges:
        if s <= pos < e:
            return True
    return False


def add_internal_links(
    content: str,
    link_map: dict[str, dict],
    own_slug: str,
    max_links: int = 5,
) -> tuple[str, int]:
    """Aggiunge fino a max_links anchor al contenuto. Skippa zone dentro <a>...</a>
    per evitare nesting. Una sola occorrenza per keyword, una sola URL per pass."""
    added = 0
    used_urls: set[str] = set()

    for keyword, link_info in link_map.items():
        if added >= max_links:
            break
        if link_info["slug"] == own_slug or link_info["url"] in used_urls:
            continue

        # Word boundary case-insensitive
        pattern = re.compile(rf'\b{re.escape(keyword)}\b', re.IGNORECASE)
        anchor_ranges = find_anchor_ranges(content)

        match = None
        for m in pattern.finditer(content):
            if not is_inside(m.start(), anchor_ranges):
                match = m
                break
        if match is None:
            continue

        replacement = f'<a href="{link_info["url"]}">{match.group(0)}</a>'
        content = content[:match.start()] + replacement + content[match.end():]
        used_urls.add(link_info["url"])
        added += 1

    return content, added


def optimize_item(item: dict, link_map: dict[str, dict], locale: str) -> dict | None:
    ct = item.get("_content_type", "")
    slug = item.get("slug", "")
    doc_id = item.get("documentId", "")
    field = CONTENT_FIELD.get(ct)
    if not field or not doc_id:
        return None
    content = item.get(field, "") or ""
    if not content:
        return None
    updated, added = add_internal_links(content, link_map, slug)
    if added == 0:
        return None
    return {
        "doc_id": doc_id,
        "content_type": ct,
        "field": field,
        "slug": slug,
        "data": {field: updated, "slug": slug},
        "links_added": added,
        "locale": locale,
    }


def main() -> None:
    print(f"[{datetime.now().isoformat()}] SEO Optimizer avviato")
    optimized: list[str] = []
    total_links = 0

    for locale in LOCALES:
        recent = get_recent_content_by_locale(locale, hours=24)
        if not recent:
            continue
        all_titles = get_all_titles_by_locale(locale)
        link_map = build_link_map(all_titles, locale)
        print(f"[{locale}] recenti={len(recent)} keyword_map={len(link_map)}")

        for item in recent:
            result = optimize_item(item, link_map, locale)
            if not result:
                continue
            try:
                strapi.update(
                    result["content_type"],
                    result["doc_id"],
                    result["data"],
                    locale=locale,
                )
                optimized.append(
                    f"[{locale}] {item.get('title', '?')} (+{result['links_added']} link)"
                )
                total_links += result["links_added"]
            except Exception as e:
                print(f"[WARN] Update fallito {locale} {item.get('title','?')}: {e}")

    if optimized:
        telegram.send_agent_report(
            "SEO Optimizer",
            f"Ottimizzati {len(optimized)} contenuti, {total_links} internal link aggiunti",
            optimized[:10],
        )
    else:
        print("Nessun contenuto da ottimizzare")

    print(f"[{datetime.now().isoformat()}] SEO Optimizer completato")


if __name__ == "__main__":
    main()
