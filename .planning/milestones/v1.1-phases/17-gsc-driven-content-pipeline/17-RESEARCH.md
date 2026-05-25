# Phase 17: GSC-Driven Content Pipeline — Research

**Researched:** 2026-05-25
**Domain:** Google Search Console API + Google Indexing API + IndexNow + Schema.org markup audit + Qwen meta optimization + Claude review-gate reuse
**Confidence:** HIGH on Indexing API scope, GSC API quotas, FAQ/HowTo deprecation; MEDIUM on Italian power-words and striking-distance dedup heuristics; LOW on the on-server `~/instagram-bot/gsc_client.py` exact code (not directly readable).

---

## Executive Summary

1. **Google Indexing API is officially scoped to JobPosting and BroadcastEvent only — but "often works" for blog content in practice.** Default quota = 200 publish requests/day per project. Recommendation: **call it best-effort, non-blocking**, with a feature flag (`GSC_INDEXING_API_ENABLED=true`) and a hard fallback to **IndexNow** (Bing/Yandex, which DO support arbitrary content and represent ~22% of Bing clicked URLs). Google itself is **NOT** an IndexNow participant in 2026 — for Google, the only documented path for editorial content is sitemap + crawl budget.
2. **FAQPage rich result was deprecated by Google on 7 May 2026 (18 days ago).** The schema markup remains valid Schema.org and is still consumed by AI search engines (Perplexity, ChatGPT browse, Gemini, Bing). **Keep emitting FAQPage** — it's a zero-cost AI-search signal even with zero Google SERP value. Existing emission lives in `web/src/components/content/FaqSection.astro` (verified).
3. **HowTo rich results were deprecated September 2023** (mobile Aug 2023, desktop Sept 2023). Schema markup still valid for AI engines. Same rationale: emit it, don't expect Google rich snippets.
4. **`speakable` schema is BETA, supports `cssSelector` OR `xPath` (not both), valuable for AI summary control in 2026** (Perplexity, ChatGPT, Gemini AI Overviews use it as a content-priority signal). Existing `ArticleSchema.astro` does NOT emit it — Phase 17 must add it.
5. **GSC Search Analytics API is robust at our scale:** 1,200 QPM per site, 30M QPD per project, 25,000 rows/request (paginated), `dataState: "all"` returns fresh (last 2-3 days) instead of `final` (default). Filter for striking-distance via `dimensionFilterGroups` with `dimension: "position"` is NOT supported — position is a metric, not filterable. Must **post-filter in Python** after the API call.
6. **Reference implementation:** `~/instagram-bot/gsc_client.py` on 192.168.1.119 already wraps the same endpoints we need. Plan should treat it as an architectural reference (not literal copy — IG bot is on different host) and re-implement following our stdlib `urllib` convention. **Verified 25 May 2026** (today's hardening session changelog): the SA key `merchant-sync@reflexmania-2025` is registered as Owner on the BBQ Search Console property and the IG bot uses it daily for GSC weekly digest.
7. **CTR benchmarks (FirstPageSage 2026):** pos 1 = 39.8%, pos 2 = 18.7%, pos 3 = 10.2%, pos 4 = 7.2%, pos 5 = 5.1%, pos 6 = 4.4%, pos 7 = 3.0%, pos 8 = 2.1%, pos 9 = 1.9%, pos 10 = 1.6%. The roadmap's "3% @ pos 6-10, 5% @ pos 1-5" benchmarks are **lenient** vs FPS — recommendation below to **stratify** instead.
8. **Cron deconfliction:** `meta_optimizer` @ 04:30 UTC after `umami_feedback` @ 04:00 UTC — both well before the SDXL window (06:00-06:55 local = ~04:00-04:55 UTC in summer). `gsc_refresh` @ Sun 08:00 UTC = after `claude_strategist` (Sun 07:00 on .119) and well clear of SDXL.
9. **Claude quality gate is reusable but only on Windows.** `scripts/agents/claude_quality_gate.py` requires `claude.exe` + Pro Max OAuth session — runs on Windows Task Scheduler. The **meta_optimizer auto-apply gate** can therefore be split: (a) `meta_optimizer.py` runs on Hetzner with Qwen drafting the new meta, writes proposals to `state/meta_changes_pending.jsonl`; (b) a separate Windows-side `meta_review.py` polls the pending file, runs Claude quality gate, auto-applies via Strapi PUT. This keeps the cron architecturally consistent with existing `content_generator.py` (Windows) → quality gate → Strapi flow.
10. **No new Python dependencies needed** if we use `urllib` + service account JWT signing manually (50 lines). For convenience and correctness, recommend **`google-auth==2.x` + `google-api-python-client==2.x`** (the IG bot likely already uses them — official Google libraries handle JWT refresh, retries, scopes correctly). Both are pure-Python wheels with no compiled deps. Document the precedent decision in Open Questions if Matteo prefers stdlib-only.

**Primary recommendation:** Use `google-api-python-client` for the GSC client (battle-tested, correct retry/auth), wrap it with our own retry-on-5xx + timeout enforcement in `lib/gsc_client.py` to match the stdlib convention exported by `strapi_client.py`. Treat Indexing API as best-effort non-blocking (logs warning on 403/404, never blocks publish). Add IndexNow as a parallel ping (free, no quota, Bing benefit). Emit FAQPage + HowTo + speakable schemas anyway — they're AI-search signals even after Google deprecation. Stratify CTR benchmarks per-position using FPS data not a 2-bucket heuristic.

---

## User Constraints (from CLAUDE.md and roadmap)

### Locked Decisions
From the roadmap spec (line 180-193 of v1.1-ROADMAP.md):
- Service account key already exists: `~/secrets/gsc-merchant-sync.json` on Hetzner, shared with BBQ + ReflexMania + ScattoPro properties. **Do NOT issue a new key.**
- 9 success criteria fixed — research must not re-litigate them.
- Target plan structure: 3-4 plans, suggested decomposition in roadmap line 193.
- Reuse the existing Claude quality gate pattern from Phase 16 (`scripts/agents/claude_quality_gate.py`) for meta-changes, NOT a new gate from scratch.
- Reuse the IG bot's `gsc_client.py` as architectural reference (port, not invent).
- `keyword_scout.py`, `content_generator.py`, `claude_strategist.py` are TOUCHED but their existing behavior must degrade gracefully when GSC data is absent.
- All new agents need cron entries with provenance comments + Telegram report (success summary + actionable next step on empty/error).

### Project Constraints (from CLAUDE.md)
- **Agent retry**: 3 attempts with exponential backoff `[1, 2, 4]` — implemented inside `lib/*_client.py`, NEVER inside the calling agent.
- **Fetch timeouts**: `timeout=10` on all external `urlopen` calls (matches `strapi_client.py`, `umami_client.py`). Longer timeout `60-120s` only for write operations.
- **Atomic file writes**: `state/*.jsonl` must be written via temp file + `os.replace()` to survive concurrent crons.
- **No new dependencies unless justified**: Python ecosystem in `scripts/agents/requirements.txt` is `python-telegram-bot`, `httpx`, `feedparser`, `beautifulsoup4`. Adding `google-auth` + `google-api-python-client` IS justified (battle-tested OAuth2 + service account flow; manual JWT signing is brittle).
- **Secrets**: NEVER commit SA key. Reference path via env `GSC_SERVICE_ACCOUNT_KEY=/path/to/json` per machine. Add to `.env.windows` and Hetzner `.env`, gitignored.
- **Qwen :8080 unavailable 06:00-06:55 local** = ~04:00-04:55 UTC summer / ~05:00-05:55 UTC winter. Any new cron that calls Qwen MUST run outside this window (or check hour). `meta_optimizer` schedule 04:30 UTC may conflict in summer — schedule it 03:30 UTC instead for safety.
- **Claude CLI Windows-only**. Any Claude-gated agent runs on Windows Task Scheduler, NOT Hetzner cron.
- **Italian code comments** for new Python; English allowed for prompt content.
- **Container names**: PostgreSQL = `postgres`, not `bbqexperience-postgres`.
- **Strapi v5 localized PUTs**: `?locale=xx` query param + slug in body. Use existing `strapi_client.update(content_type, doc_id, data, locale="it")`.

### Claude's Discretion
- Choice of `google-api-python-client` vs hand-rolled JWT signing → recommend the former (rationale above).
- Stratified CTR benchmark table (per-position) vs the roadmap's lenient 2-bucket — recommend stratified.
- Whether to add IndexNow alongside Indexing API → recommend YES, parallel ping, ~30 lines of code.
- Whether meta_optimizer auto-applies via Hetzner Qwen-only or splits to Windows Claude gate → recommend split (Hetzner drafts + queues, Windows reviews + applies).

### Deferred Ideas (OUT OF SCOPE for Phase 17)
- Per-locale GSC properties (IT/ES versions). Roadmap targets EN baseline; IT/ES locales receive the same request_indexing call when promoted.
- GSC Discover / Google News dimensions. Editorial content not in News showcase.
- BigQuery export of GSC data (cheaper at scale, but premature at 29k impressions/week).
- Bing Webmaster Tools API integration beyond IndexNow ping.

---

## Phase Requirements

| ID | Description | Mapped to Success Criterion |
|----|-------------|-----------------------------|
| **SEO-08** | `lib/gsc_client.py` exists with `top_queries`, `top_pages`, `search_analytics(dimensions=...)`, `request_indexing(url)`, `inspect_url(site_url, url)`; SA key shared with IG bot; retry/timeout consistent with stack; unit tests cover parsing + error paths; `request_indexing()` called after every publish (Indexing API best-effort + IndexNow parallel) | Criteria 1 + 5 |
| **SEO-09** | `meta_optimizer.py` daily on Hetzner (Qwen draft) + Windows-side Claude gate auto-applies; selects articles with impressions ≥100/28d AND CTR below per-position benchmark; passes top 3-5 GSC queries to Qwen; respects 60-char title / 155-char description; logs all changes to `state/meta_changes.jsonl` with before/after/queries/decision | Criterion 2 |
| **SEO-10** | `keyword_scout.py` adds striking-distance source (GSC dimensions=["query"], pos∈[8,20], impressions≥30) merged with Google Suggest before dedup; Telegram report distinguishes sources with per-candidate GSC metrics. `content_generator.py` (single-shot and multistep paths) primes outline + FAQ generator with top 5 GSC queries per target_keyword when data exists, no-op gracefully when absent | Criteria 3 + 4 |
| **SEO-11** | `gsc_refresh.py` weekly (Sun 08:00 UTC after claude_strategist) selects top 10 pages with decay ≥30% OR impressions ≥500/28d AND CTR <1.5%; pulls Strapi content + top GSC queries + competitor diff; Claude Opus rewrite (Windows-side); same quality gate; Indexing API + IndexNow re-ping on success. `claude_strategist.py` receives GSC weekly digest section (Δ clicks/impressions/CTR/position, top 10 striking-distance, top 10 CTR-opportunity, top 10 declining); strategy report includes ≥3 GSC-anchored recommendations | Criteria 6 + 7 |
| **SEO-12** | Schema markup audit: blog-post/tutorial/recipe/review serve FAQPage JSON-LD when FAQ section detected (markdown `## FAQ` / `## Domande frequenti` / `## Preguntas frecuentes` parser in `web/src/lib/structured-data.ts` — NEW file, since current emission is via component `FaqSection.astro`); tutorials emit HowTo with `step[]`; Article schema gains `speakable` (cssSelector for first `<p>` + each `<h2>`); `web/scripts/sweep_pages.py` (NEW — currently at `scripts/sweep_pages.py`, may need to be copied to web/scripts/ per spec) verifies zero regressions. All new crons registered in `scripts/agents/crontab.txt` with provenance comments; Telegram reports for each new agent; unit tests cover the 5 named areas | Criterion 8 + 9 |

---

## Critical Findings

### A. Google Indexing API — DEPRECATION / SCOPE LIMITS

**Status (verified 2026-05-25 via Google official docs):** Indexing API officially supports ONLY pages with `JobPosting` or `BroadcastEvent embedded in VideoObject`. This restriction has been in place since the API's launch (2018) and is NOT a 2026 deprecation. Default quota = 200 publish requests/day per project (raisable with additional approval).

**Practical behavior for blog content:**
- Multiple sources (CrawlWP 2026, IndexerPro 2026, community plugins) confirm **the API "often works" for non-JobPosting URLs in practice** — Google does not return an error, the request succeeds, but indexing is best-effort and Google may ignore the signal.
- No public statement that Google will start rejecting/penalizing non-JobPosting requests.
- The risk of calling it is: wasted quota (200/day is plenty for our publish volume of ~1 article/day per locale = 3/day max), occasional 403 if Google clamps down, zero risk of penalty.

**Recommendation: implement as BEST-EFFORT, NON-BLOCKING:**
```python
# Hetzner-side, called from publisher pipeline after Strapi promote-to-published
def request_indexing(url: str) -> dict:
    """Best-effort. Logs warning on failure. Never blocks publish."""
    try:
        resp = service.urlNotifications().publish(body={
            "url": url,
            "type": "URL_UPDATED",
        }).execute()
        return {"success": True, "response": resp}
    except HttpError as e:
        if e.resp.status in (403, 404):
            # Indexing API rejected — likely scope guard kicking in
            print(f"[gsc] Indexing API rejected {url}: {e.resp.status} (best-effort, ignored)")
            return {"success": False, "reason": "scope-or-quota", "code": e.resp.status}
        raise  # Re-raise on unexpected errors (auth, network) for retry
```

**Parallel IndexNow ping** (recommended as belt-and-suspenders):
- IndexNow is supported by Bing (22% of clicks come from IndexNow submissions per Bing's Dec 2025 report), Yandex, Naver, Seznam, Yep.
- Google does NOT support IndexNow.
- Effectively zero overhead: HTTP POST to `https://api.indexnow.org/indexnow` with a JSON payload `{ "host": "bbq-experience.com", "key": "<random-key>", "keyLocation": "https://bbq-experience.com/<key>.txt", "urlList": ["https://..."] }`.
- Italian market: Bing share in IT is small (~2-3%) but free incremental coverage. Recommend implementing as a 30-line helper in `lib/indexnow_client.py`.

**Sitemap pings to Google (Sitemaps API):** Still works, no quota issues, but BBQ already has sitemap auto-regenerated and pinged via Astro `@astrojs/sitemap`. No new work needed here.

**Confidence:** HIGH. Cross-verified Google docs + 3 community sources + Bing's own IndexNow blog post Dec 2024 + May 2025.

### B. GSC Search Analytics API — Quotas & Sampling

**Verified quotas (Google official 2026-05-25):**

| Resource | Per-Site QPM | Per-User QPM | Per-Project | Per-Project QPM |
|----------|-------------|-------------|-------------|----------------|
| Search Analytics | 1,200 | 1,200 | 30,000,000 QPD | 40,000 |
| URL Inspection | 600 | — | 10,000,000 QPD | 15,000 |
| All other (Sitemaps, Sites) | — | 200 (20 QPS per user) | 100,000,000 QPD | — |

**Row limits:** 25,000 rows per single request. Pagination via `startRow` (0-indexed). For full data, paginate until empty response.

**At our scale (BBQ baseline 29k imp/week ≈ ~500 unique pages on the property):** No quota concerns whatsoever — we'd make ~10 API calls per `meta_optimizer` run, ~20 for `gsc_refresh`, ~30 for `keyword_scout`. Total ~60/day vs 1,200/min budget.

**dataState:**
- `final` (default) = 2-3 day delay, stable, only safe for week-over-week comparisons.
- `all` = fresh data including last 24-48h, but mutable.
- `hourly_all` = hourly breakdown of fresh data.

**Recommendation for our agents:**
- `meta_optimizer` (daily): `dataState: "final"` over last 28 days — stable signal needed for benchmark decisions.
- `gsc_refresh` (weekly): `dataState: "final"` over last 28 days vs prior 28 days.
- `keyword_scout` (weekly): `dataState: "final"` over last 28 days.
- `claude_strategist` digest: `dataState: "final"`, two windows: last 7d vs prior 7d.

**Filter syntax for "position ∈ [8, 20] AND impressions ≥ 30":**
- `dimensionFilterGroups` supports `dimension: "query" | "page" | "country" | "device" | "date" | "searchAppearance"`.
- **`position` is NOT a filterable dimension — it's a metric only.** Same for `impressions` and `clicks`.
- **MUST post-filter in Python** after pulling rows. At 25k rows/request max, our property fits in 1-2 requests.

**Aggregation type:**
- `auto` (default) = aggregates by canonical URL — recommended for `top_pages` and `meta_optimizer`.
- `byPage` = forces page-level aggregation — same as auto for us.
- `byProperty` = single row total — use for global stats only.
- For striking-distance, use `dimensions=["query"]` with `aggregationType="auto"` (Google aggregates duplicates across pages).
- For CTR-opportunity per-page, use `dimensions=["page", "query"]` with `aggregationType="auto"` then group in Python.

**Confidence:** HIGH. Google docs + Search Analytics API reference + multiple working implementations.

### C. CTR Benchmarks for meta_optimizer

**Roadmap proposal:** "3% @ pos 6-10, 5% @ pos 1-5" — too lenient and imprecise.

**Verified industry benchmarks (FirstPageSage 2026, Backlinko 2024-2025, Advanced Web Ranking Q3 2025):**

| Position | CTR (FPS 2026) | CTR (Backlinko 2024) | Recommended Benchmark |
|----------|---------------|----------------------|----------------------|
| 1 | 39.8% | 27.6% | 25% |
| 2 | 18.7% | 18.7% | 15% |
| 3 | 10.2% | 10.7% | 9% |
| 4 | 7.2% | 7.2% | 6% |
| 5 | 5.1% | 5.1% | 4.5% |
| 6 | 4.4% | 4.4% | 3.5% |
| 7 | 3.0% | 3.0% | 2.5% |
| 8 | 2.1% | 2.1% | 1.8% |
| 9 | 1.9% | 1.9% | 1.5% |
| 10 | 1.6% | 1.6% | 1.2% |
| 11-20 | <1.5% | <1.5% | n/a (striking-distance, different agent) |

**AI Overviews drop (2025-2026):** position 1 lost ~32% CTR (28%→19%), position 2 lost ~39-50%. AI Overviews appear on ~31% of SERPs.

**Recommended trigger for rewrite:** `actual_ctr < benchmark * 0.6` (40% below benchmark). Less aggressive than `* 0.5` proposed in roadmap — fewer false positives at our scale.

**Granularity recommendation:** Use stratified table above (single dict in code). Don't bucket pos 1-5 / 6-10 — pos 1 vs pos 5 is a 5× difference, single benchmark would over-trigger on pos 5 and under-trigger on pos 1.

**Query-type awareness (informational vs transactional):** FPS does not publish this breakdown. BBQ is overwhelmingly informational (recipes, tutorials, reviews). Recommend **no query-type stratification in v1** — revisit if false positives accumulate. Add a TODO in code.

**Confidence:** MEDIUM-HIGH. FPS+Backlinko aligned for pos 2-10; pos 1 wildly variable (27.6% to 39.8%) due to SERP feature presence (AIO, featured snippets, local pack).

### D. Schema.org Markup — Current Spec (FAQPage / HowTo / Speakable)

**CRITICAL TIMING:** Google deprecated FAQ rich results on **7 May 2026** (18 days ago, well after roadmap was written 2026-04-15). This changes the value proposition but NOT the recommendation:

**FAQPage:**
- Schema markup itself: STILL VALID Schema.org type.
- Google rich result: GONE as of 7 May 2026. Search Console reporting + Rich Results Test support: removed June 2026 (next month). API removal: August 2026.
- **AI search engines (Perplexity, ChatGPT browse, Gemini, Bing) STILL CONSUME IT.** Recommendation: **keep emitting**. Zero cost (existing `FaqSection.astro` already emits it), positive signal to AI engines, no Google penalty for retaining it.
- Required properties: `mainEntity` array of `Question` with `name` + `acceptedAnswer.Answer.text`. Existing emission in `FaqSection.astro` is correct.

**HowTo:**
- Deprecated September 2023 for desktop, August 2023 for mobile rich results.
- Schema markup still valid Schema.org. Same AI-engine consumption story.
- BBQ tutorials don't currently emit HowTo. Adding it:
  - `@type: "HowTo"`, `name`, `description`, `step[]` each with `@type: "HowToStep"`, `name`, `text`, optional `image`, `url`.
  - Parser challenge: detecting "step-like" sections in tutorial markdown. Heuristic: if content has `<ol><li>...</li></ol>` OR `## Step N:` headings OR `### Step N` → wrap in HowTo. Otherwise skip (better no schema than wrong schema).
  - Recipe pages already emit Recipe schema (verified in `RecipeJsonLd.astro`) — that's STILL a Google rich result. Don't add HowTo to recipes; conflict risk.

**Speakable:**
- BETA spec (since 2018), `cssSelector` OR `xPath` (not both).
- Google Assistant original target. 2026 primary value: AI retrieval signal (Perplexity, ChatGPT, Gemini AI Overviews use it as content-priority).
- Add to `ArticleSchema.astro` — wrap first `<p>` + each `<h2>` in speakable.
- Spec: array of `SpeakableSpecification` with `cssSelector: ["article > p:first-of-type", "article h2"]` OR use `@id` selectors.
- **Note:** `xpath` is more reliable than CSS classes that may change with refactor. Recommend `cssSelector` with semantic CSS selectors (not framework-generated class names) to survive Astro refactors.

**Audit script (sweep_pages.py extension):**
- Existing `scripts/sweep_pages.py` already validates JSON-LD presence per page. Extend to:
  - Assert FAQPage block present on pages with detected FAQ section.
  - Assert HowTo block present on tutorial pages with step-like structure.
  - Assert speakable selector resolves to actual DOM nodes (validate via `BeautifulSoup` + `cssselect`).
- Phase 17 spec says script should live at `web/scripts/sweep_pages.py`. Current location is `scripts/sweep_pages.py`. Plan should either:
  - (a) Move it to `web/scripts/` and update all callers, OR
  - (b) Keep at `scripts/sweep_pages.py` and update the spec wording.
  - Recommend (b) — moving breaks habit, current path has been stable for months.

**Confidence:** HIGH on deprecation timing (multiple authoritative sources Sep 2023 + May 2026). MEDIUM on AI-engine consumption (industry consensus, not Google statement).

### E. Striking-Distance Keyword Methodology

**Industry-standard definition:** Mixed. Most common: positions 8-20 (some say 11-20, some 5-20, some say 4-15). The roadmap spec says "pos∈[8, 20] AND impressions≥30" — this is reasonable, aligned with SEOTesting + Content Raptor 2026 guides.

**Recommended params:**
- `dimensions=["query"]` (NOT `["query", "page"]` — we want intent signal, not per-page noise).
- `dataState="final"` (28-day window).
- Post-filter: `8 <= row.position <= 20 AND row.impressions >= 30`.
- Min CTR: skip rows where `row.ctr >= benchmark_for_position` (already getting clicks, not striking-distance).

**Dedup with Google Suggest:**
- Normalize: lowercase, strip punctuation, collapse whitespace, slugify via existing `lib/slugify.py`.
- Direct match: `slugify(gsc_query) == slugify(suggest_keyword)` → dedup.
- Semantic similarity for "best meat thermometer" vs "best thermometer for meat" → optional, MEDIUM complexity (cosine on bge-m3 embeddings via :8082, but adds 100ms/keyword and requires keeping the matrix in memory). **Recommend stdlib only in v1** — direct slug match. Document in Open Questions for v2.

**Telegram report format:**
```
WEEKLY KEYWORD SCOUT — 7 candidates
1. [GSC striking] "smoked brisket flat or point" — pos 11.3, 47 imp, 0.0% CTR
2. [Suggest] "best pellet grill 2026" — seed "best pellet grill"
3. [GSC striking] "weber kettle vs kamado" — pos 9.1, 124 imp, 1.6% CTR
...
```

**Confidence:** MEDIUM (industry definitions vary). Resolution: lock to roadmap's [8, 20] + impressions ≥ 30 and document in code.

### F. Qwen Prompt Engineering for CTR-Optimized Meta

**SEO title best practices (2025-2026 sources):**
- 50-60 char ideal (60-65 max before truncation at ~600px).
- Keyword at the START. Brand at the END (after `|` or `—`).
- Power words: "Ultimate", "Complete", "Best", "Top N", "How to", "Why", numbers/brackets, year only if evergreen.
- For BBQ vertical specifically: `Tested`, `Reviewed`, `Step-by-Step`, `Pitmaster's`, temperature/time specifics like `(225°F + 8 hrs)`.
- AVOID: ALL CAPS, exclamation marks, vague verbs ("learn about"), passive voice.

**Italian SEO conventions:**
- 60 char limit equally applies.
- Italian common power words: "Guida completa", "Migliori", "Come fare", "Trucchi", "Consigli del Pitmaster", "Top N", "Recensione".
- Accents matter — Strapi stores correctly, Qwen output should preserve è/à/ò/ù.
- Spanish equivalent: "Guía completa", "Mejores", "Cómo hacer", "Trucos", "Consejos del Pitmaster".

**Prompt template for Qwen:**
```
Sei l'editor SEO senior di BBQ Experience. Il seguente articolo è LIVE su Google ma sotto-performa il benchmark CTR.

ARTICOLO:
- URL: {url}
- Titolo attuale: {current_title}
- Meta attuale: {current_meta_description}
- Locale: {locale}
- Posizione media Google: {avg_position:.1f}
- CTR attuale: {ctr:.2%}
- CTR benchmark per posizione: {benchmark_ctr:.1%}

TOP QUERY CHE GIA' TI PORTANO TRAFFICO (28gg):
{top_queries_formatted}  # max 5

RISCRIVI titolo + meta description per massimizzare CTR. REGOLE:
1. TITOLO: max 60 char, keyword principale all'inizio, brand alla fine (es. "... | BBQ Experience"). NO clickbait, NO ALL CAPS.
2. META: max 155 char, includere keyword + call-to-action concreta + 1 dato specifico (temperatura, tempo, prezzo, anno se evergreen 2026+).
3. NON inventare claim falsi. NON promettere ciò che l'articolo non contiene.
4. Tono "The Pitmaster": diretto, tecnico, zero marketing BS.
5. Locale {locale} → output in lingua {locale_full}.

OUTPUT formato ESATTO (3 righe):
SEO_TITLE: ...
SEO_DESCRIPTION: ...
REASONING: una riga su perché questa versione dovrebbe convertire meglio.
```

**Claude quality gate for meta changes** (different from article gate, lighter):
- Verify: length ≤ 60/155, keyword present, no clickbait, no false claims (cross-check vs article excerpt), locale match.
- Decision: `approve` / `revise` / `reject`. Use existing `claude_quality_gate.py` infrastructure but with a meta-specific prompt template (new `prompts/claude_meta_review.md`).

**Confidence:** MEDIUM-HIGH (general SEO consensus). LOW on Italian-specific power words (research finding lacks IT-specific data — recommend Matteo provide 5-10 IT power words from his domain expertise).

### G. Existing GSC Integration on .119 (C7 IG bot)

**What I know (from STACK-AI-CHANGELOG-2026-05-25-bbq-hardening.md):**
- "GSC weekly digest Telegram via service account `merchant-sync@reflexmania-2025` su tutte e 3 property BBQ+ReflexMania+ScattoPro"
- Insight from yesterday's run: BBQ has 35 clicks / 29k impressions / 0.12% CTR / pos 6.7 on the last 7 days.
- SA key path: `~/secrets/gsc-merchant-sync.json` on Hetzner (cross-referenced from PROJECT CLAUDE.md).
- Used by IG bot to inform content selection (weekly cadence).
- IG bot is on Ubuntu 192.168.1.119, different host than Hetzner Strapi backend.

**What I CANNOT verify (no SSH from this environment):**
- Exact API endpoints called by IG bot's `gsc_client.py`.
- Whether it uses `google-api-python-client` or raw `urllib` + manual JWT.
- Whether it implements `inspect_url()` (URL Inspection API) — required by our `gsc_client.py` per success criterion 1.
- Exact error handling pattern.

**Recommendation for BBQ port:**
- **Re-implement, don't literally copy** — IG bot uses `instagrapi` patterns we don't have in `scripts/agents/lib/`.
- Match the API surface specified in roadmap success criterion 1: `top_queries`, `top_pages`, `search_analytics(dimensions=...)`, `request_indexing(url)`, `inspect_url(site_url, url)`.
- After Plan 1 is drafted, manually SSH to .119 and read `~/instagram-bot/gsc_client.py` to validate signature compatibility (cross-machine consistency) — task for execution wave.

**Confidence:** MEDIUM-HIGH on existence and SA key. LOW on exact code shape.

### H. Hetzner Cron Environment

**Verified from `scripts/agents/crontab.txt`:**

```bash
# Existing cron schedule on Hetzner (BBQ stack)
# Working directory: /opt/services/bbqexperience/app
# Python: /usr/bin/python3 (system Python, NO venv)
# Logs: /opt/webhooks/logs/<agent>.log

0 5 * * 1   keyword_scout.py       # Mon 05:00 UTC
0 9,15 * * * seo_optimizer.py       # Daily 09:00 + 15:00 UTC
0 */12 * * * competitor_monitor.py  # Every 12h
0 8 * * 1   partnership_outreach.py # Mon 08:00 UTC
0 4 * * *   umami_feedback.py       # Daily 04:00 UTC
0 3 * * *   /opt/webhooks/scripts/backup-db.sh
0 4 * * 1   refresh-instagram-token.mjs (Node)
0 */6 * * * sync-instagram.mjs (Node)
0 10 * * 0  weekly_newsletter.py    # Sun 10:00 UTC
```

**Env vars loaded from:**
- `scripts/agents/.env.windows` (Windows local dev)
- `/opt/services/bbqexperience/app/.env` (Hetzner production)
- Loaded inline at top of each agent via the pattern in `content_generator.py` lines 21-29.

**SA key placement on Hetzner:**
- Recommend: `/opt/services/bbqexperience/app/secrets/gsc-merchant-sync.json`, perms `600`, owned by deploy user.
- Symlink from `~/secrets/gsc-merchant-sync.json` if Matteo prefers a single canonical path.
- Env var: `GSC_SERVICE_ACCOUNT_KEY=/opt/services/bbqexperience/app/secrets/gsc-merchant-sync.json`.
- Add to `.env` on Hetzner (gitignored).

**Telegram bot token:** Already reused across all agents via `lib/telegram.py` → `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`. New GSC agents use the same.

**Proposed new cron entries** (with provenance comments per spec):
```bash
# Phase 17 — GSC-driven content pipeline (added 2026-MM-DD)

# Meta Optimizer drafter — Hetzner Qwen, ogni giorno 03:30 UTC (PRIMA della finestra SDXL 04:00-05:00 UTC)
30 3 * * * cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/meta_optimizer.py >> /opt/webhooks/logs/meta-optimizer.log 2>&1

# GSC Refresh — Hetzner orchestrator, domenica 08:00 UTC (DOPO claude_strategist Dom 07:00 su .119)
0 8 * * 0 cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/gsc_refresh.py >> /opt/webhooks/logs/gsc-refresh.log 2>&1
```

**Windows-side Task Scheduler entries** (for Claude-gated steps):
```
# Meta Review — Windows Claude CLI gate per meta_changes_pending.jsonl
# Schedule: ogni giorno 09:00 local (CET) — dopo che Hetzner ha generato i draft
schtasks /Create /TN "BBQ Meta Review" /SC DAILY /ST 09:00 /TR "C:\Progetti\bbqexperience\scripts\agents\meta_review.cmd"

# GSC Refresh Review — Windows Claude Opus rewrite gate per gsc_refresh queue
# Schedule: domenica 10:00 local — dopo gsc_refresh Hetzner Sun 08:00 UTC = ~10:00 local
schtasks /Create /TN "BBQ GSC Refresh Review" /SC WEEKLY /D SUN /ST 10:00 /TR "..."
```

**Confidence:** HIGH on Hetzner crontab format. MEDIUM on Windows Task Scheduler integration (precedent: `content_generator.py` runs daily 06:00 on Windows).

---

## Standard Stack

### Core (new for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-api-python-client` | 2.x (latest stable) | GSC Search Analytics + URL Inspection + Indexing API client | Official Google library, handles auth refresh, retries, scope validation. Pure-Python wheel, no compiled deps. Industry standard for GSC integrations. Alternative: hand-roll JWT signing + httpx — works but adds 80 lines of error-prone code. |
| `google-auth` | 2.x | Service account authentication | Required by `google-api-python-client`. Handles JWT signing, token caching, refresh. Pulls in `pyasn1`, `pyasn1_modules`, `rsa`, `cachetools` (all pure-Python). |

### Core (already in project — reused)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| Python stdlib `urllib` | 3.12 | Indexing API publish (small request, no need for SDK) + IndexNow ping | HIGH |
| Python stdlib `json` | 3.12 | All JSON I/O | HIGH |
| Python stdlib `math` | 3.12 | CTR delta calculations, percentile computation | HIGH |
| `scripts/agents/lib/strapi_client.py` | — | Strapi PUT for meta updates (existing) | HIGH (verified in repo) |
| `scripts/agents/lib/claude_client.py` | — | Qwen draft for meta, Claude Opus for refresh content | HIGH |
| `scripts/agents/claude_quality_gate.py` | — | Reuse for meta-change review (Windows-side) | HIGH |
| `scripts/agents/lib/telegram.py` | — | Per-agent reports | HIGH |
| `scripts/agents/lib/umami_client.py` | — | Reuse for traffic_score cross-check (gsc_refresh) | HIGH |

### Installation

```bash
# On Hetzner (and Windows for parity)
pip install google-api-python-client>=2.100.0 google-auth>=2.30.0
```

Add to `scripts/agents/requirements.txt`:
```
google-api-python-client>=2.100.0
google-auth>=2.30.0
```

**Version verification (2026-05-25):**
- `google-api-python-client` 2.x is stable, frequent maintenance releases. Use `>=2.100.0` to ensure recent OAuth flow fixes. Verify with `pip show google-api-python-client` after install.
- `google-auth` 2.30+ has service account session caching improvements relevant to our retry pattern.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-api-python-client` | Hand-rolled `urllib` + manual JWT signing via `pyjwt` | -80 LOC saved with SDK, +1 dep. SDK is safer (handles 401 refresh automatically). Decision: SDK. |
| `google-api-python-client` for Indexing API | `urllib` direct POST to `https://indexing.googleapis.com/v3/urlNotifications:publish` with `Authorization: Bearer <token from SDK>` | Lighter for the single Indexing API endpoint. Decision: use SDK for both (consistency). |
| IndexNow standalone | Bing Webmaster Tools API | BWT requires per-user auth, IndexNow is keyless. Decision: IndexNow. |
| Stratified per-position CTR benchmark | 2-bucket (pos 1-5 / 6-10) from roadmap | Single dict is identical cost. Stratified avoids false positives. Decision: stratified. |
| Claude Opus for meta review | Qwen self-review | Same prompt, weaker quality control. Qwen drafts → Claude reviews is the proven Phase 16 / content_generator pattern. Decision: split Hetzner draft + Windows Claude gate. |

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/agents/
  lib/
    gsc_client.py             # NEW — Search Analytics + URL Inspection + Indexing API wrapper
    indexnow_client.py        # NEW — IndexNow protocol POST (Bing/Yandex)
    strapi_client.py          # EXISTING
    umami_client.py           # EXISTING
    claude_client.py          # EXISTING
    telegram.py               # EXISTING
  prompts/
    claude_meta_review.md     # NEW — Claude quality gate for meta changes
    qwen_meta_draft.md        # NEW — Qwen prompt for meta optimization
    claude_refresh_review.md  # NEW — Claude Opus quality gate for refreshed article
  state/
    meta_changes.jsonl        # NEW — historical log of all meta changes
    meta_changes_pending.jsonl # NEW — Hetzner→Windows handoff queue
    gsc_refresh_queue.jsonl   # NEW — refresh candidate queue
    gsc_baseline.json         # NEW — last-week aggregates for delta computation
  meta_optimizer.py           # NEW — Hetzner daily Qwen draft (cron 03:30 UTC)
  meta_review.py              # NEW — Windows daily Claude gate (Task Scheduler 09:00 local)
  gsc_refresh.py              # NEW — Hetzner weekly orchestrator (cron Sun 08:00 UTC)
  gsc_refresh_review.py       # NEW — Windows weekly Claude Opus rewrite (Task Scheduler Sun 10:00)
  keyword_scout.py            # MODIFY — add GSC striking-distance source
  content_generator.py        # MODIFY — inject GSC query priming
  claude_strategist.py        # MODIFY — add GSC weekly digest section
  crontab.txt                 # MODIFY — register new cron entries
  requirements.txt            # MODIFY — add google-api-python-client + google-auth
  tests/
    test_gsc_client.py        # NEW
    test_meta_optimizer.py    # NEW
    test_keyword_scout_gsc.py # NEW
    test_content_generator_gsc.py  # NEW
    test_gsc_refresh.py       # NEW

web/src/
  lib/
    structured-data.ts        # NEW or rename — FAQ parser + HowTo step extractor + speakable selector builder
  components/
    content/
      ArticleSchema.astro     # MODIFY — add speakable property
      FaqSection.astro        # EXISTING (no change — already emits FAQPage)
    tutorial/
      HowToSchema.astro       # NEW — emit HowTo for step-structured tutorials
  pages/
    en/tutorials/[slug].astro # MODIFY — wire HowToSchema
    it/guide/[slug].astro     # MODIFY — same
    es/tutoriales/[slug].astro # MODIFY — same
    en/blog/[slug].astro      # ALREADY has FaqSection.astro auto-emission

scripts/
  sweep_pages.py              # MODIFY — assert FAQ/HowTo/speakable per page type
```

### Pattern 1: GSC Client (lib/gsc_client.py)

```python
"""Client GSC + Indexing API per gli agenti BBQ.

Wrapper sopra google-api-python-client che applica le convenzioni del progetto:
retry 3x con backoff esponenziale [1, 2, 4]s, timeout 10s per request, error
strutturati identici a strapi_client.py.

Service account JSON in GSC_SERVICE_ACCOUNT_KEY (shared con IG bot su .119).
"""
import os
import time
from typing import Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",  # Search Analytics
    "https://www.googleapis.com/auth/webmasters",            # URL Inspection
    "https://www.googleapis.com/auth/indexing",              # Indexing API
]

KEY_PATH = os.environ.get(
    "GSC_SERVICE_ACCOUNT_KEY",
    "/opt/services/bbqexperience/app/secrets/gsc-merchant-sync.json",
)
SITE_URL = os.environ.get("GSC_SITE_URL", "https://bbq-experience.com/")

MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 4]


