"""Claude review runner — Windows-side polling daemon-style.

Polls Strapi content-queue for items in status='draft_review' (set by
content_generator after Qwen generation), runs Claude Opus 4.7 quality gate,
applies corrected HTML in place, transitions queue status, sends Telegram report.

Architecture (see C:\\Progetti\\CLAUDE.md):
  - Ubuntu .119 cron: content_generator.py at 5:30 → marks queue as draft_review
  - Windows scheduled task: this script every 15 min → claude_quality_gate
  - Cover SDXL + final publish: separate steps (cover_generator.py at 6:10)

Run from Windows Task Scheduler (claude.exe Pro Max OAuth lives on Windows).
NOT runnable via SSH on .119 (CLAUDE.md hard constraint).
"""
import io
import os
import sys
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding
if sys.stdout and hasattr(sys.stdout, 'buffer') and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Load env from .env.windows
_script_dir = Path(__file__).parent
for _env_file in [_script_dir / ".env.windows", _script_dir.parent.parent / ".env"]:
    if _env_file.exists():
        for _line in _env_file.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib.whitelist import load_catalog_whitelist, load_blog_whitelist
from agents.claude_quality_gate import (
    review_article,
    decide_next_step,
    ReviewResult,
)

CONTENT_FIELD = {
    "blog-posts": "content",
    "tutorials": "content",
    "recipes": "editorial_intro",
    "reviews": "editorial_content",
}

STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",
    "review": "reviews",
}

SITE_PREVIEW_BASE = os.environ.get("SITE_PREVIEW_BASE", "https://bbq-experience.com")


def fetch_pending_reviews() -> list[dict]:
    """Queue items ready for Claude review (Qwen done, awaiting fact-check)."""
    return strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "draft_review"}},
        sort="priority:asc",
    )


def fetch_published_content(queue_item: dict) -> dict | None:
    """Pull the actual content entry pointed to by the queue."""
    content_id = queue_item.get("published_content_id", "")
    raw_type = queue_item.get("content_type", "blog")
    ct = STRAPI_CONTENT_TYPES.get(raw_type, "blog-posts")
    if not content_id:
        return None
    try:
        # Strapi v5: status=draft to fetch entries that are still draft
        resp = strapi.find_one(ct, content_id, populate="*")
        data = resp.get("data") or {}
        data["_strapi_type"] = ct
        return data
    except Exception as e:
        print(f"[WARN] Could not fetch {ct}/{content_id}: {e}")
        return None


def apply_review(content: dict, review: ReviewResult, queue_doc_id: str) -> str:
    """Apply corrected HTML to the content entry + transition queue status.

    Returns the next-step label: 'auto_publish' | 'preview_first' | 'human_required'
    """
    ct = content.get("_strapi_type", "blog-posts")
    doc_id = content.get("documentId", "")
    field_name = CONTENT_FIELD.get(ct, "content")
    next_step = decide_next_step(review)

    # 1. Always write back the corrected_html (even if approved without changes,
    # they should be byte-identical to the input — safe no-op).
    if doc_id and review.corrected_html and len(review.corrected_html) > 100:
        update_payload = {field_name: review.corrected_html}
        try:
            strapi.update(ct, doc_id, update_payload)
        except Exception as e:
            print(f"[WARN] Could not patch {ct}/{doc_id}: {e}")

    # 2. Map next_step -> queue status
    if next_step == "auto_publish":
        new_queue_status = "published"
    elif next_step == "preview_first":
        new_queue_status = "preview_pending"
    else:  # human_required
        new_queue_status = "needs_human"

    log_line = (
        f"Claude gate {datetime.now().isoformat()}: "
        f"score={review.score} approved={review.approved} "
        f"issues={len(review.issues)} crit={sum(1 for i in review.issues if i.severity == 'critical')} "
        f"-> {next_step}"
    )
    try:
        strapi.update("content-queues", queue_doc_id, {
            "status": new_queue_status,
            "generation_log": log_line,
        })
    except Exception as e:
        print(f"[WARN] Could not patch queue {queue_doc_id}: {e}")

    return next_step


