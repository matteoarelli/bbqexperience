#!/usr/bin/env python3
"""
Fix All Translations — Corregge blog post con titoli non-EN e ritraduce tutto.
Step 1: Identifica blog post EN con titoli spagnoli/italiani
Step 2: Traduce quei contenuti in inglese corretto
Step 3: Traduce tutto (EN corretto) in IT e ES

Uso: python scripts/agents/fix_all_translations.py [--content-type blog-posts] [--batch-size 5] [--skip 0]
"""

import os
import sys
import io
import json
import re
import time
import argparse
from pathlib import Path

# Fix encoding Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Carica env
for ef in [Path(__file__).parent / ".env.windows", Path(__file__).parent.parent.parent / ".env"]:
    if ef.exists():
        for line in ef.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import claude_client as claude

SYSTEM_TO_EN = """You are a professional translator for bbq-experience.com.
Translate the following text to English.
Keep the "Pitmaster" tone: direct, technical, expert, no marketing BS.
Keep ALL HTML tags exactly as they are.
Do NOT translate brand names or product names.
Output ONLY the translated text, nothing else."""

SYSTEM_TO_IT = """Sei un traduttore professionale per bbq-experience.com.
Traduci in italiano. Tono "The Pitmaster": diretto, tecnico, esperto.
Converti: fahrenheit->celsius, lbs->kg, oz->g, inches->cm.
NON tradurre nomi brand/prodotto. Mantieni TUTTI i tag HTML.
Output SOLO il testo tradotto."""

SYSTEM_TO_ES = """Eres un traductor profesional para bbq-experience.com.
Traduce al espanol. Tono "The Pitmaster": directo, tecnico, experto.
Convierte: fahrenheit->celsius, lbs->kg, oz->g, inches->cm.
NO traduzcas nombres de marca/producto. Mantiene TODOS los tags HTML.
Output SOLO el texto traducido."""

FIELDS = {
    "blog-posts": ["title", "content", "excerpt", "seo_title", "seo_description"],
    "reviews": ["title", "editorial_content", "excerpt", "verdict", "seo_title", "seo_description"],
    "recipes": ["title", "editorial_intro", "excerpt", "seo_title", "seo_description"],
    "tutorials": ["title", "content", "excerpt", "seo_title", "seo_description"],
}
COPY = {
    "blog-posts": ["reading_time", "category", "published_date", "slug"],
    "reviews": ["published_date", "score_overall", "score_build_quality", "score_performance",
                "score_value", "score_ease_of_use", "pros", "cons", "slug"],
    "recipes": ["ingredients", "instructions", "prep_time", "cook_time", "total_time",
                "servings", "difficulty", "technique", "meat_type", "published_date", "slug"],
    "tutorials": ["reading_time", "category", "published_date", "slug"],
}

NON_EN_PATTERN = re.compile(r'[áéíóúñ¿¡àèìòùÁÉÍÓÚÑ]|^(El |La |Los |Las |Cómo|Guía|Qué|Por |Il |Le |Lo |Come |Perché)')


def is_non_english(title: str) -> bool:
    return bool(NON_EN_PATTERN.search(title or ""))


def translate_field(text: str, system: str) -> str:
    if not text or not text.strip():
        return text
    return claude.ask(f"Translate:\n---\n{text}", system=system, timeout=300)


def process_item(ct: str, item: dict, fix_en: bool):
    doc_id = item.get("documentId", "")
    title = item.get("title", "?")
    slug = item.get("slug", "")

    # Step 1: Fix EN if title is non-English
    if fix_en:
        print(f"  [EN FIX] {title[:50]}")
        en_data = {"slug": slug}
        for f in FIELDS.get(ct, []):
            val = item.get(f, "")
            if not val:
                continue
            try:
                result = translate_field(val, SYSTEM_TO_EN)
                if result and len(result) > 5:
                    en_data[f] = result
                    print(f"    {f}: OK ({len(result)}c)")
            except Exception as e:
                print(f"    {f}: FAIL ({e})")
                en_data[f] = val
        for f in COPY.get(ct, []):
            v = item.get(f)
            if v is not None:
                en_data[f] = v
        if item.get("published_date"):
            en_data["published_date"] = item["published_date"]
        try:
            strapi.update(ct, doc_id, en_data, locale="en")
            print(f"    EN aggiornato")
            # Aggiorna item per le traduzioni successive
            for k, v in en_data.items():
                item[k] = v
        except Exception as e:
            print(f"    EN ERRORE: {e}")
        time.sleep(2)

    # Step 2: Translate to IT
    print(f"  [IT]")
    it_data = {"slug": slug}
    for f in FIELDS.get(ct, []):
        val = item.get(f, "")
        if not val:
            continue
        try:
            result = translate_field(val, SYSTEM_TO_IT)
            if result and len(result) > 5:
                it_data[f] = result
                print(f"    {f}: OK ({len(result)}c)")
        except Exception as e:
            print(f"    {f}: FAIL")
            it_data[f] = val
    for f in COPY.get(ct, []):
        v = item.get(f)
        if v is not None:
            it_data[f] = v
    if item.get("published_date"):
        it_data["published_date"] = item["published_date"]
    try:
        strapi.update(ct, doc_id, it_data, locale="it")
        print(f"    IT pubblicato")
    except Exception as e:
        print(f"    IT ERRORE: {e}")
    time.sleep(2)

    # Step 3: Translate to ES
    print(f"  [ES]")
    es_data = {"slug": slug}
    for f in FIELDS.get(ct, []):
        val = item.get(f, "")
        if not val:
            continue
        try:
            result = translate_field(val, SYSTEM_TO_ES)
            if result and len(result) > 5:
                es_data[f] = result
                print(f"    {f}: OK ({len(result)}c)")
        except Exception as e:
            print(f"    {f}: FAIL")
            es_data[f] = val
    for f in COPY.get(ct, []):
        v = item.get(f)
        if v is not None:
            es_data[f] = v
    if item.get("published_date"):
        es_data["published_date"] = item["published_date"]
    try:
        strapi.update(ct, doc_id, es_data, locale="es")
        print(f"    ES pubblicato")
    except Exception as e:
        print(f"    ES ERRORE: {e}")
    time.sleep(2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-type", "-c", default="blog-posts")
    parser.add_argument("--batch-size", "-b", type=int, default=0)
    parser.add_argument("--skip", "-s", type=int, default=0)
    args = parser.parse_args()

    ct = args.content_type
    print(f"FIX ALL TRANSLATIONS: {ct}")
    print("=" * 50)

    items = strapi.find_all_pages(ct, locale="en", status="published", populate="*")
    print(f"Totale {ct} EN: {len(items)}")

    items = items[args.skip:]
    if args.batch_size > 0:
        items = items[:args.batch_size]

    ok = fail = 0
    for i, item in enumerate(items):
        title = item.get("title", "?")
        needs_en_fix = is_non_english(title)
        tag = " [NON-EN!]" if needs_en_fix else ""
        print(f"\n[{i+1+args.skip}/{len(items)+args.skip}]{tag} {title[:60]}")

        try:
            process_item(ct, item, fix_en=needs_en_fix)
            ok += 1
        except Exception as e:
            print(f"  ERRORE FATALE: {e}")
            fail += 1

    print(f"\n{'='*50}")
    print(f"COMPLETATO: {ok} OK, {fail} FAIL")


if __name__ == "__main__":
    main()
