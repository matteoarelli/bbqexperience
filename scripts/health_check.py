#!/usr/bin/env python3
"""Health check — Report stato completo del sistema BBQ Experience."""

import json
import os
import sys
from urllib.request import Request, urlopen

TOKEN = os.environ.get("STRAPI_API_TOKEN", "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9")
BASE = "https://cms.bbq-experience.com/api"
HDR = {"Authorization": "Bearer " + TOKEN}


def get(url):
    req = Request(url, headers=HDR)
    with urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def main():
    sep = "=" * 60
    print(sep)
    print("REPORT 24H - BBQ Experience Growth Engine")
    print(sep)

    # 1. ContentQueue
    print("\n1. CONTENT QUEUE")
    q = get(BASE + "/content-queues?pagination[pageSize]=100")
    for i in q["data"]:
        log = (i.get("generation_log") or "")[:100]
        status = i["status"]
        title = i["title"]
        print("   [%s] %s" % (status, title))
        if log:
            print("      -> %s" % log)

    # 2. Articolo generato
    print("\n2. ARTICOLO GENERATO (EN)")
    try:
        t = get(BASE + "/tutorials/cnnopj9zy8xg58fauj23ymj6")
        d = t["data"]
        content = d.get("content", "") or ""
        print("   Titolo: %s" % d["title"])
        print("   Slug: %s" % d["slug"])
        print("   Data: %s" % d.get("published_date", "?"))
        print("   Lunghezza: %d chars, ~%d parole" % (len(content), len(content.split())))
        seo = d.get("seo_title", "N/A")
        print("   SEO Title: %s" % seo)
        exc = (d.get("excerpt", "") or "")[:100]
        print("   Excerpt: %s" % exc)
    except Exception as e:
        print("   Errore: %s" % e)

    # 3. Traduzioni
    print("\n3. TRADUZIONI ARTICOLO AI")
    for loc in ["it", "es"]:
        try:
            r = get(BASE + "/tutorials?locale=%s&sort=createdAt:desc&pagination[pageSize]=3" % loc)
            items = r.get("data", [])
            found = False
            for item in items:
                if item.get("documentId") == "cnnopj9zy8xg58fauj23ymj6":
                    c = item.get("content", "") or ""
                    print("   %s: PRESENTE (%d chars)" % (loc.upper(), len(c)))
                    found = True
                    break
            if not found:
                print("   %s: NON TROVATA" % loc.upper())
        except Exception as e:
            print("   %s: Errore: %s" % (loc.upper(), e))

    # 4. Contenuti totali
    print("\n4. CONTENUTI TOTALI (EN)")
    for ct in ["reviews", "recipes", "tutorials", "blog-posts"]:
        r = get(BASE + "/%s?pagination[pageSize]=1&status=published" % ct)
        total = r["meta"]["pagination"]["total"]
        print("   %s: %d" % (ct, total))

    # 5. Brands
    print("\n5. BRANDS (%d totali)" % get(BASE + "/brands?pagination[pageSize]=1")["meta"]["pagination"]["total"])
    r = get(BASE + "/brands?pagination[pageSize]=100")
    for b in r["data"]:
        print("   %s: %s" % (b["name"], b["partnership_status"]))

    # 6. Instagram
    print("\n6. INSTAGRAM POSTS")
    r = get(BASE + "/instagram-posts?pagination[pageSize]=1&sort=timestamp:desc")
    total = r["meta"]["pagination"]["total"]
    print("   Totale: %d" % total)

    # 7. Claude Reviewer
    print("\n7. CLAUDE REVIEWER STATUS")
    q_data = q["data"]
    review = [i for i in q_data if i["status"] == "draft_review"]
    published = [i for i in q_data if i["status"] == "published"]
    ready = [i for i in q_data if i["status"] == "ready"]
    failed = [i for i in q_data if i["status"] == "failed"]
    print("   In attesa review: %d" % len(review))
    print("   Approvati: %d" % len(published))
    print("   Ready (in coda): %d" % len(ready))
    print("   Falliti: %d" % len(failed))

    # 8. Sito live
    print("\n8. SITO LIVE")
    try:
        req = Request("https://bbq-experience.com/en/", method="HEAD")
        with urlopen(req, timeout=10) as r:
            print("   HTTP %d - OK" % r.status)
    except Exception as e:
        print("   ERRORE: %s" % e)

    print("\n" + sep)


if __name__ == "__main__":
    main()
