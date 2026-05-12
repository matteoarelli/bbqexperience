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
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    }


def _request(method: str, url: str, data: dict | None = None) -> dict:
    """Esegue richiesta HTTP verso Strapi con retry e backoff esponenziale."""
    body = json.dumps(data).encode("utf-8") if data else None
    last_error: Exception | None = None

    # No retry on POST/PUT/PATCH to avoid duplicate creates on timeout (no idempotency key)
    retries = MAX_RETRIES if method == "GET" else 1
    for attempt in range(retries):
        req = Request(url, data=body, headers=_headers(), method=method)
        try:
            # Larger timeout for write operations (body can be 10KB+)
            req_timeout = 60 if method != "GET" else 30
            with urlopen(req, timeout=req_timeout) as resp:
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

        if attempt < retries - 1:
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


def find_one(content_type: str, document_id: str, *, populate: str = "*", status: str = "") -> dict:
    """GET /api/{content_type}/{documentId}.

    status="draft" target la versione draft (sempre esistente in Strapi v5,
    anche per documenti già pubblicati). status="published" target la published
    (404 se draft-only). Default vuoto = Strapi default (published).
    """
    params: dict[str, str] = {"populate": populate}
    if status:
        params["status"] = status
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}?{urlencode(params)}"
    return _request("GET", url)


def create(content_type: str, data: dict, *, status: str = "published") -> dict:
    """POST /api/{content_type} — crea nuova entry.

    status="draft" crea l'entry senza pubblicarla (publishedAt resta null).
    Usato dal drafter AI per separare creazione da publish: il quality gate
    promuove la draft a published solo se la review è approvata.
    """
    params = {"status": status} if status == "draft" else {}
    qs = f"?{urlencode(params)}" if params else ""
    url = f"{STRAPI_URL}/api/{content_type}{qs}"
    return _request("POST", url, {"data": data})


def update(content_type: str, document_id: str, data: dict, *, locale: str = "", status: str = "") -> dict:
    """PUT /api/{content_type}/{documentId} — aggiorna entry esistente.

    status="draft" target la versione draft, "published" target la published.
    Default (vuoto) usa il default Strapi (draft se esiste, altrimenti published).
    """
    params = {}
    if locale:
        params["locale"] = locale
    if status:
        params["status"] = status
    qs = f"?{urlencode(params)}" if params else ""
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}{qs}"
    return _request("PUT", url, {"data": data})


def publish(content_type: str, document_id: str) -> dict:
    """Promuove una draft a published in Strapi v5.

    Strapi v5 separa documento e versione: una draft con publishedAt=null
    non è visibile sul sito; per pubblicarla bisogna creare la versione
    'published'. Via REST si usa PUT con ?status=published (lo stesso path
    funziona come no-op se è già published).
    """
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}?status=published"
    return _request("PUT", url, {"data": {}})


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


def upload_file(file_bytes: bytes, filename: str, mime: str = "image/png") -> list[dict]:
    """POST /api/upload — multipart upload media. Ritorna lista di media records (con id e url)."""
    boundary = f"----StrapiClient{int(time.time() * 1000)}"
    crlf = "\r\n"
    head = (
        f"--{boundary}{crlf}"
        f'Content-Disposition: form-data; name="files"; filename="{filename}"{crlf}'
        f"Content-Type: {mime}{crlf}{crlf}"
    ).encode("utf-8")
    tail = f"{crlf}--{boundary}--{crlf}".encode("utf-8")
    body = head + file_bytes + tail
    headers = {
        "Authorization": f"Bearer {STRAPI_API_TOKEN}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Content-Length": str(len(body)),
    }
    url = f"{STRAPI_URL}/api/upload"
    req = Request(url, data=body, headers=headers, method="POST")
    try:
        with urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        raise RuntimeError(f"Strapi upload {filename} -> {e.code}: {error_body}") from e
