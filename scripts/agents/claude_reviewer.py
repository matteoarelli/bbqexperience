#!/usr/bin/env python3
"""
Claude Reviewer — Quality gate per articoli generati da Ollama.
Usa Claude Code CLI (piano Pro Max) per rivedere e migliorare ogni articolo
prima della pubblicazione. Gira DOPO content_generator.

Flusso: Ollama genera (status: draft_review) → Claude rivede → pubblica o rifiuta.
Cron: Daily 08:00 su 192.168.1.119 (dopo content_generator delle 06:00).
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import claude_client as claude

# Soglia minima di qualita per pubblicazione automatica
MIN_QUALITY_SCORE = 6

# Mappa content type per campo contenuto
CONTENT_FIELDS = {
    "blog-posts": "content",
    "tutorials": "content",
    "recipes": "editorial_intro",
    "reviews": "editorial_content",
}

STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",
}


def get_articles_for_review() -> list[dict]:
    """Recupera articoli in ContentQueue con status 'draft_review'."""
    return strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "draft_review"}},
        sort="priority:asc",
    )


def get_published_content(queue_item: dict) -> dict | None:
    """Recupera il contenuto pubblicato collegato alla queue entry."""
    content_id = queue_item.get("published_content_id", "")
    content_type_raw = queue_item.get("content_type", "blog")
    content_type = STRAPI_CONTENT_TYPES.get(content_type_raw, "blog-posts")

    if not content_id:
        return None

    try:
        resp = strapi.find_one(content_type, content_id, populate="*")
        data = resp.get("data", {})
        data["_content_type"] = content_type
        return data
    except Exception as e:
        print(f"[WARN] Contenuto {content_id} non trovato: {e}")
        return None


def review_and_improve(queue_item: dict, content: dict) -> dict:
    """Rivede l'articolo con Claude e ritorna il risultato."""
    title = queue_item.get("title", "")
    keyword = queue_item.get("target_keyword", "")
    ct = content.get("_content_type", "blog-posts")
    content_field = CONTENT_FIELDS.get(ct, "content")
    body = content.get(content_field, "")

    if not body:
        return {"quality_score": 0, "issues": ["Contenuto vuoto"], "improved_content": ""}

    return claude.review_article(title, body, keyword, locale="en")


def apply_improvements(content: dict, review_result: dict) -> None:
    """Applica i miglioramenti di Claude al contenuto su Strapi."""
    ct = content.get("_content_type", "blog-posts")
    doc_id = content.get("documentId", "")
    content_field = CONTENT_FIELDS.get(ct, "content")

    if not doc_id:
        return

    update_data: dict = {}

    # Aggiorna contenuto migliorato
    improved = review_result.get("improved_content", "")
    if improved and len(improved) > 100:
        update_data[content_field] = improved

    # Aggiorna SEO
    seo_title = review_result.get("seo_title", "")
    if seo_title:
        update_data["seo_title"] = seo_title

    seo_desc = review_result.get("seo_description", "")
    if seo_desc:
        update_data["seo_description"] = seo_desc

    if update_data:
        strapi.update(ct, doc_id, update_data)


def main():
    print(f"[{datetime.now().isoformat()}] Claude Reviewer avviato")

    articles = get_articles_for_review()
    if not articles:
        print("Nessun articolo da rivedere")
        return

    print(f"Articoli da rivedere: {len(articles)}")
    reviewed: list[str] = []
    published: list[str] = []
    rejected: list[str] = []

    for queue_item in articles:
        title = queue_item.get("title", "?")
        queue_doc_id = queue_item.get("documentId", "")
        print(f"\nReview: {title}")

        # Recupera contenuto pubblicato
        content = get_published_content(queue_item)
        if not content:
            print(f"  Contenuto non trovato, skip")
            strapi.update("content-queues", queue_doc_id, {
                "status": "failed",
                "generation_log": f"Claude Review: contenuto non trovato - {datetime.now().isoformat()}",
            })
            rejected.append(f"{title} (contenuto non trovato)")
            continue

        # Rivedi con Claude
        try:
            result = review_and_improve(queue_item, content)
        except Exception as e:
            print(f"  Errore Claude: {e}")
            strapi.update("content-queues", queue_doc_id, {
                "generation_log": f"Claude Review errore: {e} - {datetime.now().isoformat()}",
            })
            rejected.append(f"{title} (errore Claude: {e})")
            continue

        score = result.get("quality_score", 0)
        issues = result.get("issues", [])
        print(f"  Score: {score}/10, Issues: {len(issues)}")

        if score >= MIN_QUALITY_SCORE:
            # Applica miglioramenti e pubblica
            apply_improvements(content, result)
            strapi.update("content-queues", queue_doc_id, {
                "status": "published",
                "generation_log": (
                    f"Claude Review: score {score}/10, "
                    f"{len(issues)} issues fixed - {datetime.now().isoformat()}"
                ),
            })
            published.append(f"<b>{title}</b> (score: {score}/10)")
            print(f"  Pubblicato con miglioramenti")
        else:
            # Score troppo basso — rifiuta
            strapi.update("content-queues", queue_doc_id, {
                "status": "failed",
                "generation_log": (
                    f"Claude Review RIFIUTATO: score {score}/10, "
                    f"issues: {'; '.join(issues[:3])} - {datetime.now().isoformat()}"
                ),
            })
            rejected.append(f"{title} (score: {score}/10)")
            print(f"  Rifiutato — qualita insufficiente")

        reviewed.append(title)

    # Report Telegram
    details: list[str] = []
    if published:
        details.append(f"<b>Approvati ({len(published)}):</b>")
        details.extend(published)
    if rejected:
        details.append(f"\n<b>Rifiutati ({len(rejected)}):</b>")
        details.extend(rejected)

    telegram.send_agent_report(
        "Claude Reviewer",
        f"Rivisti {len(reviewed)} articoli: {len(published)} approvati, {len(rejected)} rifiutati",
        details if details else None,
    )

    print(f"\n[{datetime.now().isoformat()}] Claude Reviewer completato")


if __name__ == "__main__":
    main()
