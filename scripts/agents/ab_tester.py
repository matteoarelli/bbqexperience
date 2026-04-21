#!/usr/bin/env python3
"""Agente settimanale A/B test — analisi statistica e raccomandazioni vincitore.

Recupera esperimenti attivi da Strapi, analizza impression/click da Umami,
esegue two-proportion z-test e invia raccomandazioni su Telegram.
Include anche report campagne A/B email da Brevo.
"""

import math
import os
import sys
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Carica .env se presente
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import umami_client as umami
from agents.lib import telegram
from agents.lib import brevo_client as brevo

# Soglie minime per dichiarare un vincitore
MIN_IMPRESSIONS = 500
MIN_DAYS = 7
SIGNIFICANCE_LEVEL = 0.05


def two_proportion_ztest(
    successes_a: int,
    trials_a: int,
    successes_b: int,
    trials_b: int,
) -> tuple[float, float]:
    """Two-proportion z-test senza scipy.

    Confronta due proporzioni (es. CTR variante A vs B).
    Ritorna (z_stat, p_value) dove p_value e two-tailed.
    """
    if trials_a == 0 or trials_b == 0:
        return 0.0, 1.0

    p1 = successes_a / trials_a
    p2 = successes_b / trials_b
    p_pool = (successes_a + successes_b) / (trials_a + trials_b)

    se = math.sqrt(p_pool * (1 - p_pool) * (1 / trials_a + 1 / trials_b))
    if se == 0:
        return 0.0, 1.0

    z = (p1 - p2) / se
    # p-value two-tailed via complementary error function
    p_value = math.erfc(abs(z) / math.sqrt(2))
    return z, p_value


def should_declare_winner(
    impressions_a: int,
    impressions_b: int,
    days_running: int,
    p_value: float,
) -> bool:
    """Verifica se tutte le condizioni per dichiarare un vincitore sono soddisfatte.

    Richiede: >= 500 impression per variante, >= 7 giorni, p_value < 0.05.
    """
    return (
        impressions_a >= MIN_IMPRESSIONS
        and impressions_b >= MIN_IMPRESSIONS
        and days_running >= MIN_DAYS
        and p_value < SIGNIFICANCE_LEVEL
    )


def get_experiment_stats(
    experiment_doc_id: str,
    start_ms: int,
    end_ms: int,
) -> dict:
    """Recupera statistiche impression e click per un esperimento da Umami.

    Ritorna dict con stats per variante: {variant: {impressions, clicks, ctr}}.
    """
    try:
        impressions_raw = umami.get_event_data("ab-impression", start_ms, end_ms)
        clicks_raw = umami.get_event_data("ab-click", start_ms, end_ms)
    except Exception as e:
        print(f"[WARN] Errore recupero eventi Umami per {experiment_doc_id}: {e}")
        return {}

    # Filtra per esperimento — formato Umami event-data fields: {fieldName, dataType, value, total}
    # Il campo 'x' contiene il valore del field (es. experiment_id), 'y' il conteggio
    stats: dict[str, dict[str, int | float]] = {}

    # Conta impression per variante
    for item in impressions_raw:
        # Formato primario: field-value con x=experiment_doc_id
        if item.get("x") == experiment_doc_id:
            variant = item.get("fieldName", "")
            if variant.startswith("variant_"):
                variant_key = variant
            else:
                variant_key = f"variant_{variant}" if variant else "unknown"
            stats.setdefault(variant_key, {"impressions": 0, "clicks": 0, "ctr": 0.0})
            stats[variant_key]["impressions"] += int(item.get("y", 0))
        # Fallback: campo experiment nel dict
        elif item.get("experiment") == experiment_doc_id:
            variant = item.get("variant", "unknown")
            stats.setdefault(variant, {"impressions": 0, "clicks": 0, "ctr": 0.0})
            stats[variant]["impressions"] += 1

    # Conta click per variante
    for item in clicks_raw:
        if item.get("x") == experiment_doc_id:
            variant = item.get("fieldName", "")
            if variant.startswith("variant_"):
                variant_key = variant
            else:
                variant_key = f"variant_{variant}" if variant else "unknown"
            stats.setdefault(variant_key, {"impressions": 0, "clicks": 0, "ctr": 0.0})
            stats[variant_key]["clicks"] += int(item.get("y", 0))
        elif item.get("experiment") == experiment_doc_id:
            variant = item.get("variant", "unknown")
            stats.setdefault(variant, {"impressions": 0, "clicks": 0, "ctr": 0.0})
            stats[variant]["clicks"] += 1

    # Calcola CTR per ogni variante
    for v_stats in stats.values():
        imp = v_stats["impressions"]
        if imp > 0:
            v_stats["ctr"] = v_stats["clicks"] / imp

    return stats


