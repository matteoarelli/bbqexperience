#!/usr/bin/env python3
"""
Content Generator — Genera articoli BBQ completi con Ollama e li pubblica su Strapi.
Legge dalla ContentQueue, genera in EN, auto-traduce in IT/ES, pubblica.
Cron: Daily 06:00 su 192.168.1.119 (accesso Ollama locale).
"""

import os
import sys
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import ollama

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
    """Genera articolo completo in EN con Ollama."""
    prompt = f"""Scrivi un articolo completo per il blog BBQ Experience.

Titolo: {title}
Keyword target: {keyword}
Cluster tematico: {cluster}
Tipo contenuto: {content_type}

Requisiti:
- 1500-2000 parole
- In inglese
- Struttura: introduzione coinvolgente, 4-6 sezioni con H2, conclusione
- Includi una sezione FAQ con 3-5 domande e risposte alla fine
- Usa tag HTML per la formattazione (h2, h3, p, ul, li, strong, em)
- La keyword target deve apparire nel primo paragrafo e in almeno 2 H2
- Tono: esperto ma accessibile, dati concreti (temperature in °F, tempi, pesi in lbs/oz)
- NO introduzioni generiche tipo "BBQ is a beloved tradition..." — vai dritto al punto
- Includi consigli pratici basati su esperienza reale

Genera SOLO il contenuto HTML dell'articolo (no title tag, no head, no body wrapper).
"""
    content = ollama.generate(prompt, system=ollama.PITMASTER_SYSTEM, max_tokens=8192)

    # Genera excerpt
    excerpt_prompt = f"""Dall'articolo seguente, scrivi un excerpt di 1-2 frasi (max 160 caratteri) per i risultati di ricerca. In inglese. Solo il testo, nessun tag HTML.

Articolo: {content[:500]}"""
    excerpt = ollama.generate(excerpt_prompt, temperature=0.3, max_tokens=200).strip()

    # Genera meta title e description
    seo_prompt = f"""Per un articolo BBQ intitolato "{title}" con keyword "{keyword}", genera:
1. SEO title (max 60 caratteri, include la keyword)
2. Meta description (max 155 caratteri, include la keyword, call to action)

Formato risposta JSON: {{"seo_title": "...", "seo_description": "..."}}"""
    seo_data = ollama.generate_json(seo_prompt, temperature=0.3)

    return {
        "content": content,
        "excerpt": excerpt[:160],
        "seo_title": seo_data.get("seo_title", title)[:60],
        "seo_description": seo_data.get("seo_description", excerpt)[:155],
    }


def translate_article(content: str, excerpt: str, seo_title: str, seo_description: str, target_locale: str) -> dict:
    """Traduce un articolo in IT o ES con Ollama."""
    lang_name = "italiano" if target_locale == "it" else "spagnolo"
    units_note = "Converti le unita: °F → °C, lbs → kg, oz → g, inches → cm" if target_locale in ("it", "es") else ""

    prompt = f"""Traduci il seguente articolo BBQ in {lang_name}.
{units_note}
Mantieni TUTTI i tag HTML esattamente come sono.
Non tradurre nomi di prodotti o brand.

Articolo:
{content}"""
    translated_content = ollama.generate(prompt, system=ollama.TRANSLATOR_SYSTEM, max_tokens=8192)

    # Traduci excerpt e SEO
    meta_prompt = f"""Traduci in {lang_name}:
- Excerpt: {excerpt}
- SEO Title: {seo_title}
- Meta Description: {seo_description}

{units_note}
Formato JSON: {{"excerpt": "...", "seo_title": "...", "seo_description": "..."}}"""
    meta = ollama.generate_json(meta_prompt, temperature=0.3)

    return {
        "content": translated_content,
        "excerpt": meta.get("excerpt", excerpt)[:160],
        "seo_title": meta.get("seo_title", seo_title)[:60],
        "seo_description": meta.get("seo_description", seo_description)[:155],
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

    # Pubblica EN
    try:
        resp = strapi.create(content_type_strapi, base_data)
        doc_id = resp.get("data", {}).get("documentId")
        if not doc_id:
            print(f"[ERRORE] Nessun documentId nella risposta per '{title}'")
            return None
    except Exception as e:
        print(f"[ERRORE] Pubblicazione EN fallita per '{title}': {e}")
        return None

    # Traduci e pubblica IT
    try:
        it_article = translate_article(
            article["content"], article["excerpt"],
            article["seo_title"], article["seo_description"], "it"
        )
        it_data = {
            "title": title,  # Titolo verra sovrascritto dalla traduzione
            "slug": slug,
            "excerpt": it_article["excerpt"],
            "seo_title": it_article["seo_title"],
            "seo_description": it_article["seo_description"],
            "published_date": base_data["published_date"],
        }
        if content_type_strapi in ("blog-posts", "tutorials"):
            it_data["content"] = it_article["content"]
        elif content_type_strapi == "recipes":
            it_data["editorial_intro"] = it_article["content"]

        strapi.update(content_type_strapi, doc_id, it_data, locale="it")
    except Exception as e:
        print(f"[WARN] Traduzione IT fallita per '{title}': {e}")

    # Traduci e pubblica ES
    try:
        es_article = translate_article(
            article["content"], article["excerpt"],
            article["seo_title"], article["seo_description"], "es"
        )
        es_data = {
            "title": title,
            "slug": slug,
            "excerpt": es_article["excerpt"],
            "seo_title": es_article["seo_title"],
            "seo_description": es_article["seo_description"],
            "published_date": base_data["published_date"],
        }
        if content_type_strapi in ("blog-posts", "tutorials"):
            es_data["content"] = es_article["content"]
        elif content_type_strapi == "recipes":
            es_data["editorial_intro"] = es_article["content"]

        strapi.update(content_type_strapi, doc_id, es_data, locale="es")
    except Exception as e:
        print(f"[WARN] Traduzione ES fallita per '{title}': {e}")

    return doc_id


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
            # Aggiorna ContentQueue — status draft_review per il quality gate di Claude
            strapi.update("content-queues", doc_id_queue, {
                "status": "draft_review",
                "published_content_id": published_id,
                "body_en": article["content"][:500],  # Salva preview per reference
                "generation_log": f"Generato da Ollama {datetime.now().isoformat()} - in attesa review Claude",
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
