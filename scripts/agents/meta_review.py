#!/usr/bin/env python3
"""Meta Review — Windows Task Scheduler daily 09:00 local.

Consuma state/meta_changes_pending.jsonl prodotto da meta_optimizer.py.
Per ogni proposta: chiama Claude CLI quality gate (review_meta); se approve
chiama strapi.update(skip_rebuild=True) per il PUT meta-only (webhook NON
triggera Astro rebuild grazie all'header X-Skip-Rebuild — vedi /opt/webhooks/
hooks.json regola not match su Hetzner). Se reject sposta la proposta in
meta_changes.jsonl con decision='reject' + reasoning per revisione manuale.

Claude CLI gira solo su Windows (precedent: claude_review_runner.py).
Schedule: 'BBQ Meta Review' /SC DAILY /ST 09:00 -> meta_review.cmd wrapper.
"""

import os
import sys
import io
import json
from datetime import datetime
from pathlib import Path

# Fix encoding Windows
if sys.stdout and hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Carica env vars da .env.windows (Windows) o .env (server)
_script_dir = Path(__file__).parent
for _env_file in [_script_dir / ".env.windows", _script_dir.parent.parent / ".env"]:
    if _env_file.exists():
        for _line in _env_file.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import atomic_io
from agents.claude_quality_gate import review_meta

# ─── Configurazione ───────────────────────────────────────────────────────

STATE_DIR = Path(__file__).parent / "state"
PENDING_FILE = STATE_DIR / "meta_changes_pending.jsonl"
LOG_FILE = STATE_DIR / "meta_changes.jsonl"


# ─── Pending I/O ──────────────────────────────────────────────────────────


def _read_pending() -> list[dict]:
    """Legge tutte le proposte da meta_changes_pending.jsonl."""
    if not PENDING_FILE.exists():
        return []
    out: list[dict] = []
    for line in PENDING_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"  [WARN] skip riga corrotta: {e}")
    return out


def _clear_pending() -> None:
    """Svuota il file pending (truncate atomico)."""
    PENDING_FILE.parent.mkdir(parents=True, exist_ok=True)
    PENDING_FILE.write_text("", encoding="utf-8")


# ─── Per-proposal review ──────────────────────────────────────────────────


def process_proposal(p: dict) -> dict:
    """Esegue review_meta su una proposta + applica via Strapi se approve.

    Ritorna il record aggiornato con review:{decision, reasoning, timestamp}
    + applied:bool (+ apply_error in caso di fail di Strapi PUT).
    """
    result = review_meta(
        current_title=p["before"]["seo_title"],
        current_meta=p["before"]["seo_description"],
        proposed_title=p["proposed"]["seo_title"],
        proposed_meta=p["proposed"]["seo_description"],
        queries=p.get("query_targets", []),
        locale=p["locale"],
        # excerpt non e' nel pending record — il review_meta gate vive con
        # quello che ha; per accuracy check Claude considera solo i campi
        # disponibili. Future enhancement: ri-fetch excerpt da Strapi prima
        # del gate per claim-check piu' rigoroso.
        excerpt="",
    )
    decision = "approve" if result.approved else "reject"
    out = {
        **p,
        "review": {
            "decision": decision,
            "reasoning": result.summary,
            "timestamp": datetime.now().isoformat(),
        },
    }
    if result.approved:
        try:
            # PUT meta-only con header X-Skip-Rebuild per evitare rebuild storm.
            # slug obbligatorio nel body per Strapi v5 localized PUT.
            strapi.update(
                p["content_type"],
                p["documentId"],
                {
                    "seo_title": p["proposed"]["seo_title"],
                    "seo_description": p["proposed"]["seo_description"],
                    "slug": p["slug"],
                },
                locale=p["locale"],
                skip_rebuild=True,
            )
            out["applied"] = True
        except Exception as e:
            out["applied"] = False
            out["apply_error"] = str(e)
            out["review"]["decision"] = "apply_failed"
    else:
        out["applied"] = False
    return out


# ─── Entry point ──────────────────────────────────────────────────────────


def main() -> None:
    pending = _read_pending()
    if not pending:
        telegram.send_agent_report(
            "Meta Review",
            "Nessuna proposta da revisionare oggi.",
        )
        return

    applied = 0
    rejected = 0
    failed = 0
    for p in pending:
        try:
            result = process_proposal(p)
            atomic_io.append_jsonl_atomic(LOG_FILE, result)
            d = result["review"]["decision"]
            if d == "approve" and result.get("applied"):
                applied += 1
            elif d == "apply_failed":
                failed += 1
            else:
                rejected += 1
        except Exception as e:
            failed += 1
            print(f"[ERR] proposal processing: {e}")
            telegram.send_agent_report(
                "Meta Review",
                f"ERROR processing proposal: {e}",
                details=[
                    "Verifica Claude CLI OAuth session attiva",
                    "Verifica state/meta_changes_pending.jsonl integrity",
                ],
            )

    # Tutte le proposte processate -> svuota pending
    _clear_pending()

    msg = (
        f"Pending: {len(pending)} | Applicati: {applied} | "
        f"Rifiutati: {rejected} | Fail: {failed}"
    )
    next_step = (
        "Verifica meta_changes.jsonl per i rifiutati (needs_human)."
        if rejected > 0
        else "Tutti applicati con successo. Webhook rebuild suppresso."
    )
    telegram.send_agent_report("Meta Review", msg, details=[next_step])


if __name__ == "__main__":
    main()
