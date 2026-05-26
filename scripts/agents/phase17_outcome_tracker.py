#!/usr/bin/env python3
"""Phase 17 Outcome Tracker — weekly CTR lift measurement vs baseline 2026-05-25.

Cron: Lun 09:00 UTC (`0 9 * * 1`) su .119 (NON Hetzner — convention agents Python).
Output: state/phase17_outcome.jsonl (1 record/week) + Telegram report markdown.

Misura il lift CTR atteso dal Phase 17 GSC pipeline (meta_optimizer + gsc_refresh +
GSC priming + Indexing API) nei 30 giorni post-ship 2026-05-25. Confronta GSC top_pages
28d aggregato con baseline hardcoded e applica decision tree per produrre un verdict
attionabile ("success", "on-track", "revisit_prompts", "degraded_rollback").

Decision tree completo:
  .planning/milestones/v1.2-phases/20-outcome-measurement-framework/_reference/decision_tree.md

Convenzioni mirror Phase 17:
- Italian comments
- 10s HTTP timeouts (gsc_client.py li gestisce internamente)
- atomic state writes via atomic_io.append_jsonl_atomic
- send_agent_report per Telegram
- Strapi find_all_pages per article count
- Best-effort GSC: errori loggati ma non bloccanti
"""

import os
import sys
import io
import json
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

# Fix encoding Windows (mirror meta_optimizer.py lines 25-28)
if sys.stdout and hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Carica env vars da .env.windows (Windows) o .env (server) — mirror meta_optimizer
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
from agents.lib import atomic_io

# ─── Baseline locked (v1.1 Phase 17 ship, 2026-05-25) ────────────────────

# Numeri hardcoded come single source of truth. NON re-fetcheare GSC per la
# baseline: la baseline E' STATICA (snapshot del momento ship). Mutate solo
# se Matteo decide consciamente di reset (es. dopo grosso refactor).
BASELINE_DATE = "2026-05-25"
BASELINE = {
    "clicks": 35,
    "impressions": 29000,
    "ctr": 0.0012,        # 0.12% aggregato
    "position": 6.7,
    "articles_count": 50,  # ~50 articoli BBQ live al ship Phase 17
}

# ─── Configurazione ───────────────────────────────────────────────────────

GSC_DAYS_WINDOW = 28          # 28 giorni rolling vs baseline statica
TOP_N_CLIMBING = 5            # top 5 URL CTR ↑↑
TOP_N_DECLINING = 5           # top 5 URL CTR ↓↓
MAX_PAGES_PULL = 200          # pages da pull (sufficienti per ~50 articoli x 3 locale)

STATE_DIR = Path(__file__).parent / "state"
OUTCOME_FILE = STATE_DIR / "phase17_outcome.jsonl"
META_CHANGES_FILE = STATE_DIR / "meta_changes.jsonl"
GSC_REFRESH_SUCCESS = STATE_DIR / "gsc_refresh_success.jsonl"
GSC_REFRESH_PENDING = STATE_DIR / "gsc_refresh_pending.jsonl"

CONTENT_TYPES = ["blog-posts", "reviews", "recipes", "tutorials"]
LOCALES = ["en", "it", "es"]


# ─── Compute delta vs baseline ────────────────────────────────────────────


