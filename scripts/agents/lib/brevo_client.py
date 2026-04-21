"""Client REST per Brevo API — recupero risultati campagne A/B email."""

import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_BASE_URL = "https://api.brevo.com/v3"

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]  # secondi tra i tentativi


def _headers() -> dict[str, str]:
    return {
        "api-key": BREVO_API_KEY,
        "Accept": "application/json",
    }


def _request(url: str) -> dict | list | None:
    """GET con api-key, retry 3x su 5xx/network, None su 404."""
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        req = Request(url, headers=_headers())
        try:
            with urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            # 404 = campagna non trovata, ritorna None
            if e.code == 404:
                return None
            error_body = e.read().decode("utf-8") if e.fp else ""
            # Non ritentare su errori client (4xx tranne 404 gia gestito)
            if 400 <= e.code < 500:
                raise RuntimeError(
                    f"Brevo GET {url} -> {e.code}: {error_body}"
                ) from e
            last_error = RuntimeError(
                f"Brevo GET {url} -> {e.code}: {error_body}"
            )
        except (URLError, TimeoutError, OSError) as e:
            last_error = RuntimeError(f"Brevo GET {url} -> errore rete: {e}")

        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF[attempt]
            print(f"[RETRY] Brevo GET tentativo {attempt + 2}/{MAX_RETRIES} tra {wait}s...")
            time.sleep(wait)

    raise last_error  # type: ignore[misc]


def get_ab_campaign_results(campaign_id: int) -> dict | None:
    """Recupera risultati campagna A/B da Brevo.

    Ritorna il dict della campagna se abTesting=true, None altrimenti (o 404).
    """
    url = f"{BREVO_BASE_URL}/emailCampaigns/{campaign_id}"
    result = _request(url)
    if result is None or not isinstance(result, dict):
        return None
    if not result.get("abTesting"):
        return None
    return result


def list_recent_ab_campaigns(limit: int = 10) -> list[dict]:
    """Lista campagne A/B recenti (inviate, ordine discendente).

    Filtra solo campagne con abTesting=true.
    """
    url = (
        f"{BREVO_BASE_URL}/emailCampaigns"
        f"?type=classic&status=sent&limit={limit}&sort=desc"
    )
    result = _request(url)
    if result is None or not isinstance(result, dict):
        return []

    campaigns = result.get("campaigns", [])
    return [c for c in campaigns if c.get("abTesting")]
