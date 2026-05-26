"""Test integrazione post-publish indexing hook.

WIRE_SITE discovered: scripts/agents/claude_review_runner.py:129
  (strapi.publish in apply_review, dopo Claude quality gate decide auto_publish).

Strategia mock:
- Mocca strapi_client.publish/update (no rete vera)
- Mocca gsc_client.request_indexing + indexnow_client.ping a livello modulo
- Costruisce ReviewResult fittizio + content dict fittizio
- Asserisce che dopo strapi.publish, vengono chiamati request_indexing E ping
  con l'URL canonico EN
"""

import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


def _make_review_result(approved=True, score=8):
    """Costruisce un ReviewResult fittizio compatibile con apply_review."""
    from agents.claude_quality_gate import ReviewResult
    return ReviewResult(
        approved=approved,
        score=score,
        summary="Test review",
        corrected_html="<p>" + "x" * 500 + "</p>",  # >100 chars per trigger update
        issues=[],
        word_count=1500,
        broken_product_links=[],
        broken_blog_links=[],
    )


def _make_content(slug="best-pellet-grill", ct="blog-posts", doc_id="doc123"):
    return {
        "_strapi_type": ct,
        "documentId": doc_id,
        "slug": slug,
        "content": "<p>" + "x" * 500 + "</p>",
    }


class TestPublisherIndexingHook:
    def test_publish_triggers_indexing(self, monkeypatch):
        """Quando apply_review pubblica (auto_publish), chiama request_indexing + ping."""
        from agents import claude_review_runner as runner
        from agents.lib import gsc_client, indexnow_client

        # Mocks
        publish_calls = []
        update_calls = []
        index_calls = []
        ping_calls = []

        monkeypatch.setattr(runner.strapi, "publish",
            lambda ct, doc_id: publish_calls.append((ct, doc_id)) or {"data": {}})
        monkeypatch.setattr(runner.strapi, "update",
            lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        monkeypatch.setattr(gsc_client, "request_indexing",
            lambda url: index_calls.append(url) or {"success": True, "response": {}})
        monkeypatch.setattr(indexnow_client, "ping",
            lambda urls: ping_calls.append(urls) or {"success": True, "code": 200})

        # Forza next_step="auto_publish"
        monkeypatch.setattr(runner, "decide_next_step", lambda r: "auto_publish")

        content = _make_content(slug="best-pellet-grill")
        review = _make_review_result()

        result = runner.apply_review(content, review, queue_doc_id="q123")

        assert result == "auto_publish"
        # Strapi.publish chiamato esattamente 1 volta
        assert len(publish_calls) == 1
        assert publish_calls[0] == ("blog-posts", "doc123")
        # Indexing API chiamata con URL canonico EN
        assert len(index_calls) == 1
        assert index_calls[0] == "https://bbq-experience.com/en/blog/best-pellet-grill"
        # IndexNow ping chiamato con stesso URL
        assert len(ping_calls) == 1
        assert ping_calls[0] == ["https://bbq-experience.com/en/blog/best-pellet-grill"]

    def test_publish_continues_on_indexing_failure(self, monkeypatch):
        """Se request_indexing fallisce, promotion comunque completa (no raise)."""
        from agents import claude_review_runner as runner
        from agents.lib import gsc_client, indexnow_client

        publish_calls = []
        monkeypatch.setattr(runner.strapi, "publish",
            lambda ct, doc_id: publish_calls.append((ct, doc_id)) or {"data": {}})
        monkeypatch.setattr(runner.strapi, "update", lambda *a, **kw: {"data": {}})
        # Indexing API ritorna failure
        monkeypatch.setattr(gsc_client, "request_indexing",
            lambda url: {"success": False, "reason": "scope-or-permission (403)"})
        # IndexNow solleva eccezione inattesa
        def raising_ping(urls):
            raise RuntimeError("network fail simulated")
        monkeypatch.setattr(indexnow_client, "ping", raising_ping)

        monkeypatch.setattr(runner, "decide_next_step", lambda r: "auto_publish")

        content = _make_content()
        review = _make_review_result()

        # Non deve sollevare
        result = runner.apply_review(content, review, queue_doc_id="q123")

        assert result == "auto_publish"
        # Strapi.publish e' stato chiamato
        assert len(publish_calls) == 1

    def test_no_publish_no_indexing(self, monkeypatch):
        """Se next_step != auto_publish, NON chiama indexing (preserva quota)."""
        from agents import claude_review_runner as runner
        from agents.lib import gsc_client, indexnow_client

        publish_calls = []
        index_calls = []
        ping_calls = []

        monkeypatch.setattr(runner.strapi, "publish",
            lambda ct, doc_id: publish_calls.append((ct, doc_id)) or {"data": {}})
        monkeypatch.setattr(runner.strapi, "update", lambda *a, **kw: {"data": {}})
        monkeypatch.setattr(gsc_client, "request_indexing",
            lambda url: index_calls.append(url) or {"success": True})
        monkeypatch.setattr(indexnow_client, "ping",
            lambda urls: ping_calls.append(urls) or {"success": True, "code": 200})

        monkeypatch.setattr(runner, "decide_next_step", lambda r: "preview_first")

        content = _make_content()
        review = _make_review_result()
        result = runner.apply_review(content, review, queue_doc_id="q123")

        assert result == "preview_first"
        # Strapi.publish NON chiamato (preview keeps as draft)
        assert publish_calls == []
        # Indexing NON chiamato
        assert index_calls == []
        assert ping_calls == []


class TestCanonicalUrl:
    """Test del builder URL canonico (LOCALIZED_ROUTES)."""

    def test_blog_en(self):
        from agents.claude_review_runner import _canonical_url
        assert _canonical_url("blog-posts", "en", "best-grill") == "https://bbq-experience.com/en/blog/best-grill"

    def test_recipe_it(self):
        from agents.claude_review_runner import _canonical_url
        assert _canonical_url("recipes", "it", "brisket") == "https://bbq-experience.com/it/ricette/brisket"

    def test_tutorial_es(self):
        from agents.claude_review_runner import _canonical_url
        assert _canonical_url("tutorials", "es", "ahumado") == "https://bbq-experience.com/es/tutoriales/ahumado"

    def test_review_it(self):
        from agents.claude_review_runner import _canonical_url
        assert _canonical_url("reviews", "it", "weber") == "https://bbq-experience.com/it/recensioni/weber"

    def test_unknown_content_type_fallback(self):
        from agents.claude_review_runner import _canonical_url
        # Fallback safe a "blog" per content_type sconosciuti
        assert _canonical_url("unknown-type", "en", "x") == "https://bbq-experience.com/en/blog/x"


# Stub top-level per coerenza signature plan
def test_publish_triggers_indexing():
    pytest.skip("covered by TestPublisherIndexingHook.test_publish_triggers_indexing")


def test_publish_continues_on_indexing_failure():
    pytest.skip("covered by TestPublisherIndexingHook.test_publish_continues_on_indexing_failure")
