#!/usr/bin/env python3
"""
Retranslate All — Ritraduce TUTTI i contenuti IT/ES con Claude Max.
Sostituisce le traduzioni Ollama 7b di bassa qualita con traduzioni professionali.

ESECUZIONE: Solo su Windows (Claude CLI richiede TTY).
  python scripts/agents/retranslate_all.py [--content-type blog-posts] [--locale it] [--batch-size 5] [--dry-run]

Senza argomenti, ritraduce TUTTO: blog-posts, recipes, reviews, tutorials per IT e ES.
"""

import os
import sys
import json
import argparse
import time
import io
from datetime import datetime
from pathlib import Path

# Fix encoding per Windows (evita UnicodeEncodeError su cp1252)
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Carica variabili d'ambiente da .env.windows (Windows) o .env (server)
_script_dir = Path(__file__).parent
for env_file in [_script_dir / ".env.windows", _script_dir.parent.parent / ".env"]:
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import claude_client as claude
from agents.lib import telegram

# Campi da tradurre per ogni content type
FIELDS_MAP = {
    "blog-posts": ["title", "content", "excerpt", "seo_title", "seo_description"],
    "tutorials": ["title", "content", "excerpt", "seo_title", "seo_description"],
    "reviews": ["title", "editorial_content", "excerpt", "verdict", "seo_title", "seo_description"],
    "recipes": ["title", "editorial_intro", "excerpt", "seo_title", "seo_description"],
}

# Campi da copiare (non tradurre) per ogni content type
COPY_FIELDS_MAP = {
    "blog-posts": ["reading_time", "category", "published_date"],
    "tutorials": ["reading_time", "category", "published_date"],
    "reviews": ["published_date", "score_overall", "score_build_quality", "score_performance",
                "score_value", "score_ease_of_use", "pros", "cons"],
    "recipes": ["ingredients", "instructions", "prep_time", "cook_time", "total_time",
                "servings", "difficulty", "technique", "meat_type", "published_date"],
}

LOCALE_NAMES = {"it": "italiano", "es": "spagnolo"}

SYSTEM_PROMPT = """Sei un traduttore professionale specializzato in contenuti BBQ e cucina per bbq-experience.com.

REGOLE TASSATIVE:
- Mantieni il tono "The Pitmaster": diretto, tecnico, esperto, zero marketing BS
- Converti le unita di misura: °F→°C, lbs→kg, oz→g, inches→cm
- NON tradurre nomi propri di prodotti, brand, o nomi di ricette tradizionali (es. "Brisket", "Burnt Ends")
- Mantieni TUTTI i tag HTML esattamente come sono (h2, h3, p, ul, li, strong, em, table, etc.)
- Le temperature devono essere precise (es. 225°F = 107°C, 275°F = 135°C, 350°F = 177°C)
- I pesi devono essere precisi (es. 10 lbs = 4.5 kg, 8 oz = 227 g)
- Usa terminologia BBQ corretta nella lingua target
- Il risultato deve suonare naturale, come se fosse stato scritto da un madrelingua esperto di BBQ
- Output SOLO il testo tradotto. Nessuna spiegazione, nessun prefisso, nessun commento."""


def get_all_content(content_type: str) -> list[dict]:
    """Recupera tutti i contenuti EN pubblicati."""
    return strapi.find_all_pages(
        content_type,
        locale="en",
        status="published",
        populate="*",
    )


def translate_field(text: str, target_locale: str, field_name: str) -> str:
    """Traduce un singolo campo con Claude Max."""
    if not text or not text.strip():
        return text

    lang = LOCALE_NAMES[target_locale]

    # Prompt specifico per tipo di campo
    if field_name in ("seo_title",):
        extra = f"\nMax 60 caratteri. Includi la keyword principale."
    elif field_name in ("seo_description", "excerpt"):
        extra = f"\nMax 155 caratteri. Deve essere accattivante per i risultati di ricerca."
    elif field_name == "title":
        extra = f"\nDeve essere accattivante e diretto. Mantieni lo stile Pitmaster."
    else:
        extra = ""

    prompt = f"""Traduci il seguente testo in {lang}.{extra}

Output SOLO il testo tradotto, niente altro.

---
{text}"""

    return claude.ask(prompt, system=SYSTEM_PROMPT, timeout=300)


