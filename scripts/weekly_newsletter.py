#!/usr/bin/env python3
"""
weekly_newsletter.py -- Newsletter settimanale automatica via Brevo API
Cron: 0 10 * * 0 (domenica ore 10)
Uso: python weekly_newsletter.py --send | --preview
"""
import json, os, sys
from pathlib import Path
from datetime import datetime
from urllib.request import Request, urlopen

STRAPI_URL = "https://cms.bbq-experience.com"
BREVO_URL = "https://api.brevo.com/v3"
SITE_URL = "https://bbq-experience.com"
STRAPI_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")
BREVO_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_LIST = int(os.environ.get("BREVO_LIST_ID", "3"))

for ep in [Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env"]:
    if ep.exists():
        for line in ep.read_text().splitlines():
            if line.startswith("STRAPI_API_TOKEN=") and not STRAPI_TOKEN:
                STRAPI_TOKEN = line.split("=", 1)[1].strip()
            if line.startswith("BREVO_API_KEY=") and not BREVO_KEY:
                BREVO_KEY = line.split("=", 1)[1].strip()

def sget(ep, params={}):
    url = f"{STRAPI_URL}/api/{ep}?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = Request(url, headers={"Authorization": f"Bearer {STRAPI_TOKEN}"})
    try:
        with urlopen(req, timeout=30) as r: return json.loads(r.read())
    except: return {"data": []}

def get_articles():
    d = sget("blog-posts", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "3", "fields[0]": "title", "fields[1]": "slug", "fields[2]": "excerpt"})
    return [{"title": p["title"], "url": f"{SITE_URL}/en/blog/{p['slug']}/", "excerpt": p.get("excerpt","")[:120]} for p in d.get("data",[])]

def get_reviews():
    d = sget("reviews", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "2", "fields[0]": "title", "fields[1]": "slug", "fields[2]": "score_overall"})
    return [{"title": r["title"], "url": f"{SITE_URL}/en/reviews/{r['slug']}/", "score": r.get("score_overall","")} for r in d.get("data",[])]

def get_recipe():
    d = sget("recipes", {"locale": "en", "status": "published", "sort": "published_date:desc",
        "pagination[pageSize]": "1", "fields[0]": "title", "fields[1]": "slug", "fields[2]": "difficulty"})
    if d.get("data"):
        r = d["data"][0]
        return {"title": r["title"], "url": f"{SITE_URL}/en/recipes/{r['slug']}/", "difficulty": r.get("difficulty","")}
    return None

def build_html(articles, reviews, recipe):
    arts = "".join(f'<tr><td style="padding:12px 0;border-bottom:1px solid #333"><a href="{a["url"]}" style="color:#F97316;text-decoration:none;font-weight:bold">{a["title"]}</a><p style="color:#A8A29E;margin:4px 0 0;font-size:14px">{a["excerpt"]}</p></td></tr>' for a in articles)
    revs = "".join(f'<tr><td style="padding:8px 0"><a href="{r["url"]}" style="color:#F97316;text-decoration:none">{r["title"]} ({r["score"]}/10)</a></td></tr>' for r in reviews if r.get("score"))
    rec = f'<tr><td style="padding:12px 0"><a href="{recipe["url"]}" style="color:#F97316;text-decoration:none;font-weight:bold">{recipe["title"]}</a> <span style="color:#A8A29E;font-size:12px">({recipe["difficulty"]})</span></td></tr>' if recipe else ""

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#1A1A1A">
<tr><td style="padding:24px;text-align:center;background:linear-gradient(135deg,#F97316,#EA580C)">
<h1 style="margin:0;color:#fff;font-size:24px">BBQ EXPERIENCE</h1>
<p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Weekly Digest</p></td></tr>
<tr><td style="padding:24px"><h2 style="color:#F5F5F4;font-size:18px;margin:0 0 16px">This Week's Top Articles</h2><table width="100%">{arts}</table></td></tr>
<tr><td style="padding:0 24px 24px"><h2 style="color:#F5F5F4;font-size:18px;margin:0 0 12px">Latest Reviews</h2><table width="100%">{revs}</table></td></tr>
{"<tr><td style='padding:0 24px 24px'><h2 style='color:#F5F5F4;font-size:18px;margin:0 0 12px'>Recipe of the Week</h2><table width='100%'>" + rec + "</table></td></tr>" if recipe else ""}
<tr><td style="padding:24px;text-align:center;background:#262626">
<a href="https://instagram.com/bbqexperience" style="color:#F97316;text-decoration:none;font-size:14px">Follow @bbqexperience on Instagram (74K+)</a>
<p style="color:#78716C;font-size:12px;margin:12px 0 0">BBQ Experience - Independent reviews, no sponsors, no BS.</p>
<p style="color:#78716C;font-size:11px;margin:8px 0 0"><a href="{{unsubscribe}}" style="color:#78716C">Unsubscribe</a></p></td></tr>
</table></body></html>"""

def send(html, subject):
    body = json.dumps({"sender":{"name":"BBQ Experience","email":"admin@bbq-experience.com"},
        "subject":subject,"htmlContent":html,"recipients":{"listIds":[BREVO_LIST]},
        "name":f"Weekly Digest {datetime.now().strftime('%Y-%m-%d')}"}).encode()
    req = Request(f"{BREVO_URL}/emailCampaigns", data=body, method="POST",
        headers={"api-key":BREVO_KEY,"Content-Type":"application/json"})
    with urlopen(req,timeout=30) as r:
        cid = json.loads(r.read()).get("id")
        print(f"  Campaign {cid} created")
        urlopen(Request(f"{BREVO_URL}/emailCampaigns/{cid}/sendNow",method="POST",
            headers={"api-key":BREVO_KEY,"Content-Type":"application/json"}),timeout=30)
        print("  Sent!")

def main():
    preview = "--preview" in sys.argv
    print("Building weekly newsletter...")
    articles, reviews, recipe = get_articles(), get_reviews(), get_recipe()
    print(f"  {len(articles)} articles, {len(reviews)} reviews, {'1 recipe' if recipe else 'no recipe'}")
    subject = f"BBQ Experience Weekly: {articles[0]['title'][:50] if articles else 'This Week in BBQ'}"
    html = build_html(articles, reviews, recipe)
    if preview:
        Path("/tmp/newsletter_preview.html").write_text(html)
        print("  Preview: /tmp/newsletter_preview.html")
    else:
        if not BREVO_KEY: print("  ERROR: no BREVO_API_KEY"); sys.exit(1)
        send(html, subject)
    print("Done!")

if __name__ == "__main__":
    main()
