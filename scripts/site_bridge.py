#!/usr/bin/env python3
"""
site_bridge.py — Data Bridge tra BBQ Experience sito e agente Instagram

Funzionalita:
1. Scarica contenuti recenti dal sito (Strapi API) -> site_content.json
2. Genera mappa link per caption IG
3. Analizza commenti IG per topic -> suggerimenti calendario editoriale
4. Genera template primo commento con link al sito
5. Sincronizza metriche IG -> Strapi

Uso:
    python site_bridge.py --all
    python site_bridge.py --fetch-site
    python site_bridge.py --generate-links
"""

import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import URLError
from collections import Counter

STRAPI_URL = "https://cms.bbq-experience.com"
SITE_URL = "https://bbq-experience.com"
STATE_DIR = Path(__file__).parent.parent / "state" if "instagram-bot" in str(Path(__file__).parent) else Path(__file__).parent / "state"
OUT_DIR = Path(__file__).parent

# Token da ambiente o .env
STRAPI_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")
if not STRAPI_TOKEN:
    for env_path in [Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env"]:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("STRAPI_API_TOKEN="):
                    STRAPI_TOKEN = line.split("=", 1)[1].strip()
                    break
        if STRAPI_TOKEN:
            break


def api_get(endpoint, params=None):
    url = f"{STRAPI_URL}/api/{endpoint}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = Request(url, headers={"Authorization": f"Bearer {STRAPI_TOKEN}"})
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  ERR {endpoint}: {e}")
        return None


def fetch_site_content():
    """Scarica contenuti recenti dal sito per uso dell'agente IG."""
    print("[1/5] Fetching site content...")
    content = {"fetched_at": datetime.now().isoformat(), "articles": [], "reviews": [], "recipes": []}

    blog = api_get("blog-posts", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "20", "fields[0]": "title", "fields[1]": "slug",
        "fields[2]": "excerpt", "fields[3]": "category", "fields[4]": "published_date"})
    if blog and blog.get("data"):
        for p in blog["data"]:
            content["articles"].append({
                "title": p["title"], "slug": p["slug"], "excerpt": p.get("excerpt", ""),
                "category": p.get("category", ""), "date": p.get("published_date", ""),
                "url": f"{SITE_URL}/en/blog/{p['slug']}/",
            })

    reviews = api_get("reviews", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "25", "fields[0]": "title", "fields[1]": "slug",
        "fields[2]": "excerpt", "fields[3]": "score_overall", "fields[4]": "verdict"})
    if reviews and reviews.get("data"):
        for r in reviews["data"]:
            content["reviews"].append({
                "title": r["title"], "slug": r["slug"], "excerpt": r.get("excerpt", ""),
                "score": r.get("score_overall"), "verdict": r.get("verdict", ""),
                "url": f"{SITE_URL}/en/reviews/{r['slug']}/",
            })

    recipes = api_get("recipes", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "25", "fields[0]": "title", "fields[1]": "slug",
        "fields[2]": "excerpt", "fields[3]": "difficulty", "fields[4]": "meat_type"})
    if recipes and recipes.get("data"):
        for r in recipes["data"]:
            content["recipes"].append({
                "title": r["title"], "slug": r["slug"], "excerpt": r.get("excerpt", ""),
                "difficulty": r.get("difficulty", ""), "meat_type": r.get("meat_type", ""),
                "url": f"{SITE_URL}/en/recipes/{r['slug']}/",
            })

    out = OUT_DIR / "site_content.json"
    out.write_text(json.dumps(content, indent=2, ensure_ascii=False))
    print(f"  {len(content['articles'])} articles, {len(content['reviews'])} reviews, {len(content['recipes'])} recipes -> {out.name}")
    return content


def generate_link_map():
    """Genera mappa keyword -> URL per caption IG contestuali."""
    print("[2/5] Generating link map...")
    cf = OUT_DIR / "site_content.json"
    if not cf.exists():
        fetch_site_content()
    content = json.loads(cf.read_text())
    lm = {}

    for rev in content.get("reviews", []):
        for w in rev["slug"].replace("-", " ").split():
            if len(w) > 4 and w not in ("review", "that", "with", "from"):
                lm[w] = {"url": rev["url"], "title": rev["title"], "type": "review"}

    for rec in content.get("recipes", []):
        for w in rec["slug"].replace("-", " ").split():
            if len(w) > 4:
                lm[w] = {"url": rec["url"], "title": rec["title"], "type": "recipe"}

    for art in content.get("articles", []):
        for w in art["slug"].replace("-", " ").split():
            if len(w) > 5:
                lm[w] = {"url": art["url"], "title": art["title"], "type": "article"}

    out = OUT_DIR / "link_map.json"
    out.write_text(json.dumps(lm, indent=2, ensure_ascii=False))
    print(f"  {len(lm)} keywords mapped -> {out.name}")


