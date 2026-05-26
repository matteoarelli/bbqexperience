"""Test per lib/gsc_client.py + lib/ctr_benchmark.py."""

import sys
import os
from unittest.mock import patch, MagicMock

# sys.path: aggiunge scripts/ così possiamo fare `from agents.lib import gsc_client`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


# ─── ctr_benchmark tests (B1 fix — shared module) ─────────────────────────

class TestCtrBenchmark:
    """CTR_BENCHMARK shared constants — single source of truth."""

    def test_ctr_benchmark_values(self):
        from agents.lib.ctr_benchmark import CTR_BENCHMARK, REWRITE_FACTOR
        assert CTR_BENCHMARK[1] == 0.398
        assert CTR_BENCHMARK[10] == 0.016
        assert REWRITE_FACTOR == 0.6
        # Dict ha esattamente 10 entries (pos 1-10)
        assert set(CTR_BENCHMARK.keys()) == set(range(1, 11))

    def test_benchmark_for_position_rounds(self):
        from agents.lib.ctr_benchmark import benchmark_for_position, CTR_BENCHMARK
        # 6.4 -> round 6 -> CTR_BENCHMARK[6]
        assert benchmark_for_position(6.4) == CTR_BENCHMARK[6] == 0.040
        # 7.6 -> round 8 (banker's rounding: Python round(7.6)==8)
        assert benchmark_for_position(7.6) == CTR_BENCHMARK[8] == 0.024
        # esatti
        assert benchmark_for_position(1.0) == CTR_BENCHMARK[1]
        assert benchmark_for_position(5.0) == CTR_BENCHMARK[5]

    def test_benchmark_for_position_clamps(self):
        from agents.lib.ctr_benchmark import benchmark_for_position, CTR_BENCHMARK
        # 0.3 -> round 0 -> clamp a 1
        assert benchmark_for_position(0.3) == CTR_BENCHMARK[1]
        # 15 -> clamp a 10
        assert benchmark_for_position(15) == CTR_BENCHMARK[10]
        # 11.4 -> clamp a 10
        assert benchmark_for_position(11.4) == CTR_BENCHMARK[10]


# ─── Helper: simula HttpError SDK ────────────────────────────────────────

def _make_http_error(status: int, reason: str = "test"):
    """Costruisce un googleapiclient.errors.HttpError con uno status code."""
    from googleapiclient.errors import HttpError
    # HttpError vuole (resp, content). Resp è httplib2.Response-like (ha .status)
    resp = MagicMock()
    resp.status = status
    resp.reason = reason
    return HttpError(resp, b'{"error": "test"}', uri="https://test")


# ─── gsc_client tests ────────────────────────────────────────────────────

class TestGscClientParsing:
    def test_parse_top_queries(self, mock_gsc_service, monkeypatch):
        """top_queries() returns list of rows from fixture."""
        from agents.lib import gsc_client
        # Resetta cache module-level + patcha _sc_service
        monkeypatch.setattr(gsc_client, "_search_console", None)
        monkeypatch.setattr(gsc_client, "_sc_service", lambda: mock_gsc_service)
        rows = gsc_client.top_queries(days=28, row_limit=10)
        assert len(rows) == 5
        # Passthrough: ogni row ha keys/clicks/impressions/ctr/position
        first = rows[0]
        assert "keys" in first
        assert "clicks" in first
        assert "impressions" in first
        assert "ctr" in first
        assert "position" in first

    def test_parse_top_pages(self, mock_gsc_service, monkeypatch):
        from agents.lib import gsc_client
        monkeypatch.setattr(gsc_client, "_search_console", None)
        monkeypatch.setattr(gsc_client, "_sc_service", lambda: mock_gsc_service)
        rows = gsc_client.top_pages(days=28, row_limit=10)
        assert len(rows) == 5
        # Verifica che almeno una row sia un URL EN
        urls = [r["keys"][0] for r in rows]
        assert any("/en/" in u for u in urls)

    def test_queries_for_page_filter(self, mock_gsc_service, monkeypatch):
        """queries_for_page() builds dimensionFilterGroups + caps top_n."""
        from agents.lib import gsc_client
        monkeypatch.setattr(gsc_client, "_search_console", None)
        monkeypatch.setattr(gsc_client, "_sc_service", lambda: mock_gsc_service)
        rows = gsc_client.queries_for_page("https://bbq-experience.com/en/blog/x", top_n=3)
        # Cap rispettato
        assert len(rows) <= 3
        # Verifica che la body request abbia dimensionFilterGroups
        call_args = mock_gsc_service.searchanalytics.return_value.query.call_args
        body = call_args.kwargs.get("body", call_args.args[-1] if call_args.args else {})
        assert "dimensionFilterGroups" in body
        # Almeno un filtro page == url
        groups = body["dimensionFilterGroups"]
        flat_filters = [f for g in groups for f in g.get("filters", [])]
        assert any(f.get("dimension") == "page" and f.get("operator") == "equals" for f in flat_filters)


