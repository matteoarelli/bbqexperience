#!/usr/bin/env python3
"""Verifica qualita rendering su un campione di pagine live.

Modalita supportate (--check arg):
- markdown (default legacy): soft hyphen, anchor annidati, markdown raw, cross-locale
- schema (NEW Phase 17-04): FAQPage / HowTo / speakable audit
- all: esegue entrambi

Per ogni pagina markdown-check:
- Status HTTP (200)
- Soft hyphen veri U+00AD (decoded UTF-8)
- Anchor annidati <a><a>
- Markdown raw non convertito (## headings, ** bold, | tabelle non rese)
- Link cross-locale (slug di route in locale sbagliato)
- JSON-LD presente

Per ogni pagina schema-check:
- FAQPage JSON-LD presente quando il body contiene visible FAQ heading
- HowTo JSON-LD presente quando il tutorial body ha step structure
- HowTo NON presente su recipe pages (conflict con Recipe schema)
- speakable cssSelector array nel Article JSON-LD
- speakable selectors resolve a real DOM nodes
"""
import argparse
import json as _json
import os
import re
import re as _re
import sys
import io
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

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

# ─── Phase 17-04: schema audit constants ──────────────────────────────────────
# Headings visible che indicano una FAQ section nel body HTML.
# Locale-aware: EN + IT + ES (DEVE matchare i FAQ_HEADING_PATTERNS di structured-data.ts).
FAQ_VISIBLE_HEADINGS = [
    "FAQ",
    "Frequently Asked Questions",
    "Domande frequenti",
    "Preguntas frecuentes",
]

# Regex patterns per riconoscere headings "Step N" in tutorial pages.
# Match anche heading multilingue (Step EN / Passo IT / Paso ES).
HOWTO_STEP_PATTERNS = [
    r"\bStep\s+\d+",
    r"\bPasso\s+\d+",
    r"\bPaso\s+\d+",
]

# Selectors per speakable. DEVE matchare exactly buildSpeakableSpec() in
# web/src/lib/structured-data.ts. Iterazione precedente usava
# ['article > p:first-of-type','article h2'] — non matchava su DOM BBQ (i <p>
# diretti di <article> sono meta info, non content). Fix 2026-05-26: usiamo
# '.content-body' classe stabile del template Astro BaseLayout.
SPEAKABLE_SELECTORS = [
    ".content-body p:first-of-type",
    ".content-body h2",
]


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
    n_sh = text.count("­")
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


# ─── Phase 17-04: schema audit helpers ────────────────────────────────────────

def _has_visible_faq(soup) -> bool:
    """True se il body HTML contiene un H2/H3 con visible FAQ heading.

    Fix v1.2.1 (2026-05-27): mirror del FAQ_HEADING_PATTERNS TS — accetta suffix
    legittimi (about|on|for|regarding|sui|sobre|...) + separatori `: — – -`.
    Trade-off: blocca ancora narrative tipo "FAQ at a barbecue" perche "at" non
    e' nei prepositional whitelist.
    """
    import re as _re
    SUFFIX = r"(\s*$|\s*[:—–-]\s*\S|\s+(about|on|for|regarding|concerning|sui|sull[oa]|sulle|riguardo|circa|sobre|acerca|para|de\s+los?)\b)"
    patterns = [_re.compile(rf"^{_re.escape(h)}{SUFFIX}", _re.I) for h in FAQ_VISIBLE_HEADINGS]
    for h in soup.find_all(["h2", "h3"]):
        # Fix v1.2.1: usare separator=' ' per spazio tra nested <a> e text adjacente
        # (es. "FAQ About <a>X</a> Cleaners" → "FAQ About X Cleaners", non "...AboutXCleaners")
        text = h.get_text(separator=" ", strip=True)
        text = _re.sub(r"\s+", " ", text)  # collapse multiple spaces
        for p in patterns:
            if p.match(text):
                return True
    return False


def _has_step_structure(soup) -> bool:
    """True se il body HTML contiene >=3 step-like headings OR <ol><li>x3."""
    step_headings = 0
    for h in soup.find_all(["h2", "h3"]):
        text = h.get_text(strip=True)
        if any(_re.match(p, text) for p in HOWTO_STEP_PATTERNS):
            step_headings += 1
    if step_headings >= 3:
        return True
    for ol in soup.find_all("ol"):
        if len(ol.find_all("li", recursive=False)) >= 3:
            return True
    return False


def _jsonld_blocks(soup) -> list[dict]:
    """Estrae e parse tutti i <script type='application/ld+json'> blocks."""
    out = []
    for s in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            out.append(_json.loads(s.string or "{}"))
        except Exception:
            continue
    return out


def _has_schema_type(blocks: list[dict], t: str) -> bool:
    """True se almeno un blocco JSON-LD ha @type == t (anche dentro @graph)."""
    for b in blocks:
        if b.get("@type") == t:
            return True
        for item in b.get("@graph", []) or []:
            if isinstance(item, dict) and item.get("@type") == t:
                return True
    return False


def _speakable_selectors_resolve(soup) -> tuple[bool, str]:
    """True se ALMENO UNO degli SPEAKABLE_SELECTORS trova >=1 node nel DOM.

    Schema.org cssSelector array NON impone che tutti i selectors matchino — basta
    che almeno uno fornisca un targeting valido per il voice assistant. Articoli
    short senza h2 strutturali sono validi se 'p:first-of-type' matcha.
    """
    matched_any = False
    invalid = []
    for sel in SPEAKABLE_SELECTORS:
        try:
            nodes = soup.select(sel)
        except Exception as e:
            invalid.append(f"selector '{sel}' invalid: {e}")
            continue
        if nodes:
            matched_any = True
    if invalid:
        return False, "; ".join(invalid)
    if not matched_any:
        return False, f"all SPEAKABLE_SELECTORS matched 0 nodes ({SPEAKABLE_SELECTORS})"
    return True, "ok"


