"""Client REST per Umami Analytics — usato dagli agenti per leggere metriche traffico."""

import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Configurazione via env vars (stesse usate da telegram_bot.py)
UMAMI_URL = os.environ.get("UMAMI_URL", "https://analytics.bbq-experience.com")
UMAMI_USERNAME = os.environ.get("UMAMI_USERNAME", "admin")
UMAMI_PASSWORD = os.environ.get("UMAMI_PASSWORD", "")
UMAMI_SITE_ID = os.environ.get(
    "UMAMI_SITE_ID", "78df95b7-1b94-43e7-9f0d-38c63e99cf64"
)

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]  # secondi tra i tentativi
TOKEN_TTL = 58 * 60  # 58 minuti — margine su scadenza 60 min di Umami

# Cache token in memoria (mai persistito su disco — T-15-04)
_cached_token: str = ""
_token_ts: float = 0.0


def _get_token() -> str:
    """Ottiene token JWT da Umami, riusando cache se ancora valido."""
    global _cached_token, _token_ts

    if _cached_token and (time.time() - _token_ts) < TOKEN_TTL:
        return _cached_token

    payload = json.dumps({
        "username": UMAMI_USERNAME,
        "password": UMAMI_PASSWORD,
    }).encode("utf-8")

    req = Request(
        f"{UMAMI_URL}/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    _cached_token = data["token"]
    _token_ts = time.time()
    return _cached_token


def _request(url: str) -> dict | list:
    """GET con Bearer token, retry 3x su 5xx/network, raise immediato su 4xx."""
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        token = _get_token()
        req = Request(url, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        })
        try:
            with urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            # Non ritentare su errori client (4xx)
            if 400 <= e.code < 500:
                raise RuntimeError(
                    f"Umami GET {url} -> {e.code}: {error_body}"
                ) from e
            last_error = RuntimeError(
                f"Umami GET {url} -> {e.code}: {error_body}"
            )
        except (URLError, TimeoutError, OSError) as e:
            last_error = RuntimeError(f"Umami GET {url} -> errore rete: {e}")

        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF[attempt]
            print(f"[RETRY] Umami GET tentativo {attempt + 2}/{MAX_RETRIES} tra {wait}s...")
            time.sleep(wait)

    raise last_error  # type: ignore[misc]


def get_metrics_by_path(
    start_ms: int, end_ms: int, *, limit: int = 500
) -> list[dict]:
    """Recupera metriche per URL path da Umami (timestamp in millisecondi)."""
    url = (
        f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/metrics"
        f"?startAt={start_ms}&endAt={end_ms}&type=path&limit={limit}"
    )
    result = _request(url)
    return result if isinstance(result, list) else []
