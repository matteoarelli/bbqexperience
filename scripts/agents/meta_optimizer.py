#!/usr/bin/env python3
"""Meta Optimizer — cron 03:30 UTC (su .119, NON Hetzner — vedi 17-01 SUMMARY).

Pesca articoli LIVE con impressions>=100/28gg e CTR sotto il benchmark per
posizione * REWRITE_FACTOR. Drafta nuovo seo_title/seo_description via Qwen
con priming sulle top query GSC reali della pagina. Appende il proposal a
state/meta_changes_pending.jsonl per il review Claude su Windows.

NON applica direttamente: il review + Strapi PUT con X-Skip-Rebuild lo fa
meta_review.py su Windows (Claude CLI non gira su Linux).

Cron: 30 3 * * * (year-round, prima della finestra SDXL su Windows .124).
SDXL window Europe/Rome 06:00-06:55 local -> 04:00-04:55 UTC (CEST) o
05:00-05:55 UTC (CET). Hour-check guard UTC-explicit per coprire entrambe
le finestre (B5 fix).
"""

import os
import sys
import io
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Fix encoding Windows (mirror content_generator.py lines 21-29)
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
from agents.lib import gsc_client
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import claude_client as claude
from agents.lib import atomic_io
# B1 fix: import dal modulo condiviso, niente duplicate inline, niente try/except
from agents.lib.ctr_benchmark import CTR_BENCHMARK, REWRITE_FACTOR, benchmark_for_position

# ─── Configurazione ───────────────────────────────────────────────────────

MIN_IMPRESSIONS_28D = 100
RECENT_CHANGE_DAYS = 14  # skip se gia toccato negli ultimi N giorni
MAX_PROPOSALS_PER_RUN = 20  # cap safety quota Qwen

STATE_DIR = Path(__file__).parent / "state"
PENDING_FILE = STATE_DIR / "meta_changes_pending.jsonl"
LOG_FILE = STATE_DIR / "meta_changes.jsonl"  # solo lettura qui — meta_review scrive
PROMPT_TEMPLATE_PATH = Path(__file__).parent / "prompts" / "qwen_meta_draft.md"
POWER_WORDS_IT_PATH = STATE_DIR / "power_words_it.txt"
POWER_WORDS_ES_PATH = STATE_DIR / "power_words_es.txt"

LOCALES = ["en", "it", "es"]
LOCALE_FULL = {"en": "English", "it": "Italian", "es": "Spanish"}
# Power words EN embedded nel codice (no file separato per EN, sono stabili)
POWER_WORDS_EN = [
    "Ultimate", "Complete", "Best", "Top 10", "How to",
    "Tested", "Reviewed", "Step-by-Step", "Pitmaster's", "2026 Guide",
]

# Mappa URL path prefix -> Strapi content type
# Allineato a web/src/lib/i18n.ts LOCALIZED_ROUTES.
PATH_TO_CONTENT_TYPE: dict[str, str] = {
    "blog": "blog-posts",
    "tutorials": "tutorials",
    "guide": "tutorials",       # IT
    "tutoriales": "tutorials",  # ES
    "recipes": "recipes",
    "ricette": "recipes",       # IT
    "recetas": "recipes",       # ES
    "reviews": "reviews",
    "recensioni": "reviews",    # IT
    "resenas": "reviews",       # ES
}


# ─── SDXL guard (B5 fix: UTC explicit) ────────────────────────────────────


def _sdxl_guard() -> None:
    """Skip se siamo dentro la finestra SDXL su Windows .124 (UTC explicit).

    SDXL gira 06:00-06:55 LOCAL su Windows .124, che e' Europe/Rome.
    CEST (estate, UTC+2) -> 04:00-04:55 UTC.
    CET (inverno, UTC+1) -> 05:00-05:55 UTC.
    Guardiamo entrambe le finestre per essere conservativi year-round.

    NB: il cron e' schedulato 03:30 UTC, fuori dalla finestra. Questa guard
    e' belt-and-suspenders defense-in-depth contro mistime / DST shift.
    """
    h_utc = datetime.now(timezone.utc).hour
    if h_utc in (4, 5):
        print(f"[meta_optimizer] skip: ora UTC {h_utc} dentro finestra SDXL "
              "(Europe/Rome 06:00-06:55 local)")
        sys.exit(0)


