#!/usr/bin/env python3
"""
Content Generator — Genera articoli BBQ con Claude Code CLI e li pubblica su Strapi.
Legge dalla ContentQueue, genera in EN con Claude (piano Max), pubblica.
Le traduzioni IT/ES vengono fatte dal translation_agent separato (Ollama).
Cron: Daily 06:00 via Windows Task Scheduler (Claude CLI funziona solo su Windows).
"""

import os
import sys
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import claude_client as claude

# ─── Mappe content type Strapi ────────────────────────────────────────────────

STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",  # Le comparazioni sono blog post con categoria specifica
}


def get_next_queue_item() -> dict | None:
    """Recupera il prossimo item dalla ContentQueue con status 'ready'."""
    resp = strapi.find(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "ready"}},
        sort="priority:asc,scheduled_date:asc",
        page_size=1,
    )
    items = resp.get("data", [])
    return items[0] if items else None


def generate_article(title: str, keyword: str, cluster: str, content_type: str) -> dict:
    """Genera articolo completo in EN con Claude Code CLI (piano Max).
    Un singolo prompt produce l'intero articolo — Claude e abbastanza potente."""

    prompt = f"""Write a complete, publication-ready BBQ article for bbq-experience.com.

Title: {title}
Target keyword: {keyword}
Cluster: {cluster}
Content type: {content_type}

REQUIREMENTS:
- 1500-2000 words in English
- Structure: compelling intro, 6-8 sections with H2/H3, conclusion, FAQ (4-5 questions)
- Use HTML tags: h2, h3, p, ul, li, strong, em, table (where appropriate)
- The target keyword MUST appear in the first paragraph and in at least 2 H2 headings
- Include specific data: temperatures in °F, cooking times, weights in lbs/oz
- Tone: "The Pitmaster" — direct, technical, zero marketing BS, brutally honest
- NO generic intros like "BBQ is a beloved tradition..." — get to the point immediately
- Include practical tips based on real pitmaster experience
- Each section should have an actionable takeaway
- FAQ answers must be specific with data, not generic

OUTPUT: Only the HTML content (no html/head/body wrapper, no title tag). Start directly with the first paragraph."""

    content = claude.ask(prompt, timeout=300)
    word_count = len(content.split())
    print(f"  Articolo generato: {word_count} parole")

    # Genera excerpt e SEO meta con Claude
    seo_prompt = f"""For this BBQ article titled "{title}" with keyword "{keyword}", generate:

1. An excerpt for search results (1-2 sentences, max 155 characters, plain text, no HTML)
2. SEO title (max 60 characters, must include the keyword)
3. Meta description (max 155 characters, must include the keyword, with call to action)

Reply in this EXACT format (3 lines, nothing else):
EXCERPT: ...
SEO_TITLE: ...
SEO_DESCRIPTION: ..."""

    seo_raw = claude.ask(seo_prompt, timeout=60)

    excerpt = ""
    seo_title = title[:60]
    seo_description = ""

    for line in seo_raw.strip().split("\n"):
        line = line.strip()
        if line.startswith("EXCERPT:"):
            excerpt = line[8:].strip()[:160]
        elif line.startswith("SEO_TITLE:"):
            seo_title = line[10:].strip()[:60]
        elif line.startswith("SEO_DESCRIPTION:"):
            seo_description = line[16:].strip()[:155]

    if not excerpt:
        excerpt = (content[:155].split(".")[0] + ".").strip()
    if not seo_description:
        seo_description = excerpt[:155]

    return {
        "content": content,
        "excerpt": excerpt,
        "seo_title": seo_title,
        "seo_description": seo_description,
    }


