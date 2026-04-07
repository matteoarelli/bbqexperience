"""Invio notifiche Telegram — usato da tutti gli agenti per logging."""

import os
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def send(message: str, *, parse_mode: str = "HTML") -> bool:
    """Invia messaggio Telegram. Ritorna True se inviato, False se token mancante."""
    if not BOT_TOKEN or not CHAT_ID:
        print(f"[TELEGRAM] Token mancante, log su console:\n{message}")
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": message[:4096],
        "parse_mode": parse_mode,
    }
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except HTTPError as e:
        print(f"[TELEGRAM] Errore invio: {e.code}")
        return False


def send_agent_report(agent_name: str, summary: str, details: list[str] | None = None) -> bool:
    """Invia report formattato per un agente specifico."""
    lines = [f"<b>🤖 {agent_name}</b>", "", summary]
    if details:
        lines.append("")
        for d in details:
            lines.append(f"• {d}")
    return send("\n".join(lines))