# ─── URL parsing helpers ──────────────────────────────────────────────────


def _locale_from_url(url: str) -> str:
    """Estrae locale dal path URL. Default 'en' se assente."""
    for loc in LOCALES:
        if f"/{loc}/" in url:
            return loc
    return "en"


def _content_type_and_slug_from_url(url: str) -> tuple[str | None, str | None]:
    """Estrae (content_type_strapi, slug) da URL canonico.

    URL pattern: https://bbq-experience.com/<locale>/<route>/<slug>
    Es: /en/blog/best-grill -> ("blog-posts", "best-grill")
    Ritorna (None, None) se URL non riconosciuto.
    """
    # rimuovi protocol + host
    if "://" in url:
        path = url.split("://", 1)[1].split("/", 1)
        path = "/" + path[1] if len(path) > 1 else "/"
    else:
        path = url
    parts = [p for p in path.split("/") if p]
    # Atteso: [locale, route, slug, ...]
    if len(parts) < 3:
        return None, None
    locale_seg, route_seg, slug_seg = parts[0], parts[1], parts[2]
    if locale_seg not in LOCALES:
        return None, None
    ct = PATH_TO_CONTENT_TYPE.get(route_seg)
    if not ct:
        return None, None
    return ct, slug_seg


# ─── Recent overlap (avoid re-thrashing) ──────────────────────────────────


def _recent_changes_urls() -> set[str]:
    """Legge meta_changes.jsonl + meta_changes_pending.jsonl, ritorna URL
    toccati negli ultimi RECENT_CHANGE_DAYS giorni.
    """
    cutoff = datetime.now() - timedelta(days=RECENT_CHANGE_DAYS)
    urls: set[str] = set()
    for p in (LOG_FILE, PENDING_FILE):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                ts_raw = r.get("timestamp", "")
                if not ts_raw:
                    continue
                ts = datetime.fromisoformat(ts_raw)
                # ts puo' avere tz-aware o naive; se aware, confronta dopo cast
                if ts.tzinfo is not None:
                    ts = ts.replace(tzinfo=None)
                if ts >= cutoff:
                    url = r.get("url")
                    if url:
                        urls.add(url)
            except (ValueError, json.JSONDecodeError):
                # riga corrotta, salta
                continue
    return urls


# ─── Selezione candidati ──────────────────────────────────────────────────


def needs_meta_rewrite(row: dict) -> bool:
    """Filtra row GSC: True se la pagina sta sotto-performando il benchmark.

    Criteri:
    - impressions >= MIN_IMPRESSIONS_28D (segnale stabile)
    - 1 <= position <= 10 (oltre la 10 il benchmark non e' significativo)
    - actual_ctr < benchmark_for_position(round(pos)) * REWRITE_FACTOR
    """
    impressions = row.get("impressions", 0)
    if impressions < MIN_IMPRESSIONS_28D:
        return False
    position = round(row.get("position", 99))
    if position < 1 or position > 10:
        return False
    benchmark = benchmark_for_position(position)
    actual = row.get("ctr", 0)
    return actual < benchmark * REWRITE_FACTOR


# ─── Power words loader ───────────────────────────────────────────────────


def _load_power_words(locale: str) -> str:
    """Carica power words per locale come stringa comma-separated.

    EN: hardcoded (lista stabile, pochi cambi).
    IT/ES: letto da state/power_words_{loc}.txt (Matteo modifica).
    Righe vuote e # comment sono ignorate. UTF-8 per preservare accenti.
    """
    if locale == "en":
        return ", ".join(POWER_WORDS_EN)
    p = POWER_WORDS_IT_PATH if locale == "it" else POWER_WORDS_ES_PATH
    if p.exists():
        lines = [
            line.strip()
            for line in p.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]
        return ", ".join(lines)
    return ""