def telegram_report(
    title: str,
    queue_item: dict,
    content: dict,
    review: ReviewResult,
    next_step: str,
) -> None:
    """Send a structured Telegram report tagged [BBQ]."""
    ct = content.get("_strapi_type", "blog-posts")
    slug = content.get("slug", "")
    preview_url = f"{SITE_PREVIEW_BASE}/en/{ct.rstrip('s')}/{slug}" if slug else "(no slug)"

    headline = {
        "auto_publish": "AUTO-PUBLISHED",
        "preview_first": "PREVIEW NEEDED",
        "human_required": "HUMAN REVIEW REQUIRED",
    }.get(next_step, next_step.upper())

    lines: list[str] = [
        f"<b>[BBQ] {headline}</b>",
        f"<b>{title}</b>",
        f"Score: {review.score}/10  |  Words: {review.word_count}",
        f"{review.summary}",
        f"<a href='{preview_url}'>Preview link</a>",
    ]
    if review.issues:
        lines.append("\n<b>Issues:</b>")
        for issue in review.issues[:8]:
            sev = issue.severity.upper()
            verdict = f" → {issue.verdict}" if issue.verdict else ""
            loc = f" @ {issue.location}" if issue.location else ""
            lines.append(f"• [{sev}] <i>{issue.category}</i>{loc}{verdict}: {issue.description[:200]}")
    if review.broken_product_links:
        lines.append(f"\n<b>Broken product links:</b> {', '.join(review.broken_product_links[:5])}")
    if review.broken_blog_links:
        lines.append(f"<b>Broken blog links:</b> {', '.join(review.broken_blog_links[:5])}")

    telegram.send_agent_report("BBQ Claude Gate", "\n".join(lines))


def process_one(queue_item: dict, catalog: list[dict], blog_wl: list[dict]) -> bool:
    """Returns True if processed (regardless of outcome), False if skipped."""
    title = queue_item.get("title", "(untitled)")
    queue_doc_id = queue_item.get("documentId", "")
    keyword = queue_item.get("target_keyword", "")
    cluster = queue_item.get("cluster", "uncategorized")
    raw_type = queue_item.get("content_type", "blog")
    print(f"\n[gate] {title}")

    content = fetch_published_content(queue_item)
    if not content:
        print("  content not found, marking failed")
        try:
            strapi.update("content-queues", queue_doc_id, {
                "status": "failed",
                "generation_log": f"Claude gate: published_content_id not found {datetime.now().isoformat()}",
            })
        except Exception:
            pass
        return False

    ct = content["_strapi_type"]
    article_html = content.get(CONTENT_FIELD.get(ct, "content"), "")
    slug = content.get("slug", "")
    if not article_html or len(article_html) < 200:
        print(f"  HTML body too short ({len(article_html)} chars), skipping review")
        try:
            strapi.update("content-queues", queue_doc_id, {
                "status": "failed",
                "generation_log": f"Claude gate: body too short {datetime.now().isoformat()}",
            })
        except Exception:
            pass
        return False

    try:
        result = review_article(
            article_html=article_html,
            catalog_whitelist=catalog,
            blog_whitelist=blog_wl,
            topic_title=title,
            url_slug=slug,
            content_type=raw_type,
            cluster=cluster,
            keyword=keyword,
        )
    except Exception as e:
        print(f"  Claude review failed: {e}")
        telegram.send_agent_report("BBQ Claude Gate", f"<b>[BBQ] REVIEW ERROR</b>\n{title}\n\n{e}")
        try:
            strapi.update("content-queues", queue_doc_id, {
                "generation_log": f"Claude gate ERROR: {e} {datetime.now().isoformat()}",
            })
        except Exception:
            pass
        return False

    print(f"  score={result.score} approved={result.approved} issues={len(result.issues)}")
    next_step = apply_review(content, result, queue_doc_id)
    telegram_report(title, queue_item, content, result, next_step)
    return True


def main() -> int:
    print(f"[{datetime.now().isoformat()}] BBQ Claude Gate runner — start")

    pending = fetch_pending_reviews()
    if not pending:
        print("Nothing to review.")
        return 0

    print(f"Pending reviews: {len(pending)}")
    catalog = load_catalog_whitelist()
    blog_wl = load_blog_whitelist()
    print(f"Whitelist: {len(catalog)} products, {len(blog_wl)} articles")

    processed = 0
    for q in pending:
        try:
            if process_one(q, catalog, blog_wl):
                processed += 1
        except Exception as e:
            print(f"  unhandled error on {q.get('title')}: {e}")

    print(f"\n[{datetime.now().isoformat()}] BBQ Claude Gate runner — done ({processed}/{len(pending)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
