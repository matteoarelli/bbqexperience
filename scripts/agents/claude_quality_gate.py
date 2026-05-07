"""Claude Opus 4.7 quality gate for BBQ Experience articles.

Mirrors the pattern of reflexmania-blog-pipeline/modules/claude_review.py:
invokes the Claude Code CLI in print mode using the user's Pro Max OAuth
session (NO Anthropic API key, NO pay-per-token). Output is structured JSON
validated against the schema in prompts/claude_review.md.

Prerequisites:
  - claude.exe installed and authenticated (OAuth Pro Max)
  - Run from a machine with active claude session (~/.claude/)
  - Windows-only (CLI Pro Max OAuth lives on Windows side, see CLAUDE.md)
"""
import json
import os
import pathlib
import re
import subprocess
from dataclasses import dataclass, field
from string import Template
from typing import List

ROOT = pathlib.Path(__file__).resolve().parent
PROMPT_DOC = (ROOT / "prompts" / "claude_review.md").read_text(encoding="utf-8")


def _extract_block(heading: str) -> str:
    pattern = rf"## {re.escape(heading)}\s*\n+```(?:\w+)?\n(.+?)\n```"
    m = re.search(pattern, PROMPT_DOC, re.DOTALL)
    if not m:
        raise RuntimeError(f"Could not extract '{heading}' block from claude_review.md")
    return m.group(1)


SYSTEM_PROMPT = _extract_block("System prompt (da `--append-system-prompt`)")
USER_TEMPLATE = _extract_block("User prompt template")
JSON_SCHEMA = json.loads(_extract_block("JSON schema output (per `--json-schema`)"))

CLAUDE_BIN = os.environ.get("CLAUDE_BIN", r"C:\Users\pozzu\.local\bin\claude.exe")


@dataclass
class ReviewIssue:
    category: str
    severity: str
    description: str
    location: str = ""
    verdict: str = ""
    fix_applied: str = ""
    suggested_fix: str = ""


@dataclass
class ReviewResult:
    approved: bool
    score: int
    summary: str
    corrected_html: str
    issues: List[ReviewIssue] = field(default_factory=list)
    word_count: int = 0
    broken_product_links: List[str] = field(default_factory=list)
    broken_blog_links: List[str] = field(default_factory=list)
    raw_response: dict = field(default_factory=dict)

    @property
    def has_critical_issues(self) -> bool:
        return any(i.severity == "critical" for i in self.issues)

    @property
    def has_major_issues(self) -> bool:
        return any(i.severity in ("critical", "major") for i in self.issues)


def review_article(
    article_html: str,
    catalog_whitelist: List[dict],
    blog_whitelist: List[dict],
    topic_title: str,
    url_slug: str,
    content_type: str,
    cluster: str,
    keyword: str,
    target: str = "BBQ enthusiast (intermediate to advanced pitmaster)",
    timeout_seconds: int = 600,
) -> ReviewResult:
    """Run Claude Opus 4.7 review on an HTML article.

    Args:
        article_html: post-Qwen HTML to review
        catalog_whitelist: list of dicts {slug, name, brand, price?}
        blog_whitelist: list of dicts {slug, title, content_type}
        topic_title, url_slug, content_type, cluster, keyword, target: article context

    Returns ReviewResult with structured findings + corrected_html.
    """
    user_prompt = Template(USER_TEMPLATE).safe_substitute(
        article_html=article_html,
        catalog_whitelist_json=json.dumps(catalog_whitelist, ensure_ascii=False, indent=2),
        blog_whitelist_json=json.dumps(blog_whitelist, ensure_ascii=False, indent=2),
        topic_title=topic_title,
        url_slug=url_slug,
        content_type=content_type,
        cluster=cluster,
        keyword=keyword,
        target=target,
    )

    cmd = [
        CLAUDE_BIN,
        "-p",
        "--output-format", "json",
        "--append-system-prompt", SYSTEM_PROMPT,
        "--effort", "high",
        "--model", "opus",
    ]

    res = subprocess.run(
        cmd,
        input=user_prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=timeout_seconds,
    )

    if res.returncode != 0:
        raise RuntimeError(f"Claude CLI failed (code {res.returncode}): {res.stderr[:500]}")

    if not res.stdout.strip():
        raise RuntimeError(f"Claude returned empty stdout. stderr: {res.stderr[:500]}")

    try:
        envelope = json.loads(res.stdout)
    except json.JSONDecodeError as e:
        debug = ROOT / "logs" / "claude_review_debug_stdout.txt"
        debug.parent.mkdir(exist_ok=True)
        debug.write_text(res.stdout, encoding="utf-8")
        raise RuntimeError(f"Envelope JSON parse failed ({e}). Saved stdout to {debug}")

    if envelope.get("type") != "result" or envelope.get("subtype") != "success":
        raise RuntimeError(
            f"Unexpected Claude envelope: subtype={envelope.get('subtype')} "
            f"is_error={envelope.get('is_error')} api_error={envelope.get('api_error_status')}"
        )

    result_field = envelope.get("result", "")
    if isinstance(result_field, dict):
        structured = result_field
    elif isinstance(result_field, str):
        clean = re.sub(r"^```(?:json)?\s*\n", "", result_field.strip())
        clean = re.sub(r"\n```\s*$", "", clean)
        try:
            structured = json.loads(clean)
        except json.JSONDecodeError as e:
            debug = ROOT / "logs" / "claude_review_debug_result.txt"
            debug.parent.mkdir(exist_ok=True)
            debug.write_text(result_field, encoding="utf-8")
            raise RuntimeError(f"Result-string JSON parse failed ({e}). Saved result to {debug}")
    else:
        raise RuntimeError(f"Unexpected result type: {type(result_field)}")

    return ReviewResult(
        approved=structured["approved"],
        score=structured["score"],
        summary=structured["summary"],
        corrected_html=structured["corrected_html"],
        issues=[ReviewIssue(**{k: v for k, v in i.items() if k in ReviewIssue.__dataclass_fields__})
                for i in structured.get("issues", [])],
        word_count=structured.get("word_count", 0),
        broken_product_links=structured.get("broken_product_links", []),
        broken_blog_links=structured.get("broken_blog_links", []),
        raw_response=envelope,
    )


def decide_next_step(result: ReviewResult) -> str:
    """Pipeline decision logic post-review.

    Returns one of: 'auto_publish', 'preview_first', 'human_required'.
    """
    if result.has_critical_issues:
        return "human_required"
    if result.approved and result.score >= 7:
        return "auto_publish"
    if result.approved and result.score >= 5:
        return "preview_first"
    return "human_required"