# ─── Strapi fetch current meta ────────────────────────────────────────────


def _fetch_current_meta(content_type_strapi: str, slug: str, locale: str) -> dict | None:
    """Recupera dati attuali da Strapi via slug+locale.

    Ritorna {documentId, current_title, current_meta, excerpt} o None.
    NOTE: find() supporta fields=[...] kwarg (verificato 17-01).
    """
    try:
        resp = strapi.find(
            content_type_strapi,
            locale=locale,
            filters={"slug": {"$eq": slug}},
            page_size=1,
            fields=["seo_title", "seo_description", "excerpt", "title"],
        )
    except Exception as e:
        print(f"  [WARN] strapi.find fallita per {slug}@{locale}: {e}")
        return None
    items = resp.get("data", [])
    if not items:
        return None
    item = items[0]
    return {
        "documentId": item.get("documentId"),
        "current_title": item.get("seo_title") or item.get("title", ""),
        "current_meta": item.get("seo_description", "") or "",
        "excerpt": item.get("excerpt", "") or "",
    }


# ─── Prompt building ──────────────────────────────────────────────────────


def build_prompt(row: dict, current: dict, queries: list[dict], locale: str) -> str:
    """Compone il prompt Qwen iniettando le top GSC query reali della pagina."""
    template = PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8")
    url = row["keys"][0]
    position = row.get("position", 0)
    benchmark = benchmark_for_position(position)
    q_lines = "\n".join(
        f"- {q['keys'][0]} ({q.get('clicks', 0)} clicks, "
        f"{q.get('impressions', 0)} imp, "
        f"{q.get('ctr', 0):.2%} CTR, pos {q.get('position', 0):.1f})"
        for q in queries[:5]
    )
    return template.format(
        url=url,
        current_title=current["current_title"],
        current_meta_description=current["current_meta"],
        excerpt=(current.get("excerpt") or "")[:500],
        locale=locale,
        locale_full=LOCALE_FULL.get(locale, locale),
        avg_position=position,
        ctr=row.get("ctr", 0),
        benchmark_ctr=benchmark,
        impressions=row.get("impressions", 0),
        top_queries_formatted=q_lines or "(nessuna query con clicks)",
        power_words=_load_power_words(locale),
    )


# ─── Qwen output parsing + length cap ─────────────────────────────────────


def _truncate_word_boundary(s: str, n: int) -> str:
    """Tronca a n char preservando word boundary (last whitespace)."""
    s = s.strip()
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut if cut else s[:n]


def parse_qwen_output(raw: str) -> dict | None:
    """Parsa 3 righe da Qwen. Tronca title a 60 e meta a 155 al word boundary.

    Ritorna {seo_title, seo_description, reasoning} o None se mancano i campi.
    """
    if not raw:
        return None
    title = meta = reasoning = ""
    for line in raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.upper().startswith("SEO_TITLE:"):
            title = line.split(":", 1)[1].strip()
        elif line.upper().startswith("SEO_DESCRIPTION:"):
            meta = line.split(":", 1)[1].strip()
        elif line.upper().startswith("REASONING:"):
            reasoning = line.split(":", 1)[1].strip()
    if not title or not meta:
        return None
    return {
        "seo_title": _truncate_word_boundary(title, 60),
        "seo_description": _truncate_word_boundary(meta, 155),
        "reasoning": reasoning,
    }


# ─── Processing per-pagina ────────────────────────────────────────────────


