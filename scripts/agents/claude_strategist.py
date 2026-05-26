#!/usr/bin/env python3
"""
Claude Strategist — Analisi settimanale e generazione pillar content.
Usa Claude Code CLI (piano Pro Max) per:
1. Analizzare performance e decidere strategia
2. Generare pillar content di altissima qualita

Cron: Domenica 07:00 su 192.168.1.119 (prima del keyword_scout di lunedi).
"""

import os
import sys
import json
from datetime import datetime, timedelta, date
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import claude_client as claude
from agents.lib import ollama
from agents.lib import gsc_client
# B1 fix: shared source of truth (no try/except fallback, no inline duplicate)
from agents.lib.ctr_benchmark import CTR_BENCHMARK, benchmark_for_position

UMAMI_URL = os.environ.get("UMAMI_URL", "https://analytics.bbq-experience.com")
UMAMI_PASSWORD = os.environ.get("UMAMI_PASSWORD", "")
UMAMI_SITE_ID = os.environ.get("UMAMI_SITE_ID", "78df95b7-1b94-43e7-9f0d-38c63e99cf64")
STATE_DIR = Path(__file__).parent.parent.parent / "state"


def get_traffic_summary() -> str:
    """Recupera riassunto traffico ultima settimana da Umami."""
    try:
        # Autenticazione
        auth_url = f"{UMAMI_URL}/api/auth/login"
        auth_body = json.dumps({"username": "admin", "password": UMAMI_PASSWORD}).encode()
        auth_req = Request(auth_url, data=auth_body, headers={"Content-Type": "application/json"})
        with urlopen(auth_req, timeout=10) as resp:
            token = json.loads(resp.read())["token"]

        # Statistiche ultimi 7 giorni
        end = datetime.now()
        start = end - timedelta(days=7)
        stats_url = (
            f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/stats"
            f"?startAt={start.strftime('%Y-%m-%d')}T00:00:00"
            f"&endAt={end.strftime('%Y-%m-%d')}T23:59:59"
        )
        stats_req = Request(stats_url, headers={"Authorization": f"Bearer {token}"})
        with urlopen(stats_req, timeout=10) as resp:
            stats = json.loads(resp.read())

        return (
            f"Pageviews 7gg: {stats.get('pageviews', {}).get('value', '?')}\n"
            f"Visitatori unici 7gg: {stats.get('visitors', {}).get('value', '?')}\n"
            f"Bounce rate: {stats.get('bounces', {}).get('value', '?')}%\n"
            f"Tempo medio: {stats.get('totaltime', {}).get('value', '?')}ms"
        )
    except Exception as e:
        return f"Umami non disponibile: {e}"


def get_content_performance() -> str:
    """Recupera metriche contenuti per tipo."""
    lines: list[str] = []
    for ct in ["reviews", "recipes", "tutorials", "blog-posts"]:
        items = strapi.find_all_pages(ct, fields=["title", "slug"], page_size=100)
        lines.append(f"{ct}: {len(items)} pubblicati")

    # ContentQueue stats
    queue = strapi.find_all_pages("content-queues", status="draft", fields=["status"])
    status_counts: dict[str, int] = {}
    for item in queue:
        s = item.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    lines.append(f"\nContentQueue: {status_counts}")

    return "\n".join(lines)


CONTENT_TYPES = ["blog-posts", "reviews", "recipes", "tutorials"]


def get_traffic_scores() -> str:
    """Recupera traffic_score per contenuto da Strapi (scritto da umami_feedback.py)."""
    all_items: list[dict] = []

    for locale in ["en", "it", "es"]:
        for ct in CONTENT_TYPES:
            try:
                items = strapi.find_all_pages(
                    ct,
                    locale=locale,
                    fields=["title", "slug", "traffic_score_7d", "traffic_score_30d"],
                    page_size=500,
                )
                for it in items:
                    if (it.get("traffic_score_7d") or 0) > 0:
                        it["_locale"] = locale
                        it["_type"] = ct
                        all_items.append(it)
            except Exception:
                continue

    if not all_items:
        return "Nessun dato traffic_score disponibile (umami_feedback non ancora eseguito)"

    all_items.sort(key=lambda x: x.get("traffic_score_7d", 0), reverse=True)

    lines: list[str] = ["TOP PERFORMERS (7d visits):"]
    for i, it in enumerate(all_items[:10], 1):
        lines.append(
            f"{i}. [{it.get('_locale', '?')}] \"{it.get('title', '?')}\" "
            f"- {it.get('traffic_score_7d', 0)} visits "
            f"(30d: {it.get('traffic_score_30d', 0)})"
        )

    lines.append("")
    lines.append("UNDERPERFORMERS (candidates for refresh):")
    bottom = all_items[-10:] if len(all_items) > 10 else []
    for i, it in enumerate(bottom, 1):
        lines.append(
            f"{i}. [{it.get('_locale', '?')}] \"{it.get('title', '?')}\" "
            f"- {it.get('traffic_score_7d', 0)} visits "
            f"(30d: {it.get('traffic_score_30d', 0)})"
        )

    return "\n".join(lines)


