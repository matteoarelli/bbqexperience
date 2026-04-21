#!/usr/bin/env python3
"""
Telegram Bot — Mission Control per BBQ Experience.
Daemon: systemd service su Hetzner. Sostituisce telegram_dashboard.py (cron).
Report giornaliero alle 21:00 + comandi interattivi.
"""

import os
import sys
import json
import asyncio
import subprocess
from datetime import datetime, time as dtime
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi

# Importa python-telegram-bot
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
UMAMI_URL = os.environ.get("UMAMI_URL", "https://analytics.bbq-experience.com")
UMAMI_PASSWORD = os.environ.get("UMAMI_PASSWORD", "")
UMAMI_SITE_ID = os.environ.get("UMAMI_SITE_ID", "78df95b7-1b94-43e7-9f0d-38c63e99cf64")
PAUSE_FLAG = Path(__file__).parent.parent.parent / "state" / "agents_paused"

# ─── Utility Umami ────────────────────────────────────────────────────────────

def get_umami_token() -> str:
    """Autentica su Umami e ritorna token."""
    url = f"{UMAMI_URL}/api/auth/login"
    body = json.dumps({"username": "admin", "password": UMAMI_PASSWORD}).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())["token"]


def get_umami_stats(token: str) -> dict:
    """Recupera statistiche giornaliere da Umami."""
    today = datetime.now().strftime("%Y-%m-%d")
    url = f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/stats?startAt={today}T00:00:00&endAt={today}T23:59:59"
    req = Request(url, headers={"Authorization": f"Bearer {token}"})
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


# ─── Digest traffico per contenuto ────────────────────────────────────────────

CONTENT_TYPES = ["blog-posts", "reviews", "recipes", "tutorials"]


def get_traffic_digest() -> list[str]:
    """Genera digest Top 5 / Bottom 5 per traffico 7gg per ogni locale."""
    lines: list[str] = []

    for locale in ["en", "it", "es"]:
        all_items: list[dict] = []
        for ct in CONTENT_TYPES:
            try:
                items = strapi.find_all_pages(
                    ct,
                    locale=locale,
                    fields=["title", "slug", "traffic_score_7d"],
                    sort="traffic_score_7d:desc",
                    page_size=500,
                )
                all_items.extend(items)
            except Exception:
                continue

        # Filtra solo items con traffico > 0
        scored = [
            it for it in all_items
            if (it.get("traffic_score_7d") or 0) > 0
        ]
        scored.sort(key=lambda x: x.get("traffic_score_7d", 0), reverse=True)

        if not scored:
            continue

        top5 = scored[:5]
        bottom5 = scored[-5:] if len(scored) > 5 else []

        lines.append(f"<b>TRAFFICO {locale.upper()} (7gg)</b>")
        lines.append("Top 5:")
        for it in top5:
            lines.append(f"  {it.get('traffic_score_7d', 0)}v - {it.get('title', '?')}")
        if bottom5:
            lines.append("Bottom 5:")
            for it in bottom5:
                lines.append(f"  {it.get('traffic_score_7d', 0)}v - {it.get('title', '?')}")
        lines.append("")

    return lines


# ─── Conteggio contenuti ─────────────────────────────────────────────────────

def get_content_counts() -> dict[str, int]:
    """Conta contenuti per tipo."""
    counts: dict[str, int] = {}
    for ct in ["reviews", "recipes", "tutorials", "blog-posts", "instagram-posts", "subscribers"]:
        try:
            resp = strapi.find(ct, status="draft" if ct == "subscribers" else "published", page_size=1)
            counts[ct] = resp.get("meta", {}).get("pagination", {}).get("total", 0)
        except Exception:
            counts[ct] = 0
    return counts


def get_queue_status() -> dict:
    """Status della ContentQueue."""
    queue = strapi.find_all_pages("content-queues", status="draft", fields=["status"])
    status_counts: dict[str, int] = {}
    for item in queue:
        s = item.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    return status_counts