def retranslate_item(
    content_type: str,
    item: dict,
    target_locale: str,
    dry_run: bool = False,
) -> bool:
    """Ritraduce un singolo contenuto in una locale target."""
    doc_id = item.get("documentId", "")
    title = item.get("title", "?")
    slug = item.get("slug", "")

    print(f"  [{target_locale.upper()}] {title}")

    # Prepara dati tradotti
    translated: dict = {"slug": slug}

    # Traduci campi testo
    fields = FIELDS_MAP.get(content_type, [])
    for field in fields:
        value = item.get(field, "")
        if not value:
            continue

        try:
            result = translate_field(value, target_locale, field)
            if result and len(result) > 10:
                translated[field] = result
                print(f"    {field}: OK ({len(result)} chars)")
            else:
                print(f"    {field}: troppo corto, uso originale")
                translated[field] = value
        except Exception as e:
            print(f"    {field}: ERRORE ({e}), uso originale")
            translated[field] = value

    # Copia campi strutturati
    copy_fields = COPY_FIELDS_MAP.get(content_type, [])
    for field in copy_fields:
        val = item.get(field)
        if val is not None:
            translated[field] = val

    if dry_run:
        print(f"    [DRY RUN] Skip PUT")
        return True

    # Push traduzione a Strapi
    try:
        strapi.update(content_type, doc_id, translated, locale=target_locale)
        print(f"    Pubblicato {target_locale.upper()}")
        return True
    except Exception as e:
        print(f"    ERRORE PUT: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Ritraduce tutti i contenuti con Claude Max")
    parser.add_argument("--content-type", "-c", help="Tipo contenuto (blog-posts, recipes, reviews, tutorials)")
    parser.add_argument("--locale", "-l", help="Locale target (it, es)")
    parser.add_argument("--batch-size", "-b", type=int, default=0, help="Max contenuti per batch (0=tutti)")
    parser.add_argument("--dry-run", "-d", action="store_true", help="Solo preview, nessuna modifica")
    parser.add_argument("--skip", "-s", type=int, default=0, help="Salta i primi N contenuti")
    args = parser.parse_args()

    content_types = [args.content_type] if args.content_type else ["reviews", "recipes", "tutorials", "blog-posts"]
    locales = [args.locale] if args.locale else ["it", "es"]

    print(f"{'='*60}")
    print(f"RETRANSLATION - Claude Max Quality")
    print(f"Content types: {content_types}")
    print(f"Locales: {locales}")
    print(f"Batch size: {args.batch_size or 'ALL'}")
    print(f"Dry run: {args.dry_run}")
    print(f"{'='*60}")

    total_ok = 0
    total_fail = 0
    start_time = time.time()

    for ct in content_types:
        items = get_all_content(ct)
        print("\n" + "-"*40)
        print(f"{ct.upper()}: {len(items)} contenuti EN")
        print("-"*40)

        # Applica skip e batch
        items = items[args.skip:]
        if args.batch_size > 0:
            items = items[:args.batch_size]

        for i, item in enumerate(items):
            print(f"\n[{i+1+args.skip}/{len(items)+args.skip}] {item.get('title', '?')}")

            for locale in locales:
                try:
                    if retranslate_item(ct, item, locale, args.dry_run):
                        total_ok += 1
                    else:
                        total_fail += 1
                except Exception as e:
                    print(f"  ERRORE FATALE: {e}")
                    total_fail += 1

                # Pausa tra traduzioni per non sovraccaricare Claude
                if not args.dry_run:
                    time.sleep(2)

    elapsed = time.time() - start_time
    minutes = int(elapsed // 60)

    print(f"\n{'='*60}")
    print(f"COMPLETATO in {minutes}m")
    print(f"OK: {total_ok} | FAIL: {total_fail}")
    print(f"{'='*60}")

    # Report Telegram
    if not args.dry_run and total_ok > 0:
        telegram.send_agent_report(
            "Retranslation (Claude Max)",
            f"Ritradotti {total_ok} contenuti in {minutes} minuti",
            [
                f"Content types: {', '.join(content_types)}",
                f"Locales: {', '.join(locales)}",
                f"Falliti: {total_fail}",
            ],
        )


if __name__ == "__main__":
    main()
