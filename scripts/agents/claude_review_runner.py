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

# ─── Phase 17 — post-publish indexing hook ────────────────────────────────
# LOCALIZED_ROUTES: stesso source-of-truth di web/scripts/sweep_pages.py.
# Mappa il content_type Strapi al segmento di route per locale.
LOCALIZED_ROUTES: dict[str, dict[str, str]] = {
    "blog-posts": {"en": "blog", "it": "blog", "es": "blog"},
    "tutorials": {"en": "tutorials", "it": "guide", "es": "tutoriales"},
    "reviews": {"en": "reviews", "it": "recensioni", "es": "resenas"},
    "recipes": {"en": "recipes", "it": "ricette", "es": "recetas"},
}
BASE_URL = "https://bbq-experience.com"


def _canonical_url(content_type_strapi: str, locale: str, slug: str) -> str:
    """Costruisce l'URL canonico per content_type+locale+slug.

    Esempi:
      _canonical_url("blog-posts","en","best-grill") -> https://bbq-experience.com/en/blog/best-grill
      _canonical_url("recipes","it","brisket") -> https://bbq-experience.com/it/ricette/brisket
    """
    route = LOCALIZED_ROUTES.get(content_type_strapi, {}).get(locale, "blog")
    return f"{BASE_URL}/{locale}/{route}/{slug}"


def _notify_search_engines(url: str) -> None:
    """Best-effort: notifica Google Indexing API + IndexNow (Bing/Yandex).

    Mai bloccare: ogni errore loggato, mai sollevato.
    Per locale IT/ES chiamare di nuovo con l'URL tradotto (per ora il path
    translation lo fa translation_agent su .119 — TODO follow-up).

    Wired Phase 17 plan 17-01: chiamata dopo strapi.publish() in apply_review().
    """
    # Import locali per evitare hard dependency al boot del runner
    from agents.lib import gsc_client, indexnow_client
    try:
        r = gsc_client.request_indexing(url)
        if not r.get("success"):
            print(f"  [WARN] Indexing API non confermata per {url}: {r.get('reason')}")
    except Exception as e:
        print(f"  [WARN] Indexing API errore inatteso {url}: {e}")
    try:
        r = indexnow_client.ping([url])
        if not r.get("success"):
            print(f"  [WARN] IndexNow ping non riuscito per {url}: "
                  f"{r.get('reason') or r.get('code')}")
    except Exception as e:
        print(f"  [WARN] IndexNow errore inatteso {url}: {e}")


def fetch_pending_reviews() -> list[dict]:
    """Queue items ready for Claude review (Qwen done, awaiting fact-check)."""
    return strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "draft_review"}},
        sort="priority:asc",
    )


def fetch_published_content(queue_item: dict) -> dict | None:
    """Pull the actual content entry pointed to by the queue.

    Strapi v5: l'entry creata da content_generator è DRAFT (publishedAt=null).
    Senza ?status=draft, Strapi default 'published' ritorna 404. La versione
    draft esiste sempre (anche per documenti già published), quindi è la query
    safe per il gate review-pre-publish.
    """
    content_id = queue_item.get("published_content_id", "")
    raw_type = queue_item.get("content_type", "blog")
    ct = STRAPI_CONTENT_TYPES.get(raw_type, "blog-posts")
    if not content_id:
        return None
    try:
        resp = strapi.find_one(ct, content_id, populate="*", status="draft")
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

    # 1. Always write back the corrected_html on the draft version (even if
    # approved without changes, they should be byte-identical to the input —
    # safe no-op). Note: content_generator.py creates entries as DRAFT in
    # Strapi v5, so this patch always targets the draft.
    if doc_id and review.corrected_html and len(review.corrected_html) > 100:
        update_payload = {field_name: review.corrected_html}
        try:
            strapi.update(ct, doc_id, update_payload, status="draft")
        except Exception as e:
            print(f"[WARN] Could not patch {ct}/{doc_id}: {e}")

    # 2. Publish authority: only the gate decides if an article goes live.
    #   - auto_publish    -> promote draft to published, queue=published
    #   - preview_first   -> KEEP AS DRAFT, queue=published (Telegram preview flags
    #                        the entry for a human eyeball before publish via admin)
    #   - human_required  -> KEEP AS DRAFT, queue=failed (corrected_html applied
    #                        but the article is not visible until a human fixes it)
    # Article body is patched in all 3 cases; publish state reflects gate verdict.
    publish_now = next_step == "auto_publish"
    if publish_now and doc_id:
        try:
            strapi.publish(ct, doc_id)
            print(f"[gate] {ct}/{doc_id} promoted draft->published")
            # WIRE_SITE: claude_review_runner.py:129 (discovered Wave 0 — M2 fix)
            # Phase 17 plan 17-01: notifica Google Indexing API + IndexNow
            # SOLO sul promotion EN. IT/ES verranno coperti via translation_agent.
            # TODO Phase 17 follow-up: hook _notify_search_engines into
            # translation_agent promotion path on .119 quando IT/ES draft -> published.
            # Per v1, indexing fires solo per EN promotion; IT/ES verranno indicizzate
            # al prossimo sitemap fetch di Google (1-3gg lag accettabile).
            slug = content.get("slug", "")
            if slug:
                en_url = _canonical_url(ct, "en", slug)
                _notify_search_engines(en_url)
        except Exception as e:
            print(f"[WARN] Could not publish {ct}/{doc_id}: {e}")
            publish_now = False

    if next_step == "auto_publish":
        new_queue_status = "published"
    elif next_step == "preview_first":
        new_queue_status = "published"
    else:  # human_required
        new_queue_status = "failed"

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


