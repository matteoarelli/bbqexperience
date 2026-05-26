#!/usr/bin/env python3
"""GSC Refresh — Ubuntu .119 cron Sun 08:00 UTC (NON Hetzner — vedi 17-02 SUMMARY).

Settimanale: pesca top 10 pagine BBQ con decadenza ranking O CTR opportunity.
Per ogni candidato: estrae top 5 query GSC + competitor diff (se
competitor_monitor ha scritto state). Scrive coda state/gsc_refresh_queue.jsonl
per il review Claude Opus su Windows (gsc_refresh_review.py, Sun 10:00 local).

NON riscrive direttamente. NON rigenera cover image (out of scope Phase 17,
m4 lock). Schema PUT delega a gsc_refresh_review che invoca Strapi update
(NO skip_rebuild — refresh IS un cambio di contenuto, rebuild SCATTA per design).

SDXL window guard: anche se cron e' Sun 08:00 UTC (fuori finestra), un dry-run
manuale durante 04-05 UTC andrebbe bloccato. Guard UTC-explicit per coprire
CEST (UTC+2 -> 04-04:55 UTC) e CET (UTC+1 -> 05-05:55 UTC). B5 fix Phase 17-02.

DEPLOY TARGET: Ubuntu .119, path ~/bbqexperience/scripts/agents/, run via
~/bbqexperience/run-agent.sh. Install: ssh matteo@192.168.1.119 'crontab -e'
"""

import os
import sys
import io
import json
from datetime import datetime, timedelta, date, timezone
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
from agents.lib import telegram
from agents.lib import atomic_io
# B1 fix: import dal modulo condiviso, niente duplicate inline, niente try/except
from agents.lib.ctr_benchmark import CTR_BENCHMARK, benchmark_for_position

# ─── Soglie selezione ─────────────────────────────────────────────────────

DECAY_THRESHOLD = 0.7      # clicks_7d < avg_per_week * 0.7 -> decay >=30%
DECAY_MIN_IMP_28D = 200    # decay non significativo sotto questo
OPPORTUNITY_MIN_IMP_28D = 500
TOP_N = 10

STATE_DIR = Path(__file__).parent / "state"
QUEUE_FILE = STATE_DIR / "gsc_refresh_queue.jsonl"
# Same path used by competitor_monitor.py (verified file: state/competitor_state.json)
COMPETITOR_STATE = STATE_DIR / "competitor_state.json"

