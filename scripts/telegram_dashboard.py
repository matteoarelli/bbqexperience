#!/usr/bin/env python3
"""
telegram_dashboard.py -- Dashboard giornaliera Telegram per BBQ Experience

Invia un report unificato con metriche sito + IG + engagement.
Cron: 0 21 * * * (ogni sera alle 21)
"""
import json, os, sys
from pathlib import Path
from datetime import datetime, date
from urllib.request import Request, urlopen

STRAPI_URL = "https://cms.bbq-experience.com"
SITE_URL = "https://bbq-experience.com"
STRAPI_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "415456994")
STATE_DIR = Path(__file__).parent.parent / "state"
INTEGRATIONS_DIR = Path(__file__).parent

# Carica da .env
for ep in [Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env"]:
    if ep.exists():
        for line in ep.read_text().splitlines():
            line = line.strip()
            if "=" not in line or line.startswith("#"):
                continue
            k, v = line.split("=", 1)
            if k == "STRAPI_API_TOKEN" and not STRAPI_TOKEN:
                STRAPI_TOKEN = v.strip()
            elif k == "TELEGRAM_BOT_TOKEN" and not TG_TOKEN:
                TG_TOKEN = v.strip()
            elif k == "TELEGRAM_CHAT_ID":
                TG_CHAT = v.strip()


def tg_send(text):
    """Invia messaggio Telegram con HTML."""
    if not TG_TOKEN:
        print("No TG token, printing instead:")
        print(text)
        return
    body = json.dumps({"chat_id": TG_CHAT, "text": text, "parse_mode": "HTML",
                        "disable_web_page_preview": True}).encode()
    req = Request(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                  data=body, headers={"Content-Type": "application/json"})
    try:
        urlopen(req, timeout=15)
    except Exception as e:
        print(f"TG send error: {e}")


def sget(endpoint, params={}):
    url = f"{STRAPI_URL}/api/{endpoint}?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = Request(url, headers={"Authorization": f"Bearer {STRAPI_TOKEN}"})
    try:
        with urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except:
        return {"data": [], "meta": {"pagination": {"total": 0}}}


def get_site_stats():
    """Conta contenuti pubblicati."""
    stats = {}
    for t in ["reviews", "recipes", "tutorials", "blog-posts"]:
        d = sget(t, {"locale": "en", "status": "published", "pagination[pageSize]": "1"})
        stats[t] = d["meta"]["pagination"]["total"]
    d = sget("instagram-posts", {"locale": "en", "status": "published", "pagination[pageSize]": "1"})
    stats["ig-posts"] = d["meta"]["pagination"]["total"]
    d = sget("subscribers", {"pagination[pageSize]": "1"})
    stats["subscribers"] = d["meta"]["pagination"]["total"]
    return stats


def get_engagement_today():
    """Leggi metriche engagement di oggi."""
    ef = STATE_DIR / "engagement.json"
    if not ef.exists():
        return None
    d = json.loads(ef.read_text())
    today = date.today().isoformat()
    daily = d.get("daily_counts", {}).get(today, {})
    return {
        "story_views": daily.get("story_views", 0),
        "likes": daily.get("likes", 0),
        "comments": daily.get("comments", 0),
        "follows": daily.get("follows", 0),
        "unfollows": daily.get("unfollows", 0),
        "following_total": len(d.get("following", {})),
    }


def get_editorial_status():
    """Stato piano editoriale corrente."""
    pf = STATE_DIR / "editorial_plan.json"
    if not pf.exists():
        return None
    d = json.loads(pf.read_text())
    posts = d.get("posts", [])
    stories = d.get("stories", [])
    return {
        "week": d.get("week_id", "?"),
        "theme": (d.get("theme", {}).get("title", "") if isinstance(d.get("theme"), dict) else str(d.get("theme", "")))[:40],
        "posts_published": sum(1 for p in posts if p.get("published")),
        "posts_total": len(posts),
        "stories_published": sum(1 for s in stories if s.get("published")),
        "stories_total": len(stories),
        "status": d.get("status", "unknown"),
    }


def get_comment_stats():
    """Statistiche risposte commenti."""
    cf = STATE_DIR / "comment_replies.json"
    if not cf.exists():
        return None
    d = json.loads(cf.read_text())
    today = date.today().isoformat()
    daily_raw = d.get("daily_counts", {}).get(today, 0)
    daily = daily_raw.get("replies", 0) if isinstance(daily_raw, dict) else int(daily_raw)
    total = len(d.get("replied", {}))
    return {"today": daily, "total": total}


def build_dashboard():
    """Costruisci il messaggio dashboard."""
    today = datetime.now().strftime("%A %d %B")
    lines = [f"<b>BBQ Experience Dashboard</b>", f"<i>{today}</i>", ""]

    # Sito
    stats = get_site_stats()
    total = sum(stats.get(k, 0) for k in ["reviews", "recipes", "tutorials", "blog-posts"])
    lines.append("<b>SITO</b>")
    lines.append(f"  {stats.get('reviews', 0)} reviews | {stats.get('recipes', 0)} ricette | {stats.get('tutorials', 0)} tutorial | {stats.get('blog-posts', 0)} blog")
    lines.append(f"  Totale: <b>{total}</b> contenuti EN")
    lines.append(f"  IG cached: {stats.get('ig-posts', 0)} | Subscribers: {stats.get('subscribers', 0)}")
    lines.append("")

    # Engagement
    eng = get_engagement_today()
    if eng:
        total_actions = eng["story_views"] + eng["likes"] + eng["comments"] + eng["follows"]
        lines.append("<b>ENGAGEMENT OGGI</b>")
        lines.append(f"  {eng['story_views']} story views | {eng['likes']} likes | {eng['comments']} commenti | {eng['follows']} follow")
        lines.append(f"  Totale: <b>{total_actions}</b> azioni | Following: {eng['following_total']}")
        lines.append("")

    # Piano editoriale
    ed = get_editorial_status()
    if ed:
        lines.append(f"<b>PIANO {ed['week']}</b> ({ed['status']})")
        lines.append(f"  Post: {ed['posts_published']}/{ed['posts_total']} | Stories: {ed['stories_published']}/{ed['stories_total']}")
        if ed["theme"]:
            lines.append(f"  Tema: {ed['theme']}")
        lines.append("")

    # Comment replies
    cr = get_comment_stats()
    if cr:
        lines.append(f"<b>COMMENTI</b>")
        lines.append(f"  Oggi: {cr['today']} risposte | Storico: {cr['total']} totali")
        lines.append("")

    # Link rapidi
    lines.append("<b>LINK</b>")
    lines.append(f"  <a href='{SITE_URL}/en/'>Sito</a> | <a href='{STRAPI_URL}/admin'>CMS</a> | <a href='https://analytics.bbq-experience.com'>Analytics</a>")
    lines.append(f"  <a href='https://instagram.com/bbqexperience'>Instagram</a> | <a href='https://sentry.io'>Sentry</a>")

    return "\n".join(lines)


def main():
    preview = "--preview" in sys.argv
    msg = build_dashboard()

    if preview:
        # Strip HTML per preview terminale
        import re
        clean = re.sub(r"<[^>]+>", "", msg)
        print(clean)
    else:
        tg_send(msg)
        print("Dashboard sent to Telegram")


if __name__ == "__main__":
    main()
