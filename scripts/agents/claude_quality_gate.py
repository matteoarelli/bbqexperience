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
    def has_unresolved_critical_issues(self) -> bool:
        """Critical issues that Claude could NOT auto-fix.

        Per prompts/claude_review.md the gate sets verdict="fixed" when it
        auto-corrects an error (the fix is already inside corrected_html), and
        "needs_human"/"uncertain" when a human decision is required. A critical
        issue with verdict="fixed" is already remediated and must NOT block an
        otherwise-approved article — only unresolved criticals do.
        """
        return any(
            i.severity == "critical" and i.verdict != "fixed"
            for i in self.issues
        )

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


def review_meta(
    current_title: str,
    current_meta: str,
    proposed_title: str,
    proposed_meta: str,
    queries: list[str],
    locale: str,
    excerpt: str,
    timeout_seconds: int = 120,
) -> ReviewResult:
    """Claude review per cambio meta (variante leggera di review_article).

    Verifica:
    1. LENGTH cap 60/155 (pre-check senza Claude, fail-fast)
    2. ACCURACY claim vs excerpt (Claude semantic check)
    3. KEYWORD MATCH almeno 1 target query (Claude semantic check)
    4. NO CLICKBAIT (Claude)
    5. LOCALE accenti corretti (Claude)
    6. TONE Pitmaster (Claude)

    Decisione: ReviewResult.approved True/False + ReviewIssue list.

    Model lock (m2 fix): --model sonnet sufficiente per length/keyword check,
    opus solo per review semantica completa (vedi review_article).
    """
    # Hard pre-checks (zero costo, fail-fast prima di Claude).
    # B4 fix: usa ReviewIssue(severity=, category=, description=), NON Issue(...).
    issues: list[ReviewIssue] = []
    if len(proposed_title) > 60:
        issues.append(ReviewIssue(
            severity="critical", category="length",
            description=f"title > 60 chars ({len(proposed_title)})",
        ))
    if len(proposed_meta) > 155:
        issues.append(ReviewIssue(
            severity="critical", category="length",
            description=f"meta > 155 chars ({len(proposed_meta)})",
        ))
    if issues:
        return ReviewResult(
            approved=False, score=0,
            summary=f"Pre-check fail: {issues[0].description}",
            corrected_html="",
            issues=issues,
        )

    # Claude CLI semantic check (m2 fix: sonnet sufficiente per length/keyword
    # check, opus solo per review semantica completa — vedi RESEARCH.md Open
    # Questions: meta-review model).
    prompt_path = ROOT / "prompts" / "claude_meta_review.md"
    template = prompt_path.read_text(encoding="utf-8")
    user_prompt = template.format(
        current_title=current_title,
        current_meta=current_meta,
        proposed_title=proposed_title,
        proposed_meta=proposed_meta,
        queries_json=json.dumps(queries, ensure_ascii=False),
        locale=locale,
        excerpt=(excerpt or "")[:500],
    )

    cmd = [
        CLAUDE_BIN,
        "-p",
        "--output-format", "json",
        "--append-system-prompt",
        "You are reviewing SEO meta changes for accuracy and length compliance.",
        "--model", "sonnet",
    ]

    try:
        res = subprocess.run(
            cmd, input=user_prompt, capture_output=True,
            text=True, encoding="utf-8", timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return ReviewResult(
            approved=False, score=0,
            summary=f"Claude CLI timeout dopo {timeout_seconds}s",
            corrected_html="",
            issues=[ReviewIssue(severity="major", category="infrastructure",
                                  description="Claude CLI timeout")],
        )

    # Parse: Claude CLI ritorna envelope {"type":"result","result":"..."} o
    # direttamente {"decision":..., "reasoning":...} (test/mock fanno il
    # secondo). Proviamo entrambi i shape.
    decision = "reject"
    reasoning = ""
    parsed: dict | None = None
    try:
        outer = json.loads(res.stdout)
    except json.JSONDecodeError:
        outer = None

    if isinstance(outer, dict):
        # Shape 1: direct {"decision":..., "reasoning":...}
        if "decision" in outer:
            parsed = outer
        # Shape 2: Claude envelope con 'result'
        elif "result" in outer:
            result_field = outer.get("result", "")
            if isinstance(result_field, dict):
                parsed = result_field
            elif isinstance(result_field, str):
                clean = re.sub(r"^```(?:json)?\s*\n", "", result_field.strip())
                clean = re.sub(r"\n```\s*$", "", clean)
                try:
                    parsed = json.loads(clean)
                except json.JSONDecodeError:
                    parsed = None

    if parsed is None:
        decision = "reject"
        reasoning = "Claude output unparseable"
    else:
        decision = parsed.get("decision", "reject")
        reasoning = parsed.get("reasoning", "")

    approved = (decision == "approve")
    if not approved:
        issues.append(ReviewIssue(
            severity="major", category="semantic",
            description=reasoning or "Claude rejected",
        ))
    return ReviewResult(
        approved=approved,
        score=(10 if approved else 0),
        summary=reasoning,
        corrected_html="",
        issues=issues,
    )


def review_meta_batch(
    proposals: list[dict],
    timeout_seconds: int = 300,
) -> list[ReviewResult] | None:
    """Valuta N proposte meta in UNA sola chiamata Claude CLI.

    Aggiunto 3 lug 2026 (audit costi): 18 sessioni/giorno da ~47k token input
    l'una per payload da ~500 token = ~25M token/mese di overhead harness.
    Batch -> 1 sessione/giorno, ~10x in meno.

    Ogni proposta e' un dict con chiavi: before{seo_title,seo_description},
    proposed{seo_title,seo_description}, query_targets, locale, excerpt.
    I pre-check length girano per-item PRIMA della chiamata (fail-fast locale).

    Ritorna una lista di ReviewResult allineata all'input, oppure None se
    l'output batch non e' parseabile -> il chiamante fa fallback al loop
    per-proposta (review_meta singola).
    """
    results: dict[int, ReviewResult] = {}
    to_review: list[dict] = []
    for i, p in enumerate(proposals):
        pt = p["proposed"]["seo_title"]
        pm = p["proposed"]["seo_description"]
        pre_issues: list[ReviewIssue] = []
        if len(pt) > 60:
            pre_issues.append(ReviewIssue(
                severity="critical", category="length",
                description=f"title > 60 chars ({len(pt)})"))
        if len(pm) > 155:
            pre_issues.append(ReviewIssue(
                severity="critical", category="length",
                description=f"meta > 155 chars ({len(pm)})"))
        if pre_issues:
            results[i] = ReviewResult(
                approved=False, score=0,
                summary=f"Pre-check fail: {pre_issues[0].description}",
                corrected_html="", issues=pre_issues)
        else:
            to_review.append({
                "index": i,
                "locale": p["locale"],
                "current_title": p["before"]["seo_title"],
                "current_meta": p["before"]["seo_description"],
                "excerpt": (p.get("excerpt") or "")[:500],
                "proposed_title": pt,
                "proposed_meta": pm,
                "query_targets": p.get("query_targets", []),
            })

    if to_review:
        template = (ROOT / "prompts" / "claude_meta_review_batch.md").read_text(encoding="utf-8")
        user_prompt = template.format(
            proposals_json=json.dumps(to_review, ensure_ascii=False, indent=1))
        cmd = [
            CLAUDE_BIN, "-p", "--output-format", "json",
            "--append-system-prompt",
            "You are reviewing SEO meta changes for accuracy and length compliance.",
            "--model", "sonnet",
        ]
        try:
            res = subprocess.run(
                cmd, input=user_prompt, capture_output=True,
                text=True, encoding="utf-8", timeout=timeout_seconds)
        except subprocess.TimeoutExpired:
            return None

        arr = None
        try:
            outer = json.loads(res.stdout)
            raw = outer.get("result", "") if isinstance(outer, dict) else ""
            if isinstance(raw, list):
                arr = raw
            elif isinstance(raw, str):
                clean = re.sub(r"^```(?:json)?\s*\n", "", raw.strip())
                clean = re.sub(r"\n```\s*$", "", clean)
                arr = json.loads(clean)
        except (json.JSONDecodeError, AttributeError):
            arr = None
        if not isinstance(arr, list):
            return None  # fallback per-proposta nel chiamante

        by_index = {v.get("index"): v for v in arr if isinstance(v, dict)}
        for item in to_review:
            i = item["index"]
            v = by_index.get(i)
            if v is None:
                return None  # verdict mancante: batch inaffidabile, fallback
            approved = v.get("decision") == "approve"
            reasoning = v.get("reasoning", "")
            issues = [] if approved else [ReviewIssue(
                severity="major", category="semantic",
                description=reasoning or "Claude rejected")]
            results[i] = ReviewResult(
                approved=approved, score=(10 if approved else 0),
                summary=reasoning, corrected_html="", issues=issues)

    return [results[i] for i in range(len(proposals))]


def decide_next_step(result: ReviewResult) -> str:
    """Pipeline decision logic post-review.

    Returns one of: 'auto_publish', 'preview_first', 'human_required'.

    A critical issue blocks publication ONLY if it is unresolved
    (verdict != "fixed"). Criticals that Claude auto-corrected are already
    reflected in corrected_html and must not veto an approved article — that
    over-strict veto was blocking every article from 13 May onward even when
    approved with score 7-8 (see .planning/debug/gate-articoli-non-pubblicati.md).
    """
    if result.has_unresolved_critical_issues:
        return "human_required"
    if result.approved and result.score >= 7:
        return "auto_publish"
    if result.approved and result.score >= 5:
        return "preview_first"
    return "human_required"