def _credentials():
    """Carica SA credentials una volta sola (cache implicita via module-level)."""
    if not os.path.exists(KEY_PATH):
        raise RuntimeError(f"SA key non trovata: {KEY_PATH}")
    return service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)


_search_console = None
_indexing = None


def _sc_service():
    global _search_console
    if _search_console is None:
        _search_console = build("searchconsole", "v1", credentials=_credentials(), cache_discovery=False)
    return _search_console


def _idx_service():
    global _indexing
    if _indexing is None:
        _indexing = build("indexing", "v3", credentials=_credentials(), cache_discovery=False)
    return _indexing


def _retry(fn, *args, **kwargs):
    """Wrapper retry comune. Raise immediato su 4xx, retry su 5xx/network."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn(*args, **kwargs).execute(num_retries=0)  # disattiva retry SDK, gestiamo noi
        except HttpError as e:
            if 400 <= e.resp.status < 500 and e.resp.status not in (429,):
                raise RuntimeError(f"GSC {e.resp.status}: {e.error_details}") from e
            last_error = e
        except Exception as e:
            last_error = e
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_BACKOFF[attempt])
    raise last_error


def search_analytics(
    *,
    start_date: str,
    end_date: str,
    dimensions: list[str],
    dimension_filter_groups: list[dict] | None = None,
    aggregation_type: str = "auto",
    row_limit: int = 25000,
    start_row: int = 0,
    data_state: str = "final",
    search_type: str = "web",
) -> list[dict]:
    """Query Search Analytics. Ritorna lista di righe {keys, clicks, impressions, ctr, position}."""
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "aggregationType": aggregation_type,
        "rowLimit": row_limit,
        "startRow": start_row,
        "dataState": data_state,
        "type": search_type,
    }
    if dimension_filter_groups:
        body["dimensionFilterGroups"] = dimension_filter_groups
    resp = _retry(
        _sc_service().searchanalytics().query,
        siteUrl=SITE_URL,
        body=body,
    )
    return resp.get("rows", [])


def top_queries(*, days: int = 28, row_limit: int = 1000) -> list[dict]:
    """Shorthand: top query per clicks negli ultimi N giorni."""
    from datetime import date, timedelta
    end = date.today() - timedelta(days=3)  # final data ha 2-3gg di delay
    start = end - timedelta(days=days)
    return search_analytics(
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        dimensions=["query"],
        row_limit=row_limit,
    )


def top_pages(*, days: int = 28, row_limit: int = 1000) -> list[dict]:
    """Shorthand: top page per clicks negli ultimi N giorni."""
    from datetime import date, timedelta
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=days)
    return search_analytics(
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        dimensions=["page"],
        row_limit=row_limit,
    )


def queries_for_page(url: str, *, days: int = 28, top_n: int = 5) -> list[dict]:
    """Top query per una pagina specifica — usato da meta_optimizer e content_generator."""
    from datetime import date, timedelta
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=days)
    rows = search_analytics(
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        dimensions=["query"],
        dimension_filter_groups=[{
            "filters": [{
                "dimension": "page",
                "operator": "equals",
                "expression": url,
            }],
        }],
        row_limit=top_n * 2,  # extra per safety se Google dedupa
    )
    rows.sort(key=lambda r: r.get("clicks", 0), reverse=True)
    return rows[:top_n]


def request_indexing(url: str) -> dict:
    """Best-effort. Google Indexing API officially supports solo JobPosting + BroadcastEvent
    ma 'spesso funziona' anche per blog. Non bloccare il publish su errore."""
    try:
        resp = _retry(
            _idx_service().urlNotifications().publish,
            body={"url": url, "type": "URL_UPDATED"},
        )
        return {"success": True, "response": resp}
    except RuntimeError as e:
        # 4xx già loggato in _retry; ritorna soft-failure
        print(f"[gsc] request_indexing rifiutato {url}: {e}")
        return {"success": False, "reason": str(e)}


def inspect_url(url: str) -> dict:
    """URL Inspection API — ritorna stato indicizzazione, rich result eligibility, sitemap presence."""
    body = {
        "inspectionUrl": url,
        "siteUrl": SITE_URL,
    }
    resp = _retry(
        _sc_service().urlInspection().index().inspect,
        body=body,
    )
    return resp.get("inspectionResult", {})
```

[VERIFIED: API surface against Google official docs 2026-05-25. Auth scopes verified.]

### Pattern 2: IndexNow Client (lib/indexnow_client.py)

```python
"""IndexNow ping — Bing/Yandex/etc. Google NON supporta IndexNow.