def get_competitor_news() -> str:
    """Recupera ultimi articoli competitor dal file di stato."""
    state_file = STATE_DIR / "competitor_state.json"
    if not state_file.exists():
        return "Nessun dato competitor"

    state = json.loads(state_file.read_text(encoding="utf-8"))
    total = len(state.get("seen_urls", []))
    last_check = state.get("last_check", "mai")
    return f"URL monitorati: {total}, ultimo check: {last_check}"


def get_current_queue() -> str:
    """Recupera articoli in coda."""
    items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$in": ["ready", "idea", "research"]}},
        sort="priority:asc",
        fields=["title", "cluster", "target_keyword", "status"],
    )
    if not items:
        return "Coda vuota"

    lines: list[str] = []
    for item in items[:15]:
        lines.append(
            f"- [{item.get('status')}] {item.get('title')} "
            f"(cluster: {item.get('cluster')}, kw: {item.get('target_keyword')})"
        )
    return "\n".join(lines)


def get_gsc_digest() -> dict:
    """Digest GSC settimanale per il prompt strategist (Plan 17-03).

    4 sezioni:
    - summary_delta: 7d vs prev 7d (clicks/imp/ctr/pos + delta_clicks_pct + delta_pos)
    - striking_top10: pos in [8,20] AND imp>=30
    - ctr_opportunity_top10: pos in [1,10] AND ctr<benchmark, sorted by gap_pct desc
    - declining_top10: decay>=30% AND imp_28d>=200

    Graceful degrade: qualsiasi errore GSC -> dict con liste vuote, mai raise.
    Caller (main) propaga al claude_client.generate_strategy via gsc_digest kwarg;
    se vuoto, il prompt finale non include il blocco GSC WEEKLY DIGEST.
    """
    result = {
        "summary_delta": {},
        "striking_top10": [],
        "ctr_opportunity_top10": [],
        "declining_top10": [],
    }
    try:
        end = date.today() - timedelta(days=3)
        start_7 = end - timedelta(days=7)
        start_prev = start_7 - timedelta(days=7)
        start_28 = end - timedelta(days=28)

        # Summary delta: aggrega clicks/imp/ctr/position 7d vs prev 7d
        curr_7 = gsc_client.search_analytics(
            start_date=start_7.isoformat(), end_date=end.isoformat(),
            dimensions=["date"], row_limit=10,
        )
        prev_7 = gsc_client.search_analytics(
            start_date=start_prev.isoformat(),
            end_date=(start_7 - timedelta(days=1)).isoformat(),
            dimensions=["date"], row_limit=10,
        )

        def _agg(rows):
            if not rows:
                return {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}
            cl = sum(r.get("clicks", 0) for r in rows)
            im = sum(r.get("impressions", 0) for r in rows)
            ctr = (cl / im) if im else 0
            pos = sum(r.get("position", 0) for r in rows) / len(rows)
            return {"clicks": cl, "impressions": im, "ctr": ctr, "position": pos}

        c = _agg(curr_7)
        p = _agg(prev_7)
        result["summary_delta"] = {
            "total_clicks_7d": c["clicks"],
            "total_clicks_prev_7d": p["clicks"],
            "total_imp_7d": c["impressions"],
            "total_imp_prev_7d": p["impressions"],
            "avg_ctr_7d": c["ctr"],
            "avg_ctr_prev_7d": p["ctr"],
            "avg_pos_7d": c["position"],
            "avg_pos_prev_7d": p["position"],
            "delta_clicks_pct": ((c["clicks"] - p["clicks"]) / p["clicks"] * 100) if p["clicks"] else 0,
            "delta_pos": c["position"] - p["position"],
        }

        # Striking distance (query level, 28d)
        striking_rows = gsc_client.search_analytics(
            start_date=start_28.isoformat(), end_date=end.isoformat(),
            dimensions=["query"], row_limit=5000,
        )
        striking: list[dict] = []
        for r in striking_rows:
            pos = r.get("position", 0)
            imp = r.get("impressions", 0)
            if not (8 <= pos <= 20):
                continue
            if imp < 30:
                continue
            striking.append({
                "query": r["keys"][0],
                "position": round(pos, 1),
                "impressions": imp,
                "clicks": r.get("clicks", 0),
                "ctr": r.get("ctr", 0),
            })
        striking.sort(key=lambda x: x["impressions"], reverse=True)
        result["striking_top10"] = striking[:10]

        # CTR opportunity (page level, 28d, pos 1-10 sotto benchmark)
        pages_28 = gsc_client.search_analytics(
            start_date=start_28.isoformat(), end_date=end.isoformat(),
            dimensions=["page"], row_limit=2000,
        )
        opp: list[dict] = []
        for r in pages_28:
            pos = r.get("position", 0)
            imp = r.get("impressions", 0)
            if not (1 <= pos <= 10):
                continue
            if imp < 100:
                continue
            ctr = r.get("ctr", 0)
            benchmark = benchmark_for_position(pos)  # shared helper, no fallback
            if ctr >= benchmark:
                continue
            opp.append({
                "url": r["keys"][0],
                "position": round(pos, 1),
                "impressions": imp,
                "clicks": r.get("clicks", 0),
                "ctr": ctr,
                "benchmark_ctr": benchmark,
                "gap_pct": (benchmark - ctr) / benchmark * 100,
            })
        opp.sort(key=lambda x: x["gap_pct"], reverse=True)
        result["ctr_opportunity_top10"] = opp[:10]

        # Declining (page level, decay 7d vs avg 28d)
        pages_7 = gsc_client.search_analytics(
            start_date=start_7.isoformat(), end_date=end.isoformat(),
            dimensions=["page"], row_limit=2000,
        )
        pages_7_map = {r["keys"][0]: r for r in pages_7}
        declining: list[dict] = []
        for r in pages_28:
            url = r["keys"][0]
            imp_28 = r.get("impressions", 0)
            cl_28 = r.get("clicks", 0)
            if imp_28 < 200:
                continue
            avg_w = cl_28 / 4.0
            if avg_w == 0:
                continue
            row7 = pages_7_map.get(url, {})
            cl_7 = row7.get("clicks", 0)
            decay = (avg_w - cl_7) / avg_w * 100
            if decay < 30:
                continue
            declining.append({
                "url": url,
                "clicks_7d": cl_7,
                "clicks_prev_7d_avg": round(avg_w, 1),
                "decay_pct": round(decay, 1),
                "position_drift": round(row7.get("position", 0) - r.get("position", 0), 1),
            })
        declining.sort(key=lambda x: x["decay_pct"], reverse=True)
        result["declining_top10"] = declining[:10]
    except Exception as e:
        print(f"[strategist] get_gsc_digest fallita (graceful degrade): {e}")
    return result