def analyze_comments():
    """Analizza commenti per suggerire topic al calendario editoriale."""
    print("[3/5] Analyzing comments...")
    rf = STATE_DIR / "comment_replies.json"
    if not rf.exists():
        print("  No comment data found")
        return

    data = json.loads(rf.read_text())
    comments = [info["comment_text"].lower() for info in data.get("replied", {}).values()
                if isinstance(info, dict) and info.get("comment_text")]

    if not comments:
        print("  No comments to analyze")
        return

    stop = {"the", "and", "for", "that", "this", "with", "you", "your", "bbq", "love",
            "great", "nice", "good", "wow", "amazing", "fire", "looks", "like", "much",
            "very", "really", "just", "what", "how", "can", "from", "have", "been"}
    words = [w.strip(".,!?@#") for c in comments for w in c.split() if len(w.strip(".,!?@#")) > 3 and w.strip(".,!?@#") not in stop]
    top = Counter(words).most_common(15)
    suggestions = [{"topic": w, "mentions": c} for w, c in top if c >= 2]

    out = OUT_DIR / "topic_suggestions.json"
    out.write_text(json.dumps({"generated_at": datetime.now().isoformat(),
        "comments_analyzed": len(comments), "suggestions": suggestions}, indent=2))
    print(f"  {len(suggestions)} topics from {len(comments)} comments -> {out.name}")


def generate_first_comments():
    """Genera template primo commento con link per post IG."""
    print("[4/5] Generating first comment templates...")
    cf = OUT_DIR / "site_content.json"
    if not cf.exists():
        fetch_site_content()
    content = json.loads(cf.read_text())

    templates = [
        "Full article on our site! Link in bio\n.\n#{topic} #bbqexperience #bbqlife",
        "We did a deep dive on this -- check our site, link in bio\n.\n#{topic} #bbqtips #grilling",
        "Complete guide on bbq-experience.com -- link in bio!\n.\n#{topic} #pitmaster #bbq",
    ]

    topic_links = {}
    for rev in content.get("reviews", []):
        for kw in rev["slug"].replace("-", " ").split()[:3]:
            if len(kw) > 4:
                topic_links[kw] = {"url": rev["url"], "type": "review", "title": rev["title"]}
    for rec in content.get("recipes", []):
        for kw in rec["slug"].replace("-", " ").split()[:3]:
            if len(kw) > 4:
                topic_links[kw] = {"url": rec["url"], "type": "recipe", "title": rec["title"]}

    out = OUT_DIR / "first_comments.json"
    out.write_text(json.dumps({"generated_at": datetime.now().isoformat(),
        "templates": templates, "topic_links": topic_links}, indent=2, ensure_ascii=False))
    print(f"  {len(topic_links)} topic links, {len(templates)} templates -> {out.name}")


def sync_metrics():
    """Sincronizza metriche IG dal piano editoriale verso Strapi."""
    print("[5/5] Syncing metrics...")
    pf = STATE_DIR / "editorial_plan.json"
    if not pf.exists():
        print("  No editorial plan found")
        return

    plan = json.loads(pf.read_text())
    metrics = plan.get("metrics", {})
    if not metrics:
        print("  No metrics data")
        return

    synced = 0
    for post in plan.get("posts", []):
        mid = post.get("media_id")
        if not mid or not post.get("published"):
            continue
        pm = metrics.get(str(mid), {})
        if not pm:
            continue

        result = api_get("instagram-posts", {
            "filters[instagram_id][$eq]": str(mid), "locale": "en", "status": "published"})
        if result and result.get("data"):
            doc_id = result["data"][0]["documentId"]
            body = json.dumps({"data": {
                "like_count": pm.get("likes", 0),
                "comments_count": pm.get("comments", 0),
                "engagement_score": pm.get("engagement_rate", 0),
            }}).encode()
            req = Request(f"{STRAPI_URL}/api/instagram-posts/{doc_id}", data=body, method="PUT",
                headers={"Authorization": f"Bearer {STRAPI_TOKEN}", "Content-Type": "application/json"})
            try:
                urlopen(req, timeout=30)
                synced += 1
            except Exception:
                pass

    print(f"  {synced} post metrics synced to Strapi")


def main():
    parser = argparse.ArgumentParser(description="BBQ Experience Site Bridge")
    parser.add_argument("--fetch-site", action="store_true")
    parser.add_argument("--generate-links", action="store_true")
    parser.add_argument("--analyze-comments", action="store_true")
    parser.add_argument("--generate-first-comments", action="store_true")
    parser.add_argument("--sync-metrics", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    if args.all or not any(vars(args).values()):
        fetch_site_content()
        generate_link_map()
        analyze_comments()
        generate_first_comments()
        sync_metrics()
    else:
        if args.fetch_site: fetch_site_content()
        if args.generate_links: generate_link_map()
        if args.analyze_comments: analyze_comments()
        if args.generate_first_comments: generate_first_comments()
        if args.sync_metrics: sync_metrics()

    print("\nBridge sync complete!")


if __name__ == "__main__":
    main()
