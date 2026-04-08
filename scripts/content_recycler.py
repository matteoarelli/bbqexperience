#!/usr/bin/env python3
"""
content_recycler.py -- Content Recycling Loop IG <-> Sito

1. Articoli sito con piu traffico -> suggeriti come IG post
2. Post IG con piu engagement -> suggeriti come articoli blog da espandere
3. Salva suggerimenti in recycle_suggestions.json

Cron: 0 8 * * 1 (lunedi mattina, prima della generazione piano editoriale)
"""
import json, os
from pathlib import Path
from datetime import datetime
from urllib.request import Request, urlopen

STRAPI_URL = "https://cms.bbq-experience.com"
SITE_URL = "https://bbq-experience.com"
STRAPI_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")
OUT_DIR = Path(__file__).parent

for ep in [Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env"]:
    if ep.exists():
        for line in ep.read_text().splitlines():
            if line.startswith("STRAPI_API_TOKEN=") and not STRAPI_TOKEN:
                STRAPI_TOKEN = line.split("=", 1)[1].strip()

def sget(endpoint: str, params: dict | None = None) -> dict:
    url = f"{STRAPI_URL}/api/{endpoint}?" + "&".join(f"{k}={v}" for k, v in (params or {}).items())
    req = Request(url, headers={"Authorization": f"Bearer {STRAPI_TOKEN}"})
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"[WARN] Strapi GET {endpoint} fallito: {e}")
        return {"data": []}

def get_top_site_content():
    """Articoli recenti del sito che possono diventare post IG."""
    articles = []
    # Blog post recenti non ancora riciclati
    d = sget("blog-posts", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "10", "fields[0]": "title", "fields[1]": "slug",
        "fields[2]": "excerpt", "fields[3]": "category"})
    for p in d.get("data", []):
        articles.append({
            "title": p["title"], "slug": p["slug"],
            "excerpt": p.get("excerpt", "")[:150],
            "category": p.get("category", ""),
            "url": f"{SITE_URL}/en/blog/{p['slug']}/",
            "ig_caption_idea": f"New on the blog: {p['title']}\n\nRead the full article -- link in bio!\n\n#bbqexperience #bbq #{p.get('category', 'bbqtips')}",
            "ig_story_idea": f"Swipe up for: {p['title']}",
        })

    # Review recenti
    d = sget("reviews", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "5", "fields[0]": "title", "fields[1]": "slug",
        "fields[2]": "score_overall", "fields[3]": "verdict"})
    for r in d.get("data", []):
        score = r.get("score_overall", "")
        articles.append({
            "title": r["title"], "slug": r["slug"],
            "score": score,
            "url": f"{SITE_URL}/en/reviews/{r['slug']}/",
            "ig_caption_idea": f"We tested it. Score: {score}/10\n\n{r['title']}\n\nFull review on our site -- link in bio!\n\n#bbqexperience #bbqreview #honestreviews",
            "ig_story_idea": f"New review: {score}/10 -- swipe up!",
        })

    return articles

def get_top_ig_posts():
    """Post IG con alto engagement che meritano un articolo di approfondimento."""
    d = sget("instagram-posts", {"locale": "en", "status": "published",
        "sort": "engagement_score:desc", "pagination[pageSize]": "10",
        "filters[curated][$eq]": "true",
        "fields[0]": "instagram_id", "fields[1]": "caption", "fields[2]": "engagement_score",
        "fields[3]": "like_count", "fields[4]": "comments_count", "fields[5]": "permalink"})

    posts = []
    for p in d.get("data", []):
        caption = p.get("caption", "") or ""
        # Estrai topic dalla caption
        words = [w.strip("#@.,!?") for w in caption.split() if len(w) > 4 and not w.startswith("http")]
        topic = " ".join(words[:5]) if words else "BBQ content"

        posts.append({
            "instagram_id": p.get("instagram_id", ""),
            "caption_preview": caption[:100],
            "engagement_score": p.get("engagement_score", 0),
            "likes": p.get("like_count", 0),
            "comments": p.get("comments_count", 0),
            "permalink": p.get("permalink", ""),
            "topic_keywords": words[:10],
            "blog_idea": f"Expand this high-engagement IG post into a full article about: {topic}",
        })

    return posts

def main():
    print("Content Recycler -- analyzing content for cross-promotion...")

    site_to_ig = get_top_site_content()
    ig_to_site = get_top_ig_posts()

    suggestions = {
        "generated_at": datetime.now().isoformat(),
        "site_to_instagram": {
            "description": "Site articles to promote on Instagram",
            "count": len(site_to_ig),
            "items": site_to_ig[:5],
        },
        "instagram_to_site": {
            "description": "High-engagement IG posts to expand into blog articles",
            "count": len(ig_to_site),
            "items": ig_to_site[:5],
        },
    }

    out = OUT_DIR / "recycle_suggestions.json"
    out.write_text(json.dumps(suggestions, indent=2, ensure_ascii=False))
    print(f"  {len(site_to_ig)} site->IG suggestions, {len(ig_to_site)} IG->site suggestions")
    print(f"  Saved to {out}")

    # Anche salva un file piu semplice per il piano editoriale dell'agente IG
    ig_promo = OUT_DIR / "site_promo_queue.json"
    ig_promo.write_text(json.dumps({
        "updated": datetime.now().isoformat(),
        "promo_posts": [{"title": a["title"], "url": a["url"], "caption": a["ig_caption_idea"],
                         "story": a["ig_story_idea"]} for a in site_to_ig[:5]],
    }, indent=2, ensure_ascii=False))
    print(f"  Promo queue: {ig_promo}")
    print("Done!")

if __name__ == "__main__":
    main()