# Mappa URL path prefix -> Strapi content type (mirror meta_optimizer.PATH_TO_CONTENT_TYPE)
LOCALES = ["en", "it", "es"]
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

    Cron schedule: Sun 08:00 UTC, ben fuori dalla finestra. Questa guard
    e' belt-and-suspenders defense-in-depth contro dry-run manuali.
    """
    h_utc = datetime.now(timezone.utc).hour
    if h_utc in (4, 5):
        print(f"[gsc_refresh] skip: ora UTC {h_utc} dentro finestra SDXL "
              "(Europe/Rome 06:00-06:55 local)")
        sys.exit(0)


# ─── URL parsing ──────────────────────────────────────────────────────────


def _parse_url(url: str) -> tuple[str | None, str | None, str | None]:
    """Estrae (content_type_strapi, slug, locale) da URL canonical.

    Es: /en/blog/best-pellet-grill-2026 -> ("blog-posts", "best-pellet-grill-2026", "en")
    Ritorna (None, None, None) se URL non riconosciuto.
    """
    if "://" in url:
        path = url.split("://", 1)[1].split("/", 1)
        path = "/" + path[1] if len(path) > 1 else "/"
    else:
        path = url
    parts = [p for p in path.split("/") if p]
    if len(parts) < 3:
        return None, None, None
    locale_seg, route_seg, slug_seg = parts[0], parts[1], parts[2]
    if locale_seg not in LOCALES:
        return None, None, None
    ct = PATH_TO_CONTENT_TYPE.get(route_seg)
    if not ct:
        return None, None, None
    return ct, slug_seg, locale_seg


# ─── GSC fetch wrappers ───────────────────────────────────────────────────


def _fetch_clicks_per_week(days_back: int) -> dict[str, dict]:
    """Per ogni page URL, ritorna {clicks, impressions, ctr, position} sull'intervallo.

    end = today - 3gg per dataState=final stability (mirror gsc_client._date_range).
    """
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=days_back)
    rows = gsc_client.search_analytics(
        start_date=start.isoformat(), end_date=end.isoformat(),
        dimensions=["page"], row_limit=5000,
    )
    return {r["keys"][0]: r for r in rows}


# ─── Candidate selection ──────────────────────────────────────────────────


def _select_candidates() -> list[dict]:
    """Union decay + ctr_opportunity, dedup, top 10 by impressions.

    branches stored as LIST (not joined string) per supportare conditional
    prompt rendering in gsc_refresh_review._build_prompt (M8 fix).
    """
    last_7 = _fetch_clicks_per_week(7)
    last_28 = _fetch_clicks_per_week(28)
    candidates: dict[str, dict] = {}
    for url, row28 in last_28.items():
        imp_28 = row28.get("impressions", 0)
        clicks_28 = row28.get("clicks", 0)
        ctr_28 = row28.get("ctr", 0)
        pos_28 = row28.get("position", 0)
        avg_week = clicks_28 / 4.0
        row7 = last_7.get(url, {})
        clicks_7 = row7.get("clicks", 0)
        branches: list[str] = []
        # Branch A: decay (segnale stabile solo con imp_28d sufficiente)
        if imp_28 >= DECAY_MIN_IMP_28D and avg_week > 0 and clicks_7 < avg_week * DECAY_THRESHOLD:
            branches.append("decay")
        # Branch B: CTR opportunity — usa benchmark per posizione (shared lib)
        if imp_28 >= OPPORTUNITY_MIN_IMP_28D and 1 <= pos_28 <= 10:
            benchmark = benchmark_for_position(pos_28)
            if ctr_28 < benchmark:
                branches.append("ctr_opportunity")
        if branches:
            decay_pct = ((avg_week - clicks_7) / avg_week * 100) if avg_week > 0 else 0
            candidates[url] = {
                "url": url,
                "branches": branches,  # LIST per M8 conditional rendering downstream
                "metrics_28d": {
                    "impressions": imp_28,
                    "clicks": clicks_28,
                    "ctr": ctr_28,
                    "position": pos_28,
                    "avg_clicks_per_week": avg_week,
                },
                "metrics_7d": {
                    "clicks": clicks_7,
                    "decay_pct": round(decay_pct, 1),
                },
            }
    ranked = sorted(
        candidates.values(),
        key=lambda c: c["metrics_28d"]["impressions"],
        reverse=True,
    )
    return ranked[:TOP_N]


# ─── Competitor news matching (best-effort) ───────────────────────────────


def _load_competitor_news() -> list[dict]:
    """Carica competitor_state.json se esiste. No-op + lista vuota su error.

    Format atteso: lista di dict {url, title, source, ...} oppure dict con
    chiave 'seen_urls' (storage corrente di competitor_monitor.py).
    """
    if not COMPETITOR_STATE.exists():
        return []
    try:
        raw = json.loads(COMPETITOR_STATE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[gsc_refresh] competitor state non leggibile: {e}")
        return []
    # competitor_monitor scrive {"seen_urls": [...]} oggi; ma se contiene una
    # lista di articoli ricchi (futuro enhancement) la passiamo through.
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        # Heuristic: cerca chiave 'articles' o 'news', altrimenti restituisci []
        for k in ("articles", "news", "recent"):
            v = raw.get(k)
            if isinstance(v, list):
                return v
        return []
    return []


def _match_competitor(candidate_url: str, news: list[dict]) -> list[dict]:
    """Heuristic match: token overlap tra URL slug e news title.

    Senza embeddings: confronto token overlap >=2 token significativi (len > 3).
    Cap 3 match per candidate per non saturare prompt downstream.
    """
    if not news:
        return []
    slug = candidate_url.rstrip("/").split("/")[-1]
    slug_tokens = set(t for t in slug.split("-") if len(t) > 3)
    matched: list[dict] = []
    for n in news:
        title = n.get("title", "") or ""
        title_tokens = set(
            t.lower() for t in title.replace("-", " ").split() if len(t) > 3
        )
        if len(slug_tokens & title_tokens) >= 2:
            matched.append({
                "url": n.get("url"),
                "title": n.get("title"),
                "source": n.get("source"),
            })
    return matched[:3]


# ─── Per-candidate enrichment ─────────────────────────────────────────────


def _enrich(candidate: dict, competitor_news: list[dict]) -> dict:
    """Aggiunge gsc_queries + competitor_articles + slug/content_type/locale derivati."""
    url = candidate["url"]
    try:
        queries = gsc_client.queries_for_page(url, days=28, top_n=5)
        candidate["gsc_queries"] = [
            {
                "query": q["keys"][0],
                "clicks": q.get("clicks", 0),
                "impressions": q.get("impressions", 0),
                "ctr": q.get("ctr", 0),
                "position": q.get("position", 0),
            }
            for q in queries
        ]
    except Exception as e:
        print(f"[gsc_refresh] queries_for_page fail {url}: {e}")
        candidate["gsc_queries"] = []
    candidate["competitor_articles"] = _match_competitor(url, competitor_news)
    candidate["timestamp"] = datetime.now().isoformat()
    ct, slug, locale = _parse_url(url)
    candidate["slug"] = slug
    candidate["content_type"] = ct
    candidate["locale"] = locale
    return candidate


# ─── Entry point ──────────────────────────────────────────────────────────


def main() -> None:
    _sdxl_guard()
    print(f"[{datetime.now().isoformat()}] gsc_refresh avviato")
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    # Reset queue file ogni run (settimanale, non append cumulativo).
    # Su run successivo, la queue rappresenta l'ultimo snapshot dei candidati.
    if QUEUE_FILE.exists():
        QUEUE_FILE.unlink()
    try:
        candidates = _select_candidates()
    except Exception as e:
        telegram.send_agent_report(
            "GSC Refresh",
            f"ERROR: Selection fallita: {e}",
            details=[
                "Verifica SA permission GSC",
                "Verifica connettivita searchconsole.googleapis.com",
            ],
        )
        sys.exit(1)
    if not candidates:
        telegram.send_agent_report(
            "GSC Refresh",
            "Nessun candidato selezionato (no decay >=30% + no CTR opportunity >=500imp).",
            details=["Content health buona. Re-check next Sun."],
        )
        return
    news = _load_competitor_news()
    enriched_count = 0
    for c in candidates:
        try:
            enriched = _enrich(c, news)
            atomic_io.append_jsonl_atomic(QUEUE_FILE, enriched)
            enriched_count += 1
        except Exception as e:
            print(f"[ERR] enrich {c.get('url', '?')}: {e}")
    summary = f"Candidati accodati: {enriched_count}/{len(candidates)}"
    details = [
        f"- {c['url']} (branches: {'+'.join(c['branches'])}, "
        f"imp {c['metrics_28d']['impressions']}, "
        f"ctr {c['metrics_28d']['ctr']:.2%})"
        for c in candidates[:5]
    ]
    next_step = "Review Claude Opus su Windows Dom 10:00 (gsc_refresh_review.py)."
    telegram.send_agent_report(
        "GSC Refresh", summary, details=details + [next_step],
    )


if __name__ == "__main__":
    main()
