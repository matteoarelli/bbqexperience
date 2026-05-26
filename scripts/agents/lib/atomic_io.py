"""Helper I/O atomico per file di stato JSONL.

Pattern: read existing, append new line, write to tmp file, os.replace (atomico
cross-platform Windows + Linux).

Per volumi <10k righe è accettabile; oltre, considerare lock fcntl o append-only.
Importato da: meta_optimizer.py (state/meta_changes.jsonl), gsc_refresh.py,
keyword_scout.py.

Convenzioni:
- record è un dict serializzabile JSON (json.dumps lo accetta)
- path è Path o str (convertito a Path)
- newline finale sempre presente (jsonl standard)
- encoding utf-8 (per emoji/accenti IT/ES)
"""

import json
import os
import tempfile
from pathlib import Path


def append_jsonl_atomic(path: Path | str, record: dict) -> None:
    """Append atomico di una riga JSON a un file JSONL.

    Atomico via: read all -> append new line -> write to tmp file in stessa dir
    -> os.replace (rename atomico). Evita corruzione da cron concorrenti.
    """
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    # Read existing content (vuoto se file non esiste)
    existing = ""
    if target.exists():
        existing = target.read_text(encoding="utf-8")
        # Assicura newline finale prima dell'append
        if existing and not existing.endswith("\n"):
            existing += "\n"

    new_line = json.dumps(record, ensure_ascii=False) + "\n"
    new_content = existing + new_line

    # Tmp file nella stessa dir (per os.replace cross-device atomico)
    fd, tmp_path = tempfile.mkstemp(
        prefix=target.name + ".",
        suffix=".tmp",
        dir=str(target.parent),
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(new_content)
        os.replace(tmp_path, target)
    except Exception:
        # Cleanup tmp se replace fallisce
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass
        raise


def atomic_write_text(path: Path | str, content: str, encoding: str = "utf-8") -> None:
    """Scrittura atomica di un file di testo (es. INDEXNOW key)."""
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix=target.name + ".",
        suffix=".tmp",
        dir=str(target.parent),
    )
    try:
        with os.fdopen(fd, "w", encoding=encoding) as f:
            f.write(content)
        os.replace(tmp_path, target)
    except Exception:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass
        raise


def atomic_write_json(path: Path | str, data: dict | list) -> None:
    """Scrittura atomica di un file JSON (state, config)."""
    atomic_write_text(path, json.dumps(data, ensure_ascii=False, indent=2))