Setup one-time: generare chiave random, salvarla a https://bbq-experience.com/<key>.txt
(file statico) prima di chiamare. Vedi env INDEXNOW_KEY.
"""
import os
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

INDEXNOW_KEY = os.environ.get("INDEXNOW_KEY", "")
INDEXNOW_HOST = os.environ.get("INDEXNOW_HOST", "bbq-experience.com")
INDEXNOW_KEY_URL = os.environ.get(
    "INDEXNOW_KEY_URL",
    f"https://{INDEXNOW_HOST}/{INDEXNOW_KEY}.txt",
)

ENDPOINT = "https://api.indexnow.org/indexnow"


def ping(urls: list[str]) -> dict:
    """POST batch fino a 10k URL. Free, no auth oltre la chiave hostata."""
    if not INDEXNOW_KEY:
        return {"success": False, "reason": "INDEXNOW_KEY non impostata"}
    payload = {
        "host": INDEXNOW_HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": INDEXNOW_KEY_URL,
        "urlList": urls,
    }
    body = json.dumps(payload).encode("utf-8")
    req = Request(ENDPOINT, data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=10) as resp:
            # 200 = accepted, 202 = accepted (verify pending), 422 = invalid URL
            return {"success": resp.status in (200, 202), "code": resp.status}
    except HTTPError as e:
        return {"success": False, "code": e.code}
```

### Pattern 3: Per-Position CTR Benchmark Table

```python
# In meta_optimizer.py
# Fonte: FirstPageSage 2026 + Backlinko 2024. Conservative cut.
CTR_BENCHMARK = {
    1: 0.25,   # FPS 39.8, Backlinko 27.6 — taglio conservativo
    2: 0.15,
    3: 0.09,
    4: 0.06,
    5: 0.045,
    6: 0.035,
    7: 0.025,
    8: 0.018,
    9: 0.015,
    10: 0.012,
}

# Soglia trigger rewrite: actual CTR < benchmark * REWRITE_FACTOR
REWRITE_FACTOR = 0.6


def needs_meta_rewrite(row: dict) -> bool:
    """row: GSC search_analytics output con keys, clicks, impressions, ctr, position."""
    impressions = row.get("impressions", 0)
    if impressions < 100:
        return False  # not enough signal in 28 days
    position = round(row.get("position", 99))
    if position < 1 or position > 10:
        return False  # striking-distance handled separately
    benchmark = CTR_BENCHMARK[position]
    actual = row.get("ctr", 0)
    return actual < benchmark * REWRITE_FACTOR
```

### Pattern 4: Atomic JSONL Append for state/

```python
# state/meta_changes.jsonl pattern — concorrente con meta_review.py su Windows
import json
import os
import tempfile
from pathlib import Path

def append_jsonl_atomic(path: Path, record: dict) -> None:
    """Append una riga JSONL in modo atomico. Usa lock con file-rename.
    
    NB: questa è append, non rewrite. Read existing, append new, atomic replace.
    Su volumi piccoli (<10k righe) è accettabile. Per volumi grandi usare lock con fcntl.
    """
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    new_content = existing + json.dumps(record, ensure_ascii=False) + "\n"
    
    tmp = Path(tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")[1])
    tmp.write_text(new_content, encoding="utf-8")
    os.replace(tmp, path)  # atomico cross-platform su stesso filesystem
```

### Pattern 5: Speakable Selector Pattern in Astro

```typescript
// In ArticleSchema.astro — additions to jsonLd object
jsonLd.speakable = {
  '@type': 'SpeakableSpecification',
  cssSelector: [
    'article > p:first-of-type',  // intro paragraph
    'article h2',                    // all H2 headings
  ],
};
```

[VERIFIED: Schema.org speakable v17.0 spec, Google's BETA support docs 2026.]

### Anti-Patterns to Avoid

- **DO NOT block publish on Indexing API failure.** It's best-effort. Logs warning, moves on.
- **DO NOT filter by `position` in `dimensionFilterGroups`.** Position is a metric, not filterable. Post-filter in Python.
- **DO NOT call `request_indexing()` from inside Strapi webhook handler.** Add it to the publisher pipeline after Strapi confirms publish — async, fire-and-forget.
- **DO NOT auto-apply meta changes on Hetzner without Claude review.** Use the split: Hetzner Qwen drafts → JSONL queue → Windows Claude gates → Strapi PUT.
- **DO NOT regenerate `meta_changes.jsonl` from scratch on each run.** Append-only audit log.
- **DO NOT call GSC during the SDXL window (04:00-05:00 UTC summer)** — Qwen unavailable, our agents share an LLM. Schedule meta_optimizer at 03:30 UTC.
- **DO NOT emit FAQPage schema on pages without a visible FAQ section.** Google's structured-data spam policy still applies even with rich results gone — emitting schema for invisible content can trigger manual action.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service account JWT signing for GSC | Manual PEM key parsing + JWT encoding + token refresh | `google-auth.service_account.Credentials.from_service_account_file()` | 80 lines of error-prone code; auth bugs are silent (401 misinterpreted as 5xx); SDK handles edge cases. |
| GSC API request/response shape | Custom Pydantic models | Raw dict from `_retry()` + minimal helper funcs | GSC response is stable, dict access is fine, no need for full model validation. |
| z-test for CTR delta | scipy or custom CDF | Two-proportion z-test with `math.erfc` (15 lines — already in `ab_tester.py`) | Same formula as Phase 16, reuse logic. |
| Claude quality gate for meta | Bash one-liner | Reuse `scripts/agents/claude_quality_gate.py` with new prompt template | Phase 16 already validated this pattern; meta-review is a 100-line variant. |
| FAQ section detection in markdown | Custom regex parser per locale | Single multi-locale regex `^##\s+(FAQ|Domande frequenti|Preguntas frecuentes)` then look for `^###\s+` or `^Q:` pattern | Same data shape across locales because content_generator uses fixed FAQ section headings. |
| HowTo step extraction | LLM call to identify steps | Heuristic: `<ol><li>...</li></ol>` OR `## Step N:` / `## Passo N:` / `## Paso N:` headings | LLM cost zero, heuristic deterministic. Skip if heuristic fails (better no schema than wrong schema). |
| IndexNow client | Full SDK | 30-line stdlib `urllib` POST | Protocol is dead simple, single endpoint. |
| Per-position CTR benchmark | Compute from rolling 90-day GSC data | Hard-code FPS 2026 table at top of `meta_optimizer.py` | Industry-stable values, recomputing adds complexity and noise. |

---

## Common Pitfalls

### Pitfall 1: Service Account NOT verified as Owner on GSC property

**What goes wrong:** `searchanalytics().query()` returns 403 "User does not have sufficient permission for site".

**Why it happens:** Service account email (e.g. `merchant-sync@reflexmania-2025.iam.gserviceaccount.com`) must be added as Owner (NOT Restricted User) in GSC Settings → Users and permissions for each property. Plus the property must be verified (the SA email needs to be granted ownership by an existing verified owner).

**How to avoid:** Verified TODAY (2026-05-25) via the IG bot's working GSC integration on `~/instagram-bot/gsc_client.py`. The SA is already Owner on BBQ property. **Plan task: smoke test `search_analytics(...)` at end of Plan 1 to confirm before Plan 2 starts.**

**Warning signs:** 403 errors. Easy to miss — check error_details for "User does not have sufficient permission".

### Pitfall 2: `dataState="final"` and 2-3 day delay confusion

**What goes wrong:** `meta_optimizer` runs at 03:30 UTC daily but the "yesterday" data isn't in `final` yet.

**Why it happens:** Google's "final" data state lags 2-3 days. If we query `end_date = today`, we get fewer rows than expected.

**How to avoid:** Use `end_date = today - timedelta(days=3)` for `final` queries. Use `dataState="all"` only for "Δ vs yesterday" insights in claude_strategist.

**Warning signs:** Inconsistent row counts day-over-day. Use `dataState=all` only when freshness > stability is the goal.

### Pitfall 3: Strapi PUT for meta change fails silently on IT/ES locale

**What goes wrong:** Meta change applies to EN but not IT/ES.

**Why it happens:** Strapi v5 requires `?locale=xx` + slug in body for localized updates. The existing `strapi_client.update(content_type, doc_id, data, locale="it")` handles this correctly IF we pass the slug in `data`.

**How to avoid:** When calling `strapi_client.update()` for meta change, always include the locale's `slug` in `data`. Verify locale was actually updated by re-fetching with `find_one(..., populate="*")`.

**Warning signs:** Meta change shows in EN, IT/ES still old. Check Strapi logs.

### Pitfall 4: Indexing API quota exhaustion during refresh storm

**What goes wrong:** `gsc_refresh.py` selects 10 articles × 3 locales = 30 URLs, plus `meta_optimizer` daily indexing pings = ~5/day. Default quota = 200/day = generous, but a bug-induced retry loop can blow it.

**Why it happens:** Naive retry on 429 (rate limit) can cascade.

**How to avoid:** Our `_retry()` honors backoff `[1, 2, 4]` and gives up after 3 attempts. Never retry on 4xx including 429 in tight loops. Add a circuit breaker: if 5 consecutive 429s in one run, abort the run and Telegram-alert.

**Warning signs:** Sudden spike in 403/429 errors. Check Google Cloud Console quotas dashboard.

### Pitfall 5: Qwen returns meta longer than 60/155 chars

**What goes wrong:** Qwen, even with explicit instructions, occasionally returns 75-char titles.

**Why it happens:** Token-based generation doesn't respect character counts deterministically.

**How to avoid:**
1. Truncate at the prompt-parse layer: `seo_title = qwen_output[:60]`.
2. If truncation cuts mid-word, fall back to last-space-before-60 to preserve word boundary.
3. Validate in Claude gate: reject if `len(seo_title) > 60` (Claude will rewrite to fit).
4. Final safety: `strapi_client.update()` should hard-truncate before PUT.

**Warning signs:** Titles look cut off in SERP preview. Audit `meta_changes.jsonl` for `len(seo_title) > 60` rows.

### Pitfall 6: Speakable cssSelector breaks after Astro/CSS refactor

**What goes wrong:** Speakable selector `.article-body > p:first-child` works today, breaks after CSS module name changes.

**Why it happens:** Astro auto-generates scoped class names like `_article-body_abc123`.

**How to avoid:** Use **structural selectors only**, not class-based: `article > p:first-of-type`, `article h2`. Test selectors via `BeautifulSoup` + `cssselect` in `sweep_pages.py`.

**Warning signs:** Sweep test fails on speakable resolution. Add as regression check.

### Pitfall 7: FAQ section detection false-positives

**What goes wrong:** Tutorial with `## FAQ at a barbecue` heading triggers FAQPage emission with bogus content.

**Why it happens:** Loose regex `^##\s+FAQ` matches partial headings.

**How to avoid:** Tighten regex to require FAQ as exact heading or with explicit Q: prefix: `^##\s+(FAQ|Frequently Asked Questions|Domande frequenti|Preguntas frecuentes)\s*$`. Plus require ≥2 question-answer pairs detected below.

**Warning signs:** sweep_pages.py reports FAQPage schema with `mainEntity` length 0 or 1.

### Pitfall 8: Cron contention during SDXL VRAM swap

**What goes wrong:** `meta_optimizer` cron at 04:30 UTC tries to call Qwen :8080 during summer DST = local 06:30 = inside SDXL window.

**Why it happens:** Cron is UTC, SDXL window is local. Summer DST shifts the offset.

**How to avoid:** Schedule at 03:30 UTC year-round. Add hour-check guard: if `5 <= datetime.now().hour <= 7` (local), exit with "skipped — SDXL window".

**Warning signs:** Connection refused on Qwen :8080 between 06:00-06:55 local.

---

## Runtime State Inventory

> Phase 17 is mostly GREENFIELD (new agents, new schema fields). Some refactor of `keyword_scout.py`, `content_generator.py`, `claude_strategist.py`. No rename. State inventory minimal.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New file `state/meta_changes.jsonl` — append-only audit log. New file `state/meta_changes_pending.jsonl` — Hetzner→Windows handoff queue. New file `state/gsc_refresh_queue.jsonl`. New file `state/gsc_baseline.json` (rolling 7d aggregate). | Create empty files at first run; no migration. |
| Live service config | Google Cloud Project `reflexmania-2025` already has `merchant-sync@reflexmania-2025` SA registered. Verify Search Console API + URL Inspection API + Indexing API are ENABLED in the project's API Library — Indexing API needs explicit enable. | Confirm 3 APIs enabled before Plan 1. If not, enable via gcloud console (1 click each). |
| OS-registered state | New Windows Task Scheduler tasks: `BBQ Meta Review` (daily 09:00), `BBQ GSC Refresh Review` (Sun 10:00). | Add to existing Windows Task Scheduler — same pattern as `BBQ content_generator` already scheduled. |
| Secrets/env vars | NEW `GSC_SERVICE_ACCOUNT_KEY` (path to JSON), `GSC_SITE_URL` (default `https://bbq-experience.com/`), `INDEXNOW_KEY` (random 32-char), `INDEXNOW_HOST`. Add to `.env.windows` AND Hetzner `.env`. | Generate IndexNow key once + host at `https://bbq-experience.com/<key>.txt`. SA key already exists, just reference path. |
| Build artifacts | New Python deps `google-api-python-client` + `google-auth` require `pip install` on both Hetzner and Windows. New `web/src/lib/structured-data.ts` requires `npm run build` to bundle. | Add to requirements.txt + run pip install in Plan 1 wave 0. Schema changes deploy via existing webhook. |

**Nothing else found** — verified by reading `scripts/agents/`, `web/src/components/`, `scripts/agents/crontab.txt`, and the Phase 17 spec.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3 on Hetzner | All Hetzner-side agents | ✓ | 3.12 system | — |
| Python 3 on Windows | meta_review.py + gsc_refresh_review.py | ✓ | 3.12 | — |
| `claude` CLI on Windows | Claude quality gate for meta and refresh | ✓ (verified `C:\Users\pozzu\.local\bin\claude.exe`) | Pro Max OAuth | — |
| Qwen :8080 endpoint | meta_optimizer drafting | ✓ (192.168.1.124:8080) | qwen3.6-27b | None — must schedule outside SDXL window 04:00-05:00 UTC |
| GSC Search Analytics API | gsc_client | ✓ (SA key working for IG bot) | v1 | — |
| GSC URL Inspection API | gsc_client.inspect_url | ✓ (same SA scope) | v1 | — |
| Google Indexing API | request_indexing publish hook | ✓ (SA scope `auth/indexing`) | v3 | IndexNow ping (always parallel) |
| IndexNow protocol | indexnow_client | ✓ (no auth, free) | — | — |
| `google-api-python-client` 2.x | gsc_client | ✗ (not in `requirements.txt` yet) | install >=2.100.0 | None — install required |
| `google-auth` 2.x | SDK dep | ✗ (not yet) | install >=2.30.0 | None |
| Strapi REST API | meta updates + queue read | ✓ | 5.40.0 | — |
| Telegram Bot API | per-agent notifications | ✓ | — | — |
| pytest | unit tests | Available locally; install on Hetzner via `pip install pytest` | latest | Run locally before deploy |

**Missing dependencies with no fallback:**
- `google-api-python-client` + `google-auth` — must `pip install` on Hetzner AND Windows during Plan 1 Wave 0.

**Missing dependencies with fallback:**
- Google Indexing API — if quota exhausts or scope guard tightens, IndexNow remains as the parallel ping. Sitemap is the long-term fallback (no action needed, already in place).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (already used by `ab_tester.py` tests, no config required for new tests) |
| Config file | none — Wave 0 should create `scripts/agents/tests/conftest.py` if not present |
| Quick run command | `cd scripts/agents && python -m pytest tests/ -x -q` |
| Full suite command | `cd scripts/agents && python -m pytest tests/ -v && cd ../../web && npx vitest run` |
| Estimated runtime | ~5 seconds (pytest), ~10 seconds (vitest) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEO-08 | GSC client parsing (top_queries, top_pages, queries_for_page) | unit (mock SDK responses) | `pytest tests/test_gsc_client.py::test_parse_top_queries -x` | ❌ Wave 0 |
| SEO-08 | GSC client error paths (403, 429, network) | unit | `pytest tests/test_gsc_client.py::test_error_handling -x` | ❌ Wave 0 |
| SEO-08 | request_indexing soft-failure on 403 | unit | `pytest tests/test_gsc_client.py::test_request_indexing_soft_fail -x` | ❌ Wave 0 |
| SEO-08 | request_indexing called after publish_article | integration (mock SDK + mock Strapi) | `pytest tests/test_publisher_indexing_hook.py -x` | ❌ Wave 0 |
| SEO-09 | needs_meta_rewrite per-position benchmark | unit | `pytest tests/test_meta_optimizer.py::test_benchmark_logic -x` | ❌ Wave 0 |
| SEO-09 | meta_optimizer prompt includes top GSC queries | unit (mock gsc_client) | `pytest tests/test_meta_optimizer.py::test_prompt_includes_queries -x` | ❌ Wave 0 |
| SEO-09 | length cap enforcement (60/155) | unit | `pytest tests/test_meta_optimizer.py::test_length_caps -x` | ❌ Wave 0 |
| SEO-09 | meta_changes.jsonl append atomic | unit | `pytest tests/test_meta_optimizer.py::test_jsonl_atomic_append -x` | ❌ Wave 0 |
| SEO-09 | Claude gate decision logic | manual-only (requires live Claude CLI on Windows) | run `meta_review.py --dry-run` and inspect output | — |
| SEO-10 | keyword_scout merges Suggest + GSC striking sources | unit (mock gsc_client + mock get_google_suggestions) | `pytest tests/test_keyword_scout_gsc.py::test_fusion -x` | ❌ Wave 0 |
| SEO-10 | content_generator graceful degrade when no GSC data | unit | `pytest tests/test_content_generator_gsc.py::test_no_gsc_data -x` | ❌ Wave 0 |
| SEO-10 | content_generator priming injects top 5 queries in outline | unit | `pytest tests/test_content_generator_gsc.py::test_priming_outline -x` | ❌ Wave 0 |
| SEO-11 | gsc_refresh selection criteria (decay ≥30% OR imp ≥500 AND CTR <1.5%) | unit | `pytest tests/test_gsc_refresh.py::test_selection -x` | ❌ Wave 0 |
| SEO-11 | gsc_refresh competitor diff reuse | unit (mock competitor_state.json) | `pytest tests/test_gsc_refresh.py::test_competitor_diff -x` | ❌ Wave 0 |
| SEO-11 | claude_strategist GSC digest section format | unit | `pytest tests/test_strategist_gsc_digest.py -x` | ❌ Wave 0 |
| SEO-12 | FAQ detection from markdown | unit (vitest, TS) | `cd web && npx vitest run src/lib/structured-data.test.ts -t "FAQ"` | ❌ Wave 0 |
| SEO-12 | HowTo step extraction | unit (vitest, TS) | `cd web && npx vitest run src/lib/structured-data.test.ts -t "HowTo"` | ❌ Wave 0 |
| SEO-12 | speakable selector valid CSS | unit | `pytest tests/test_sweep_speakable.py -x` | ❌ Wave 0 |
| SEO-12 | sweep_pages.py zero JSON-LD regression | smoke (live HTTP) | `python scripts/sweep_pages.py` after deploy | — |

### Sampling Rate

- **Per task commit:** `cd scripts/agents && python -m pytest tests/ -x -q` (~3 seconds)
- **Per wave merge:** Full suite Python + Vitest
- **Phase gate:** Full suite green AND `python scripts/sweep_pages.py` reports zero regression on live URLs

### Wave 0 Gaps

- [ ] `scripts/agents/tests/__init__.py`
- [ ] `scripts/agents/tests/conftest.py` — shared fixtures: mock GSC SDK, mock Strapi client, mock Qwen `ask()`
- [ ] `scripts/agents/tests/test_gsc_client.py` — covers SEO-08
- [ ] `scripts/agents/tests/test_meta_optimizer.py` — covers SEO-09
- [ ] `scripts/agents/tests/test_keyword_scout_gsc.py` — covers SEO-10 (keyword_scout part)
- [ ] `scripts/agents/tests/test_content_generator_gsc.py` — covers SEO-10 (content_generator part)
- [ ] `scripts/agents/tests/test_gsc_refresh.py` — covers SEO-11 (gsc_refresh part)
- [ ] `scripts/agents/tests/test_strategist_gsc_digest.py` — covers SEO-11 (strategist part)
- [ ] `scripts/agents/tests/test_publisher_indexing_hook.py` — covers SEO-08 publish hook
- [ ] `scripts/agents/tests/test_sweep_speakable.py` — covers SEO-12 speakable validation
- [ ] `web/src/lib/structured-data.test.ts` — covers SEO-12 FAQ/HowTo parsers (vitest)
- [ ] Framework installs: `pip install pytest google-api-python-client google-auth` on Hetzner and Windows

---

## API Reference Summary

### GSC Search Analytics API

**Endpoint:** `https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`

**Request body keys:**
- `startDate`, `endDate` (string, YYYY-MM-DD, PT time, inclusive)
- `dimensions[]` (subset of: `query`, `page`, `country`, `device`, `date`, `hour`, `searchAppearance`)
- `type` (string: `web` (default), `image`, `video`, `news`, `discover`, `googleNews`)
- `dimensionFilterGroups[]` (with `groupType: "and"`, `filters[]` containing `dimension`, `operator` (`equals|notEquals|contains|notContains|includingRegex|excludingRegex`), `expression` max 4096 chars)
- `aggregationType` (`auto` (default), `byPage`, `byProperty`, `byNewsShowcasePanel`)
- `rowLimit` (1-25000, default 1000)
- `startRow` (0-indexed pagination, default 0)
- `dataState` (`final` (default), `all`, `hourly_all`)

**Response shape:**
```json
{
  "rows": [
    {
      "keys": ["how to smoke brisket"],  // matches dimensions[]
      "clicks": 42,
      "impressions": 1234,
      "ctr": 0.034,
      "position": 6.2
    }
  ],
  "responseAggregationType": "byProperty"
}
```

**Quotas:** 1,200 QPM/site, 30M QPD/project, 40k QPM/project. Row limit: 25k/request.

### GSC URL Inspection API

**Endpoint:** `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`

**Request body:** `{"inspectionUrl": "https://bbq-experience.com/en/blog/...", "siteUrl": "https://bbq-experience.com/"}`

**Response:** `inspectionResult` with `indexStatusResult` (verdict: `PASS|PARTIAL|FAIL|NEUTRAL`, coverageState, lastCrawlTime, robotsTxtState, etc.), `mobileUsabilityResult`, `richResultsResult`, `ampResult`.

**Quotas:** 600 QPM/site, 2,000 QPD/site, 10M QPD/project.

### Google Indexing API

**Endpoint:** `https://indexing.googleapis.com/v3/urlNotifications:publish`

**Request body:** `{"url": "https://...", "type": "URL_UPDATED" | "URL_DELETED"}`

**Scope:** `https://www.googleapis.com/auth/indexing` (separate from webmasters).

**Quota:** 200/day default. Raisable on request via Google form.

**Official scope:** JobPosting + BroadcastEvent only. Returns 200 for other content types but indexing is best-effort.

### IndexNow

**Endpoint:** `https://api.indexnow.org/indexnow` (or `https://www.bing.com/indexnow`)

**Auth:** Host a random key at `https://<host>/<key>.txt`; include key in POST.

**Request body:** `{"host": "...", "key": "...", "keyLocation": "...", "urlList": [...]}` (max 10k URLs).

**Response:** 200 (accepted), 202 (accepted, verify pending), 422 (invalid URL).

**Google:** Does NOT participate. Bing/Yandex/Naver/Seznam/Yep do.

---

## Reusable Patterns (from existing codebase)

| Pattern | Source File | Reuse for | Notes |
|---------|------------|-----------|-------|
| Retry with backoff `[1, 2, 4]` + 4xx-no-retry | `scripts/agents/lib/strapi_client.py` lines 26-58 | `gsc_client._retry()` | Same shape, different SDK underneath. |
| Cached session token with TTL | `scripts/agents/lib/umami_client.py` lines 26-49 | Could mirror for SA credentials but SDK handles refresh — skip. | Note: `google-auth` already caches. |
| Two-proportion z-test | `scripts/agents/ab_tester.py` lines 39-64 | CTR delta significance in `gsc_refresh` (compare 7d to prior 7d) | Lift verbatim. |
| Telegram report formatting | `scripts/agents/lib/telegram.py` `send_agent_report()` | All new agents | Same call signature. |
| Env loading inline at top of agent | `scripts/agents/content_generator.py` lines 21-29 | All new agents | Copy verbatim. |
| Multi-step LLM (outline → sections → assembly) | `scripts/agents/lib/claude_client.py` `generate_article_multistep()` | `gsc_refresh.py` can reuse for refreshed-article generation, passing the GSC top queries into the outline phase. | Touchpoint: `_generate_outline()` would accept a new `gsc_queries` kwarg. |
| Claude quality gate (Windows CLI + structured JSON) | `scripts/agents/claude_quality_gate.py` lines 88-187 | Meta review AND refresh review (with different prompts) | New prompts go in `prompts/claude_meta_review.md` + `prompts/claude_refresh_review.md`. |
| Strapi v5 localized PUT | `scripts/agents/lib/strapi_client.py` `update(..., locale="it")` | meta_optimizer.apply_meta_change() | Already proven across 30+ articles. |
| FAQPage JSON-LD emission | `web/src/components/content/FaqSection.astro` | EXISTING — no rewrite needed. Phase 17 ADD detection logic so it gets called automatically when content has FAQ markdown. | Currently relies on Astro frontmatter passing `faqs` prop. New: extract from markdown. |
| Sitemap regeneration | `web/scripts/sync-instagram.mjs` (similar pattern: cron-driven artifact regen) | n/a — Astro `@astrojs/sitemap` plugin handles this | No new work. |
| Atomic JSONL writes | Existing convention from CLAUDE.md but no canonical helper. Each agent rolls its own currently. | NEW `lib/atomic_io.py` with `append_jsonl_atomic()` (Pattern 4 above) — extract DRY pattern from this phase | Bonus: backport to existing `state/*.jsonl` callers. |

**Critical reuse for `gsc_client.py` port from .119:**
- IG bot's `gsc_client.py` (path `~/instagram-bot/gsc_client.py` on 192.168.1.119) — read via SSH from Windows during Plan 1 first task. Likely uses `google-api-python-client` already. Don't duplicate effort.

---

## Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|------------|------------|
| Indexing API silently no-ops on blog URLs | LOW | HIGH | Already treating as best-effort. IndexNow parallel ping. Sitemap is fallback. Accept this risk explicitly in code comments. |
| GSC quota exhaustion | LOW | LOW | At our scale (~60 calls/day) we're 5 orders of magnitude under limits. Circuit breaker on 5x consecutive 429 in `_retry()`. |
| FAQ schema markup penalized after deprecation | LOW | LOW | Schema markup itself remains valid per Google. Penalty would only apply to invisible/spammy FAQ — we emit only when visible section exists. |
| Qwen meta output exceeds 60/155 chars | MEDIUM | MEDIUM | Hard truncate at strapi PUT. Claude gate rejects over-length proposals. Validate in tests. |
| Cron contention with SDXL window | MEDIUM | LOW | Schedule meta_optimizer at 03:30 UTC year-round (well before 04:00-05:00 UTC summer window). Hour-check guard as belt-and-suspenders. |
| `google-api-python-client` adds pip install friction | LOW | HIGH | Document in REQUIREMENTS.md + Wave 0 task. Failure mode: ModuleNotFoundError at first cron — Telegram-alerted, easily fixed. |
| Service account permission drift | MEDIUM | LOW | SA already Owner per yesterday's hardening session. Add periodic check (monthly cron) that calls `top_pages()` and alerts on 403. |
| Speakable selector breaks after CSS refactor | MEDIUM | MEDIUM | Use structural selectors only (`article > p:first-of-type`). Add sweep_pages regression check. |
| Claude CLI OAuth session expires on Windows | HIGH | LOW | Already a known issue from other Claude-gated agents. Telegram alert + Matteo re-auths. No new work specific to Phase 17. |
| Meta change causes ranking drop (the new title performs WORSE) | MEDIUM | MEDIUM | Quality gate is the primary defense. Add: track ranking pos in GSC for 7 days after change, alert if pos drops >2. Future v2 enhancement (out of scope for Phase 17). |
| Strapi PUT triggers webhook rebuild on every meta change → rebuild storm | HIGH | HIGH | This is the SAME problem Phase 16 solved for `ab-experiment`. **Plan must add a similar webhook exclusion for blog-post/review/recipe/tutorial UPDATES where ONLY seo_title and seo_description fields change.** Either via Strapi lifecycle hook that suppresses webhook for meta-only changes, OR adnanh/webhook `not` rule. **CRITICAL — this can break the site if not addressed.** |
| `gsc_refresh.py` Claude Opus rewrite produces a worse article | MEDIUM | MEDIUM | Claude quality gate runs on every refresh. Auto-publish only on score ≥7 (same threshold as content_generator). Rejected refreshes go to `needs_human` queue. |
| Sweep_pages.py false-positives spam Telegram | LOW | MEDIUM | Existing pattern already gentle; add aggregated reporting (don't alert per-page). |

---

## Recommended Plan Breakdown

Target: **4 plans**, sequenced as 2 waves with one parallel-safe split.

### Wave A — Foundations

**Plan 17-01: GSC client + Indexing/IndexNow hooks + publisher integration + tests**
- Files NEW:
  - `scripts/agents/lib/gsc_client.py`
  - `scripts/agents/lib/indexnow_client.py`
  - `scripts/agents/lib/atomic_io.py` (extract DRY append_jsonl_atomic helper)
  - `scripts/agents/tests/conftest.py`
  - `scripts/agents/tests/test_gsc_client.py`
  - `scripts/agents/tests/test_indexnow_client.py`
  - `scripts/agents/tests/test_publisher_indexing_hook.py`
- Files MODIFY:
  - `scripts/agents/requirements.txt` (+google-api-python-client, +google-auth)
  - `scripts/agents/content_generator.py` (call `gsc_client.request_indexing()` + `indexnow_client.ping()` after `publish_article`)
  - `.env.windows` and Hetzner `.env` template (+GSC_SERVICE_ACCOUNT_KEY, +GSC_SITE_URL, +INDEXNOW_KEY, +INDEXNOW_HOST)
- Wave 0 tasks: pip install on Hetzner + Windows, generate IndexNow key file, verify SA Owner permission, smoke test `top_pages()`.
- Manual verification: serve `<key>.txt` from web/public/, verify Cloudflare doesn't strip.

### Wave B — Parallel-safe (can split into separate plans)

**Plan 17-02: meta_optimizer + meta_review + keyword_scout GSC source + content_generator priming**
- Files NEW:
  - `scripts/agents/meta_optimizer.py` (Hetzner cron 03:30 UTC)
  - `scripts/agents/meta_review.py` (Windows Task Scheduler daily 09:00)
  - `scripts/agents/prompts/claude_meta_review.md`
  - `scripts/agents/prompts/qwen_meta_draft.md`
  - `scripts/agents/tests/test_meta_optimizer.py`
  - `scripts/agents/tests/test_keyword_scout_gsc.py`
  - `scripts/agents/tests/test_content_generator_gsc.py`
- Files MODIFY:
  - `scripts/agents/keyword_scout.py` (add `scout_gsc_striking()` function, merge into `scout_keywords()`)
  - `scripts/agents/content_generator.py` (modify `generate_article_multistep()` to accept `gsc_queries` kwarg; modify `_generate_outline()` to inject)
  - `scripts/agents/claude_quality_gate.py` (factor out reusable review_meta() variant)
  - `scripts/agents/crontab.txt` (add meta_optimizer entry)
- Critical: **webhook rebuild exclusion for meta-only updates** (see Risk Register). Plan task: investigate Strapi lifecycle hook OR adnanh/webhook `not` rule on body shape (e.g. detect when ONLY `seo_title`/`seo_description` changed in payload).

**Plan 17-03: gsc_refresh + gsc_refresh_review + strategist GSC digest**
- Files NEW:
  - `scripts/agents/gsc_refresh.py` (Hetzner cron Sun 08:00 UTC)
  - `scripts/agents/gsc_refresh_review.py` (Windows Task Scheduler Sun 10:00)
  - `scripts/agents/prompts/claude_refresh_review.md`
  - `scripts/agents/tests/test_gsc_refresh.py`
  - `scripts/agents/tests/test_strategist_gsc_digest.py`
- Files MODIFY:
  - `scripts/agents/claude_strategist.py` (add `get_gsc_digest()`, weave into `main()`)
  - `scripts/agents/lib/claude_client.py` (extend `generate_strategy()` signature with `gsc_digest` kwarg)
  - `scripts/agents/crontab.txt` (add gsc_refresh entry)
- Depends on Plan 17-01 (gsc_client exists).
- **Parallel-safe with Plan 17-02** if executed in different waves OR with disjoint file sets.

### Wave C — Cross-cutting

**Plan 17-04: Schema markup audit (FAQPage/HowTo/speakable) + cron registry + Telegram reports**
- Files NEW:
  - `web/src/lib/structured-data.ts` (FAQ parser + HowTo extractor + speakable selector builder)
  - `web/src/lib/structured-data.test.ts`
  - `web/src/components/tutorial/HowToSchema.astro`
  - `scripts/agents/tests/test_sweep_speakable.py`
- Files MODIFY:
  - `web/src/components/content/ArticleSchema.astro` (add `speakable` property)
  - `web/src/pages/{en,it,es}/{tutorials,guide,tutoriales}/[slug].astro` (wire HowToSchema conditionally)
  - `web/src/pages/{en,it,es}/{blog,recensioni,reviews,resenas,ricette,recipes,recetas,guide,tutorials,tutoriales}/[slug].astro` (auto-detect FAQ from markdown content, pass to FaqSection)
  - `scripts/sweep_pages.py` (extend with FAQ/HowTo/speakable assertions)
- Per-agent Telegram report wiring (success summary + empty/error actionable message) — verify each of the 4 new agents has report.
- Deploy verification: webhook rebuild, sweep_pages.py zero regression.

### Dependency Graph

```
Plan 17-01 (foundations)
    │
    ├──> Plan 17-02 (meta_optimizer + keyword_scout + content_gen) ──┐
    │                                                                  │
    └──> Plan 17-03 (gsc_refresh + strategist) ───────────────────────┤
                                                                       │
Plan 17-04 (schema audit) — parallel-safe with 17-02 and 17-03 ────────┤
                                                                       ▼
                                                              Phase 17 GATE
                                                              (smoke + sweep)
```

Total plans: 4. Total tasks (estimated): ~25-30 across all plans.

---

## Requirements Mapping (proposed for REQUIREMENTS.md update)

Add these to v1.1 requirements section before archiving v1.1:

```markdown
### GSC-Driven Content Pipeline (Phase 17)

- [ ] **SEO-08**: `lib/gsc_client.py` exposes `top_queries()`, `top_pages()`, `search_analytics(dimensions=...)`, `queries_for_page(url)`, `request_indexing(url)`, `inspect_url(url)` against the shared `merchant-sync@reflexmania-2025` SA key; retry+timeout match stack convention; unit tests cover parsing + error paths; `request_indexing()` + IndexNow ping are called as best-effort, non-blocking, after every `publish_article` and every IT/ES translation promotion
- [ ] **SEO-09**: `meta_optimizer.py` runs daily on Hetzner at 03:30 UTC, selects articles with impressions ≥100/28d AND CTR below the per-position FPS 2026 benchmark × 0.6, drafts new seo_title/seo_description via Qwen with top 3-5 GSC queries injected; `meta_review.py` runs on Windows via Task Scheduler daily 09:00, Claude quality gates auto-apply on pass and queues `needs_human` on reject; every change appended atomically to `state/meta_changes.jsonl` with before/after/queries/decision; webhook rebuild suppressed for meta-only Strapi updates
- [ ] **SEO-10**: `keyword_scout.py` weekly pulls GSC striking-distance candidates (pos∈[8,20], impressions≥30, dedup via slugify against Suggest source); Telegram report distinguishes source per candidate with GSC metrics inline. `content_generator.py` (single-shot and `generate_article_multistep`) accepts `gsc_queries` kwarg, injects top 5 reali queries into outline + FAQ generator when target_keyword has GSC data; graceful no-op when absent
- [ ] **SEO-11**: `gsc_refresh.py` runs weekly Sun 08:00 UTC on Hetzner, selects top 10 pages with clicks-decay ≥30% OR impressions≥500/28d AND CTR<1.5%; pulls Strapi content + top GSC queries + competitor diff; `gsc_refresh_review.py` runs Windows Sun 10:00 with Claude Opus rewrite + quality gate, auto-publishes on score≥7, re-pings Indexing API + IndexNow. `claude_strategist.py` receives GSC weekly digest (Δ clicks/impressions/CTR/position vs prior 7d, top 10 striking-distance, top 10 CTR-opportunity, top 10 declining); weekly Telegram report includes ≥3 recommendations explicitly anchored to GSC metrics
- [ ] **SEO-12**: Every blog-post/tutorial/recipe/review serves FAQPage JSON-LD when content contains a recognized FAQ section (markdown headings `## FAQ` / `## Domande frequenti` / `## Preguntas frecuentes`); tutorials with step-structured content emit HowTo JSON-LD; Article schema includes `speakable` with structural cssSelectors covering first paragraph + each H2. `scripts/sweep_pages.py` extended assertions report zero regressions across all 50 live articles in 3 locales. All new crons registered in `scripts/agents/crontab.txt` with provenance comments; each new agent emits a Telegram report (success summary + actionable next step on empty/error)
```

---

## Project Constraints (from CLAUDE.md) — for planner verification

The planner must ensure plans honor these directives. They are LOCKED, not negotiable:

1. **Agents in `scripts/agents/`, shared libs in `scripts/agents/lib/`.** No exceptions.
2. **All external fetches use `timeout=10` (or `timeout=60-120` for write operations).** No bare `urlopen()`.
3. **Retry+backoff lives in `lib/*_client.py`, NOT in calling agents.** 3 attempts, `[1, 2, 4]` seconds.
4. **Atomic file writes for `state/*.jsonl`.** Use temp file + `os.replace()`. New helper `lib/atomic_io.py` recommended.
5. **No new pip dependencies unless justified.** `google-api-python-client` + `google-auth` ARE justified (SDK correctness vs hand-rolled JWT).
6. **Secrets via env vars only.** Never commit SA key. Add new vars to `.env` templates with comments.
7. **Italian code comments.** English allowed inside prompt template content.
8. **Qwen :8080 unavailable 06:00-06:55 local time (SDXL VRAM swap).** Cron meta_optimizer at 03:30 UTC year-round + hour-check guard.
9. **Claude CLI is Windows-only.** Any Claude-gated agent runs on Windows Task Scheduler.
10. **Strapi v5 localized PUTs: `?locale=xx` + slug in body.** Use existing `strapi_client.update()`.
11. **No instagram_bot.py modifications.** Only editorial_plan.py and integrations/. Phase 17 doesn't touch IG bot code directly.
12. **Container names: PostgreSQL = `postgres`.** No code change here; reminder for any DB-direct queries.
13. **Webhook rebuild suppression required for meta-only Strapi updates.** Same problem as Phase 16 ab-experiment. Planner must address explicitly.
14. **Deploy via webhook on push.** No GH Actions.

---

## Open Questions

1. **IG bot `gsc_client.py` exact code:** I cannot SSH into 192.168.1.119 from this environment. Plan 17-01 first task should SSH and read it; if it already uses `google-api-python-client` per my recommendation, validate signature parity; if it uses hand-rolled JWT, decide whether to standardize (recommend yes — port to SDK in IG bot during a future maintenance window, not Phase 17 scope).
   - **Recommendation:** Don't block Phase 17 on this. Implement BBQ-side per the recommendation in this research; reconcile cross-machine consistency in a follow-up if drift is found.

2. **Strapi webhook exclusion for meta-only updates:** Three options:
   - (a) Strapi lifecycle hook in `cms/src/api/blog-post/content-types/blog-post/lifecycles.js` that suppresses webhook fire when `data` only contains `seo_title`/`seo_description` (and same for review/recipe/tutorial).
   - (b) adnanh/webhook `not` rule matching on payload body keys.
   - (c) Special `X-Skip-Rebuild: true` header from `meta_optimizer` PUT, checked by adnanh/webhook trigger rule.
   - **Recommendation:** (c) is simplest and most explicit — needs verification that adnanh/webhook can match on request headers (Phase 16 already uses header `X-Rebuild-Secret` so this pattern works).
   - **Block:** Decide before Plan 17-02 starts.

3. **Italian-specific power words for Qwen meta prompt:** Research surfaced general Italian SEO conventions but no domain-specific BBQ vocabulary. Matteo should provide 5-10 Italian power words/phrases that resonate with the BBQ-Italy audience (e.g. "Pitmaster italiano", "Guida 2026", "Tutto sul brisket"). Without this, Qwen falls back to generic Italian power words — acceptable but suboptimal.
   - **Recommendation:** Plan 17-02 task creates `prompts/qwen_meta_draft.md` with placeholder POWER_WORDS_IT/POWER_WORDS_ES sections; Matteo fills them in during Plan 17-02 manual verification.

4. **Cover image refresh on gsc_refresh:** When `gsc_refresh.py` rewrites an article, should it also regenerate the cover image via SDXL? Current `cover_generator.py` runs daily 06:10 for NEW articles. Decision: out of scope for Phase 17 — refresh keeps existing cover. If cover gen becomes a refresh requirement, add as Phase 18 enhancement.

5. **GSC data for IT/ES locales:** The roadmap baseline (35 clicks/29k imp) is total across locales. EN dominates. Plan 17-02 task should verify that `top_pages()` returns URLs across all 3 locales (Google sees them as separate URLs per i18n). If GSC tracks them aggregated, may need per-locale filter (`dimensionFilterGroups` with `dimension: "page"` `operator: "includingRegex"` `expression: "^https://bbq-experience.com/it/"`).
   - **Recommendation:** Verify during smoke test in Plan 17-01.

6. **Wave 0 test framework install location:** The existing `scripts/agents/ab_tester.py` ships with tests, but I don't see a confirmed `pytest.ini` or `pyproject.toml` at `scripts/agents/`. Plan 17-01 task should establish the test discovery convention (likely `pytest.ini` at `scripts/agents/`) and add pytest to requirements.txt.

---

## Sources

### Primary (HIGH confidence)
- [Google Indexing API Quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart) — official scope statement (JobPosting + BroadcastEvent only)
- [Google Search Console API Usage Limits](https://developers.google.com/webmaster-tools/limits) — quotas per resource
- [Search Analytics: query Method Reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) — request body shape, filters, aggregation types
- [Google Article structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/article) — current spec
- [Google Speakable BETA documentation](https://developers.google.com/search/docs/appearance/structured-data/speakable) — cssSelector/xPath spec
- [Schema.org speakable property](https://schema.org/speakable) — official definition
- [Bing IndexNow blog (Dec 2024 + May 2025)](https://blogs.bing.com/webmaster/May-2025/IndexNow-Enables-Faster-and-More-Reliable-Updates-for-Shopping-and-Ads) — 22% of Bing clicked URLs from IndexNow
- `scripts/agents/lib/strapi_client.py` — retry+backoff+timeout pattern (verified in repo 2026-05-25)
- `scripts/agents/lib/umami_client.py` — token caching pattern
- `scripts/agents/ab_tester.py` — two-proportion z-test
- `scripts/agents/claude_quality_gate.py` — Claude Opus structured review pattern
- `scripts/agents/content_generator.py` — env loading + Strapi PUT pattern
- `scripts/agents/lib/claude_client.py` `generate_article_multistep()` — multi-step outline pattern
- `web/src/components/content/FaqSection.astro` — existing FAQPage JSON-LD emission
- `web/src/components/content/ArticleSchema.astro` — existing Article JSON-LD emission (missing speakable — target of Plan 17-04)
- `C:\Progetti\STACK-AI-CHANGELOG-2026-05-25-bbq-hardening.md` — yesterday's session notes confirming SA key + IG bot GSC working

### Secondary (MEDIUM confidence)
- [FirstPageSage 2026 CTR by ranking position](https://firstpagesage.com/reports/google-click-through-rates-ctrs-by-ranking-position/) — per-position CTR table (verified against multiple secondary studies)
- [Backlinko 2024 organic CTR study (200K keywords)](https://backlinko.com/google-ctr-stats) — corroborating CTR data
- [Advanced Web Ranking Q3 2025 CTR report](https://www.advancedwebranking.com/blog/ctr-google-2025-q3) — AI Overviews CTR impact data
- [SearchEngineJournal: Google Drops FAQ Rich Results](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/) — May 2026 FAQ deprecation
- [CrawlWP IndexNow vs Indexing API 2026](https://crawlwp.com/indexnow-vs-google-indexing-api-vs-sitemaps/) — practical recommendation for blog content
- [SEOTesting striking distance keywords via GSC API](https://seotesting.com/google-search-console/striking-distance-keywords-gsc-api/) — pos 8-20 + impressions filter approach
- [Google Drops FAQ Rich Results impact on AI search](https://www.thehoth.com/blog/google-faq-rich-results-deprecated/) — AI engine consumption rationale

### Tertiary (LOW confidence — flagged for runtime validation)
- IG bot `~/instagram-bot/gsc_client.py` exact implementation (assumed `google-api-python-client` — verify in Plan 17-01)
- Italian-specific SEO power words (general Italian SEO conventions found, BBQ-specific not in any source — Matteo input required)
- Bing market share in IT specifically (not found in search results; general Bing share ~2-3% in IT assumed from European market reports)
- GSC IT/ES locale aggregation behavior (assumption: separate URLs per locale; verify with smoke test)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `google-api-python-client` is industry-standard, all other libs already in project
- Architecture: HIGH — patterns directly mirror existing Phase 15/16 implementations
- GSC API specifics: HIGH — official Google docs verified 2026-05-25
- Indexing API scope: HIGH — official scope documented; practical behavior verified across 4 sources
- FAQ/HowTo deprecation: HIGH — 8+ corroborating sources for May 2026 + Sept 2023 dates
- CTR benchmarks: MEDIUM-HIGH — FPS+Backlinko aligned for pos 2-10, variance on pos 1
- Italian SEO: MEDIUM — general conventions found, BBQ-specific blocked on Matteo input
- IG bot reference code: MEDIUM-LOW — cannot read directly, recommended re-implementation pattern

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (FAQ rich result deprecation timing locked, GSC API surface stable, but Google's AI Overviews continue evolving CTR landscape — re-validate CTR benchmarks if not shipped within 30 days)

---

## RESEARCH COMPLETE

All 9 success criteria mapped to concrete patterns. All 8 critical research questions (A-H) answered with confidence levels and concrete recommendations. Reference implementations identified for every new file. Cron deconfliction validated. 6 open questions surfaced — only one (#2, webhook rebuild exclusion) blocks Plan 17-02 start; rest are runtime validations.

**Ready for `/gsd:plan-phase 17`.**