def analyze_experiments(dry_run: bool = False) -> str:
    """Analizza tutti gli esperimenti A/B attivi e genera report.

    Se dry_run=True, stampa su stdout invece di inviare su Telegram.
    """
    print("[AB Tester] Inizio analisi esperimenti...")

    report_lines: list[str] = []
    report_lines.append("<b>A/B Test Weekly Report</b>\n")

    # --- Sezione 1: Esperimenti headline da Strapi/Umami ---
    try:
        resp = strapi.find(
            "ab-experiments",
            filters={"status": {"$eq": "active"}},
            populate="blog_post",
            page_size=100,
        )
        experiments = resp.get("data", [])
    except Exception as e:
        print(f"[ERROR] Fetch esperimenti da Strapi: {e}")
        experiments = []

    if not experiments:
        report_lines.append("Nessun esperimento headline attivo.\n")
    else:
        report_lines.append(f"<b>Headline Experiments ({len(experiments)})</b>\n")

    # Controlla vincolo one-active-per-post
    post_experiments: dict[str, list[str]] = {}
    for exp in experiments:
        blog_post = exp.get("blog_post")
        if blog_post:
            post_id = blog_post.get("documentId", "unknown")
            post_experiments.setdefault(post_id, []).append(exp.get("documentId", ""))

    now_ms = int(time.time() * 1000)

    for exp in experiments:
        doc_id = exp.get("documentId", "")
        variant_a = exp.get("variant_a", "—")
        variant_b = exp.get("variant_b", "—")
        started_at = exp.get("started_at", "")

        # Vincolo one-active-per-post
        blog_post = exp.get("blog_post")
        if blog_post:
            post_id = blog_post.get("documentId", "unknown")
            if len(post_experiments.get(post_id, [])) > 1:
                report_lines.append(
                    f"  {doc_id[:8]}: SKIPPED — post {post_id[:8]} ha "
                    f"{len(post_experiments[post_id])} test attivi"
                )
                continue

        # Calcola giorni attivi
        days_running = 0
        start_ms = 0
        if started_at:
            try:
                start_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                days_running = (datetime.now(timezone.utc) - start_dt).days
                start_ms = int(start_dt.timestamp() * 1000)
            except (ValueError, TypeError):
                start_ms = now_ms - (30 * 24 * 60 * 60 * 1000)  # fallback 30 giorni

        if start_ms == 0:
            start_ms = now_ms - (30 * 24 * 60 * 60 * 1000)

        # Recupera stats da Umami
        stats = get_experiment_stats(doc_id, start_ms, now_ms)

        if not stats:
            report_lines.append(
                f"  {doc_id[:8]}: {days_running}d — nessun dato Umami"
            )
            continue

        # Estrai dati control (variant_a) vs challenger (variant_b)
        ctrl = stats.get("variant_a", {"impressions": 0, "clicks": 0, "ctr": 0.0})
        chal = stats.get("variant_b", {"impressions": 0, "clicks": 0, "ctr": 0.0})

        imp_a = int(ctrl["impressions"])
        imp_b = int(chal["impressions"])
        click_a = int(ctrl["clicks"])
        click_b = int(chal["clicks"])

        z, p = two_proportion_ztest(click_a, imp_a, click_b, imp_b)
        winner_ready = should_declare_winner(imp_a, imp_b, days_running, p)

        ctr_a = ctrl["ctr"] * 100
        ctr_b = chal["ctr"] * 100

        line = (
            f"  {doc_id[:8]}: {days_running}d | "
            f"A: {ctr_a:.1f}% ({imp_a} imp) vs B: {ctr_b:.1f}% ({imp_b} imp) | "
            f"p={p:.4f}"
        )

        if winner_ready:
            winner = "A" if ctr_a > ctr_b else "B"
            winner_title = variant_a if winner == "A" else variant_b
            line += f" | WINNER: {winner} ({winner_title[:40]})"
        elif days_running < MIN_DAYS:
            line += f" | attesa (min {MIN_DAYS}d)"
        elif imp_a < MIN_IMPRESSIONS or imp_b < MIN_IMPRESSIONS:
            line += f" | attesa (min {MIN_IMPRESSIONS} imp)"
        else:
            line += " | non significativo"

        report_lines.append(line)

    # --- Sezione 2: Campagne A/B email da Brevo ---
    report_lines.append("\n<b>Brevo A/B Email Campaigns</b>\n")

    try:
        ab_campaigns = brevo.list_recent_ab_campaigns(limit=10)
    except Exception as e:
        print(f"[WARN] Errore fetch campagne Brevo: {e}")
        ab_campaigns = []

    if not ab_campaigns:
        report_lines.append("  Nessuna campagna A/B recente.\n")
    else:
        for campaign in ab_campaigns:
            campaign_id = campaign.get("id", 0)
            name = campaign.get("name", "N/A")

            try:
                details = brevo.get_ab_campaign_results(campaign_id)
            except Exception as e:
                report_lines.append(f"  {name}: errore recupero dettagli ({e})")
                continue

            if details is None:
                report_lines.append(f"  {name}: non A/B o non trovata")
                continue

            ab_test_result = details.get("abTestPercentage") or details.get("abTesting")
            winner_criteria = details.get("winnerCriteria", "")
            winner_version = details.get("winnerVersion", "")

            # Estrai statistiche per versione A e B
            stats_detail = details.get("statistics", {})
            global_stats = stats_detail.get("globalStats", {})
            # Controlla se il vincitore e stato selezionato
            if winner_version:
                report_lines.append(
                    f"  {name}: winner={winner_version} "
                    f"(criteria: {winner_criteria})"
                )
            else:
                report_lines.append(
                    f"  {name}: pending winner selection"
                )

    # Invia report
    report = "\n".join(report_lines)

    if dry_run:
        print("\n--- DRY RUN REPORT ---")
        print(report)
        print("--- END REPORT ---\n")
    else:
        telegram.send(report, parse_mode="HTML")
        print("[AB Tester] Report inviato su Telegram")

    return report


def main() -> None:
    """Entry point — supporta --dry-run per output locale."""
    parser = argparse.ArgumentParser(description="Agente A/B test settimanale")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Stampa report su stdout invece di inviare su Telegram",
    )
    args = parser.parse_args()

    analyze_experiments(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
