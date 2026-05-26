"""Fixture condivise per i test agents/.

Convenzioni:
- mock_gsc_service: simula service.searchanalytics().query().execute() + urlInspection
- mock_strapi: MagicMock di strapi_client.create/update/publish con returns predefiniti
- frozen_today: monkeypatcha date.today a 2026-05-25 per date math stabile
- gsc_sample_rows: lista pre-parsata di righe GSC dalla fixture JSON

Tutte le fixture sono pytest.fixture standard (nessun mark custom).
"""

import json
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# ─── Percorsi fixture JSON ─────────────────────────────────────────────────
_FIXTURES_DIR = Path(__file__).parent / "fixtures"
_GSC_SEARCH_ANALYTICS = _FIXTURES_DIR / "gsc_search_analytics_sample.json"
_GSC_URL_INSPECTION = _FIXTURES_DIR / "gsc_url_inspection_sample.json"


def _load_json(path: Path) -> dict:
    """Helper interno: carica JSON dalla fixture path."""
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def gsc_search_analytics_payload() -> dict:
    """Payload grezzo della fixture search analytics (con 'rows' + responseAggregationType)."""
    return _load_json(_GSC_SEARCH_ANALYTICS)


@pytest.fixture
def gsc_url_inspection_payload() -> dict:
    """Payload grezzo della fixture URL inspection."""
    return _load_json(_GSC_URL_INSPECTION)


@pytest.fixture
def gsc_sample_rows(gsc_search_analytics_payload) -> list[dict]:
    """Lista di righe pronte (passthrough da fixture)."""
    return gsc_search_analytics_payload["rows"]


@pytest.fixture
def mock_gsc_service(gsc_search_analytics_payload, gsc_url_inspection_payload):
    """MagicMock che simula service Search Console + URL Inspection.

    Restituisce un mock chainable:
      service.searchanalytics().query(siteUrl=..., body=...).execute() -> payload
      service.urlInspection().index().inspect(body=...).execute() -> payload
    """
    service = MagicMock()
    service.searchanalytics.return_value.query.return_value.execute.return_value = (
        gsc_search_analytics_payload
    )
    service.urlInspection.return_value.index.return_value.inspect.return_value.execute.return_value = (
        gsc_url_inspection_payload
    )
    return service


@pytest.fixture
def mock_indexing_service():
    """MagicMock per Indexing API (urlNotifications.publish)."""
    service = MagicMock()
    service.urlNotifications.return_value.publish.return_value.execute.return_value = {
        "urlNotificationMetadata": {
            "url": "https://bbq-experience.com/en/blog/test",
            "latestUpdate": {"notifyTime": "2026-05-26T10:00:00Z", "type": "URL_UPDATED"},
        }
    }
    return service


@pytest.fixture
def mock_strapi():
    """MagicMock per strapi_client con returns base."""
    strapi = MagicMock()
    strapi.create.return_value = {"data": {"documentId": "abc123", "id": 1}}
    strapi.update.return_value = {"data": {"documentId": "abc123", "id": 1}}
    strapi.publish.return_value = {"data": {"documentId": "abc123", "publishedAt": "2026-05-26T10:00:00Z"}}
    strapi.find.return_value = {"data": [], "meta": {"pagination": {"pageCount": 1}}}
    return strapi


@pytest.fixture
def frozen_today(monkeypatch):
    """Monkeypatcha date.today a 2026-05-25 per test deterministici sul date math.

    Patch su tutti i moduli che potrebbero importare `from datetime import date`:
    applichiamo via monkeypatch del modulo `datetime.date`.
    """
    import datetime as _dt

    class _FrozenDate(_dt.date):
        @classmethod
        def today(cls):
            return cls(2026, 5, 25)

    monkeypatch.setattr(_dt, "date", _FrozenDate)
    return date(2026, 5, 25)
