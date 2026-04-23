# Phase 15: Growth Engine v2 -- Analytics Feedback Loop - Research

**Researched:** 2026-04-21
**Domain:** Umami Analytics API + Python agents + Strapi CMS integration
**Confidence:** HIGH

## Summary

This phase wires Umami traffic data into the existing Python agent ecosystem so that content decisions become data-driven. The core loop is: Umami tracks per-page visits -> nightly cron fetches 7d/30d metrics via API -> writes `traffic_score` back into Strapi -> Telegram digest shows top/bottom performers -> Claude strategist uses the score to prioritize refresh candidates.

The Umami API provides a `/api/websites/:websiteId/metrics` endpoint with `type=path` that returns per-URL visitor counts in `{x: path, y: visitors}` format. This is the primary data source. The existing `telegram_bot.py` and `claude_strategist.py` already authenticate to Umami (username/password -> bearer token), so the pattern is proven. The new `umami_client.py` library must mirror `strapi_client.py` conventions (retry with exponential backoff, structured errors) and add session token caching (58-min TTL, Umami tokens expire at 60 min).

**Primary recommendation:** Build `umami_client.py` as a thin wrapper around the `/metrics` and `/metrics/expanded` endpoints, reusing the exact retry/timeout patterns from `strapi_client.py`. Add `traffic_score` fields to the 4 content type schemas. The `umami_feedback.py` agent maps URL paths to Strapi content via the localized route table already used by `random_check.py` and `seo_optimizer.py`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANLY-01 | Nightly agent fetches 7d/30d visits per article from Umami, writes traffic_score to Strapi | Umami `/metrics?type=path` endpoint returns per-URL visitors. All 4 content types have `published_date` and `slug` fields. Schema needs new `traffic_score_7d`, `traffic_score_30d`, `traffic_last_updated` fields. |
| ANLY-02 | `umami_client.py` mirrors strapi_client.py patterns (retry, timeout, cached session) | `strapi_client.py` uses `MAX_RETRIES=3`, `RETRY_BACKOFF=[1,2,4]`, `timeout=30`. Umami auth returns JWT token (60-min expiry). Cache with 58-min TTL. |
| ANLY-03 | Daily Telegram digest with top 5 / bottom 5 by 7d traffic per locale | `telegram_bot.py` daily_report runs at 21:00 UTC. Add a new section. `telegram.send_agent_report()` supports HTML formatting. |
| ANLY-04 | Claude strategist consumes traffic_score for content queue prioritization | `claude_strategist.py` already calls `get_traffic_summary()` and `get_content_performance()`. Add traffic_score data to the prompt context. |
| ANLY-05 | Low-confidence filter: <50 visits or <7 days since publish excluded from agent actions | All 4 content types have `published_date` field. Filter logic goes in `umami_feedback.py` before writing scores. Unit test required. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives that constrain this phase:

- **Agent retry** -- strapi_client, ollama, claude_client have retry with exponential backoff (3 attempts). Do NOT add custom retry in individual agents. `umami_client.py` must follow same pattern internally.
- **Fetch timeouts** -- ALL fetch() to external services must have `signal: AbortSignal.timeout(10_000)` equivalent. In Python: `timeout=10` on `urlopen`.
- **Atomic file writes** -- For state JSON files (state/), use temp file + `os.replace()` to avoid corruption from concurrent crons.
- **Env vars** -- ALL env vars needed at runtime must be both ARG in Dockerfile and -e in docker run.
- **Segreti** -- NEVER commit token/API key in files. Use `.env.windows` (gitignored) for Windows, `.env` for server.
- **Agent location** -- scripts in `scripts/agents/`, shared libs in `scripts/agents/lib/`.
- **Container names** -- PostgreSQL: "postgres" (not "bbqexperience-postgres").
- **Deploy** -- webhook auto on push. To force: `--no-cache` in docker build.

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python stdlib (urllib) | 3.x | HTTP requests to Umami API | Project convention -- all agents use `urllib.request`, not `requests` or `httpx` [VERIFIED: strapi_client.py, telegram.py] |
| python-telegram-bot | >=21.0,<22.0 | Telegram bot framework | Already in requirements.txt [VERIFIED: scripts/agents/requirements.txt] |
| json (stdlib) | 3.x | JSON parsing | Standard [VERIFIED: all agents] |
| pytest | latest | Unit testing for low-confidence filter | Nyquist validation enabled, no pytest config exists yet -- Wave 0 gap [VERIFIED: no pytest.ini/pyproject.toml found] |