def generate_slug(title: str) -> str:
    """Genera slug URL-safe dal titolo."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:80].strip("-")


def publish_article(
    queue_item: dict, article: dict, content_type_strapi: str, content_type_raw: str
) -> str | None:
    """Pubblica articolo in EN e traduzioni IT/ES su Strapi. Ritorna documentId."""
    title = queue_item.get("title", "Untitled")
    slug = generate_slug(title)
    keyword = queue_item.get("target_keyword", "")

    # Dati comuni
    base_data: dict = {
        "title": title,
        "slug": slug,
        "excerpt": article["excerpt"],
        "seo_title": article["seo_title"],
        "seo_description": article["seo_description"],
        "published_date": datetime.now().strftime("%Y-%m-%d"),
    }

    # Campo contenuto varia per content type
    if content_type_strapi == "blog-posts":
        base_data["content"] = article["content"]
        base_data["category"] = "tips"  # Default per AI-generated
        if content_type_raw == "comparison":
            base_data["category"] = "trends"
        word_count = len(article["content"].split())
        base_data["reading_time"] = max(1, word_count // 200)
    elif content_type_strapi == "tutorials":
        base_data["content"] = article["content"]
        base_data["category"] = "knowledge"
        word_count = len(article["content"].split())
        base_data["reading_time"] = max(1, word_count // 200)
    elif content_type_strapi == "recipes":
        base_data["editorial_intro"] = article["content"]

    # Pubblica EN (traduzioni IT/ES gestite dal translation_agent separato)
    try:
        resp = strapi.create(content_type_strapi, base_data)
        doc_id = resp.get("data", {}).get("documentId")
        if not doc_id:
            print(f"[ERRORE] Nessun documentId nella risposta per '{title}'")
            return None
        print(f"  Pubblicato EN: {content_type_strapi}/{doc_id}")
        return doc_id
    except Exception as e:
        print(f"[ERRORE] Pubblicazione EN fallita per '{title}': {e}")
        return None


def main():
    print(f"[{datetime.now().isoformat()}] Content Generator avviato")

    queue_item = get_next_queue_item()
    if not queue_item:
        print("Nessun item nella ContentQueue con status 'ready'")
        telegram.send_agent_report("Content Generator", "Nessun articolo in coda oggi.")
        return

    doc_id_queue = queue_item.get("documentId")
    title = queue_item.get("title", "Untitled")
    keyword = queue_item.get("target_keyword", "")
    cluster = queue_item.get("cluster", "uncategorized")
    content_type_raw = queue_item.get("content_type", "blog")
    content_type_strapi = STRAPI_CONTENT_TYPES.get(content_type_raw, "blog-posts")

    print(f"Generazione: '{title}' (keyword: {keyword}, cluster: {cluster})")

    # Aggiorna status a "generating"
    strapi.update("content-queues", doc_id_queue, {"status": "generating"})

    try:
        # Genera articolo
        article = generate_article(title, keyword, cluster, content_type_raw)
        print(f"Articolo generato: {len(article['content'])} caratteri")

        # Pubblica
        published_id = publish_article(queue_item, article, content_type_strapi, content_type_raw)

        if published_id:
            # Aggiorna ContentQueue — pubblicato direttamente (Claude genera qualita)
            strapi.update("content-queues", doc_id_queue, {
                "status": "published",
                "published_content_id": published_id,
                "body_en": article["content"][:500],
                "generation_log": f"Generato da Claude Max {datetime.now().isoformat()} - {len(article['content'].split())} parole",
            })

            telegram.send_agent_report(
                "Content Generator",
                f"Articolo pubblicato in 3 lingue",
                [
                    f"<b>{title}</b>",
                    f"Keyword: {keyword}",
                    f"Cluster: {cluster}",
                    f"Tipo: {content_type_strapi}",
                    f"ID: {published_id}",
                ],
            )
        else:
            strapi.update("content-queues", doc_id_queue, {
                "status": "failed",
                "generation_log": f"Pubblicazione fallita {datetime.now().isoformat()}",
            })
            telegram.send_agent_report("Content Generator", f"ERRORE: pubblicazione fallita per '{title}'")

    except Exception as e:
        strapi.update("content-queues", doc_id_queue, {
            "status": "failed",
            "generation_log": f"Errore: {e} - {datetime.now().isoformat()}",
        })
        telegram.send_agent_report("Content Generator", f"ERRORE: {e}")
        raise

    print(f"[{datetime.now().isoformat()}] Content Generator completato")


if __name__ == "__main__":
    main()
