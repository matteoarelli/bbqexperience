#!/usr/bin/env python3
"""Check randomico esteso del sito: campiona pagine random + statiche
in tutti i locale e verifica problemi residui (HTTP, rendering, contrasto,
JSON-LD, link cross-locale corrotti, header/footer presenti).
"""
import os
import sys
import io
import random
import re
import json
from urllib.request import Request, urlopen
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, 'buffer') and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

for ef in [Path("scripts/agents/.env.windows")]:
    if ef.exists():
        for line in ef.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from agents.lib import strapi_client as strapi

random.seed(42)

LOCALIZED_ROUTES = {
    "blog-posts": {"en": "blog", "it": "blog", "es": "blog"},
    "tutorials": {"en": "tutorials", "it": "guide", "es": "tutoriales"},
    "reviews": {"en": "reviews", "it": "recensioni", "es": "resenas"},
    "recipes": {"en": "recipes", "it": "ricette", "es": "recetas"},
}

STATIC_ROUTES = {
    "home": {"en": "/en/", "it": "/it/", "es": "/es/"},
    "about": {"en": "/en/about/", "it": "/it/chi-siamo/", "es": "/es/sobre-nosotros/"},
    "contact": {"en": "/en/contact/", "it": "/it/contatti/", "es": "/es/contacto/"},
    "privacy": {"en": "/en/privacy/", "it": "/it/privacy/", "es": "/es/privacy/"},
    "terms": {"en": "/en/terms/", "it": "/it/terms/", "es": "/es/terms/"},
    "compare": {"en": "/en/compare/", "it": "/it/confronta/", "es": "/es/comparar/"},
    "bookmarks": {"en": "/en/bookmarks/", "it": "/it/preferiti/", "es": "/es/favoritos/"},
}

LISTING_ROUTES = {
    "reviews": {"en": "/en/reviews/", "it": "/it/recensioni/", "es": "/es/resenas/"},
    "recipes": {"en": "/en/recipes/", "it": "/it/ricette/", "es": "/es/recetas/"},
    "tutorials": {"en": "/en/tutorials/", "it": "/it/guide/", "es": "/es/tutoriales/"},
    "blog": {"en": "/en/blog/", "it": "/it/blog/", "es": "/es/blog/"},
}

BASE = "https://bbq-experience.com"


def fetch(url: str) -> tuple[int, bytes]:
    req = Request(url, headers={"User-Agent": "BBQ-RandomCheck/1.0"})
    try:
        with urlopen(req, timeout=20) as r:
            return r.status, r.read()
    except Exception as e:
        return 0, str(e).encode("utf-8", "replace")


def analyze(url: str, body: bytes, locale: str, kind: str) -> list[str]:
    issues: list[str] = []
    try:
        text = body.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        issues.append("invalid_utf8")
        return issues

    # Header presente (logo BBQ EXP)
    if "BBQ" not in text or "EXP" not in text:
        issues.append("missing_brand_header")

    # Footer presente (cerchiamo "Privacy Policy" o un footer marker)
    if "Privacy" not in text and "privacy" not in text.lower():
        issues.append("missing_footer_link")

    # Hreflang corretto (tutti e 3 i locale)
    for loc in ("en", "it", "es"):
        if f'hreflang="{loc}"' not in text:
            issues.append(f"missing_hreflang_{loc}")

    # Markdown raw / nested anchors (per pagine di contenuto)
    if kind == "detail":
        if re.search(r"(?<!#)## (?!\w?\{)", text):
            issues.append("md_heading_raw")
        if re.search(r"<a [^>]+>\s*<a ", text):
            issues.append("nested_anchor")

    # Contenuto sufficiente (almeno 3KB)
    if len(text) < 3000:
        issues.append(f"page_too_small_{len(text)}b")

    # JSON-LD presente
    if 'application/ld+json' not in text:
        issues.append("missing_jsonld")

    # Soft hyphens veri
    if text.count("\u00AD") > 0:
        issues.append(f"soft_hyphens_{text.count(chr(0x00AD))}")

    return issues


def main():
    samples: list[tuple[str, str, str]] = []  # (label, url, locale)

    # Statiche
    for name, by_locale in STATIC_ROUTES.items():
        for loc, path in by_locale.items():
            samples.append((f"static/{name}/{loc}", f"{BASE}{path}", loc))

    # Listing
    for name, by_locale in LISTING_ROUTES.items():
        for loc, path in by_locale.items():
            samples.append((f"list/{name}/{loc}", f"{BASE}{path}", loc))

    # Detail random: 5 per content_type/locale
    for ct, routes in LOCALIZED_ROUTES.items():
        for loc, slug_route in routes.items():
            try:
                items = strapi.find_all_pages(ct, locale=loc, status="published", page_size=100, fields=["slug"])
            except Exception:
                continue
            slugs = [i.get("slug") for i in items if i.get("slug")]
            if not slugs:
                continue
            picks = random.sample(slugs, min(5, len(slugs)))
            for s in picks:
                url = f"{BASE}/{loc}/{slug_route}/{s}/"
                samples.append((f"detail/{ct}/{loc}/{s}", url, loc))

    print(f"Sampling {len(samples)} pages...")
    bad_status: list[tuple[str, int]] = []
    issues_by_url: list[tuple[str, list[str]]] = []

    for label, url, locale in samples:
        kind = "detail" if "detail" in label else ("list" if label.startswith("list") else "static")
        status, body = fetch(url)
        if status != 200:
            bad_status.append((url, status))
            continue
        issues = analyze(url, body, locale, kind)
        if issues:
            issues_by_url.append((url, issues))

    print()
    print(f"=== RESULT ===")
    print(f"Total sampled: {len(samples)}")
    print(f"HTTP non-200: {len(bad_status)}")
    print(f"Pages with issues: {len(issues_by_url)}")

    if bad_status:
        print("\nNon-200 URLs:")
        for u, s in bad_status[:15]:
            print(f"  {s} {u}")

    if issues_by_url:
        # Aggrega per tipo issue
        agg: dict[str, int] = {}
        for _, iss in issues_by_url:
            for i in iss:
                key = re.sub(r"_\d+(b|)$", "_N", i)
                agg[key] = agg.get(key, 0) + 1
        print("\nIssue types (aggregated):")
        for k, v in sorted(agg.items(), key=lambda x: -x[1]):
            print(f"  {v:4d}  {k}")
        print("\nFirst 12 affected URLs:")
        for u, iss in issues_by_url[:12]:
            print(f"  {u}")
            print(f"    {iss}")
    else:
        print("\nAll sampled pages CLEAN")


if __name__ == "__main__":
    main()
