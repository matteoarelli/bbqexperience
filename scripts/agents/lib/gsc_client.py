"""Client GSC + Indexing API per gli agenti BBQ.

Wrapper sopra google-api-python-client. Convenzioni del progetto:
- retry 3x con backoff [1,2,4]s (eccetto 4xx; ma 429 SI ritenta)
- timeout 10s per request (SDK gestisce internamente; passiamo num_retries=0
  al SDK e gestiamo noi il retry esplicitamente per coerenza con strapi_client)
- error strutturati identici a strapi_client.py
- SA JSON in env GSC_SERVICE_ACCOUNT_KEY (shared con IG bot su .119:
  ~/secrets/gsc-merchant-sync.json)
- Site URL in env GSC_SITE_URL (default https://bbq-experience.com/)
- dataState='final' di default (2-3gg di lag GSC, accettato per stabilità)

Funzioni esposte:
- search_analytics(...) — wrapper diretto su searchanalytics.query
- top_queries(days=28, row_limit=1000) — dimensions=["query"]
- top_pages(days=28, row_limit=1000) — dimensions=["page"]
- queries_for_page(url, days=28, top_n=5) — filtered by page=url, sort clicks desc
- request_indexing(url) — Indexing API best-effort (403/404 -> success:False, no raise)
- inspect_url(url) — URL Inspection API (status indicizzazione + mobile + rich)

IT/ES handling: questa lib ritorna righe raw GSC. Il caller filtra per locale
via path prefix (/en/, /it/, /es/). Per query GSC-side per locale, usare
dimensionFilterGroups con dimension=page operator=contains expression=/it/.
"""

import os
import time
from datetime import date, timedelta

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ─── Config / env ──────────────────────────────────────────────────────────

SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/indexing",
]
KEY_PATH = os.environ.get(
    "GSC_SERVICE_ACCOUNT_KEY",
    "/opt/services/bbqexperience/app/secrets/gsc-merchant-sync.json",
)
SITE_URL = os.environ.get("GSC_SITE_URL", "https://bbq-experience.com/")

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]  # secondi tra i tentativi (mirror strapi_client.py)
REQUEST_TIMEOUT = 10  # secondi (SDK socket-level)

# Module-level cache; SDK gestisce refresh token internamente
_search_console = None
_indexing = None


# ─── Auth + service builders ───────────────────────────────────────────────


def _credentials():
    """Carica SA credentials da KEY_PATH con gli scope GSC + Indexing."""
    if not os.path.exists(KEY_PATH):
        raise RuntimeError(
            f"GSC SA key non trovata: {KEY_PATH}. "
            "Imposta env GSC_SERVICE_ACCOUNT_KEY o crea il file."
        )
    return service_account.Credentials.from_service_account_file(
        KEY_PATH, scopes=SCOPES
    )


def _sc_service():
    """Singleton Search Console service ('searchconsole', v1)."""
    global _search_console
    if _search_console is None:
        _search_console = build(
            "searchconsole", "v1",
            credentials=_credentials(),
            cache_discovery=False,
        )
    return _search_console


def _idx_service():
    """Singleton Indexing API service ('indexing', v3)."""
    global _indexing
    if _indexing is None:
        _indexing = build(
            "indexing", "v3",
            credentials=_credentials(),
            cache_discovery=False,
        )
    return _indexing


# ─── Retry wrapper ─────────────────────────────────────────────────────────


def _retry(fn, *args, **kwargs):
    """Esegue fn(*args, **kwargs) con retry [1,2,4]s su 5xx + 429 + network errors.

    4xx (eccetto 429) -> RuntimeError immediato (mirror strapi_client._request).
    Dopo MAX_RETRIES falliti -> RuntimeError con dettaglio ultimo errore.
    """
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except HttpError as e:
            status = getattr(e.resp, "status", 0)
            try:
                status = int(status)
            except (TypeError, ValueError):
                status = 0
            # 4xx -> no retry (tranne 429 rate limit)
            if 400 <= status < 500 and status != 429:
                raise RuntimeError(
                    f"GSC API {fn.__name__ if hasattr(fn,'__name__') else 'call'} "
                    f"-> {status}: {e}"
                ) from e
            last_error = RuntimeError(f"GSC API -> {status}: {e}")
        except (TimeoutError, OSError) as e:
            last_error = RuntimeError(f"GSC API network error: {e}")

        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF[attempt]
            print(f"[RETRY] GSC tentativo {attempt + 2}/{MAX_RETRIES} tra {wait}s...")
            time.sleep(wait)

    assert last_error is not None  # branch logico: arrivati qui solo se ci sono errori
    raise last_error


# ─── Search Analytics API ──────────────────────────────────────────────────


def search_analytics(
    *,
    start_date: str,
    end_date: str,
    dimensions: list[str],
    dimension_filter_groups: list[dict] | None = None,
    aggregation_type: str = "auto",
    row_limit: int = 25000,
    start_row: int = 0,
    data_state: str = "final",
    search_type: str = "web",
) -> list[dict]:
    """Wrapper su searchanalytics.query. Ritorna lista righe raw (con 'keys')."""
    body: dict = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "aggregationType": aggregation_type,
        "rowLimit": row_limit,
        "startRow": start_row,
        "dataState": data_state,
        "type": search_type,
    }
    if dimension_filter_groups:
        body["dimensionFilterGroups"] = dimension_filter_groups

    svc = _sc_service()

    def _call():
        # num_retries=0: gestiamo noi il retry per coerenza stack
        return svc.searchanalytics().query(siteUrl=SITE_URL, body=body).execute(
            num_retries=0
        )

    resp = _retry(_call)
    return resp.get("rows", [])


