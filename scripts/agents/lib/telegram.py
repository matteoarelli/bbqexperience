"""Invio notifiche Telegram — usato da tutti gli agenti per logging."""

import os
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def _post(message: str, parse_mode: str | None) -> tuple[bool, str]:
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": message[:4096]}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=10) as resp:
            return resp.status == 200, ""
    except HTTPError as e:
        try:
            detail = e.read().decode("utf-8")[:200]
        except Exception:
            detail = ""
        return False, f"HTTP {e.code} {detail}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def send(message: str, *, parse_mode: str = "HTML") -> bool:
    """Invia messaggio Telegram. Ritorna True se inviato, False altrimenti.

    Con parse_mode=HTML, Telegram rifiuta con 400 qualunque testo che contenga
    un '<' non appartenente a un tag valido, e l'agente crede di aver avvisato
    quando invece non e' partito niente. Al 400 si ritenta una volta in testo
    semplice. (3 ago 2026, stesso fix applicato a scattopro-agents dopo che le
    notifiche del cover_generator morivano su "titolo <- autore".)
    """
    if not BOT_TOKEN or not CHAT_ID:
        print(f"[TELEGRAM] Token mancante, log su console:\n{message}")
        return False

    ok, err = _post(message, parse_mode)
    if ok:
        return True

    if parse_mode and err.startswith("HTTP 400"):
        print(f"[TELEGRAM] 400 con parse_mode={parse_mode} ({err}), ritento in testo semplice")
        ok, err = _post(message, None)
        if ok:
            return True

    print(f"[TELEGRAM] Errore invio: {err}")
    return False


def send_agent_report(agent_name: str, summary: str, details: list[str] | None = None) -> bool:
    """Invia report formattato per un agente specifico."""
    lines = [f"<b>🤖 {agent_name}</b>", "", summary]
    if details:
        lines.append("")
        for d in details:
            lines.append(f"• {d}")
    return send("\n".join(lines))