### No New Dependencies Needed

This phase requires zero new pip packages. Everything builds on stdlib (`urllib.request`, `json`, `time`, `datetime`) matching existing agent conventions. [VERIFIED: all existing agents in scripts/agents/lib/ use only stdlib]

## Architecture Patterns

### Recommended Project Structure

```
scripts/agents/
  lib/
    umami_client.py          # NEW: Umami API client (mirrors strapi_client.py)
    strapi_client.py          # existing
    telegram.py               # existing
  umami_feedback.py           # NEW: nightly cron agent
  telegram_bot.py             # MODIFY: add top/bottom traffic section
  claude_strategist.py        # MODIFY: consume traffic_score
  crontab.txt                 # MODIFY: add 04:00 UTC cron line

cms/src/api/
  blog-post/content-types/blog-post/schema.json    # MODIFY: add traffic fields
  review/content-types/review/schema.json           # MODIFY: add traffic fields
  recipe/content-types/recipe/schema.json           # MODIFY: add traffic fields
  tutorial/content-types/tutorial/schema.json       # MODIFY: add traffic fields

tests/
  test_umami_feedback.py      # NEW: unit tests for low-confidence filter
```

### Pattern 1: Umami API Client (umami_client.py)

**What:** Thin wrapper around Umami REST API with session token caching and retry.
**When to use:** Any agent needing Umami analytics data.

```python
# Source: Verified against existing strapi_client.py + Umami API docs
"""Client REST per Umami Analytics -- usato dagli agenti AI."""

import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

UMAMI_URL = os.environ.get("UMAMI_URL", "https://analytics.bbq-experience.com")
UMAMI_USERNAME = os.environ.get("UMAMI_USERNAME", "admin")
UMAMI_PASSWORD = os.environ.get("UMAMI_PASSWORD", "")
UMAMI_SITE_ID = os.environ.get("UMAMI_SITE_ID", "78df95b7-1b94-43e7-9f0d-38c63e99cf64")

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]
TOKEN_TTL = 58 * 60  # 58 minuti (token Umami scade a 60 min)

_cached_token: str = ""
_token_ts: float = 0.0


def _get_token() -> str:
    """Autentica su Umami e ritorna token (con cache 58-min TTL)."""
    global _cached_token, _token_ts
    if _cached_token and (time.time() - _token_ts) < TOKEN_TTL:
        return _cached_token

    url = f"{UMAMI_URL}/api/auth/login"
    body = json.dumps({"username": UMAMI_USERNAME, "password": UMAMI_PASSWORD}).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as resp:
        _cached_token = json.loads(resp.read())["token"]
        _token_ts = time.time()
    return _cached_token


def _request(url: str) -> dict | list:
    """GET request con retry e backoff esponenziale."""
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        token = _get_token()
        req = Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            if 400 <= e.code < 500:
                raise RuntimeError(f"Umami GET {url} -> {e.code}") from e
            last_error = RuntimeError(f"Umami GET {url} -> {e.code}")
        except (URLError, TimeoutError, OSError) as e:
            last_error = RuntimeError(f"Umami GET {url} -> network: {e}")
        if attempt < MAX_RETRIES - 1:
            wait = RETRY_BACKOFF[attempt]
            print(f"[RETRY] Umami tentativo {attempt + 2}/{MAX_RETRIES} tra {wait}s...")
            time.sleep(wait)
    raise last_error  # type: ignore[misc]


def get_metrics_by_path(start_ms: int, end_ms: int, *, limit: int = 500) -> list[dict]:
    """GET /api/websites/:id/metrics?type=path -- ritorna [{x: path, y: visitors}]."""
    url = (
        f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/metrics"
        f"?startAt={start_ms}&endAt={end_ms}&type=path&limit={limit}"
    )
    return _request(url)
```

[VERIFIED: Umami API endpoint format from official docs at docs.umami.is/docs/api/website-stats]
[VERIFIED: Token auth pattern from existing telegram_bot.py get_umami_token()]

### Pattern 2: URL Path to Strapi Content Mapping

**What:** Map Umami URL paths (e.g. `/it/recensioni/weber-kettle/`) back to Strapi content type + slug + locale.
**When to use:** In `umami_feedback.py` to match traffic data to CMS entries.

