"""IndexNow ping — notifica indicizzazione a Bing/Yandex/Seznam.

Google NON supporta IndexNow (usare gsc_client.request_indexing per Google).
Bing aderisce dal 2021, Yandex dal 2021, Seznam dal 2022, Naver dal 2023.

Setup one-time:
1. Generare INDEXNOW_KEY random 32-char hex (Python: `secrets.token_hex(16)`)
2. Pubblicare la chiave a https://<host>/<key>.txt come file statico
   (in BBQ: web/public/<key>.txt — Astro serve i file statici da public/)
3. Verificare INDEXNOW_KEY_URL risponda 200 con la chiave nel body
4. Set env: INDEXNOW_KEY, INDEXNOW_HOST=bbq-experience.com

Endpoint: POST https://api.indexnow.org/indexnow
Body: {"host":"<host>","key":"<key>","keyLocation":"<url>","urlList":[...]}
Success: 200 (accepted) o 202 (accepted pending verify)
Failure: 400 (bad request), 403 (key non valida o non trovata), 422 (urls invalidi)
"""

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen

INDEXNOW_KEY = os.environ.get("INDEXNOW_KEY", "")
INDEXNOW_HOST = os.environ.get("INDEXNOW_HOST", "bbq-experience.com")
INDEXNOW_KEY_URL = os.environ.get(
    "INDEXNOW_KEY_URL",
    f"https://{INDEXNOW_HOST}/{INDEXNOW_KEY}.txt" if INDEXNOW_KEY else "",
)
ENDPOINT = "https://api.indexnow.org/indexnow"
REQUEST_TIMEOUT = 10  # secondi


def ping(urls: list[str]) -> dict:
    """Notifica IndexNow di una lista di URL aggiornati/nuovi.

    Returns:
        {"success": True, "code": 200|202} su successo
        {"success": False, "reason": "INDEXNOW_KEY non impostata"} se env vuoto
        {"success": False, "code": <int>} su HTTPError non success
        {"success": False, "reason": "<network error>"} su network failure

    NON solleva eccezioni — best-effort, mai blocca il publish.
    Max 10.000 URL per batch (limite IndexNow), in pratica chiamato con 1-3 url.
    """
    if not INDEXNOW_KEY:
        return {"success": False, "reason": "INDEXNOW_KEY non impostata"}

    if not urls:
        return {"success": False, "reason": "urls vuoto"}

    payload = {
        "host": INDEXNOW_HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": INDEXNOW_KEY_URL,
        "urlList": urls,
    }
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "BBQ-Experience-IndexNow/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return {
                "success": resp.status in (200, 202),
                "code": resp.status,
            }
    except HTTPError as e:
        return {"success": False, "code": e.code}
    except (TimeoutError, OSError) as e:
        return {"success": False, "reason": f"network error: {e}"}


if __name__ == "__main__":
    import sys

    urls = sys.argv[1:] if len(sys.argv) > 1 else [
        f"https://{INDEXNOW_HOST}/en/blog/best-pellet-grill-2026",
    ]
    print(json.dumps(ping(urls), indent=2))
