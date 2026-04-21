#!/usr/bin/env python3
"""Agente notturno — recupera traffico Umami e scrive traffic_score in Strapi."""

import os
import sys
import time
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import umami_client as umami
from agents.lib import strapi_client as strapi
from agents.lib import telegram

# Locali supportati
LOCALES = ["en", "it", "es"]

# Soglie filtro bassa confidenza (ANLY-05)
MIN_VISITS = 50
MIN_DAYS_PUBLISHED = 7

# Mappa segmenti URL localizzati -> nome API Strapi
ROUTE_TO_CONTENT_TYPE: dict[str, str] = {
    "blog": "blog-posts",
    "reviews": "reviews", "recensioni": "reviews", "resenas": "reviews",
    "recipes": "recipes", "ricette": "recipes", "recetas": "recipes",
    "tutorials": "tutorials", "guide": "tutorials", "tutoriales": "tutorials",
}

# Content type da iterare per indicizzazione Strapi
CONTENT_TYPES = ["blog-posts", "reviews", "recipes", "tutorials"]


def parse_umami_path(path: str) -> tuple[str, str, str] | None:
    """Converte path Umami (es. /en/blog/my-article/) in (content_type, slug, locale).

    Restituisce None se il path non corrisponde a una pagina di dettaglio contenuto.
    """
    # Rimuovi slash iniziali/finali e splitta
    segments = [s for s in path.strip("/").split("/") if s]

    if len(segments) < 3:
        return None

    locale = segments[0]
    if locale not in LOCALES:
        return None

    route_segment = segments[1]
    content_type = ROUTE_TO_CONTENT_TYPE.get(route_segment)
    if content_type is None:
        return None

    slug = segments[2]
    return (content_type, slug, locale)


def is_high_confidence(visits: int, published_date: str | None) -> bool:
    """Verifica se il contenuto ha abbastanza dati per un aggiornamento affidabile.

    Esclude contenuti con meno di MIN_VISITS visite o pubblicati da meno di
    MIN_DAYS_PUBLISHED giorni (ANLY-05).
    """
    if visits < MIN_VISITS:
        return False

    if published_date is None:
        return False

    try:
        pub_date = date.fromisoformat(published_date)
    except (ValueError, TypeError):
        return False

    days_since = (date.today() - pub_date).days
    if days_since < MIN_DAYS_PUBLISHED:
        return False

    return True


def fetch_traffic_data(days: int) -> list[dict]:
    """Recupera metriche traffico per URL path degli ultimi N giorni.

    CRITICO: Umami usa timestamp in millisecondi, non secondi.
    """
    now_ms = int(time.time() * 1000)
    start_ms = now_ms - (days * 24 * 60 * 60 * 1000)
    return umami.get_metrics_by_path(start_ms, now_ms)


def build_content_index() -> dict[tuple[str, str, str], dict]:
    """Costruisce indice {(content_type, slug, locale): {documentId, published_date, title, slug}}.

    Itera tutti i content type e tutti i locale per avere una mappa completa.
    """
    index: dict[tuple[str, str, str], dict] = {}

    for ct in CONTENT_TYPES:
        for locale in LOCALES:
            try:
                items = strapi.find_all_pages(
                    ct,
                    locale=locale,
                    fields=["slug", "published_date", "title"],
                )
            except Exception as e:
                print(f"[WARN] Errore fetch {ct}/{locale}: {e}")
                continue

            for item in items:
                slug = item.get("slug", "")
                if not slug:
                    continue
                index[(ct, slug, locale)] = {
                    "documentId": item.get("documentId", ""),
                    "published_date": item.get("published_date"),
                    "title": item.get("title", ""),
                    "slug": slug,
                }

    return index


def run() -> dict:
    """Orchestratore principale — recupera traffico, filtra, aggiorna Strapi."""
    print("[Umami Feedback] Inizio esecuzione...")

    # 1. Costruisci indice contenuti da Strapi
    content_index = build_content_index()
    print(f"[Umami Feedback] Indicizzati {len(content_index)} contenuti")

    # 2. Recupera dati traffico 7d e 30d
    data_7d = fetch_traffic_data(7)
    data_30d = fetch_traffic_data(30)

    # 3. Costruisci lookup {(ct, slug, locale): {visits_7d, visits_30d}} da path Umami
    traffic: dict[tuple[str, str, str], dict[str, int]] = {}

    for item in data_7d:
        # Validazione risposta Umami (T-15-02)
        if not isinstance(item, dict) or "x" not in item or "y" not in item:
            continue
        parsed = parse_umami_path(str(item["x"]))
        if parsed:
            key = parsed
            traffic.setdefault(key, {"visits_7d": 0, "visits_30d": 0})
            traffic[key]["visits_7d"] = int(item["y"])

    for item in data_30d:
        if not isinstance(item, dict) or "x" not in item or "y" not in item:
            continue
        parsed = parse_umami_path(str(item["x"]))
        if parsed:
            key = parsed
            traffic.setdefault(key, {"visits_7d": 0, "visits_30d": 0})
            traffic[key]["visits_30d"] = int(item["y"])

    # 4. Aggiorna Strapi per ogni contenuto con dati di traffico
    stats = {"updated": 0, "skipped_low_confidence": 0, "not_found": 0, "errors": 0}
    now_iso = datetime.utcnow().isoformat()

    for key, content_info in content_index.items():
        ct, slug, locale = key
        t = traffic.get(key)

        if t is None:
            stats["not_found"] += 1
            continue

        visits_7d = t.get("visits_7d", 0)
        if not is_high_confidence(visits_7d, content_info.get("published_date")):
            stats["skipped_low_confidence"] += 1
            continue

        doc_id = content_info["documentId"]
        try:
            strapi.update(ct, doc_id, {
                "slug": content_info["slug"],  # Obbligatorio per Strapi v5 locale PUT
                "traffic_score_7d": visits_7d,
                "traffic_score_30d": t.get("visits_30d", 0),
                "traffic_last_updated": now_iso,
            }, locale=locale)
            stats["updated"] += 1
        except Exception as e:
            print(f"[ERROR] Aggiornamento {ct}/{slug}/{locale}: {e}")
            stats["errors"] += 1

    # 5. Report Telegram
    summary = (
        f"Aggiornati {stats['updated']} contenuti, "
        f"esclusi {stats['skipped_low_confidence']} (bassa confidenza), "
        f"{stats['not_found']} senza traffico, "
        f"{stats['errors']} errori"
    )
    details = [
        f"Contenuti indicizzati: {len(content_index)}",
        f"Path con traffico 7d: {len(data_7d)}",
        f"Path con traffico 30d: {len(data_30d)}",
    ]
    telegram.send_agent_report("Umami Feedback", summary, details)

    print(f"[Umami Feedback] Completato: {summary}")
    return stats


if __name__ == "__main__":
    run()
