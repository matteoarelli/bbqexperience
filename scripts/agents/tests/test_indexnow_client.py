"""Test per lib/indexnow_client.py."""

import sys
import os
import json
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


class TestIndexNowPing:
    def test_ping_payload_shape(self, monkeypatch):
        """ping() POSTa JSON con host/key/keyLocation/urlList."""
        # Patch ENV PRIMA dell'import per far ri-leggere le costanti
        monkeypatch.setenv("INDEXNOW_KEY", "abc123def456")
        monkeypatch.setenv("INDEXNOW_HOST", "bbq-experience.com")
        # Re-importa il modulo per ri-leggere os.environ
        import importlib
        from agents.lib import indexnow_client
        importlib.reload(indexnow_client)

        captured = {}

        class FakeResp:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *a): pass

        def fake_urlopen(req, timeout=10):
            captured["url"] = req.full_url
            captured["data"] = req.data
            captured["headers"] = dict(req.header_items())
            return FakeResp()

        monkeypatch.setattr(indexnow_client, "urlopen", fake_urlopen)

        r = indexnow_client.ping([
            "https://bbq-experience.com/en/blog/a",
            "https://bbq-experience.com/en/blog/b",
        ])
        assert r["success"] is True
        assert r["code"] == 200

        # Verifica payload shape
        assert captured["url"] == "https://api.indexnow.org/indexnow"
        payload = json.loads(captured["data"].decode("utf-8"))
        assert payload["host"] == "bbq-experience.com"
        assert payload["key"] == "abc123def456"
        assert "keyLocation" in payload
        assert payload["urlList"] == [
            "https://bbq-experience.com/en/blog/a",
            "https://bbq-experience.com/en/blog/b",
        ]

    def test_ping_missing_key_noop(self, monkeypatch):
        """Senza INDEXNOW_KEY non fa nessuna chiamata HTTP."""
        monkeypatch.delenv("INDEXNOW_KEY", raising=False)
        import importlib
        from agents.lib import indexnow_client
        importlib.reload(indexnow_client)

        called = {"n": 0}
        def fake_urlopen(*a, **kw):
            called["n"] += 1
            raise AssertionError("urlopen non doveva essere chiamato senza key")

        monkeypatch.setattr(indexnow_client, "urlopen", fake_urlopen)

        r = indexnow_client.ping(["https://bbq-experience.com/x"])
        assert r["success"] is False
        assert "INDEXNOW_KEY" in r["reason"]
        assert called["n"] == 0

    def test_ping_422_returns_failure(self, monkeypatch):
        """HTTPError 422 (invalid payload) returns {success:False, code:422}."""
        monkeypatch.setenv("INDEXNOW_KEY", "k")
        monkeypatch.setenv("INDEXNOW_HOST", "bbq-experience.com")
        import importlib
        from agents.lib import indexnow_client
        importlib.reload(indexnow_client)

        def fake_urlopen(req, timeout=10):
            raise HTTPError(req.full_url, 422, "Unprocessable", {}, None)

        monkeypatch.setattr(indexnow_client, "urlopen", fake_urlopen)

        r = indexnow_client.ping(["https://x"])
        assert r["success"] is False
        assert r["code"] == 422


# Stub top-level per coerenza signature plan
def test_ping_payload_shape():
    pytest.skip("covered by TestIndexNowPing.test_ping_payload_shape")


def test_ping_missing_key_noop():
    pytest.skip("covered by TestIndexNowPing.test_ping_missing_key_noop")


def test_ping_422_returns_failure():
    pytest.skip("covered by TestIndexNowPing.test_ping_422_returns_failure")