def check_schema(url: str) -> dict:
    """Audit FAQPage / HowTo / speakable per una pagina live.

    Returns dict: {url, decision: 'pass'|'fail'|'skip', issues?: list[str], reason?: str}
    """
    status, html_bytes = fetch(url)
    if status != 200:
        return {"url": url, "decision": "skip", "reason": f"HTTP {status}"}

    soup = BeautifulSoup(html_bytes, "html.parser")
    blocks = _jsonld_blocks(soup)
    issues: list[str] = []

    # FAQPage check: visible heading <-> JSON-LD coerenza.
    visible_faq = _has_visible_faq(soup)
    has_faq_schema = _has_schema_type(blocks, "FAQPage")
    if visible_faq and not has_faq_schema:
        issues.append("Visible FAQ section but NO FAQPage JSON-LD")
    if has_faq_schema and not visible_faq:
        issues.append("FAQPage JSON-LD present but NO visible FAQ section (Google spam policy)")

    # HowTo check: solo su tutorials.
    is_tutorial = any(seg in url for seg in ["/tutorials/", "/guide/", "/tutoriales/"])
    if is_tutorial:
        has_step = _has_step_structure(soup)
        has_howto = _has_schema_type(blocks, "HowTo")
        if has_step and not has_howto:
            issues.append("Tutorial has step structure but NO HowTo JSON-LD")

    # Recipe pages: HowTo NON deve esserci (conflict con Recipe schema).
    is_recipe = any(seg in url for seg in ["/recipes/", "/ricette/", "/recetas/"])
    if is_recipe and _has_schema_type(blocks, "HowTo"):
        issues.append("Recipe page has HowTo JSON-LD (conflict with Recipe schema)")

    # Speakable check: ogni Article deve averlo.
    article_blocks = [b for b in blocks if b.get("@type") == "Article"]
    for ab in article_blocks:
        spk = ab.get("speakable")
        if not spk:
            issues.append("Article JSON-LD missing speakable property")
        elif spk.get("@type") != "SpeakableSpecification":
            issues.append("speakable @type incorrect")
        elif not isinstance(spk.get("cssSelector"), list) or not spk["cssSelector"]:
            issues.append("speakable cssSelector empty or not array")

    # Speakable selectors devono risolvere a nodi reali nel DOM.
    ok, reason = _speakable_selectors_resolve(soup)
    if not ok and article_blocks:
        issues.append(f"Speakable selectors broken: {reason}")

    return {
        "url": url,
        "decision": "fail" if issues else "pass",
        "issues": issues,
    }


def _gather_live_urls(limit: int = 50) -> list[tuple[str, str, str]]:
    """Raccoglie (locale, ct, slug) da Strapi per tutti i content type."""
    samples: list[tuple[str, str, str]] = []
    for ct in ["blog-posts", "reviews", "recipes", "tutorials"]:
        for locale in ["en", "it", "es"]:
            items = strapi.find_all_pages(
                ct, locale=locale, status="published", page_size=100, fields=["slug"]
            )
            slugs = [i.get("slug") for i in items if i.get("slug")]
            for s in slugs:
                samples.append((locale, ct, s))
            if len(samples) >= limit:
                return samples
    return samples


def _run_markdown_check(samples: list[tuple[str, str, str]]) -> int:
    """Modalita legacy: esegue analyze() su ogni pagina."""
    print(f"Sweeping {len(samples)} pages (markdown check)...")
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

    print(f"\n=== RESULT (markdown) ===")
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
    return 1 if (failures or bad_status) else 0


def _run_schema_check(samples: list[tuple[str, str, str]]) -> int:
    """Modalita Phase 17-04: esegue check_schema() su ogni pagina."""
    print(f"Sweeping {len(samples)} pages (schema check)...")
    pass_n = fail_n = skip_n = 0
    failures: list[dict] = []

    for locale, ct, slug in samples:
        route = LOCALIZED_ROUTES[ct][locale]
        url = f"{BASE}/{locale}/{route}/{slug}/"
        r = check_schema(url)
        if r["decision"] == "pass":
            pass_n += 1
        elif r["decision"] == "fail":
            fail_n += 1
            failures.append(r)
        else:
            skip_n += 1

    print(f"\n=== SWEEP SCHEMA SUMMARY ===")
    print(f"PASS: {pass_n} | FAIL: {fail_n} | SKIP: {skip_n}")
    if failures:
        print("\nFailures (first 20):")
        for f in failures[:20]:
            print(f"  FAIL {f['url']}: {'; '.join(f['issues'])}")
    return 1 if fail_n > 0 else 0


def main():
    parser = argparse.ArgumentParser(description="BBQ sweep_pages — markdown + schema audit")
    parser.add_argument(
        "--check",
        choices=["all", "schema", "markdown"],
        default="markdown",
        help="Modalita di check (default: markdown, legacy behavior)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Max numero pagine da campionare (default: 200, take all if higher)",
    )
    args = parser.parse_args()

    samples = _gather_live_urls(limit=args.limit)

    rc = 0
    if args.check in ("markdown", "all"):
        rc |= _run_markdown_check(samples)
    if args.check in ("schema", "all"):
        rc |= _run_schema_check(samples)
    sys.exit(rc)


if __name__ == "__main__":
    main()
