#!/usr/bin/env python3
"""GSC Refresh Review — Windows Task Scheduler Sun 10:00 local.

Consuma state/gsc_refresh_queue.jsonl (prodotto da gsc_refresh.py su .119
Sun 08:00 UTC). Per ogni candidato: chiama Claude Opus generate_article_multistep
con priming GSC + competitor diff. Quality gate review_article (Opus per
review semantica completa — sonnet solo per length/keyword check via
review_meta, vedi 17-02 meta_review). Score>=7 -> Strapi PUT + re-index
(Indexing API + IndexNow). Score<7 OR critical issues unresolved -> queue
gsc_refresh_failed.jsonl per intervento umano.

Cover image NON rigenerata (out of scope Phase 17, m4 lock).

Strapi update USA il default skip_rebuild=False — refresh IS un cambio
sostanziale di contenuto, il rebuild Astro DEVE scattare. Scoperta da 17-02
checkpoint: Strapi webhook ascolta solo entry.publish/unpublish/delete, NON
entry.update. La promozione via toggle published_at scatena entry.publish
quindi rebuild fires per design.

Claude CLI gira solo su Windows (mirror meta_review.py / claude_review_runner.py).
Schedule: 'BBQ GSC Refresh Review' /SC WEEKLY /D SUN /ST 10:00.
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
from agents.lib import claude_client as claude
from agents.lib import strapi_client as strapi
from agents.lib import gsc_client
from agents.lib import indexnow_client
from agents.lib import telegram
from agents.lib import atomic_io
# B1 fix: import shared ctr_benchmark (no inline duplication)
from agents.lib.ctr_benchmark import benchmark_for_position
# Quality gate Opus (semantic-heavy) — sonnet solo per length/keyword (vedi 17-02 meta_review)
from agents.claude_quality_gate import review_article
# M7 fix: reverse-lookup cluster da keyword via keyword_scout.CLUSTERS
# (il content-type blog-post NON ha campo `cluster`, ricavato esternamente)
from agents.keyword_scout import CLUSTERS

# ─── Configurazione ───────────────────────────────────────────────────────

STATE_DIR = Path(__file__).parent / "state"
QUEUE_FILE = STATE_DIR / "gsc_refresh_queue.jsonl"
FAILED_FILE = STATE_DIR / "gsc_refresh_failed.jsonl"
SUCCESS_FILE = STATE_DIR / "gsc_refresh_success.jsonl"
PROMPT_TEMPLATE = Path(__file__).parent / "prompts" / "claude_refresh_review.md"
AUTO_PUBLISH_MIN_SCORE = 7
# DRY_RUN per Task 5 checkpoint: stampa decisione senza chiamare Strapi.update / indexing
DRY_RUN = "--dry-run" in sys.argv


# ─── Helpers I/O ──────────────────────────────────────────────────────────


def _read_queue() -> list[dict]:
    """Legge tutti i candidate JSONL da gsc_refresh_queue.jsonl."""
    if not QUEUE_FILE.exists():
        return []
    out: list[dict] = []
    for line in QUEUE_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"  [WARN] skip riga corrotta: {e}")
    return out


# ─── M7: cluster reverse-lookup ───────────────────────────────────────────


def _cluster_for_keyword(keyword: str | None) -> str:
    """M7 fix: reverse-lookup cluster da keyword via keyword_scout.CLUSTERS.

    Il content-type blog-post NON ha campo `cluster`. Ricaviamo il cluster
    cercando se uno qualsiasi dei seed di un cluster appare nella keyword.

    Esempi:
      "how to smoke meat" -> "smoking"
      "smoked brisket recipe" -> "brisket"
      "completely unrelated" -> "uncategorized"
    """
    k = (keyword or "").lower()
    if not k:
        return "uncategorized"
    for cname, seeds in CLUSTERS.items():
        for seed in seeds:
            if seed.lower() in k:
                return cname
    return "uncategorized"


# ─── M8: conditional metrics_block prompt rendering ──────────────────────


def _build_prompt(candidate: dict, current: dict) -> str:
    """M8 fix: conditional metrics_block rendering based on candidate.branches list.

    Solo le metriche delle branch attive vengono iniettate nel prompt — evita
    rumore (es. CTR opportunity quando il solo segnale e' decay, e vv.).
    """
    template = PROMPT_TEMPLATE.read_text(encoding="utf-8")
    branches = candidate.get("branches", [])
    sections: list[str] = []
    if "decay" in branches:
        decay_pct = candidate.get("metrics_7d", {}).get("decay_pct", 0)
        sections.append(f"Decay 7gg vs media 28gg: -{decay_pct}%")
    if "ctr_opportunity" in branches:
        m28 = candidate.get("metrics_28d", {})
        pos = m28.get("position", 0)
        ctr = m28.get("ctr", 0)
        benchmark = benchmark_for_position(pos) if 1 <= pos <= 10 else 0
        sections.append(
            f"CTR opportunity: pos {pos:.1f} con CTR {ctr * 100:.2f}% "
            f"(benchmark {benchmark * 100:.1f}%)"
        )
    metrics_block = (
        "\n".join(sections)
        if sections
        else "(nessuna metrica significativa - refresh proattivo)"
    )
    return template.format(
        url=candidate.get("url", ""),
        locale=candidate.get("locale", "en"),
        current_title=current.get("title", ""),
        slug=candidate.get("slug", ""),
        gsc_queries_json=json.dumps(
            candidate.get("gsc_queries", []), ensure_ascii=False, indent=2
        ),
        metrics_block=metrics_block,
        competitor_articles_json=json.dumps(
            candidate.get("competitor_articles", []), ensure_ascii=False
        ),
    )


# ─── Strapi fetch current ─────────────────────────────────────────────────


def _fetch_current_article(content_type_strapi: str, slug: str, locale: str) -> dict | None:
    """Recupera l'articolo corrente da Strapi via slug+locale, populate cover.

    Cover image populate per non perdere relazione (anche se non la tocchiamo —
    populate serve solo per leggerla, ma scriviamo back senza cover_image).
    """
    try:
        resp = strapi.find(
            content_type_strapi,
            locale=locale,
            filters={"slug": {"$eq": slug}},
            page_size=1,
            populate="*",
        )
    except Exception as e:
        print(f"  [WARN] strapi.find fallita per {slug}@{locale}: {e}")
        return None
    items = resp.get("data", [])
    return items[0] if items else None


# ─── Per-candidate processing ─────────────────────────────────────────────


def process_candidate(candidate: dict) -> dict:
    """Processa un candidato: fetch + multistep regen + quality gate + apply + reindex.

    Ritorna il record con `decision` aggiornata:
    - "applied"           -> Strapi PUT eseguito + indexing chiamato
    - "needs_human"       -> quality_score < 7 OR critical issues unresolved
    - "skipped_not_found" -> Strapi non trova lo slug
    - "generation_failed" -> Claude generate_article_multistep raise
    - "review_failed"     -> review_article raise (es. Claude CLI down)
    - "apply_failed"      -> strapi.update raise
    - "dry_run_would_apply" -> DRY_RUN attivo, no side-effect
    """
    ct = candidate["content_type"]
    slug = candidate["slug"]
    locale = candidate["locale"]
    current = _fetch_current_article(ct, slug, locale)
    if not current:
        return {**candidate, "decision": "skipped_not_found"}

    # Genera nuova versione usando multistep con priming GSC reale
    title = current.get("title", "")
    gsc_qs = candidate.get("gsc_queries", []) or []
    keyword = gsc_qs[0].get("query", "") if gsc_qs else ""
    # M7 fix: cluster via reverse-lookup, NOT from non-existent Strapi field
    cluster = _cluster_for_keyword(keyword) if keyword else "uncategorized"

    try:
        article = claude.generate_article_multistep(
            title,
            keyword,
            cluster,
            content_type=ct.rstrip("s"),  # "blog-posts" -> "blog-post" (singolare)
            gsc_queries=gsc_qs,
        )
    except Exception as e:
        return {**candidate, "decision": "generation_failed", "error": str(e)}

    # Quality gate Opus (review_article verbatim — semantic-heavy refresh richiede opus)
    # # opus per review semantica completa, sonnet solo per length/keyword check (vedi 17-02 meta_review)
    try:
        review = review_article(
            article_html=article["content"],
            catalog_whitelist=[],
            blog_whitelist=[],
            topic_title=title,
            url_slug=slug,
            content_type=ct.rstrip("s"),
            cluster=cluster,
            keyword=keyword,
        )
    except Exception as e:
        return {**candidate, "decision": "review_failed", "error": str(e)}

    score = review.score
    if score < AUTO_PUBLISH_MIN_SCORE or review.has_unresolved_critical_issues:
        return {
            **candidate,
            "decision": "needs_human",
            "review": {
                "score": score,
                "summary": review.summary,
                "issues": [
                    {
                        "category": i.category,
                        "severity": i.severity,
                        "description": i.description,
                    }
                    for i in review.issues
                ],
            },
        }

    # Apply: aggiorna content + excerpt + seo_*. publishedAt preservata (NON
    # nel payload). cover_image NON nel payload (m4 lock out of scope).
    update_data = {
        "content": review.corrected_html or article["content"],
        "excerpt": article.get("excerpt", ""),
        "seo_title": article.get("seo_title", ""),
        "seo_description": article.get("seo_description", ""),
        "slug": slug,  # required for Strapi v5 localized PUT
    }

    if DRY_RUN:
        print(
            f"  [DRY-RUN] sarebbe applicato: {ct}/{slug}/{locale}, "
            f"cluster={cluster}, score {score}, "
            f"len content {len(update_data['content'])}"
        )
        return {**candidate, "decision": "dry_run_would_apply",
                "review": {"score": score, "summary": review.summary}}

    try:
        # NB: rebuild deliberatamente NON soppresso — refresh IS un full content change,
        # il rebuild Astro deve scattare. (Strapi webhook ascolta solo
        # entry.publish/unpublish/delete; il toggle publish post-update fa scattare
        # il rebuild per design, vedi 17-02 SUMMARY checkpoint discovery.)
        strapi.update(ct, current["documentId"], update_data, locale=locale)
    except Exception as e:
        return {**candidate, "decision": "apply_failed", "error": str(e)}

    # Re-index (best-effort, mai blocca)
    try:
        gsc_client.request_indexing(candidate["url"])
        indexnow_client.ping([candidate["url"]])
    except Exception as e:
        print(f"  [WARN] re-index fail {candidate['url']}: {e}")

    return {
        **candidate,
        "decision": "applied",
        "review": {"score": score, "summary": review.summary},
        "applied_at": datetime.now().isoformat(),
    }


# ─── Entry point ──────────────────────────────────────────────────────────


def main() -> None:
    queue = _read_queue()
    if not queue:
        telegram.send_agent_report(
            "GSC Refresh Review",
            "Nessun candidato in coda.",
            details=[
                "Verifica che gsc_refresh.py (Ubuntu .119 Sun 08:00 UTC) "
                "sia girato e abbia scritto la coda.",
            ],
        )
        return

    applied = 0
    failed = 0
    needs_human = 0
    dry_runs = 0
    for c in queue:
        try:
            result = process_candidate(c)
            d = result.get("decision")
            target = SUCCESS_FILE if d == "applied" else FAILED_FILE
            atomic_io.append_jsonl_atomic(target, result)
            if d == "applied":
                applied += 1
            elif d == "needs_human":
                needs_human += 1
            elif d == "dry_run_would_apply":
                dry_runs += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"[ERR] processing {c.get('url')}: {e}")
            telegram.send_agent_report(
                "GSC Refresh Review",
                f"ERROR processing candidate {c.get('url')}: {e}",
                details=[
                    "Verifica Claude CLI OAuth session attiva",
                    "Verifica state/gsc_refresh_queue.jsonl integrity",
                ],
            )

    # Reset queue dopo processing (no append cumulativo settimanale).
    # In DRY_RUN preserviamo la queue per ripetere il sample-review.
    if not DRY_RUN:
        QUEUE_FILE.unlink(missing_ok=True)

    if DRY_RUN:
        msg = (f"[DRY-RUN] Coda: {len(queue)} | Would apply: {dry_runs} | "
               f"Needs human: {needs_human} | Fail: {failed}")
        next_step = "DRY-RUN: nessuna modifica effettiva. Rimuovi --dry-run per applicare."
    else:
        msg = (f"Coda: {len(queue)} | Applicati: {applied} | "
               f"Needs human: {needs_human} | Fail: {failed}")
        next_step = (
            "Verifica gsc_refresh_failed.jsonl per i rejected."
            if (needs_human + failed) > 0
            else "Refresh week completato senza needs_human."
        )
    telegram.send_agent_report("GSC Refresh Review", msg, details=[next_step])


if __name__ == "__main__":
    main()