```python
# Source: Verified from web/src/lib/i18n.ts localizedRoutes + random_check.py LOCALIZED_ROUTES
ROUTE_TO_CONTENT_TYPE: dict[str, str] = {
    "blog": "blog-posts",
    "reviews": "reviews",
    "recensioni": "reviews",
    "resenas": "reviews",
    "recipes": "recipes",
    "ricette": "recipes",
    "recetas": "recipes",
    "tutorials": "tutorials",
    "guide": "tutorials",
    "tutoriales": "tutorials",
}

LOCALES = ["en", "it", "es"]

def parse_umami_path(path: str) -> tuple[str, str, str] | None:
    """Parsa path Umami -> (content_type, slug, locale) o None se non e contenuto."""
    parts = [p for p in path.strip("/").split("/") if p]
    if len(parts) < 3:
        return None  # Non e una pagina di dettaglio contenuto
    locale = parts[0]
    if locale not in LOCALES:
        return None
    route_segment = parts[1]
    content_type = ROUTE_TO_CONTENT_TYPE.get(route_segment)
    if not content_type:
        return None
    slug = parts[2]
    return (content_type, slug, locale)
```

[VERIFIED: Route mappings from web/src/lib/i18n.ts lines 15-31 and scripts/random_check.py lines 30-35]

### Pattern 3: Low-Confidence Filter

**What:** Exclude content with <50 visits or <7 days since publish from agent actions.
**When to use:** Before writing traffic_score and before strategist uses score.

```python
from datetime import date, timedelta

MIN_VISITS = 50
MIN_DAYS_PUBLISHED = 7

def is_high_confidence(visits: int, published_date: str | None) -> bool:
    """Verifica se il dato di traffico e affidabile per decisioni."""
    if visits < MIN_VISITS:
        return False
    if not published_date:
        return False
    pub = date.fromisoformat(published_date)
    if (date.today() - pub).days < MIN_DAYS_PUBLISHED:
        return False
    return True
```

### Anti-Patterns to Avoid