def _compute_delta(current: dict, baseline: dict) -> dict:
    """Calcola delta % e assolute vs baseline.

    Ritorna dict con stringhe formattate per Telegram + numeri raw per JSONL.
    Tutti i campi safe contro division by zero.
    """
    bl_clicks = baseline.get("clicks", 0)
    bl_impr = baseline.get("impressions", 0)
    bl_ctr = baseline.get("ctr", 0.0)
    bl_pos = baseline.get("position", 0.0)

    cur_clicks = current.get("clicks", 0)
    cur_impr = current.get("impressions", 0)
    cur_ctr = current.get("ctr", 0.0)
    cur_pos = current.get("position", 0.0)

    def _pct(cur: float, bl: float) -> float:
        """Delta percentuale safe vs zero."""
        if bl == 0:
            return 0.0 if cur == 0 else float("inf")
        return (cur - bl) / bl * 100.0

    # Lift CTR è il numero chiave: rapporto current/baseline (es. 2.5x significa +150%)
    lift_ctr_x = 0.0
    if bl_ctr > 0:
        lift_ctr_x = cur_ctr / bl_ctr

    clicks_pct = _pct(cur_clicks, bl_clicks)
    impr_pct = _pct(cur_impr, bl_impr)
    ctr_pct = _pct(cur_ctr, bl_ctr)
    ctr_abs_pp = (cur_ctr - bl_ctr) * 100.0  # percentage points
    pos_delta = cur_pos - bl_pos  # negativo = miglioramento (posizione cresce verso 1)

    return {
        "lift_ctr_x": round(lift_ctr_x, 2),
        "clicks_pct": f"{clicks_pct:+.0f}%",
        "impressions_pct": f"{impr_pct:+.0f}%",
        "ctr_pct": f"{ctr_pct:+.0f}%",
        "ctr_abs_pp": f"{ctr_abs_pp:+.2f}pp",
        "position_delta": f"{pos_delta:+.1f}",
    }


# ─── Aggregate current 28d state ──────────────────────────────────────────


def _aggregate_gsc_28d() -> tuple[dict, list[dict]]:
    """Aggrega GSC top_pages 28d. Ritorna (totals, per_page_rows).

    totals: {clicks, impressions, ctr, position}
    per_page_rows: lista raw rows da gsc_client.top_pages per top_climbing/declining.
    Best-effort: errori GSC -> totals con zeri + lista vuota.
    """
    try:
        rows = gsc_client.top_pages(days=GSC_DAYS_WINDOW, row_limit=MAX_PAGES_PULL)
    except Exception as e:
        print(f"[WARN] gsc.top_pages fallita: {e}")
        return ({"clicks": 0, "impressions": 0, "ctr": 0.0, "position": 0.0}, [])

    if not rows:
        return ({"clicks": 0, "impressions": 0, "ctr": 0.0, "position": 0.0}, [])

    # Aggregazione: clicks/impressions sommate; ctr = clicks/impressions sito-wide;
    # position = weighted average per impressions
    total_clicks = sum(r.get("clicks", 0) for r in rows)
    total_impr = sum(r.get("impressions", 0) for r in rows)
    ctr_agg = (total_clicks / total_impr) if total_impr > 0 else 0.0
    pos_weighted = 0.0
    if total_impr > 0:
        pos_weighted = sum(
            r.get("position", 0.0) * r.get("impressions", 0)
            for r in rows
        ) / total_impr

    return (
        {
            "clicks": total_clicks,
            "impressions": total_impr,
            "ctr": round(ctr_agg, 5),
            "position": round(pos_weighted, 2),
        },
        rows,
    )


# ─── Articles count via Strapi ────────────────────────────────────────────


def _count_articles_live() -> int:
    """Conta articoli BBQ live (blog + reviews + recipes + tutorials, EN+IT+ES).

    Mirror pattern claude_strategist.get_content_performance:69. Strapi v5 list
    paginated via find_all_pages. Best-effort: errori Strapi -> ritorna baseline
    count come fallback per non rompere il report.
    """
    total = 0
    for locale in LOCALES:
        for ct in CONTENT_TYPES:
            try:
                items = strapi.find_all_pages(
                    ct,
                    locale=locale,
                    status="published",
                    fields=["slug"],
                    page_size=100,
                )
                total += len(items)
            except Exception as e:
                print(f"  [WARN] strapi.find_all_pages({ct}@{locale}) fallita: {e}")
                continue
    return total


# ─── Top climbing / declining (vs baseline benchmark per posizione) ───────


