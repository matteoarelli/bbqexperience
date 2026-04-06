#!/usr/bin/env python3
"""
telegram_dashboard.py -- Dashboard giornaliera Telegram per BBQ Experience

Invia un report unificato con metriche sito + IG + engagement.
Cron: 0 21 * * * (ogni sera alle 21)
"""
import json, os, sys, time, calendar
from pathlib import Path
from datetime import datetime, date, timezone
from urllib.request import Request, urlopen

STRAPI_URL = "https://cms.bbq-experience.com"
SITE_URL = "https://bbq-experience.com"
UMAMI_URL = "https://analytics.bbq-experience.com"
UMAMI_USER = "admin"
UMAMI_PASS = os.environ.get("UMAMI_PASSWORD", "umami")
UMAMI_SITE_ID = "78df95b7-1b94-43e7-9f0d-38c63e99cf64"
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


def get_umami_stats():
    """Prende pageviews e visitatori da Umami API (oggi e ultimi 7 giorni)."""
    try:
        # Login
        body = json.dumps({"username": UMAMI_USER, "password": UMAMI_PASS}).encode()
        req = Request(f"{UMAMI_URL}/api/auth/login", data=body,
                      headers={"Content-Type": "application/json"})
        with urlopen(req, timeout=10) as r:
            token = json.loads(r.read()).get("token", "")

        if not token:
            return None

        # Stats oggi
        now = datetime.now(timezone.utc)
        today_start = int(datetime(now.year, now.month, now.day, tzinfo=timezone.utc).timestamp() * 1000)
        today_end = int(now.timestamp() * 1000)

        req = Request(
            f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/stats?startAt={today_start}&endAt={today_end}",
            headers={"Authorization": f"Bearer {token}"})
        with urlopen(req, timeout=10) as r:
            today_stats = json.loads(r.read())

        # Stats ultimi 7 giorni
        week_start = today_end - (7 * 86400 * 1000)
        req = Request(
            f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/stats?startAt={week_start}&endAt={today_end}",
            headers={"Authorization": f"Bearer {token}"})
        with urlopen(req, timeout=10) as r:
            week_stats = json.loads(r.read())

        # Top pagine ultimi 7 giorni
        try:
            req = Request(
                f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/metrics?startAt={week_start}&endAt={today_end}&type=url",
                headers={"Authorization": f"Bearer {token}"})
            with urlopen(req, timeout=10) as r:
                top_pages = json.loads(r.read())[:5]
        except Exception:
            top_pages = []

        def val(d, k):
            v = d.get(k, 0)
            return v.get("value", 0) if isinstance(v, dict) else int(v)

        return {
            "today_views": val(today_stats, "pageviews"),
            "today_visitors": val(today_stats, "visitors"),
            "today_bounces": val(today_stats, "bounces"),
            "today_time": val(today_stats, "totaltime"),
            "week_views": val(week_stats, "pageviews"),
            "week_visitors": val(week_stats, "visitors"),
            "top_pages": [{"url": p.get("x", ""), "views": p.get("y", 0)} for p in top_pages],
        }
    except Exception as e:
        return {"error": str(e)}


def get_ig_profile_views():
    """Prende reach/impressions dal profilo IG se disponibili nei state files."""
    # L'agente IG non traccia le impressioni del profilo direttamente,
    # ma possiamo calcolare metriche dai post pubblicati recenti
    pf = STATE_DIR / "editorial_plan.json"
    if not pf.exists():
        return None
    d = json.loads(pf.read_text())
    metrics = d.get("metrics", {})
    if not metrics:
        return None

    total_likes = sum(m.get("likes", 0) for m in metrics.values())
    total_comments = sum(m.get("comments", 0) for m in metrics.values())
    total_reach = sum(m.get("reach", 0) for m in metrics.values())
    posts_with_metrics = len(metrics)

    return {
        "posts_measured": posts_with_metrics,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_reach": total_reach,
        "avg_likes": round(total_likes / max(posts_with_metrics, 1), 1),
        "avg_comments": round(total_comments / max(posts_with_metrics, 1), 1),
    }


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

    # Visualizzazioni sito (Umami)
    umami = get_umami_stats()
    if umami and not umami.get("error"):
        lines.append("<b>TRAFFICO SITO</b>")
        avg_time = round(umami["today_time"] / max(umami["today_visitors"], 1))
        lines.append(f"  Oggi: <b>{umami['today_views']}</b> pageviews | {umami['today_visitors']} visitatori | {avg_time}s tempo medio")
        lines.append(f"  Ultimi 7gg: <b>{umami['week_views']}</b> pageviews | {umami['week_visitors']} visitatori")
        if umami.get("top_pages"):
            top = umami["top_pages"][:3]
            top_str = " | ".join(f"{p['url'].split('/')[-2] if p['url'].endswith('/') else p['url'].split('/')[-1]}({p['views']})" for p in top)
            lines.append(f"  Top: {top_str}")
        lines.append("")

    # Metriche IG (dal piano editoriale)
    ig_metrics = get_ig_profile_views()
    if ig_metrics and ig_metrics["posts_measured"] > 0:
        lines.append("<b>INSTAGRAM PERFORMANCE</b>")
        lines.append(f"  {ig_metrics['posts_measured']} post misurati questa settimana")
        lines.append(f"  Likes: {ig_metrics['total_likes']} (media {ig_metrics['avg_likes']}/post)")
        lines.append(f"  Commenti: {ig_metrics['total_comments']} (media {ig_metrics['avg_comments']}/post)")
        if ig_metrics["total_reach"] > 0:
            lines.append(f"  Reach: {ig_metrics['total_reach']}")
        lines.append("")

    # Contenuti sito
    stats = get_site_stats()
    total = sum(stats.get(k, 0) for k in ["reviews", "recipes", "tutorials", "blog-posts"])
    lines.append("<b>CONTENUTI</b>")
    lines.append(f"  {stats.get('reviews', 0)} reviews | {stats.get('recipes', 0)} ricette | {stats.get('tutorials', 0)} tutorial | {stats.get('blog-posts', 0)} blog")
    lines.append(f"  Totale: <b>{total}</b> EN | IG: {stats.get('ig-posts', 0)} | Subs: {stats.get('subscribers', 0)}")
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