- **Do NOT add retry logic inside umami_feedback.py** -- retry lives in `umami_client.py` only, per CLAUDE.md convention. [VERIFIED: CLAUDE.md "Agent retry" rule]
- **Do NOT use `requests` or `httpx`** -- all agents use stdlib `urllib.request`. [VERIFIED: all lib/*.py files]
- **Do NOT write state files without atomic writes** -- use temp + `os.replace()`. [VERIFIED: CLAUDE.md "Atomic file writes" rule]
- **Do NOT hardcode Umami credentials** -- use env vars matching existing pattern. [VERIFIED: telegram_bot.py lines 28-29]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL path parsing to locale/content-type/slug | Regex-based custom parser | Dict lookup from `ROUTE_TO_CONTENT_TYPE` map | Localized routes already defined in i18n.ts; keep in sync |
| Umami authentication | Custom JWT refresh logic | Cache token with TTL < expiry (58 min < 60 min) | Simpler than parsing JWT exp claim |
| Strapi field updates per locale | Manual HTTP calls | `strapi_client.update(ct, doc_id, data, locale=locale)` | Already handles locale query param [VERIFIED: strapi_client.py line 102] |
| Telegram message formatting | Custom HTML builder | `telegram.send_agent_report()` | Already formats agent reports [VERIFIED: telegram.py line 34] |

## Common Pitfalls

### Pitfall 1: Umami Timestamps are Milliseconds

**What goes wrong:** Passing Unix seconds instead of milliseconds to `startAt`/`endAt`.
**Why it happens:** Python `time.time()` returns seconds; Umami expects milliseconds.
**How to avoid:** Always multiply by 1000: `int(time.time() * 1000)`.
**Warning signs:** Empty results or 400 errors from Umami API.
[VERIFIED: telegram_bot.py uses ISO date strings which work differently; Umami API docs specify millisecond timestamps]

### Pitfall 2: Locale-Specific URL Slugs

**What goes wrong:** Assuming the same slug appears in all locales for the same content.
**Why it happens:** Strapi `slug` is a UID field on the default locale but may differ per localized version.
**How to avoid:** Fetch content from Strapi with `fields=["slug", "published_date"]` per locale, then match against Umami paths per locale.
**Warning signs:** Missing traffic data for IT/ES content.
[VERIFIED: Strapi schema has `slug` as `uid` type in all 4 content types]

### Pitfall 3: Umami API Rate Limits on Self-Hosted

**What goes wrong:** Hammering the Umami API with too many requests.
**Why it happens:** Fetching metrics separately for each content type or date range.
**How to avoid:** Single call to `/metrics?type=path&limit=500` returns ALL paths ranked by visitors. Process the full list in memory.
**Warning signs:** 429 responses or Umami becoming unresponsive.
[ASSUMED: Self-hosted Umami has no documented rate limit, but being conservative is prudent]

### Pitfall 4: Strapi v5 Localized Update Requires slug in Body

**What goes wrong:** PUT to update `traffic_score` on IT/ES locale fails or creates orphan.
**Why it happens:** Strapi v5 requires `?locale=xx` in query param AND `slug` in body for localized updates.
**How to avoid:** Always include slug in the update payload when locale is specified.
**Warning signs:** 400 errors or duplicate entries in CMS.
[VERIFIED: CLAUDE.md "Strapi v5 localizzazioni" convention]

### Pitfall 5: Token Expiry Mid-Batch

**What goes wrong:** Umami token expires during a long-running metrics fetch + Strapi update cycle.
**Why it happens:** Umami JWT tokens expire after 60 minutes; processing 200+ content items across 3 locales can exceed this.
**How to avoid:** Cache token with 58-min TTL (2 min safety margin), re-authenticate automatically.
**Warning signs:** 401 errors partway through the batch.
[VERIFIED: token TTL pattern from Umami API docs auth endpoint]

## Code Examples

### Strapi Schema Addition for traffic_score

```json
// Source: Verified against existing schema format in cms/src/api/blog-post/content-types/blog-post/schema.json
// Add to attributes section of all 4 content types
"traffic_score_7d": {
  "type": "integer",
  "default": 0
},
"traffic_score_30d": {
  "type": "integer",
  "default": 0
},
"traffic_last_updated": {
  "type": "datetime"
}
```

Note: `traffic_score` fields should NOT be localized (`pluginOptions.i18n.localized` omitted = false). Each locale's traffic is tracked independently via the URL path, but the score is written per-locale using `strapi_client.update(..., locale=locale)`. The field itself is not marked as localized because the value differs per locale entry and Strapi v5 handles this via the locale query param on update. [VERIFIED: strapi_client.update supports locale param]

### Telegram Top/Bottom Section

```python
# Source: Pattern from telegram_bot.py daily_report()
def format_traffic_digest(top5: list[dict], bottom5: list[dict], locale: str) -> str:
    """Formatta sezione traffico per digest Telegram."""
    lines = [f"<b>TRAFFICO {locale.upper()} (7gg)</b>"]
    lines.append("Top 5:")
    for item in top5:
        lines.append(f"  {item['visits']}v - {item['title']}")
    lines.append("Bottom 5:")
    for item in bottom5:
        lines.append(f"  {item['visits']}v - {item['title']}")
    return "\n".join(lines)
```

### Crontab Entry

```bash
# Source: Matches existing crontab.txt format
# Umami Feedback -- Ogni giorno 04:00 UTC
0 4 * * * cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/umami_feedback.py >> /opt/webhooks/logs/umami-feedback.log 2>&1
```

[VERIFIED: crontab format from scripts/agents/crontab.txt]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Umami dashboard checking | Automated traffic_score in CMS | This phase | Matteo stops dashboard-diving |
| Strategist uses only aggregate stats | Strategist gets per-article traffic data | This phase | Data-driven content decisions |
| No per-article analytics in Strapi | traffic_score_7d/30d fields | This phase | Enables Phase 16 A/B baseline sizing |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Umami self-hosted has no API rate limit requiring special handling | Pitfall 3 | Could need request throttling; LOW risk since we make only 2-4 API calls total |
| A2 | `type=path` on `/metrics` endpoint returns unique visitors (not pageviews) as the `y` value | Architecture Pattern 1 | If it returns pageviews instead, the threshold of 50 may need adjustment; can verify at runtime |
| A3 | Umami JWT tokens expire at exactly 60 minutes | Pitfall 5 | If shorter, 58-min cache might still fail; mitigated by retry logic that re-authenticates on 401 |
| A4 | Strapi integer fields can store traffic counts up to INT range (~2.1B) | Code Examples | Zero risk for a BBQ site |

## Open Questions

1. **Umami version on Hetzner**
   - What we know: Umami is running at analytics.bbq-experience.com, API works (telegram_bot.py uses it daily)
   - What's unclear: Exact version (v2 vs v3) -- API slightly differs. The `/metrics/expanded` endpoint (returns pageviews + visitors separately) may not exist on older v2.
   - Recommendation: Check server version. If v2, use `/metrics?type=path` (returns visitors). If v3, prefer `/metrics/expanded` for richer data. Either way, the basic approach works.

2. **traffic_score field semantics**
   - What we know: Requirements say "traffic_score" as a single field
   - What's unclear: Whether to store raw visit count or a normalized score
   - Recommendation: Store raw unique-visitor counts as `traffic_score_7d` and `traffic_score_30d` integers. Raw counts are simpler, debuggable, and the strategist can normalize in its prompt. Adding a computed "score" adds complexity without benefit at this scale.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Umami Analytics API | ANLY-01, ANLY-02 | Yes (confirmed) | unknown (verify) | -- |
| Strapi REST API | ANLY-01 | Yes (confirmed) | 5.40.0 | -- |
| Telegram Bot API | ANLY-03 | Yes (confirmed) | -- | -- |
| Python 3 on Hetzner | All | Yes (confirmed) | 3.x | -- |
| pytest | ANLY-05 (unit test) | Unknown on Hetzner; available locally | -- | Run tests locally before deploy |

[VERIFIED: Umami API available -- telegram_bot.py and claude_strategist.py already use it successfully]
[VERIFIED: Strapi API available -- all agents use strapi_client.py daily]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (needs install) |
| Config file | none -- Wave 0 gap |
| Quick run command | `python -m pytest tests/test_umami_feedback.py -x` |
| Full suite command | `python -m pytest tests/ -x` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLY-01 | Umami path parsing + Strapi field mapping | unit | `python -m pytest tests/test_umami_feedback.py::test_parse_umami_path -x` | Wave 0 |
| ANLY-02 | umami_client retry + token caching | unit | `python -m pytest tests/test_umami_client.py -x` | Wave 0 |
| ANLY-03 | Telegram digest formatting | unit | `python -m pytest tests/test_umami_feedback.py::test_format_digest -x` | Wave 0 |
| ANLY-04 | Strategist consumes traffic_score | manual-only | Verify in strategy report output | -- |
| ANLY-05 | Low-confidence filter (<50 visits, <7 days) | unit | `python -m pytest tests/test_umami_feedback.py::test_low_confidence_filter -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `python -m pytest tests/test_umami_feedback.py -x`
- **Per wave merge:** `python -m pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/__init__.py` -- empty init
- [ ] `tests/test_umami_feedback.py` -- covers ANLY-01, ANLY-03, ANLY-05
- [ ] `tests/test_umami_client.py` -- covers ANLY-02 (mock urllib)
- [ ] pytest install: `pip install pytest` (not in requirements.txt currently)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Umami username/password in env vars, never in code |
| V3 Session Management | yes | Token cached with TTL < expiry |
| V4 Access Control | no | Internal agent, no user-facing access |
| V5 Input Validation | yes | Validate Umami API response structure before processing |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Umami credentials in code | Information Disclosure | Env vars only (UMAMI_PASSWORD), .env.windows gitignored |
| Strapi API token in code | Information Disclosure | Env vars only (STRAPI_API_TOKEN), .env.windows gitignored |
| Malformed Umami response injection | Tampering | Validate response is list of {x: str, y: int} before processing |

## Sources

### Primary (HIGH confidence)
- [Umami API docs - website-stats](https://docs.umami.is/docs/api/website-stats) -- metrics endpoint, parameters, response format
- `scripts/agents/lib/strapi_client.py` -- retry/backoff/timeout patterns
- `scripts/agents/telegram_bot.py` -- existing Umami auth + Telegram report patterns
- `scripts/agents/claude_strategist.py` -- existing strategist data flow
- `cms/src/api/*/content-types/*/schema.json` -- all 4 content type schemas verified
- `web/src/lib/i18n.ts` -- localized route mappings
- `scripts/random_check.py` -- LOCALIZED_ROUTES content-type-to-route mapping

### Secondary (MEDIUM confidence)
- [Clayton Errington blog](https://claytonerrington.com/blog/umami-api-top-10-pages/) -- practical Umami /metrics usage with type=url
- [Umami API automate reporting guide](https://docs.umami.is/docs/guides/automate-reporting-with-api) -- general API usage patterns

### Tertiary (LOW confidence)
- Umami token expiry time (60 min) -- from common knowledge, not verified against specific Umami version on server

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, zero new dependencies
- Architecture: HIGH -- patterns directly mirror existing agents, Umami API verified against official docs
- Pitfalls: HIGH -- most based on verified code analysis of existing codebase
- Umami API specifics: MEDIUM -- endpoint verified but server version unknown

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no fast-moving dependencies)
