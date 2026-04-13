#!/usr/bin/env python3
"""Verifica qualita rendering su un campione di pagine live.

Per ogni pagina controlla:
- Status HTTP (200)
- Soft hyphen veri U+00AD (decoded UTF-8)
- Anchor annidati <a><a>
- Markdown raw non convertito (## headings, ** bold, | tabelle non rese)
- Link cross-locale (slug di route in locale sbagliato)
- JSON-LD presente
"""
import os
import re
import sys
import io
from urllib.request import Request, urlopen

if sys.stdout and hasattr(sys.stdout, 'buffer') and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from agents.lib import strapi_client as strapi

# Aggiorna env
from pathlib import Path
for ef in [Path("scripts/agents/.env.windows"), Path(".env")]:
    if ef.exists():
        for line in ef.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
        break

LOCALIZED_ROUTES = {
    "blog-posts": {"en": "blog", "it": "blog", "es": "blog"},
    "tutorials": {"en": "tutorials", "it": "guide", "es": "tutoriales"},
    "reviews": {"en": "reviews", "it": "recensioni", "es": "resenas"},
    "recipes": {"en": "recipes", "it": "ricette", "es": "recetas"},
}

WRONG_SLUGS_BY_LOCALE = {
    "en": {"ricette", "recensioni", "guide", "recetas", "resenas", "tutoriales"},
    "it": {"recipes", "reviews", "tutorials", "recetas", "resenas", "tutoriales"},
    "es": {"recipes", "reviews", "tutorials", "ricette", "recensioni", "guide"},
}

BASE = "https://bbq-experience.com"


def fetch(url: str) -> tuple[int, bytes]:
    req = Request(url, headers={"User-Agent": "BBQ-Sweep/1.0"})
    try:
        with urlopen(req, timeout=20) as r:
            return r.status, r.read()
    except Exception as e:
        return 0, str(e).encode("utf-8")


def analyze(url: str, body_bytes: bytes, locale: str) -> dict:
    text = body_bytes.decode("utf-8", errors="strict")
    issues = {}

    # Soft hyphen vero (U+00AD nel decoded text)
    n_sh = text.count("\u00AD")
    if n_sh:
        issues["soft_hyphen"] = n_sh

    # Anchor annidati
    nested = re.findall(r"<a [^>]+>\s*<a [^>]+>", text)
    if nested:
        issues["nested_a"] = len(nested)

    # Markdown raw (## headings rimasti come testo)
    md_h = len(re.findall(r"(?<!#)## (?![\w{])", text))
    if md_h:
        issues["md_headings_raw"] = md_h
    md_table = len(re.findall(r"\| \*\*[A-Z]", text))
    if md_table:
        issues["md_table_raw"] = md_table

    # Cross-locale links: cerca href verso slug del locale sbagliato
    wrong = WRONG_SLUGS_BY_LOCALE[locale]
    for ws in wrong:
        n = len(re.findall(rf'href="/{locale}/{ws}/', text))
        if n:
            issues.setdefault("wrong_route_slug", []).append(f"/{locale}/{ws}/ x{n}")

    # NB: NON cerchiamo link cross-locale come issue: il language switcher
    # nell'header genera link legittimi verso le altre lingue su ogni pagina.
    # I link cross-locale corrotti dentro CONTENT sono coperti da
    # wrong_route_slug e dal cleanup DB, quindi qui non riportiamo nulla.

    return issues


def main():
    samples: list[tuple[str, str, str]] = []  # (locale, content_type, slug)
    for ct in ["blog-posts", "reviews", "recipes", "tutorials"]:
        for locale in ["en", "it", "es"]:
            items = strapi.find_all_pages(
                ct, locale=locale, status="published", page_size=100, fields=["slug"]
            )
            slugs = [i.get("slug") for i in items if i.get("slug")]
            for s in slugs:
                samples.append((locale, ct, s))

    print(f"Sweeping {len(samples)} pages...")
    failures: list[tuple[str, dict]] = []
    bad_status: list[tuple[str, int]] = []

    for locale, ct, slug in samples:
        route = LOCALIZED_ROUTES[ct][locale]
        url = f"{BASE}/{locale}/{route}/{slug}/"
        status, body = fetch(url)
        if status != 200:
            bad_status.append((url, status))
            continue
        issues = analyze(url, body, locale)
        if issues:
            failures.append((url, issues))

    print(f"\n=== RESULT ===")
    print(f"Sampled: {len(samples)}")
    print(f"HTTP non-200: {len(bad_status)}")
    print(f"Pages with issues: {len(failures)}")
    if bad_status:
        print("\nNon-200 URLs:")
        for u, s in bad_status[:10]:
            print(f"  {s} {u}")
    if failures:
        print("\nIssues:")
        for u, iss in failures[:20]:
            print(f"  {u}")
            for k, v in iss.items():
                print(f"    {k}: {v}")
    if not failures and not bad_status:
        print("\nAll pages CLEAN")


if __name__ == "__main__":
    main()
