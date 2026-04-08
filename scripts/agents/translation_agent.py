#!/usr/bin/env python3
"""
Translation Agent — Trova contenuti EN senza traduzione IT/ES e li traduce con Ollama.
Cron: ogni 6h su 192.168.1.119.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import ollama


def find_untranslated(content_type: str, target_locale: str) -> list[dict]:
    """Trova contenuti EN che non hanno traduzione nella locale target."""
    # Recupera tutti gli slug EN
    en_items = strapi.find_all_pages(content_type, locale="en", fields=["slug", "title", "documentId"])
    en_slugs = {item.get("slug"): item for item in en_items if item.get("slug")}

    # Recupera tutti gli slug nella locale target
    target_items = strapi.find_all_pages(content_type, locale=target_locale, fields=["slug"])
    target_slugs = {item.get("slug") for item in target_items if item.get("slug")}

    # Trova mancanti
    missing: list[dict] = []
    for slug, item in en_slugs.items():
        if slug not in target_slugs:
            missing.append(item)

    return missing


def translate_content(content_type: str, doc_id: str, target_locale: str) -> bool:
    """Traduce un singolo contenuto. Ritorna True se successo."""
    # Recupera contenuto completo EN
    resp = strapi.find_one(content_type, doc_id, populate="*")
    item = resp.get("data", {})

    lang_name = "italiano" if target_locale == "it" else "spagnolo"

    # Campi da tradurre dipendono dal content type
    text_fields: dict[str, str] = {}

    if content_type in ("blog-posts", "tutorials"):
        for field in ("title", "content", "excerpt", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val
    elif content_type == "reviews":
        for field in ("title", "editorial_content", "excerpt", "verdict", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val
        # Traduci anche pros/cons
        pros = item.get("pros", [])
        cons = item.get("cons", [])
        if pros or cons:
            text_fields["_pros_cons"] = f"Pros: {pros}\nCons: {cons}"
    elif content_type == "recipes":
        for field in ("title", "editorial_intro", "excerpt", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val

    if not text_fields:
        return False

    # Traduci ogni campo singolarmente (piu robusto con modelli 7b)
    units_note = "Convert units: °F→°C, lbs→kg, oz→g, inches→cm." if target_locale in ("it", "es") else ""
    translated_data: dict = {"slug": item.get("slug", "")}

    for field_name, field_value in text_fields.items():
        if field_name.startswith("_"):
            continue

        # Tronca contenuti lunghi per non superare il context window del 7b
        value = field_value[:4000] if len(field_value) > 4000 else field_value

        prompt = f"""Translate the following text to {lang_name}. {units_note}
Keep all HTML tags exactly as they are. Do not translate product names or brand names.
Output ONLY the translated text, nothing else. No explanations, no labels.

{value}"""

        try:
            translated = ollama.generate(prompt, system=ollama.TRANSLATOR_SYSTEM, max_tokens=6000)
            # Rimuovi eventuale prefisso/suffisso aggiunto dal modello
            translated = translated.strip()
            if translated:
                translated_data[field_name] = translated
        except Exception as e:
            print(f"  [WARN] Traduzione campo {field_name} fallita: {e}")

    # Gestisci pros/cons per review
    if "_pros_cons" in text_fields and content_type == "reviews":
        # Copia pros/cons originali (sono array, non testo lungo)
        translated_data["pros"] = item.get("pros", [])
        translated_data["cons"] = item.get("cons", [])

    # Copia campi strutturati per recipes
    if content_type == "recipes":
        for field in ("ingredients", "instructions", "prep_time", "cook_time", "total_time", "servings"):
            val = item.get(field)
            if val is not None:
                translated_data[field] = val

    # Pubblica traduzione
    translated_data["published_date"] = item.get("published_date", datetime.now().strftime("%Y-%m-%d"))

    try:
        strapi.update(content_type, doc_id, translated_data, locale=target_locale)
        return True
    except Exception as e:
        print(f"[ERRORE] Traduzione {target_locale} fallita per {doc_id}: {e}")
        return False


def main():
    print(f"[{datetime.now().isoformat()}] Translation Agent avviato")

    content_types = ["blog-posts", "tutorials", "reviews", "recipes"]
    locales = ["it", "es"]
    total_translated = 0
    details: list[str] = []

    for ct in content_types:
        for locale in locales:
            missing = find_untranslated(ct, locale)
            if not missing:
                continue

            print(f"{ct}: {len(missing)} traduzioni {locale} mancanti")
            # Traduci max 3 per run per non sovraccaricare Ollama
            for item in missing[:3]:
                doc_id = item.get("documentId", "")
                title = item.get("title", "?")
                if translate_content(ct, doc_id, locale):
                    total_translated += 1
                    details.append(f"{title} → {locale.upper()}")
                    print(f"  Tradotto: {title} -> {locale}")

    # Report
    if total_translated > 0:
        telegram.send_agent_report(
            "Translation Agent",
            f"Tradotti {total_translated} contenuti",
            details,
        )
    else:
        print("Nessun contenuto da tradurre")

    print(f"[{datetime.now().isoformat()}] Translation Agent completato")


if __name__ == "__main__":
    main()
