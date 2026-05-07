"""Apply the smoke-test result to Strapi without re-running Opus.

Reads logs/smoke-test-{result.json,corrected.html}, reconstructs a ReviewResult,
and feeds it through the same apply_review + telegram_report path as the live
runner. Idempotent enough: re-running just re-patches the same body.
"""
import io
import json
import os
import sys
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parent
ed = HERE / "agents" / ".env.windows"
for line in ed.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(HERE))

from agents.lib import strapi_client as strapi  # noqa: E402
from agents.claude_quality_gate import ReviewResult, ReviewIssue  # noqa: E402
from agents.claude_review_runner import apply_review, telegram_report, fetch_published_content  # noqa: E402

logs = HERE.parent / "logs"
result_data = json.loads((logs / "smoke-test-result.json").read_text(encoding="utf-8"))
corrected = (logs / "smoke-test-corrected.html").read_text(encoding="utf-8")

# Find the queue item from the smoke test (most recent published item, same selection logic).
items = strapi.find_all_pages(
    "content-queues",
    status="draft",
    filters={"status": {"$eq": "published"}},
    sort="updatedAt:desc",
)
q = items[0]
print(f"Target queue item: {q.get('title')}  (id={q['documentId']})")

content = fetch_published_content(q)
if not content:
    print("Could not fetch content, aborting.")
    sys.exit(1)

# Reconstruct ReviewResult from saved JSON
issues = [
    ReviewIssue(
        category=i["category"],
        severity=i["severity"],
        description=i["description"],
        location=i.get("location", ""),
        verdict=i.get("verdict", ""),
        fix_applied=i.get("fix_applied", ""),
        suggested_fix=i.get("suggested_fix", ""),
    )
    for i in result_data["issues"]
]
result = ReviewResult(
    approved=result_data["approved"],
    score=result_data["score"],
    summary=result_data["summary"],
    corrected_html=corrected,
    issues=issues,
    word_count=result_data["word_count"],
    broken_product_links=result_data["broken_product_links"],
    broken_blog_links=result_data["broken_blog_links"],
)

print(f"approved={result.approved} score={result.score} issues={len(result.issues)}")
print(f"corrected_html length: {len(corrected)} chars")
print()
print("Applying...")
next_step = apply_review(content, result, q["documentId"])
print(f"  apply_review -> next_step={next_step}")
print()
print("Sending Telegram report...")
telegram_report(q.get("title", "?"), q, content, result, next_step)
print("Done.")