def get_pipeline_status() -> list[dict]:
    """Status pipeline partnership."""
    return strapi.find_all_pages("partnerships", status="draft", populate="brand")


# ─── Report giornaliero ──────────────────────────────────────────────────────

async def daily_report(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Invia report giornaliero alle 21:00."""
    lines: list[str] = ["<b>📊 BBQ Experience — Report Giornaliero</b>", ""]

    # Traffico Umami
    try:
        token = get_umami_token()
        stats = get_umami_stats(token)
        lines.append("<b>TRAFFICO</b>")
        lines.append(f"• Pageviews: {stats.get('pageviews', {}).get('value', 0)}")
        lines.append(f"• Visitatori unici: {stats.get('visitors', {}).get('value', 0)}")
        lines.append(f"• Bounce rate: {stats.get('bounces', {}).get('value', 0)}%")
        lines.append("")
    except Exception as e:
        lines.append(f"<i>Umami non disponibile: {e}</i>")
        lines.append("")

    # Digest traffico per contenuto
    try:
        traffic_lines = get_traffic_digest()
        if traffic_lines:
            lines.extend(traffic_lines)
            lines.append("")
    except Exception as e:
        lines.append(f"<i>Traffic digest non disponibile: {e}</i>")
        lines.append("")

    # Contenuti
    counts = get_content_counts()
    lines.append("<b>CONTENUTI</b>")
    lines.append(f"• Reviews: {counts.get('reviews', 0)}")
    lines.append(f"• Ricette: {counts.get('recipes', 0)}")
    lines.append(f"• Tutorial: {counts.get('tutorials', 0)}")
    lines.append(f"• Blog: {counts.get('blog-posts', 0)}")
    lines.append(f"• Post IG: {counts.get('instagram-posts', 0)}")
    lines.append(f"• Subscriber: {counts.get('subscribers', 0)}")
    lines.append("")

    # ContentQueue
    queue = get_queue_status()
    if queue:
        lines.append("<b>CODA AI</b>")
        for status, count in sorted(queue.items()):
            lines.append(f"• {status}: {count}")
        lines.append("")

    # Partnership
    partnerships = get_pipeline_status()
    if partnerships:
        lines.append("<b>PARTNERSHIP</b>")
        for p in partnerships[:5]:
            brand = p.get("brand", {})
            brand_name = brand.get("name", "?") if isinstance(brand, dict) else "?"
            lines.append(f"• {brand_name}: {p.get('status', '?')}")
        lines.append("")

    # Links
    lines.append("<b>LINKS</b>")
    lines.append('• <a href="https://bbq-experience.com">Sito</a>')
    lines.append('• <a href="https://cms.bbq-experience.com/admin">CMS</a>')
    lines.append('• <a href="https://analytics.bbq-experience.com">Analytics</a>')

    await context.bot.send_message(
        chat_id=CHAT_ID,
        text="\n".join(lines),
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


# ─── Comandi ──────────────────────────────────────────────────────────────────

async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /stats — report istantaneo."""
    await daily_report(context)


async def cmd_queue(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /queue — mostra articoli in coda."""
    items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$in": ["ready", "generating"]}},
        sort="priority:asc",
        fields=["title", "status", "scheduled_date", "cluster", "target_keyword"],
    )
    if not items:
        await update.message.reply_text("Coda vuota — lancia keyword_scout per popolarla.")
        return

    lines = ["<b>📝 Coda Pubblicazione</b>", ""]
    for item in items[:15]:
        lines.append(f"• [{item.get('status', '?')}] <b>{item.get('title', '?')}</b>")
        lines.append(f"  {item.get('target_keyword', '')} | {item.get('cluster', '')} | {item.get('scheduled_date', '')}")
    await update.message.reply_html("\n".join(lines))


async def cmd_keywords(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /keywords — top keyword opportunities."""
    items = strapi.find_all_pages(
        "keyword-trackers",
        status="draft",
        filters={"is_low_hanging": {"$eq": "true"}},
        sort="impressions:desc",
        fields=["keyword", "position", "impressions", "trend"],
    )
    if not items:
        await update.message.reply_text("Nessun dato keyword — lancia keyword_scout per iniziare.")
        return

    lines = ["<b>🎯 Top Keyword Opportunities</b>", ""]
    for item in items[:10]:
        trend_icon = "📈" if item.get("trend") == "rising" else "📉" if item.get("trend") == "falling" else "➡️"
        lines.append(f"{trend_icon} <b>{item.get('keyword', '?')}</b> — pos {item.get('position', '?')}, {item.get('impressions', 0)} imp")
    await update.message.reply_html("\n".join(lines))


async def cmd_pipeline(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /pipeline — status partnership."""
    partnerships = get_pipeline_status()
    if not partnerships:
        await update.message.reply_text("Pipeline vuoto — aggiungi brand in Strapi.")
        return

    lines = ["<b>🤝 Partnership Pipeline</b>", ""]
    for p in partnerships:
        brand = p.get("brand", {})
        brand_name = brand.get("name", "?") if isinstance(brand, dict) else "?"
        lines.append(f"• <b>{brand_name}</b>: {p.get('status', '?')} (dal {p.get('contact_date', '?')})")
    await update.message.reply_html("\n".join(lines))


async def cmd_competitors(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /competitors — ultimi articoli competitor."""
    state_file = Path(__file__).parent.parent.parent / "state" / "competitor_state.json"
    if not state_file.exists():
        await update.message.reply_text("Nessun dato competitor — attendi il primo run del monitor.")
        return

    state = json.loads(state_file.read_text())
    last_check = state.get("last_check", "mai")
    total = len(state.get("seen_urls", []))
    await update.message.reply_html(
        f"<b>📡 Competitor Monitor</b>\n\n"
        f"Ultimo check: {last_check}\n"
        f"URL monitorati: {total}\n\n"
        f"<i>Alert nuovi articoli arrivano automaticamente.</i>"
    )


async def cmd_pause(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /pause — pausa agenti per 24h."""
    PAUSE_FLAG.parent.mkdir(parents=True, exist_ok=True)
    PAUSE_FLAG.write_text(datetime.now().isoformat())
    await update.message.reply_text("⏸️ Agenti in pausa per 24h. Usa /resume per riprendere.")


async def cmd_resume(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /resume — riprendi agenti."""
    if PAUSE_FLAG.exists():
        PAUSE_FLAG.unlink()
    await update.message.reply_text("▶️ Agenti ripresi.")


async def cmd_publish(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /publish — pubblica prossimo articolo in coda."""
    await update.message.reply_text("🚀 Lancio content_generator...")
    try:
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "content_generator.py")],
            capture_output=True, text=True, timeout=1800,
            env={**os.environ},
        )
        if result.returncode == 0:
            await update.message.reply_text("✅ Articolo pubblicato! Vedi report sopra.")
        else:
            await update.message.reply_text(f"❌ Errore: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        await update.message.reply_text("⏰ Timeout (30 min). Controlla i log.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN non configurato")
        sys.exit(1)

    app = Application.builder().token(BOT_TOKEN).build()

    # Registra comandi
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("queue", cmd_queue))
    app.add_handler(CommandHandler("keywords", cmd_keywords))
    app.add_handler(CommandHandler("pipeline", cmd_pipeline))
    app.add_handler(CommandHandler("competitors", cmd_competitors))
    app.add_handler(CommandHandler("pause", cmd_pause))
    app.add_handler(CommandHandler("resume", cmd_resume))
    app.add_handler(CommandHandler("publish", cmd_publish))

    # Report giornaliero alle 21:00 UTC
    job_queue = app.job_queue
    job_queue.run_daily(daily_report, time=dtime(hour=21, minute=0))

    print(f"[{datetime.now().isoformat()}] Telegram Bot avviato — polling attivo")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
