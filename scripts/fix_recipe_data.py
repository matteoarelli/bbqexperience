#!/usr/bin/env python3
"""Genera ingredients e instructions per ricette AI-generated che ne sono prive."""
import os, sys, io, json, time
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, 'buffer') and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

for ef in [Path(__file__).parent / "agents" / ".env.windows", Path(__file__).parent.parent / ".env"]:
    if ef.exists():
        for line in ef.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from agents.lib import strapi_client as strapi
from agents.lib import claude_client as claude


def clean_json(raw: str) -> str:
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) >= 2 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


RECIPES = [
    ("fqc4ar6466znhtucku86t5kg", "BBQ Sauce Recipe", "other"),
]

for doc_id, title, technique in RECIPES:
    print(f"\n{title}")
    item = strapi.find_one("recipes", doc_id, populate="*").get("data", {})
    content = (item.get("editorial_intro") or "")[:2000]

    # Genera ingredients
    ingr_prompt = (
        f"For the BBQ recipe '{title}', generate a realistic ingredients list.\n"
        f"Output ONLY a valid JSON array. Each item: {{\"name\": \"...\", \"quantity\": \"...\", \"unit\": \"...\"}}\n"
        f"No explanation text. Just the JSON array.\n\n"
        f"Context: {content[:800]}"
    )
    ingr_raw = claude.ask(ingr_prompt, timeout=120)

    # Genera instructions
    instr_prompt = (
        f"For the BBQ recipe '{title}', generate step-by-step cooking instructions.\n"
        f"Output ONLY a valid JSON array. Each item: {{\"step\": N, \"title\": \"Short title\", \"text\": \"Detailed instruction with temperatures in F and times.\"}}\n"
        f"No explanation text. Just the JSON array.\n\n"
        f"Context: {content[:800]}"
    )
    instr_raw = claude.ask(instr_prompt, timeout=120)

    try:
        ingredients = json.loads(clean_json(ingr_raw))
        instructions = json.loads(clean_json(instr_raw))
        print(f"  Ingredients: {len(ingredients)} items")
        print(f"  Instructions: {len(instructions)} steps")

        data = {
            "ingredients": ingredients,
            "instructions": instructions,
            "slug": item.get("slug", ""),
        }
        if not item.get("prep_time"):
            data["prep_time"] = 30
        if not item.get("cook_time"):
            cook = 60 if "sauce" in title.lower() else 360
            data["cook_time"] = cook
        if not item.get("total_time"):
            data["total_time"] = data.get("prep_time", 30) + data.get("cook_time", 240)
        if not item.get("servings"):
            data["servings"] = 8
        if not item.get("difficulty"):
            data["difficulty"] = "medium"
        if not item.get("technique"):
            data["technique"] = technique

        for loc in ["en", "it", "es"]:
            strapi.update("recipes", doc_id, data, locale=loc)
            print(f"  {loc.upper()} OK")

    except Exception as e:
        print(f"  ERRORE: {e}")
        print(f"  ingr_raw: {ingr_raw[:200]}")
        print(f"  instr_raw: {instr_raw[:200]}")

    time.sleep(2)

print("\nDONE")
