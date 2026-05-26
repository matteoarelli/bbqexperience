"""Test per il modulo sweep_pages schema-check (Phase 17-04).

Coverage:
- FAQPage rilevata su pagine con visible FAQ section
- FAQPage MANCANTE riportata come regression
- HowTo presente su tutorial con step structure
- HowTo NON emesso su recipe (Recipe schema dominante, conflict evitato)
- speakable selectors resolve a DOM nodes reali
- speakable cssSelector array presente in Article JSON-LD
- output summary include PASS/FAIL/SKIP counters
"""
import sys
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Importa sweep_pages dal percorso scripts/ (sorella di scripts/agents/)
_REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_REPO_ROOT / "scripts"))

import sweep_pages  # type: ignore


# ─── Fixture HTML di esempio ───────────────────────────────────────────────

def _wrap_html(article_jsonld: dict | None, extra_blocks: list[dict] | None = None,
               body_html: str = "") -> bytes:
    """Costruisce HTML minimo con <article> + JSON-LD scripts iniettati."""
    scripts = ""
    if article_jsonld:
        scripts += f'<script type="application/ld+json">{json.dumps(article_jsonld)}</script>\n'
    for blk in extra_blocks or []:
        scripts += f'<script type="application/ld+json">{json.dumps(blk)}</script>\n'
    html = f"""<!DOCTYPE html>
<html><head>{scripts}</head><body><article>{body_html}</article></body></html>"""
    return html.encode("utf-8")


def _article_with_speakable() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Test",
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["article > p:first-of-type", "article h2"],
        },
    }


def _faq_block() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}},
            {"@type": "Question", "name": "Q2", "acceptedAnswer": {"@type": "Answer", "text": "A2"}},
        ],
    }


def _howto_block() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Tutorial",
        "step": [
            {"@type": "HowToStep", "position": 1, "name": "S1", "text": "T1"},
            {"@type": "HowToStep", "position": 2, "name": "S2", "text": "T2"},
            {"@type": "HowToStep", "position": 3, "name": "S3", "text": "T3"},
        ],
    }


# ─── Test FAQPage detection ─────────────────────────────────────────────────

def test_check_faqpage_present_when_section():
    """Visible FAQ heading + FAQPage JSON-LD = pass."""
    body = "<p>Intro</p><h2>FAQ</h2><h3>Q1</h3><p>A1</p><h3>Q2</h3><p>A2</p>"
    html = _wrap_html(_article_with_speakable(), [_faq_block()], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert result["decision"] == "pass", f"issues: {result.get('issues')}"


def test_check_faqpage_missing_when_section():
    """Visible FAQ heading senza FAQPage JSON-LD = regression."""
    body = "<p>Intro</p><h2>FAQ</h2><h3>Q1</h3><p>A1</p>"
    html = _wrap_html(_article_with_speakable(), [], body)  # no FAQ block
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert result["decision"] == "fail"
    assert any("FAQPage" in issue for issue in result["issues"])


# ─── Test HowTo detection ───────────────────────────────────────────────────

def test_check_howto_present_on_tutorial():
    """Tutorial con step structure + HowTo JSON-LD = pass."""
    body = "<p>Intro</p><h2>Step 1: Prep</h2><p>Do it.</p><h2>Step 2: Cook</h2><p>Cook it.</p><h2>Step 3: Serve</h2><p>Serve it.</p>"
    html = _wrap_html(_article_with_speakable(), [_howto_block()], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/tutorials/test/")
    assert result["decision"] == "pass", f"issues: {result.get('issues')}"


def test_check_howto_absent_on_recipe():
    """Recipe page deliberatamente NON emette HowTo (Recipe schema dominante)."""
    recipe_block = {"@context": "https://schema.org", "@type": "Recipe", "name": "Test recipe"}
    body = "<p>Intro</p><h2>Ingredients</h2><ol><li>1</li><li>2</li><li>3</li></ol>"
    # Article + Recipe + speakable, NO HowTo
    html = _wrap_html(_article_with_speakable(), [recipe_block], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/recipes/test/")
    # Recipe schema presente, no HowTo -> deliberato, pass.
    assert result["decision"] == "pass", f"issues: {result.get('issues')}"


def test_check_howto_on_recipe_flagged_conflict():
    """Recipe con HowTo JSON-LD = conflict, deve essere flagged."""
    recipe_block = {"@context": "https://schema.org", "@type": "Recipe", "name": "Test recipe"}
    body = "<p>Intro</p><h2>Instructions</h2><ol><li>1</li><li>2</li><li>3</li></ol>"
    html = _wrap_html(_article_with_speakable(), [recipe_block, _howto_block()], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/recipes/test/")
    assert result["decision"] == "fail"
    assert any("HowTo" in issue and "Recipe" in issue for issue in result["issues"])


# ─── Test speakable selectors ───────────────────────────────────────────────

def test_speakable_selector_resolves():
    """I selectors 'article > p:first-of-type' e 'article h2' devono trovare nodi reali."""
    body = "<p>First paragraph (intro)</p><h2>Section 1</h2><p>Body</p>"
    html = _wrap_html(_article_with_speakable(), [], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert result["decision"] == "pass", f"issues: {result.get('issues')}"


def test_speakable_selector_in_jsonld():
    """Article JSON-LD deve contenere speakable.cssSelector array."""
    body = "<p>Intro</p><h2>Heading</h2><p>Body</p>"
    html = _wrap_html(_article_with_speakable(), [], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert result["decision"] == "pass"


def test_article_without_speakable_flagged():
    """Article schema senza speakable property deve essere flagged."""
    article_no_speakable = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Test",
    }
    body = "<p>Intro</p><h2>Heading</h2>"
    html = _wrap_html(article_no_speakable, [], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert result["decision"] == "fail"
    assert any("speakable" in issue.lower() for issue in result["issues"])


# ─── Test summary output ────────────────────────────────────────────────────

def test_sweep_summary_format():
    """check_schema ritorna dict con keys url + decision + (issues)."""
    body = "<p>Intro</p><h2>Heading</h2>"
    html = _wrap_html(_article_with_speakable(), [], body)
    with patch.object(sweep_pages, "fetch", return_value=(200, html)):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/test/")
    assert "url" in result
    assert "decision" in result
    assert result["decision"] in ("pass", "fail", "skip")
    if result["decision"] == "fail":
        assert "issues" in result


def test_sweep_skip_on_non_200():
    """HTTP non-200 ritorna skip."""
    with patch.object(sweep_pages, "fetch", return_value=(404, b"")):
        result = sweep_pages.check_schema("https://bbq-experience.com/en/blog/missing/")
    assert result["decision"] == "skip"
    assert "404" in result["reason"]


# ─── Test HOWTO_STEP_PATTERNS + FAQ_VISIBLE_HEADINGS constants ──────────────

def test_constants_exported():
    """I constants devono essere accessibili come module-level attributes."""
    assert hasattr(sweep_pages, "FAQ_VISIBLE_HEADINGS")
    assert hasattr(sweep_pages, "HOWTO_STEP_PATTERNS")
    assert hasattr(sweep_pages, "SPEAKABLE_SELECTORS")
    assert "article > p:first-of-type" in sweep_pages.SPEAKABLE_SELECTORS
    assert "FAQ" in sweep_pages.FAQ_VISIBLE_HEADINGS
    assert "Domande frequenti" in sweep_pages.FAQ_VISIBLE_HEADINGS
    assert "Preguntas frecuentes" in sweep_pages.FAQ_VISIBLE_HEADINGS