def process_page(row: dict, recent_urls: set[str]) -> bool:
    """Processa una singola pagina candidata.

    Returns True se ha accodato una proposta, False altrimenti (skip per
    qualsiasi ragione: recente, non-rewrite, fetch fail, parse fail).
    """
    url = row["keys"][0]
    if url in recent_urls:
        print(f"  skip (recente): {url}")
        return False
    if not needs_meta_rewrite(row):
        return False
    locale = _locale_from_url(url)
    ct, slug = _content_type_and_slug_from_url(url)
    if not ct or not slug:
        print(f"  skip (URL non riconosciuto): {url}")
        return False
    current = _fetch_current_meta(ct, slug, locale)
    if not current:
        print(f"  skip (Strapi non trova): {ct}/{slug}@{locale}")
        return False
    # Top 5 query GSC reali per questa pagina (priming Qwen)
    try:
        queries = gsc_client.queries_for_page(url, days=28, top_n=5)
    except Exception as e:
        print(f"  [WARN] gsc.queries_for_page fallita per {url}: {e}")
        queries = []
    prompt = build_prompt(row, current, queries, locale)
    # Qwen: max 400 tok (output corto: 3 righe), timeout 120s
    try:
        raw = claude.ask(
            prompt,
            system="",
            max_tokens=400,
            timeout=120,
            enable_thinking=False,
        )
    except Exception as e:
        print(f"  [ERR] Qwen ask fallita per {url}: {e}")
        return False
    parsed = parse_qwen_output(raw)
    if not parsed:
        print(f"  Qwen output unparseable per {url}")
        return False
    record = {
        "url": url,
        "locale": locale,
        "content_type": ct,
        "documentId": current["documentId"],
        "slug": slug,
        "before": {
            "seo_title": current["current_title"],
            "seo_description": current["current_meta"],
        },
        "proposed": parsed,
        "query_targets": [q["keys"][0] for q in queries[:5]],
        "metrics": {
            "position": row.get("position"),
            "ctr": row.get("ctr"),
            "impressions": row.get("impressions"),
        },
        "timestamp": datetime.now().isoformat(),
    }
    atomic_io.append_jsonl_atomic(PENDING_FILE, record)
    print(f"  proposta accodata: {url} "
          f"(pos {row.get('position', 0):.1f} ctr {row.get('ctr', 0):.2%})")
    return True


# ─── Entry point ──────────────────────────────────────────────────────────


def main() -> None:
    _sdxl_guard()
    print(f"[{datetime.now().isoformat()}] meta_optimizer avviato")
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        pages = gsc_client.top_pages(days=28, row_limit=1000)
    except Exception as e:
        telegram.send_agent_report(
            "Meta Optimizer",
            f"ERROR: GSC fetch fallita: {e}",
            details=[
                "Verifica SA permission (Search Console -> Settings -> Users)",
                "Verifica connettivita: ping searchconsole.googleapis.com",
            ],
        )
        sys.exit(1)

    recent = _recent_changes_urls()
    candidates = [
        r for r in pages
        if needs_meta_rewrite(r) and r["keys"][0] not in recent
    ]
    proposed = 0
    for row in candidates[:MAX_PROPOSALS_PER_RUN]:
        try:
            if process_page(row, recent):
                proposed += 1
        except Exception as e:
            print(f"[ERR] {row.get('keys')}: {e}")

    if proposed == 0:
        telegram.send_agent_report(
            "Meta Optimizer",
            f"Pagine scansionate: {len(pages)} | Nessun candidato — "
            "coverage CTR OK o no nuovi articoli pubblicati.",
            details=["Re-check tra 24h."],
        )
    else:
        msg = (
            f"Pagine scansionate: {len(pages)} | "
            f"Sotto benchmark: {len(candidates)} | "
            f"Proposte accodate (max {MAX_PROPOSALS_PER_RUN}): {proposed}"
        )
        next_step = "Pending review su Windows (meta_review.py 09:00 local)."
        telegram.send_agent_report("Meta Optimizer", msg, details=[next_step])


if __name__ == "__main__":
    main()