def _date_range(days: int, offset_days: int = 3) -> tuple[str, str]:
    """Calcola (start, end) ISO. end = today - offset (default 3gg per dataState=final)."""
    end = date.today() - timedelta(days=offset_days)
    start = end - timedelta(days=days)
    return start.isoformat(), end.isoformat()


def top_queries(*, days: int = 28, row_limit: int = 1000) -> list[dict]:
    """Top query GSC su site_url. Default 28gg lag-3gg."""
    start, end = _date_range(days)
    return search_analytics(
        start_date=start, end_date=end,
        dimensions=["query"], row_limit=row_limit,
    )


def top_pages(*, days: int = 28, row_limit: int = 1000) -> list[dict]:
    """Top page GSC su site_url. Default 28gg lag-3gg."""
    start, end = _date_range(days)
    return search_analytics(
        start_date=start, end_date=end,
        dimensions=["page"], row_limit=row_limit,
    )


def queries_for_page(url: str, *, days: int = 28, top_n: int = 5) -> list[dict]:
    """Top N query per una pagina specifica.

    Costruisce dimensionFilterGroups con page=url e ordina per clicks desc.
    """
    start, end = _date_range(days)
    filter_groups = [{
        "filters": [{
            "dimension": "page",
            "operator": "equals",
            "expression": url,
        }],
    }]
    rows = search_analytics(
        start_date=start, end_date=end,
        dimensions=["query"],
        dimension_filter_groups=filter_groups,
        # Chiediamo qualche row in più del top_n per safety, poi sort+cap
        row_limit=max(top_n * 5, 25),
    )
    # Sort by clicks desc, then impressions desc come tiebreak
    rows_sorted = sorted(
        rows,
        key=lambda r: (r.get("clicks", 0), r.get("impressions", 0)),
        reverse=True,
    )
    return rows_sorted[:top_n]


# ─── Indexing API ──────────────────────────────────────────────────────────


def request_indexing(url: str, type_: str = "URL_UPDATED") -> dict:
    """Notifica Google Indexing API.

    type_: 'URL_UPDATED' (default) o 'URL_DELETED'.
    Quota: ~200 req/day per progetto Google Cloud.

    Comportamento BEST-EFFORT (mai blocca il publish):
    - 200 -> {"success": True, "response": {...}}
    - 403/404 -> {"success": False, "reason": "..."} senza raise
    - 429/5xx dopo retry -> {"success": False, "reason": "..."}
    - errori inattesi -> {"success": False, "reason": str(e)}

    Nota Google: ufficialmente supporta solo JobPosting e BroadcastEvent.
    Per blog/recipe in pratica spesso "funziona" ma può ritornare 403 scope-error.
    """
    body = {"url": url, "type": type_}
    svc = _idx_service()

    def _call():
        return svc.urlNotifications().publish(body=body).execute(num_retries=0)

    try:
        resp = _retry(_call)
        return {"success": True, "response": resp}
    except RuntimeError as e:
        # Estrai status code dal messaggio per UX migliore (sono dict-like)
        msg = str(e)
        reason = msg
        if "403" in msg:
            reason = f"scope-or-permission (403): {msg}"
        elif "404" in msg:
            reason = f"not-found (404): {msg}"
        print(f"[gsc] request_indexing soft-fail per {url}: {reason}")
        return {"success": False, "reason": reason}
    except Exception as e:  # safety net
        print(f"[gsc] request_indexing unexpected error per {url}: {e}")
        return {"success": False, "reason": str(e)}


# ─── URL Inspection API ────────────────────────────────────────────────────


def inspect_url(url: str) -> dict:
    """URL Inspection API: stato indicizzazione + mobile + rich + AMP.

    Returns inspectionResult dict (verdict, coverageState, lastCrawlTime, ...).
    Su errore raise RuntimeError (questa NON è best-effort, usata da audit).
    """
    body = {"inspectionUrl": url, "siteUrl": SITE_URL}
    svc = _sc_service()

    def _call():
        return svc.urlInspection().index().inspect(body=body).execute(num_retries=0)

    resp = _retry(_call)
    return resp.get("inspectionResult", {})


# ─── CLI smoke test ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    import sys

    cmd = sys.argv[1] if len(sys.argv) > 1 else "pages"
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 28

    if cmd == "pages":
        rows = top_pages(days=days, row_limit=20)
        print(json.dumps(rows[:10], indent=2, ensure_ascii=False))
    elif cmd == "queries":
        rows = top_queries(days=days, row_limit=20)
        print(json.dumps(rows[:10], indent=2, ensure_ascii=False))
    elif cmd == "inspect":
        url = sys.argv[3] if len(sys.argv) > 3 else f"{SITE_URL}en/blog/best-pellet-grill-2026"
        print(json.dumps(inspect_url(url), indent=2))
    elif cmd == "index":
        url = sys.argv[3] if len(sys.argv) > 3 else f"{SITE_URL}en/blog/best-pellet-grill-2026"
        print(json.dumps(request_indexing(url), indent=2))
    else:
        print(f"Uso: python -m agents.lib.gsc_client {{pages|queries|inspect|index}} [days|url]")
        sys.exit(1)
