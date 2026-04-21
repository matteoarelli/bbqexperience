"""Test unitari per umami_client — retry, backoff, cache token."""

import json
import sys
import os
import time
from io import BytesIO
from unittest.mock import patch, MagicMock

import pytest

# Aggiungi scripts/ al path per import agenti
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.lib import umami_client


class FakeResponse:
    """Risposta HTTP simulata per urlopen."""

    def __init__(self, data: dict | list, status: int = 200):
        self._data = json.dumps(data).encode("utf-8")
        self.status = status

    def read(self) -> bytes:
        return self._data

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class TestGetToken:
    """Test cache e refresh del token Umami."""

    def setup_method(self):
        # Reset cache tra i test
        umami_client._cached_token = ""
        umami_client._token_ts = 0.0

    @patch("agents.lib.umami_client.urlopen")
    def test_token_cached_within_ttl(self, mock_urlopen):
        """Token riutilizzato se ancora valido (entro 58 min)."""
        mock_urlopen.return_value = FakeResponse({"token": "abc123"})

        token1 = umami_client._get_token()
        token2 = umami_client._get_token()

        assert token1 == "abc123"
        assert token2 == "abc123"
        assert mock_urlopen.call_count == 1  # chiamata una sola volta

    @patch("agents.lib.umami_client.urlopen")
    def test_token_refreshed_after_ttl(self, mock_urlopen):
        """Token riottenuto dopo scadenza TTL."""
        mock_urlopen.return_value = FakeResponse({"token": "new_token"})

        # Simula token scaduto
        umami_client._cached_token = "old_token"
        umami_client._token_ts = time.time() - (umami_client.TOKEN_TTL + 10)

        token = umami_client._get_token()
        assert token == "new_token"
        assert mock_urlopen.call_count == 1


class TestRequest:
    """Test retry e gestione errori di _request."""

    def setup_method(self):
        umami_client._cached_token = "test_token"
        umami_client._token_ts = time.time()

    @patch("agents.lib.umami_client.time.sleep")
    @patch("agents.lib.umami_client.urlopen")
    def test_retry_on_500(self, mock_urlopen, mock_sleep):
        """Retry su errori server 5xx con backoff esponenziale."""
        from urllib.error import HTTPError

        error_500 = HTTPError(
            "http://test", 500, "Server Error", {}, BytesIO(b"error")
        )
        mock_urlopen.side_effect = [
            error_500,
            error_500,
            FakeResponse({"ok": True}),
        ]

        result = umami_client._request("http://test/api/something")
        assert result == {"ok": True}
        assert mock_urlopen.call_count == 3

    @patch("agents.lib.umami_client.urlopen")
    def test_no_retry_on_400(self, mock_urlopen):
        """Nessun retry su errori client 4xx — raise immediato."""
        from urllib.error import HTTPError

        error_400 = HTTPError(
            "http://test", 400, "Bad Request", {}, BytesIO(b"bad")
        )
        mock_urlopen.side_effect = error_400

        with pytest.raises(RuntimeError, match="400"):
            umami_client._request("http://test/api/something")

        assert mock_urlopen.call_count == 1

    @patch("agents.lib.umami_client.time.sleep")
    @patch("agents.lib.umami_client.urlopen")
    def test_raises_after_max_retries(self, mock_urlopen, mock_sleep):
        """RuntimeError dopo 3 tentativi falliti."""
        from urllib.error import HTTPError

        error_500 = HTTPError(
            "http://test", 500, "Server Error", {}, BytesIO(b"err")
        )
        mock_urlopen.side_effect = [error_500, error_500, error_500]

        with pytest.raises(RuntimeError):
            umami_client._request("http://test/api/something")

        assert mock_urlopen.call_count == 3


class TestGetMetricsByPath:
    """Test costruzione URL per get_metrics_by_path."""

    def setup_method(self):
        umami_client._cached_token = "test_token"
        umami_client._token_ts = time.time()

    @patch("agents.lib.umami_client.urlopen")
    def test_url_construction(self, mock_urlopen):
        """URL contiene type=path, timestamp in millisecondi, site ID corretto."""
        mock_urlopen.return_value = FakeResponse([])

        start_ms = 1700000000000
        end_ms = 1700086400000
        umami_client.get_metrics_by_path(start_ms, end_ms)

        call_args = mock_urlopen.call_args
        req = call_args[0][0]
        url = req.full_url

        assert "type=url" in url or "type=path" in url
        # Verifica che contiene i timestamp millisecondi
        assert str(start_ms) in url
        assert str(end_ms) in url
        # Verifica site ID
        assert umami_client.UMAMI_SITE_ID in url