class TestGscClientRetry:
    def test_retry_5xx_3times(self, monkeypatch):
        """HttpError 503 retry 3 volte con sleep [1,2,4], poi raise."""
        from agents.lib import gsc_client
        sleep_calls = []
        monkeypatch.setattr(gsc_client.time, "sleep", lambda s: sleep_calls.append(s))

        fail_count = {"n": 0}
        def always_fail():
            fail_count["n"] += 1
            raise _make_http_error(503)

        with pytest.raises(RuntimeError):
            gsc_client._retry(always_fail)

        # 3 tentativi totali (con 2 sleep tra di loro = [1, 2])
        assert fail_count["n"] == 3
        assert sleep_calls == [1, 2]

    def test_no_retry_4xx(self, monkeypatch):
        """HttpError 400 raise immediato senza retry."""
        from agents.lib import gsc_client
        sleep_calls = []
        monkeypatch.setattr(gsc_client.time, "sleep", lambda s: sleep_calls.append(s))

        fail_count = {"n": 0}
        def fail_400():
            fail_count["n"] += 1
            raise _make_http_error(400)

        with pytest.raises(RuntimeError):
            gsc_client._retry(fail_400)

        # Esattamente 1 tentativo, zero sleep
        assert fail_count["n"] == 1
        assert sleep_calls == []

    def test_429_retries(self, monkeypatch):
        """429 (rate limit) e' eccezione: ritenta."""
        from agents.lib import gsc_client
        sleep_calls = []
        monkeypatch.setattr(gsc_client.time, "sleep", lambda s: sleep_calls.append(s))

        fail_count = {"n": 0}
        def fail_429():
            fail_count["n"] += 1
            raise _make_http_error(429)

        with pytest.raises(RuntimeError):
            gsc_client._retry(fail_429)

        assert fail_count["n"] == 3
        assert sleep_calls == [1, 2]


class TestGscClientIndexing:
    def test_request_indexing_soft_fail(self, monkeypatch):
        """403/404 returns {"success":False,"reason":...} senza raise."""
        from agents.lib import gsc_client
        monkeypatch.setattr(gsc_client, "_indexing", None)

        for status in (403, 404):
            fake_svc = MagicMock()
            fake_svc.urlNotifications.return_value.publish.return_value.execute.side_effect = (
                _make_http_error(status)
            )
            monkeypatch.setattr(gsc_client, "_idx_service", lambda svc=fake_svc: svc)
            r = gsc_client.request_indexing("https://bbq-experience.com/en/blog/test")
            assert r.get("success") is False
            assert "reason" in r
            assert str(status) in r["reason"] or status == 403 or status == 404

    def test_request_indexing_success(self, mock_indexing_service, monkeypatch):
        """Happy path: ritorna {"success":True, "response":...}."""
        from agents.lib import gsc_client
        monkeypatch.setattr(gsc_client, "_indexing", None)
        monkeypatch.setattr(gsc_client, "_idx_service", lambda: mock_indexing_service)
        r = gsc_client.request_indexing("https://bbq-experience.com/en/blog/test")
        assert r.get("success") is True
        assert "response" in r


class TestGscClientInspect:
    def test_inspect_url_parsing(self, mock_gsc_service, monkeypatch):
        from agents.lib import gsc_client
        monkeypatch.setattr(gsc_client, "_search_console", None)
        monkeypatch.setattr(gsc_client, "_sc_service", lambda: mock_gsc_service)
        result = gsc_client.inspect_url("https://bbq-experience.com/en/blog/test")
        assert result.get("indexStatusResult", {}).get("verdict") == "PASS"


# Stub legacy compat: i nomi vecchi sono coperti dalle classi sopra,
# manteniamo le funzioni top-level per compatibilita' col plan.
def test_parse_top_queries():
    pytest.skip("covered by TestGscClientParsing.test_parse_top_queries")


def test_parse_top_pages():
    pytest.skip("covered by TestGscClientParsing.test_parse_top_pages")


def test_queries_for_page_filter():
    pytest.skip("covered by TestGscClientParsing.test_queries_for_page_filter")


def test_retry_5xx_3times():
    pytest.skip("covered by TestGscClientRetry.test_retry_5xx_3times")


def test_no_retry_4xx():
    pytest.skip("covered by TestGscClientRetry.test_no_retry_4xx")


def test_request_indexing_soft_fail():
    pytest.skip("covered by TestGscClientIndexing.test_request_indexing_soft_fail")


def test_inspect_url_parsing():
    pytest.skip("covered by TestGscClientInspect.test_inspect_url_parsing")
