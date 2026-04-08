"""Client REST per Strapi 5 — usato da tutti gli agenti AI."""

import os
import json
import time
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

STRAPI_URL = os.environ.get("STRAPI_URL", "https://cms.bbq-experience.com")
STRAPI_API_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]  # secondi tra i tentativi


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {STRAPI_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, data: dict | None = None) -> dict:
    """Esegue richiesta HTTP verso Strapi con retry e backoff esponenziale."""
    body = json.dumps(data).encode("utf-8") if data else None
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        req = Request(url, data=body, headers=_headers(), method=method)
        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            # Non ritentare su errori client (4xx) — solo server (5xx) e timeout
            if 400 <= e.code < 500:
                raise RuntimeError(
                    f"Strapi {method} {url} -> {e.code}: {error_body}"
                ) from e
            last_error = RuntimeError(
                f"Strapi {method} {url} -> {e.code}: {error_body}"
            )
        except (URLError, TimeoutError, OSError) as e:
            last_error = RuntimeError(f"Strapi {method} {url} -> network error: {e}")

        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF[attempt]
            print(f"[RETRY] Strapi {method} tentativo {attempt + 2}/{MAX_RETRIES} tra {wait}s...")
            time.sleep(wait)

    raise last_error  # type: ignore[misc]


def find(
    content_type: str,
    *,
    locale: str = "en",
    status: str = "published",
    page: int = 1,
    page_size: int = 25,
    sort: str = "",
    filters: dict[str, Any] | None = None,
    populate: str = "",
    fields: list[str] | None = None,
) -> dict:
    """GET /api/{content_type} con parametri Strapi v5."""
    params: dict[str, str] = {
        "locale": locale,
        "status": status,
        "pagination[page]": str(page),
        "pagination[pageSize]": str(page_size),
    }
    if sort:
        params["sort"] = sort
    if populate:
        params["populate"] = populate
    if fields:
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
    if filters:
        _flatten_filters(filters, "filters", params)

    url = f"{STRAPI_URL}/api/{content_type}?{urlencode(params)}"
    return _request("GET", url)


def find_one(content_type: str, document_id: str, *, populate: str = "*") -> dict:
    """GET /api/{content_type}/{documentId}."""
    params = {"populate": populate}
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}?{urlencode(params)}"
    return _request("GET", url)


def create(content_type: str, data: dict) -> dict:
    """POST /api/{content_type} — crea nuova entry."""
    url = f"{STRAPI_URL}/api/{content_type}"
    return _request("POST", url, {"data": data})


def update(content_type: str, document_id: str, data: dict, *, locale: str = "") -> dict:
    """PUT /api/{content_type}/{documentId} — aggiorna entry esistente."""
    params = {}
    if locale:
        params["locale"] = locale
    qs = f"?{urlencode(params)}" if params else ""
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}{qs}"
    return _request("PUT", url, {"data": data})


def find_all_pages(
    content_type: str,
    *,
    locale: str = "en",
    status: str = "published",
    page_size: int = 100,
    sort: str = "",
    filters: dict[str, Any] | None = None,
    populate: str = "",
    fields: list[str] | None = None,
) -> list[dict]:
    """Recupera TUTTE le pagine di una collezione iterando automaticamente."""
    all_data: list[dict] = []
    page = 1
    while True:
        resp = find(
            content_type,
            locale=locale,
            status=status,
            page=page,
            page_size=page_size,
            sort=sort,
            filters=filters,
            populate=populate,
            fields=fields,
        )
        all_data.extend(resp.get("data", []))
        meta = resp.get("meta", {}).get("pagination", {})
        if page >= meta.get("pageCount", 1):
            break
        page += 1
    return all_data


def _flatten_filters(
    filters: dict[str, Any], prefix: str, out: dict[str, str]
) -> None:
    """Serializza filtri Strapi v5 in query params flat."""
    for key, value in filters.items():
        param_key = f"{prefix}[{key}]"
        if isinstance(value, dict):
            _flatten_filters(value, param_key, out)
        else:
            out[param_key] = str(value)
