"""Test per X-Skip-Rebuild header support in lib/strapi_client.py.

Behavior coverage (PLAN 17-02 Task 3, STEP 2):
- test_strapi_update_skip_rebuild       -> PUT include X-Skip-Rebuild: 1 quando kwarg True
- test_strapi_update_without_skip       -> header NON inviato per default (no regression)
- test_strapi_create_no_skip_header     -> create() non supporta skip (genuine rebuilds)
- test_strapi_find_no_skip_header       -> find() non supporta skip
"""

import sys
import os
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class _FakeResp:
    """Minimal context-manager fake for urlopen()."""
    def __init__(self, body=b'{"data": {"documentId": "x"}}', status=200):
        self._body = body
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def read(self):
        return self._body


def _capture_request(monkeypatch):
    """Patcha strapi_client.urlopen e cattura la Request inviata."""
    from agents.lib import strapi_client as sc
    captured = {}

    def fake_urlopen(req, timeout=None):
        captured["request"] = req
        captured["headers"] = dict(req.headers)
        captured["url"] = req.full_url
        captured["method"] = req.get_method()
        return _FakeResp()

    monkeypatch.setattr(sc, "urlopen", fake_urlopen)
    return captured


class TestStrapiSkipRebuildHeader:
    def test_strapi_update_skip_rebuild_true(self, monkeypatch):
        """update(..., skip_rebuild=True) invia X-Skip-Rebuild: 1."""
        from agents.lib import strapi_client as sc
        cap = _capture_request(monkeypatch)
        sc.update("blog-posts", "doc-123", {"seo_title": "x"},
                  locale="en", skip_rebuild=True)
        # urllib normalizza i nomi degli header (capitalize_each_segment con _).
        # Cerchiamo case-insensitive.
        headers_lower = {k.lower(): v for k, v in cap["headers"].items()}
        assert headers_lower.get("x-skip-rebuild") == "1", \
            f"X-Skip-Rebuild header missing/wrong. headers={cap['headers']}"

    def test_strapi_update_default_no_skip(self, monkeypatch):
        """update() senza skip_rebuild NON invia il header (no regression)."""
        from agents.lib import strapi_client as sc
        cap = _capture_request(monkeypatch)
        sc.update("blog-posts", "doc-123", {"title": "x"}, locale="en")
        headers_lower = {k.lower(): v for k, v in cap["headers"].items()}
        assert "x-skip-rebuild" not in headers_lower, \
            f"X-Skip-Rebuild header presente senza kwarg: {cap['headers']}"

    def test_strapi_update_skip_rebuild_false(self, monkeypatch):
        """update(..., skip_rebuild=False) NON invia header (esplicito False)."""
        from agents.lib import strapi_client as sc
        cap = _capture_request(monkeypatch)
        sc.update("blog-posts", "doc-123", {"title": "x"},
                  locale="en", skip_rebuild=False)
        headers_lower = {k.lower(): v for k, v in cap["headers"].items()}
        assert "x-skip-rebuild" not in headers_lower

    def test_strapi_create_no_skip_header(self, monkeypatch):
        """create() non deve mai inviare X-Skip-Rebuild (genuine rebuild needed)."""
        from agents.lib import strapi_client as sc
        cap = _capture_request(monkeypatch)
        sc.create("blog-posts", {"title": "x"})
        headers_lower = {k.lower(): v for k, v in cap["headers"].items()}
        assert "x-skip-rebuild" not in headers_lower

    def test_strapi_find_no_skip_header(self, monkeypatch):
        """find() (GET) non deve mai inviare X-Skip-Rebuild."""
        from agents.lib import strapi_client as sc
        cap = _capture_request(monkeypatch)
        sc.find("blog-posts", locale="en", page_size=1)
        headers_lower = {k.lower(): v for k, v in cap["headers"].items()}
        assert "x-skip-rebuild" not in headers_lower
        assert cap["method"] == "GET"


class TestStrapiSkipRebuildSignature:
    def test_update_signature_has_skip_rebuild(self):
        """Signature update() include skip_rebuild kwarg (grep test)."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "lib" / "strapi_client.py"
        text = src.read_text(encoding="utf-8")
        assert "skip_rebuild" in text
        assert "X-Skip-Rebuild" in text