def should_generate_pillar() -> dict | None:
    """Determina se e il momento di generare un pillar article.
    Ritorna info sul pillar da generare o None."""
    # Controlla quanti satellite per cluster
    cluster_counts: dict[str, int] = {}
    for ct in ["blog-posts", "tutorials", "recipes"]:
        items = strapi.find_all_pages(ct, fields=["title"], page_size=500)
        # Conta approssimativamente per cluster basandosi sui titoli
        for item in items:
            title = item.get("title", "").lower()
            for cluster in ["smoking", "grills", "thermometers", "brisket", "sauces"]:
                keywords = {
                    "smoking": ["smok", "wood", "pellet"],
                    "grills": ["grill", "charcoal", "gas", "bbq grill"],
                    "thermometers": ["thermometer", "temperature", "probe", "thermapen", "meater"],
                    "brisket": ["brisket", "beef"],
                    "sauces": ["sauce", "rub", "marinade"],
                }
                if any(kw in title for kw in keywords.get(cluster, [])):
                    cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1
                    break

    # Se un cluster ha 10+ satellite, e pronto per un pillar
    pillar_topics = {
        "smoking": {
            "title": "The Ultimate Guide to BBQ Smoking",
            "keyword": "how to smoke meat",
        },
        "grills": {
            "title": "BBQ Grills Buyer's Guide 2026",
            "keyword": "best bbq grill",
        },
        "thermometers": {
            "title": "BBQ Thermometer Complete Guide",
            "keyword": "best meat thermometer",
        },
        "brisket": {
            "title": "Mastering Brisket: The Complete Guide",
            "keyword": "how to cook brisket",
        },
        "sauces": {
            "title": "BBQ Sauce & Rubs Encyclopedia",
            "keyword": "bbq sauce recipe",
        },
    }

    for cluster, count in sorted(cluster_counts.items(), key=lambda x: -x[1]):
        if count >= 8:  # Soglia per pillar
            return {**pillar_topics.get(cluster, {}), "cluster": cluster, "satellite_count": count}

    return None


