"""One-shot smoke test for the BBQ Claude gate.

Picks the most recent published article, runs Claude Opus 4.7 on it (dry-run:
NO writes back to Strapi), saves full result + corrected_html + diff to
logs/smoke-test-*.{json,html,txt}.

Usage:
  python scripts/smoke_test_gate.py [--queue-id XXX]

Cost: ~3 min Claude Opus high reasoning (free on Pro Max plan).
"""
import argparse
import io
import json
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path

# Force UTF-8 stdout (avoid cp1252 crash on unicode arrows etc.)
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Load env
HERE = Path(__file__).resolve().parent
ed = HERE / "agents" / ".env.windows"
for line in ed.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(HERE))

from agents.lib import strapi_client as strapi  # noqa: E402
from agents.lib.whitelist import load_catalog_whitelist, load_blog_whitelist  # noqa: E402
from agents.claude_quality_gate import review_article, decide_next_step  # noqa: E402

CT_STRAPI = {"blog": "blog-posts", "recipe": "recipes", "tutorial": "tutorials", "comparison": "blog-posts"}
FIELD = {"blog-posts": "content", "tutorials": "content", "recipes": "editorial_intro"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue-id", help="Specific content-queues documentId; otherwise picks most recent published")
    args = ap.parse_args()

    if args.queue_id:
        items = [strapi.find_one("content-queues", args.queue_id, populate="*").get("data", {})]
    else:
        items = strapi.find_all_pages(
            "content-queues",
            status="draft",
            filters={"status": {"$eq": "published"}},
            sort="updatedAt:desc",
        )
    if not items or not items[0]:
        print("No queue items found.")
        return 1

    q = items[0]
    qid = q["documentId"]
    content_id = q.get("published_content_id")
    title = q.get("title", "?")
    ctype = q.get("content_type", "blog")
    keyword = q.get("target_keyword", "")
    cluster = q.get("cluster", "")
    print(f"Article: {title}")
    print(f"  queue={qid} content={content_id} type={ctype} kw={keyword}")

    if not content_id:
        print("No published_content_id, skipping.")
        return 1

    ct_strapi = CT_STRAPI.get(ctype, "blog-posts")
    field = FIELD.get(ct_strapi, "content")
    resp = strapi.find_one(ct_strapi, content_id, populate="*")
    data = resp.get("data", {})
    slug = data.get("slug", "")
    body = data.get(field, "") or ""
    print(f"  body field={field} len={len(body)} slug={slug}\n")

    out_dir = HERE.parent / "logs"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "smoke-test-original.html").write_text(body, encoding="utf-8")

    print("Loading whitelists...")
    t0 = time.time()
    catalog = load_catalog_whitelist()
    blog_wl = load_blog_whitelist()
    print(f"  catalog={len(catalog)} blog={len(blog_wl)} ({time.time() - t0:.1f}s)\n")

    print("Calling Claude Opus 4.7 (high reasoning, ~3 min)...")
    t0 = time.time()
    try:
        result = review_article(
            article_html=body,
            catalog_whitelist=catalog,
            blog_whitelist=blog_wl,
            topic_title=title,
            url_slug=slug,
            content_type=ctype,
            cluster=cluster,
            keyword=keyword,
            timeout_seconds=900,
        )
    except Exception as e:
        print(f"REVIEW FAILED: {e}")
        return 2
    elapsed = time.time() - t0
    print(f"Done in {elapsed:.0f}s\n")

    # Save full result as JSON (ensure_ascii=False keeps emoji/unicode readable)
    result_json = {
        "approved": result.approved,
        "score": result.score,
        "summary": result.summary,
        "word_count": result.word_count,
        "next_step": decide_next_step(result),
        "broken_product_links": result.broken_product_links,
        "broken_blog_links": result.broken_blog_links,
        "issues": [asdict(i) for i in result.issues],
        "corrected_html_len": len(result.corrected_html),
    }
    (out_dir / "smoke-test-result.json").write_text(
        json.dumps(result_json, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "smoke-test-corrected.html").write_text(result.corrected_html, encoding="utf-8")

    # Print compact summary (ASCII-safe)
    print("=== REVIEW SUMMARY ===")
    print(f"approved   : {result.approved}")
    print(f"score      : {result.score}/10")
    print(f"word_count : {result.word_count}")
    print(f"next_step  : {decide_next_step(result)}")
    print(f"summary    : {result.summary}")
    print()
    print(f"Issues: {len(result.issues)} ({sum(1 for i in result.issues if i.severity=='critical')} critical, "
          f"{sum(1 for i in result.issues if i.severity=='major')} major, "
          f"{sum(1 for i in result.issues if i.severity=='minor')} minor, "
          f"{sum(1 for i in result.issues if i.severity=='info')} info)")
    for idx, iss in enumerate(result.issues, 1):
        # Strip non-ASCII for safe console printing
        desc = iss.description.encode("ascii", "replace").decode("ascii")[:280]
        loc = iss.location.encode("ascii", "replace").decode("ascii")[:120] if iss.location else ""
        fix = iss.fix_applied.encode("ascii", "replace").decode("ascii")[:200] if iss.fix_applied else ""
        sug = iss.suggested_fix.encode("ascii", "replace").decode("ascii")[:200] if iss.suggested_fix else ""
        print(f"  [{idx:2d}] {iss.severity:8s} | {iss.category:14s} | {iss.verdict}")
        print(f"       desc: {desc}")
        if loc:
            print(f"       loc : {loc}")
        if fix:
            print(f"       fix : {fix}")
        if sug:
            print(f"       sugg: {sug}")
    print()
    print(f"broken_product_links: {result.broken_product_links}")
    print(f"broken_blog_links   : {result.broken_blog_links}")
    print()
    orig_words = len(body.split())
    new_words = len(result.corrected_html.split())
    print(f"Word count : {orig_words} -> {new_words}  (delta {new_words - orig_words:+d})")
    print(f"Char count : {len(body)} -> {len(result.corrected_html)}  (delta {len(result.corrected_html) - len(body):+d})")
    print()
    print("Saved:")
    print(f"  {out_dir / 'smoke-test-result.json'}")
    print(f"  {out_dir / 'smoke-test-corrected.html'}")
    print(f"  {out_dir / 'smoke-test-original.html'}")
    print()
    print("Dry-run only: no writes to Strapi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