def _esc(s: str) -> str:
    """Escape characters that Telegram HTML parse mode chokes on."""
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def telegram_report(
    title: str,
    queue_item: dict,
    content: dict,
    review: ReviewResult,
    next_step: str,
) -> None:
    """Send a structured Telegram report tagged [BBQ]. Splits to multiple
    messages if the body would exceed Telegram's 4096-char limit."""
    ct = content.get("_strapi_type", "blog-posts")
    slug = content.get("slug", "")
    preview_url = f"{SITE_PREVIEW_BASE}/en/{ct.rstrip('s')}/{slug}" if slug else "(no slug)"

    headline = {
        "auto_publish": "AUTO-PUBLISHED",
        "preview_first": "PREVIEW NEEDED",
        "human_required": "HUMAN REVIEW REQUIRED",
    }.get(next_step, next_step.upper())

    header_lines: list[str] = [
        f"<b>[BBQ] {headline}</b>",
        f"<b>{_esc(title)}</b>",
        f"Score: {review.score}/10  |  Words: {review.word_count}",
        _esc(review.summary),
        f"<a href=\"{_esc(preview_url)}\">Preview link</a>",
    ]
    telegram.send_agent_report("BBQ Claude Gate", "\n".join(header_lines))

    if review.issues:
        # One message per chunk of issues to stay under 4096 chars.
        chunk: list[str] = ["<b>Issues:</b>"]
        chunk_len = len(chunk[0])
        for issue in review.issues:
            sev = _esc(issue.severity.upper())
            verdict = f" -&gt; {_esc(issue.verdict)}" if issue.verdict else ""
            loc = f" @ {_esc(issue.location[:80])}" if issue.location else ""
            line = f"\n[{sev}] <i>{_esc(issue.category)}</i>{loc}{verdict}\n  {_esc(issue.description[:300])}"
            if issue.fix_applied:
                line += f"\n  fix: {_esc(issue.fix_applied[:200])}"
            if issue.suggested_fix:
                line += f"\n  sugg: {_esc(issue.suggested_fix[:200])}"
            if chunk_len + len(line) > 3800:
                telegram.send_agent_report("BBQ Claude Gate", "\n".join(chunk))
                chunk = [line]
                chunk_len = len(line)
            else:
                chunk.append(line)
                chunk_len += len(line)
        if chunk:
            telegram.send_agent_report("BBQ Claude Gate", "\n".join(chunk))

    extras: list[str] = []
    if review.broken_product_links:
        extras.append(f"<b>Broken product links:</b> {_esc(', '.join(review.broken_product_links[:8]))}")
    if review.broken_blog_links:
        extras.append(f"<b>Broken blog links:</b> {_esc(', '.join(review.broken_blog_links[:8]))}")
    if extras:
        telegram.send_agent_report("BBQ Claude Gate", "\n".join(extras))


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