def _select_top_climbing_declining(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Identifica top 5 URL "climbing" (CTR > 2x benchmark per pos) e "declining"
    (CTR < 0.5x benchmark per pos).

    Usa benchmark_for_position dal modulo shared (B1 Phase 17 convention).
    Solo URL con impressions >= 50 per filtrare noise long-tail.
    """
    from agents.lib.ctr_benchmark import benchmark_for_position

    rated: list[dict] = []
    for r in rows:
        impr = r.get("impressions", 0)
        if impr < 50:
            continue
        ctr = r.get("ctr", 0.0)
        pos = r.get("position", 0.0)
        # benchmark_for_position clampa pos 1..10 internamente
        try:
            bench = benchmark_for_position(pos)
        except Exception:
            continue
        if bench <= 0:
            continue
        ratio = ctr / bench
        rated.append({
            "url": r.get("keys", ["?"])[0],
            "clicks": r.get("clicks", 0),
            "impressions": impr,
            "ctr": round(ctr, 4),
            "position": round(pos, 1),
            "ctr_vs_benchmark_x": round(ratio, 2),
        })

    # Sort climbing: ratio desc; declining: ratio asc
    climbing = sorted(rated, key=lambda x: x["ctr_vs_benchmark_x"], reverse=True)
    declining = sorted(rated, key=lambda x: x["ctr_vs_benchmark_x"])
    return climbing[:TOP_N_CLIMBING], declining[:TOP_N_DECLINING]


# ─── Pipeline activity (this week) ────────────────────────────────────────


def _count_jsonl_records_since(path: Path, since: datetime) -> int:
    """Conta record JSONL con timestamp >= since (naive UTC).

    Robusto a file mancanti (ritorna 0), righe corrotte (skip), timestamp ISO
    aware (cast a naive UTC), naive (passthrough).
    """
    if not path.exists():
        return 0
    count = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
            ts_raw = r.get("timestamp", "")
            if not ts_raw:
                continue
            ts = datetime.fromisoformat(ts_raw)
            if ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)
            if ts >= since:
                count += 1
        except (ValueError, json.JSONDecodeError):
            continue
    return count


def _count_pipeline_activity_this_week() -> tuple[int, int]:
    """Conta meta_changes e gsc_refresh nelle ultime 7gg.

    Ritorna (meta_changes_count, refresh_count). meta_changes include sia
    "apply" che "reject" perché entrambi indicano lavoro del pipeline.
    refresh count somma success + pending (needs_human) — tutto ciò che è stato
    selezionato + processato.
    """
    one_week_ago = datetime.now() - timedelta(days=7)
    meta_changes = _count_jsonl_records_since(META_CHANGES_FILE, one_week_ago)
    refresh_success = _count_jsonl_records_since(GSC_REFRESH_SUCCESS, one_week_ago)
    refresh_pending = _count_jsonl_records_since(GSC_REFRESH_PENDING, one_week_ago)
    return meta_changes, refresh_success + refresh_pending


# ─── Decision tree ────────────────────────────────────────────────────────


def _decide_verdict(delta: dict, weeks_elapsed: int) -> tuple[str, list[str]]:
    """Applica decision tree _reference/decision_tree.md.

    Returns (verdict, action_recommendations).

    4 verdetti:
      - "success"            -> lift >= 10x entro 14gg
      - "on-track"           -> 3 <= lift < 10x entro 14gg
      - "revisit_prompts"    -> lift < 3x dopo 14gg (week 2+)
      - "degraded_rollback"  -> lift < 1.5x dopo 30gg (week 4+)

    NB: weeks_elapsed conta settimane intere dalla ship date 2026-05-25.
    Per decisioni "degraded_rollback" weeks_elapsed deve essere >= 4 per evitare
    panic prematuro.
    """
    lift = delta.get("lift_ctr_x", 0.0)

    # Worst case first: degraded_rollback (priorità più alta se trigger)
    if lift < 1.5 and weeks_elapsed >= 4:
        return ("degraded_rollback", [
            "PAUSE cron meta_optimizer su .119 (commenta riga 30 3 * * *)",
            "PAUSE cron gsc_refresh su .119 (commenta riga 0 8 * * 0)",
            "Manual review state/meta_changes.jsonl ultimi 30gg + cross-ref GSC URL Inspection per regression",
            "Rollback selettivo seo_title/seo_description per URL con CTR peggiorato >20%",
            "Scrivere _reference/phase17_postmortem.md con root cause prima di re-attivare",
        ])

    if lift >= 10.0 and weeks_elapsed <= 2:
        return ("success", [
            "Scale gsc_refresh: weekly (0 8 * * 0) -> daily (0 8 * * *)",
            "Estendere meta_optimizer.MAX_PROPOSALS_PER_RUN: 20 -> 30",
            "Considerare estensione GSC priming + Indexing API a IT/ES (translation_agent.py su .119)",
        ])

    if 3.0 <= lift < 10.0 and weeks_elapsed <= 2:
        return ("on-track", [
            "Nessuna modifica. Continuare monitoring weekly.",
            "Verdict si stabilizzerà su 'success' o 'revisit_prompts' nelle prossime 2-3 settimane.",
        ])

    if lift < 3.0 and weeks_elapsed >= 2:
        return ("revisit_prompts", [
            "Review qualitativo state/meta_changes.jsonl ultimi 14gg (power words usati? query_targets visibili?)",
            "Tune state/power_words_it.txt + power_words_es.txt con domain-specific BBQ terms",
            "Considerare tuning prompts/qwen_meta_draft.md con esempi few-shot gold-standard",
            "Cron continua a girare — è tuning, NON rollback",
        ])

    # Default: early phase senza trigger sufficiente (es. week 1 con lift 2x)
    return ("monitoring", [
        f"Week {weeks_elapsed}: lift {lift}x — nessun trigger del decision tree attivo",
        "Continuare monitoring weekly. Riconsiderare dopo week 2+ per `revisit_prompts` trigger.",
    ])


# ─── Telegram report formatter ────────────────────────────────────────────


def _format_telegram_report(record: dict) -> tuple[str, list[str]]:
    """Costruisce (summary, details) per send_agent_report.

    summary = headline 1-liner. details = lista bullet per sezioni del report.
    Markdown leggero compatibile con parse_mode='HTML' di telegram.send.
    """
    delta = record["delta"]
    week = record["week_number"]
    verdict = record["decision_tree_verdict"].upper()
    cur = record["current_28d"]
    bl = record["baseline_2026_05_25"]

    headline = (
        f"📈 Phase 17 Outcome — Week {week} "
        f"(lift CTR {delta['lift_ctr_x']}x, {verdict})"
    )

    details: list[str] = []

    # Sezione "Vs Baseline"
    details.append(
        f"<b>Vs baseline {BASELINE_DATE}:</b> "
        f"clicks {bl['clicks']}→{cur['clicks']} ({delta['clicks_pct']}) | "
        f"impr {bl['impressions']}→{cur['impressions']} ({delta['impressions_pct']}) | "
        f"CTR {bl['ctr']*100:.2f}%→{cur['ctr']*100:.2f}% ({delta['ctr_abs_pp']}, {delta['ctr_pct']}) | "
        f"pos {bl['position']}→{cur['position']} ({delta['position_delta']})"
    )

    # Articoli live
    details.append(
        f"<b>Articoli live:</b> {bl['articles_count']}→{cur['articles_count']}"
    )

    # Pipeline activity
    details.append(
        f"<b>Pipeline this week:</b> meta_changes={record['meta_changes_count_this_week']}, "
        f"refresh={record['refresh_count_this_week']}"
    )

    # Top 5 climbing
    climbing = record.get("top_5_climbing", [])
    if climbing:
        details.append("<b>Top 5 climbing (CTR vs benchmark):</b>")
        for c in climbing:
            url_short = c["url"].replace("https://bbq-experience.com", "")
            details.append(
                f"  ↑ {url_short} — {c['ctr_vs_benchmark_x']}x bench "
                f"({c['clicks']} clicks, pos {c['position']})"
            )

    # Top 5 declining
    declining = record.get("top_5_declining", [])
    if declining:
        details.append("<b>Top 5 declining (CTR vs benchmark):</b>")
        for d in declining:
            url_short = d["url"].replace("https://bbq-experience.com", "")
            details.append(
                f"  ↓ {url_short} — {d['ctr_vs_benchmark_x']}x bench "
                f"({d['clicks']} clicks, pos {d['position']})"
            )

    # Action recommendations da decision tree
    actions = record.get("action_recommendations", [])
    if actions:
        details.append("<b>Action recommendations:</b>")
        for a in actions:
            details.append(f"  → {a}")

    return headline, details


# ─── Week number computation ──────────────────────────────────────────────


def _weeks_since_baseline(today: date | None = None) -> int:
    """Settimane intere dal ship date BASELINE_DATE (2026-05-25).

    Usata dal decision tree per gating dei verdetti (es. 'success' richiede week <=2).
    today=None -> usa date.today() reale (production cron).
    """
    today = today or date.today()
    bl_date = date.fromisoformat(BASELINE_DATE)
    diff_days = (today - bl_date).days
    return max(0, diff_days // 7)


# ─── Entry point ──────────────────────────────────────────────────────────


def build_outcome_record() -> dict:
    """Costruisce il record settimanale completo. Espone build separato per test."""
    print(f"[{datetime.now().isoformat()}] phase17_outcome_tracker avviato")

    # 1. Aggrega GSC 28gg
    current_totals, current_rows = _aggregate_gsc_28d()

    # 2. Conta articoli live
    articles_count = _count_articles_live()
    if articles_count == 0:
        # Fallback su baseline per non rompere il report (Strapi giù?)
        print("  [WARN] articles_count=0, fallback a baseline")
        articles_count = BASELINE["articles_count"]
    current_totals["articles_count"] = articles_count

    # 3. Calcola delta vs baseline
    delta = _compute_delta(current_totals, BASELINE)

    # 4. Top 5 climbing / declining
    climbing, declining = _select_top_climbing_declining(current_rows)

    # 5. Pipeline activity this week
    meta_count, refresh_count = _count_pipeline_activity_this_week()

    # 6. Decision tree verdict
    weeks = _weeks_since_baseline()
    verdict, actions = _decide_verdict(delta, weeks)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "week_number": weeks,
        "baseline_2026_05_25": BASELINE,
        "current_28d": current_totals,
        "delta": delta,
        "meta_changes_count_this_week": meta_count,
        "refresh_count_this_week": refresh_count,
        "top_5_climbing": climbing,
        "top_5_declining": declining,
        "decision_tree_verdict": verdict,
        "action_recommendations": actions,
    }
    return record


def main() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        record = build_outcome_record()
    except Exception as e:
        # Catch-all per fail loudly su Telegram (cron silenziosamente rotto e' peggio)
        telegram.send_agent_report(
            "Phase 17 Outcome Tracker",
            f"ERROR: build_outcome_record fallita: {e}",
            details=[
                "Verifica connettività GSC + Strapi",
                f"Log: {Path(__file__).parent.parent.parent / 'logs' / 'phase17_outcome.log'}",
            ],
        )
        sys.exit(1)

    # Atomic append (1 record per week) — mirror meta_optimizer pattern
    atomic_io.append_jsonl_atomic(OUTCOME_FILE, record)
    print(f"  record settimana {record['week_number']} -> {OUTCOME_FILE}")

    # Telegram report
    headline, details = _format_telegram_report(record)
    telegram.send_agent_report("Phase 17 Outcome Tracker", headline, details=details)
    print(f"  verdict: {record['decision_tree_verdict']}")


if __name__ == "__main__":
    main()