def publish_pillar(title: str, content: str, keyword: str, cluster: str) -> str | None:
    """Pubblica pillar article su Strapi come tutorial. Ritorna documentId."""
    import re
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"[\s]+", "-", slug).strip("-")[:80]

    word_count = len(content.split())

    try:
        resp = strapi.create("tutorials", {
            "title": title,
            "slug": slug,
            "content": content,
            "excerpt": f"The definitive guide to {keyword}. Everything you need to know.",
            "category": "knowledge",
            "difficulty": "beginner",
            "reading_time": max(1, word_count // 200),
            "seo_title": title[:60],
            "seo_description": f"Complete {keyword} guide with expert tips, techniques, and recommendations from The Pitmaster at BBQ Experience."[:155],
            "published_date": datetime.now().strftime("%Y-%m-%d"),
        })
        doc_id = resp.get("data", {}).get("documentId")

        # Traduci con Ollama per IT e ES
        for locale in ["it", "es"]:
            try:
                lang = "italiano" if locale == "it" else "spagnolo"
                translated = ollama.generate(
                    f"Traduci in {lang}. Converti unita: F->C, lbs->kg. Mantieni HTML.\n\n{content[:6000]}",
                    system=ollama.TRANSLATOR_SYSTEM,
                    max_tokens=8192,
                )
                strapi.update("tutorials", doc_id, {
                    "title": title,
                    "slug": slug,
                    "content": translated,
                    "published_date": datetime.now().strftime("%Y-%m-%d"),
                }, locale=locale)
            except Exception as e:
                print(f"[WARN] Traduzione {locale} pillar fallita: {e}")

        return doc_id
    except Exception as e:
        print(f"[ERRORE] Pubblicazione pillar fallita: {e}")
        return None


def main():
    print(f"[{datetime.now().isoformat()}] Claude Strategist avviato")

    # 1. Raccogli dati
    traffic = get_traffic_summary()
    performance = get_content_performance()
    competitor = get_competitor_news()
    queue = get_current_queue()
    traffic_scores = get_traffic_scores()
    # Plan 17-03: GSC weekly digest (graceful degrade su qualsiasi errore)
    gsc_digest = get_gsc_digest()

    print("Dati raccolti, genero analisi strategica con Claude...")

    # 2. Genera analisi strategica con Claude (GSC digest iniettato come kwarg
    # backward-compat: gsc_digest=None mantiene il comportamento pre-Phase 17)
    try:
        strategy = claude.generate_strategy(
            traffic, performance, competitor, queue, traffic_scores,
            gsc_digest=gsc_digest,
        )
    except Exception as e:
        print(f"[ERRORE] Claude non disponibile: {e}")
        telegram.send_agent_report(
            "Claude Strategist",
            f"ERRORE: Claude CLI non disponibile — {e}",
        )
        return

    # Salva report su file
    report_file = STATE_DIR / "weekly_strategy.md"
    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(
        f"# Strategy Report — {datetime.now().strftime('%Y-%m-%d')}\n\n{strategy}",
        encoding="utf-8",
    )
    print(f"Report salvato in {report_file}")

    # 3. Genera pillar content se il cluster e pronto
    pillar_info = should_generate_pillar()
    pillar_report = ""

    if pillar_info:
        title = pillar_info["title"]
        keyword = pillar_info["keyword"]
        cluster = pillar_info["cluster"]
        count = pillar_info["satellite_count"]

        print(f"\nCluster '{cluster}' pronto per pillar ({count} satellite). Genero con Claude...")

        try:
            # Genera outline prima
            outline = claude.ask(
                f"Crea un outline dettagliato per un articolo pillar di 5000 parole su: {title}\n"
                f"Keyword: {keyword}\nCluster: {cluster}\n"
                f"Il sito ha gia {count} articoli satellite su questo topic.\n"
                f"L'outline deve coprire tutti gli aspetti principali con 8-12 sezioni.",
                timeout=120,
            )

            # Genera contenuto completo
            content = claude.generate_pillar_content(title, keyword, cluster, outline)

            if len(content) > 2000:  # Verifica che abbia generato contenuto sostanziale
                doc_id = publish_pillar(title, content, keyword, cluster)
                if doc_id:
                    pillar_report = f"\n\nPILLAR PUBBLICATO: <b>{title}</b> ({len(content.split())} parole, 3 lingue)"
                    print(f"Pillar pubblicato: {title} ({doc_id})")
                else:
                    pillar_report = f"\n\nPILLAR FALLITO: errore pubblicazione {title}"
            else:
                pillar_report = f"\n\nPILLAR SKIPPATO: contenuto generato troppo corto ({len(content)} chars)"
        except Exception as e:
            pillar_report = f"\n\nPILLAR ERRORE: {e}"
            print(f"Errore generazione pillar: {e}")
    else:
        pillar_report = "\n\nNessun cluster pronto per pillar (serve 8+ satellite articles)"

    # 4. Report Telegram
    # Tronca la strategia per Telegram (max 3000 char)
    strategy_short = strategy[:2500] + "..." if len(strategy) > 2500 else strategy

    telegram.send_agent_report(
        "Claude Strategist",
        f"Analisi settimanale completata{pillar_report}",
        [strategy_short],
    )

    print(f"\n[{datetime.now().isoformat()}] Claude Strategist completato")


if __name__ == "__main__":
    main()
