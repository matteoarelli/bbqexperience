#!/usr/bin/env python3
"""Bonifica contenuti CMS: rimuove <a> annidati, normalizza link cross-locale,
rimuove soft hyphens. Itera blog_posts, reviews, recipes, tutorials su EN/IT/ES.

Sicuro da rieseguire (idempotente). Aggiorna via Strapi PUT solo se il contenuto
e' effettivamente cambiato.
"""
import os
import sys
import io
import re
import time
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

# Mappa route_key -> slug per locale (stessa di web/src/lib/i18n.ts)
LOCALIZED_ROUTES: dict[str, dict[str, str]] = {
    "recipes": {"en": "recipes", "it": "ricette", "es": "recetas"},
    "reviews": {"en": "reviews", "it": "recensioni", "es": "resenas"},
    "tutorials": {"en": "tutorials", "it": "guide", "es": "tutoriales"},
    "blog": {"en": "blog", "it": "blog", "es": "blog"},
}

# Inverso: slug -> route_key (per riconoscere link in qualsiasi locale)
SLUG_TO_ROUTE: dict[str, str] = {
    slug: route_key
    for route_key, by_locale in LOCALIZED_ROUTES.items()
    for slug in by_locale.values()
}

# Content types e relativo campo testo principale
CONTENT_TYPES: list[tuple[str, str]] = [
    ("blog-posts", "content"),
    ("tutorials", "content"),
    ("reviews", "editorial_content"),
    ("recipes", "editorial_intro"),
]

LOCALES = ["en", "it", "es"]
SOFT_HYPHEN = "\u00AD"


_INNER_TAGS_RE = re.compile(r'<[^>]+>')


def strip_nested_anchors(html: str) -> str:
    """Rimuove <a><a>X</a></a> mantenendo l'href interno.

    Gestisce anche il pattern markdown corrotto generato dal SEO optimizer
    quando il content gia conteneva un anchor HTML inline:
        [<a href="X">parte1</a> parte2](/url/)
    In questo caso ripulisce i tag dentro `[]` lasciando un markdown link
    pulito `[parte1 parte2](/url/)` che marked rendera come singolo anchor
    senza nesting.
    """

    def clean_md_text(match: re.Match) -> str:
        inner = match.group(1)
        # Rimuove qualunque tag HTML lasciando solo il testo plain
        plain = _INNER_TAGS_RE.sub('', inner).strip()
        return f'[{plain}]({match.group(2)})'

    # [...con tag HTML dentro...](url) -> [testo pulito](url)
    html = re.sub(
        r'\[((?:[^\[\]]|<[^>]+>)*?<[^>]+>(?:[^\[\]]|<[^>]+>)*?)\]\(([^)]*)\)',
        clean_md_text,
        html,
    )

    prev = None
    curr = html
    safety = 5
    while curr != prev and safety > 0:
        prev = curr
        curr = re.sub(r'<a\s+[^>]*>\s*(<a\s+[^>]*>)', r'\1', curr, flags=re.IGNORECASE)
        curr = re.sub(r'</a>\s*</a>', '</a>', curr, flags=re.IGNORECASE)
        safety -= 1
    return curr


def fix_locale_links(html: str, target_locale: str) -> str:
    """Riscrive link interni (HTML href e markdown link) per usare il locale prefix
    corretto e lo slug di route tradotto per il locale del record."""

    def make_replacer(prefix: str, suffix: str):
        def replace(match: re.Match) -> str:
            link_slug = match.group(2).lower()
            route_key = SLUG_TO_ROUTE.get(link_slug)
            if route_key is None:
                return match.group(0)
            new_slug = LOCALIZED_ROUTES[route_key].get(target_locale, link_slug)
            return f'{prefix}/{target_locale}/{new_slug}/{suffix}'
        return replace

    # HTML: href="/<locale>/<route>/..."
    html = re.sub(
        r'(href=")/([a-z]{2})/([^/"]+)/',
        lambda m: f'href="/{target_locale}/'
        f'{LOCALIZED_ROUTES[SLUG_TO_ROUTE[m.group(3).lower()]].get(target_locale, m.group(3))}/'
        if m.group(3).lower() in SLUG_TO_ROUTE else m.group(0),
        html,
        flags=re.IGNORECASE,
    )

    # Markdown: ](/<locale>/<route>/...)
    html = re.sub(
        r'(\]\()/([a-z]{2})/([^/)]+)/',
        lambda m: f'](/{target_locale}/'
        f'{LOCALIZED_ROUTES[SLUG_TO_ROUTE[m.group(3).lower()]].get(target_locale, m.group(3))}/'
        if m.group(3).lower() in SLUG_TO_ROUTE else m.group(0),
        html,
        flags=re.IGNORECASE,
    )

    return html


def transform(text: str, locale: str) -> str:
    if not text:
        return text
    out = text.replace(SOFT_HYPHEN, "")
    out = strip_nested_anchors(out)
    out = fix_locale_links(out, locale)
    return out


# Campi addizionali (oltre al main content field) da bonificare:
# titolo, excerpt e meta SEO sono visibili in pagina (h1, og:description, breadcrumb)
# quindi anche soft hyphen residui qui rovinano il rendering.
EXTRA_TEXT_FIELDS = ["title", "excerpt", "seo_title", "seo_description"]


def process_collection(content_type: str, main_field: str) -> tuple[int, int]:
    """Itera tutti i record di una collezione (tutti i locale) e aggiorna
    quelli che hanno cambiamenti. Bonifica main_field + campi short-text.
    Ritorna (esaminati, aggiornati)."""
    total_seen = 0
    total_updated = 0
    fields_to_fetch = ["documentId", "slug", main_field] + EXTRA_TEXT_FIELDS

    for locale in LOCALES:
        items = strapi.find_all_pages(
            content_type,
            locale=locale,
            status="published",
            page_size=100,
            fields=fields_to_fetch,
        )
        for item in items:
            total_seen += 1
            doc_id = item.get("documentId")
            slug = item.get("slug", "")
            update_data: dict[str, str] = {}

            for field in [main_field] + EXTRA_TEXT_FIELDS:
                original = item.get(field)
                if not isinstance(original, str) or not original:
                    continue
                fixed = transform(original, locale)
                if fixed != original:
                    update_data[field] = fixed

            if not update_data:
                continue

            update_data["slug"] = slug
            try:
                strapi.update(content_type, doc_id, update_data, locale=locale)
                total_updated += 1
                changed = ",".join(k for k in update_data if k != "slug")
                print(f"  [{locale}] {content_type}/{slug} -> {changed}")
            except Exception as e:
                print(f"  [{locale}] {content_type}/{slug} -> ERRORE: {e}")
            time.sleep(0.2)  # gentle on Strapi
    return total_seen, total_updated


def main() -> None:
    print(f"Cleanup CMS @ {strapi.STRAPI_URL}")
    grand_total_seen = 0
    grand_total_updated = 0
    for content_type, field in CONTENT_TYPES:
        print(f"\n=== {content_type} ({field}) ===")
        seen, updated = process_collection(content_type, field)
        print(f"  Totale: esaminati {seen}, aggiornati {updated}")
        grand_total_seen += seen
        grand_total_updated += updated
    print(f"\nDONE - {grand_total_updated}/{grand_total_seen} record aggiornati")


if __name__ == "__main__":
    main()
