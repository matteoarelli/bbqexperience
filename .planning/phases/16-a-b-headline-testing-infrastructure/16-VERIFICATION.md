---
phase: 16-a-b-headline-testing-infrastructure
verified: 2026-04-21T19:30:00Z
status: human_needed
score: 7/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Editing an ab-experiment or variant-impression entry in Strapi does NOT trigger an Astro site rebuild (ROADMAP SC6 — both content types excluded)"
    status: partial
    reason: "ab-experiment is correctly excluded from hooks.json with a 'not' rule. However, the ROADMAP SC6 explicitly names variant-impression as a second content type to exclude, and no variant-impression content type exists in Strapi nor is it excluded in hooks.json. The design moved impression tracking to Umami events (not a Strapi content type), making variant-impression a moot exclusion — but the ROADMAP SC wording has not been updated to reflect this."
    artifacts:
      - path: "/opt/webhooks/hooks.json (server)"
        issue: "variant-impression not excluded — but this content type was never created"
    missing:
      - "Either update ROADMAP SC6 wording to remove the variant-impression reference, OR explicitly confirm in a VERIFICATION override that the design decision to use Umami events eliminates the need for a variant-impression Strapi content type and webhook exclusion"
human_verification:
  - test: "Smoke test — bot UA receives control variant"
    expected: "curl -A 'Googlebot/2.1' https://bbq-experience.com/en/blog/{slug-with-active-experiment}/ — response h1 contains original post.title, not a variant title"
    why_human: "Requires an active experiment to exist in Strapi and cannot be verified against live site programmatically without one"
  - test: "ab_id cookie is set on first visit to SSR blog page"
    expected: "curl -v https://bbq-experience.com/en/blog/ 2>&1 | grep 'Set-Cookie.*ab_id' — should show a 30-day max-age cookie"
    why_human: "Needs live request through Cloudflare/Caddy to verify cookie flows correctly end-to-end"
  - test: "Umami ab-impression events appear after creating a test experiment"
    expected: "Within 24 hours of creating an active ab-experiment in Strapi and visiting the blog post, Umami dashboard should show ab-impression events with variant identifiers"
    why_human: "Requires an active experiment, real browser visits, and access to Umami dashboard"
  - test: "ab_tester.py --dry-run produces expected output"
    expected: "python scripts/agents/ab_tester.py --dry-run produces formatted report including Brevo A/B section without Telegram send"
    why_human: "Requires .env with BREVO_API_KEY and valid Umami/Strapi credentials on the server"
  - test: "Editing an ab-experiment in Strapi does NOT appear in /opt/webhooks/logs/bbqexperience.log"
    expected: "After editing an ab-experiment entry, confirm no rebuild is triggered in the log"
    why_human: "Requires manual interaction with Strapi admin and SSH log check"
---

# Phase 16: A/B Headline Testing Infrastructure — Verification Report

**Phase Goal:** Blog post headlines can be tested with statistically valid assignment and measurement, without triggering SEO cloaking penalties, rebuild cascades, or client-side flicker; newsletter subject lines ride the same feedback loop via Brevo.
**Verified:** 2026-04-21T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Strapi exposes ab-experiment content type with relation to blog-post, variant_a/b/c, status, winner fields | VERIFIED | `cms/src/api/ab-experiment/content-types/ab-experiment/schema.json` — collectionType, manyToOne blog_post relation, variant_a/b/c (i18n localized), status enum [active,completed,paused], winner enum [control,a,b,c], started_at/completed_at |
| 2 | ab.ts provides deterministic variant assignment always returning the same variant for the same ab_id+postId pair | VERIFIED | `web/src/lib/ab.ts` — FNV-1a hash: `hash ^= charCodeAt(i); hash = Math.imul(hash, 16777619)` returning `Math.abs(hash) % variantCount`. 13 vitest tests pass including determinism and 40-60% distribution across 10000 inputs |
| 3 | ab.ts detects Googlebot/Bingbot/etc user agents and returns true for isBot() | VERIFIED | `web/src/lib/ab.ts` — 16 bot patterns including googlebot, bingbot, gptbot, claudebot, semrushbot, ahrefsbot. Tests confirm: isBot('Googlebot/2.1')=true, isBot('')=false |
| 4 | Middleware sets ab_id cookie on first visit with 30-day TTL and passes abId+isBot to Astro.locals | VERIFIED | `web/src/middleware.ts` — `maxAge: 30 * 24 * 60 * 60`, `httpOnly: false`, `sameSite: 'lax'`, `secure: true`. `context.locals.abId = abId; context.locals.isBot = isBot(...)` present. `web/src/env.d.ts` declares `abId: string; isBot: boolean` in App.Locals |
| 5 | Blog post detail pages show variant headline in h1 for non-bot visitors when experiment is active; bots always see control | VERIFIED | All 3 locale `[slug].astro` pages — guard `if (!Astro.locals.isBot)`, `assignVariant()` used, `displayTitle` used in `ContentLayout title={displayTitle}` and breadcrumb. seoTitle, canonicalUrl, ArticleSchema headline, og:title all use original `post.title`. No `set:html` with displayTitle |
| 6 | ArticleCard shows variant title for non-bot visitors; ab-click tracking data attributes emitted | VERIFIED | `web/src/components/content/ArticleCard.astro` — Props `experimentDocId?` and `activeVariant?`. Conditional `data-umami-event="ab-click"` with `data-umami-event-experiment` and `data-umami-event-variant` on the card anchor element. All 3 blog listing pages build `experimentsMap` and pass props |
| 7 | ab_tester.py computes two-proportion z-test, refuses winner with <500 impressions or <7 days, enforces one-active-per-post | VERIFIED | `scripts/agents/ab_tester.py` — `two_proportion_ztest` using `math.erfc` (no scipy), `MIN_IMPRESSIONS=500`, `MIN_DAYS=7`, `SIGNIFICANCE_LEVEL=0.05`. One-active-per-post check via `post_experiments` dict. 7 pytest tests pass. Brevo A/B included via `brevo_client.list_recent_ab_campaigns()` |
| 8 | Webhook hooks.json excludes ab-experiment AND variant-impression from rebuild trigger; webhook service active | PARTIAL | `ab-experiment` is correctly excluded (verified via SSH — "not" rule present). `variant-impression` is not excluded, but this content type was never created — impression tracking moved to Umami events. ROADMAP SC6 wording includes `variant-impression` but the design superseded it. Webhook service is `active`. |

**Score:** 7/8 truths verified (SC8 partial — see Gaps section)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `cms/src/api/ab-experiment/content-types/ab-experiment/schema.json` | A/B experiment Strapi content type schema | VERIFIED | kind=collectionType, singularName=ab-experiment, blog_post manyToOne, variant_a/b/c, status/winner enums, i18n localized |
| `cms/src/api/ab-experiment/routes/ab-experiment.ts` | Core router factory | VERIFIED | `factories.createCoreRouter('api::ab-experiment.ab-experiment')` |
| `cms/src/api/ab-experiment/controllers/ab-experiment.ts` | Core controller factory | VERIFIED | `factories.createCoreController(...)` |
| `cms/src/api/ab-experiment/services/ab-experiment.ts` | Core service factory | VERIFIED | `factories.createCoreService(...)` |
| `web/src/lib/ab.ts` | Variant assignment + bot detection | VERIFIED | Exports `assignVariant`, `isBot`, `generateAbId`, `VARIANT_NAMES`, `VariantName` |
| `web/src/lib/ab.test.ts` | Unit tests for ab.ts | VERIFIED | 13 tests — determinism, distribution, bot detection, range validation |
| `web/src/middleware.ts` | ab_id cookie + locals assignment | VERIFIED | Cookie set with 30d maxAge, httpOnly:false, lax/secure. Locals populated before page logic |
| `web/src/env.d.ts` | App.Locals type declarations | VERIFIED | `abId: string; isBot: boolean` alongside `isPreview: boolean` |
| `web/src/lib/types.ts` | StrapiAbExperiment + ContentType | VERIFIED | `StrapiAbExperiment` interface at line 283, `'ab-experiments'` in ContentType union at line 18 |
| `web/package.json` | nanoid dependency | VERIFIED | `"nanoid": "^5.1.9"` |
| `web/src/pages/en/blog/[slug].astro` | A/B variant injection + ab-impression | VERIFIED | `ab-impression` present, `assignVariant` import, `displayTitle` in ContentLayout, bot guard |
| `web/src/pages/it/blog/[slug].astro` | A/B variant injection + ab-impression | VERIFIED | Identical A/B logic to EN |
| `web/src/pages/es/blog/[slug].astro` | A/B variant injection + ab-impression | VERIFIED | Identical A/B logic to EN |
| `web/src/pages/en/blog/index.astro` | experimentsMap + variant resolution | VERIFIED | `experimentsMap`, `assignVariant`, props passed to ArticleCard |
| `web/src/pages/it/blog/index.astro` | experimentsMap + variant resolution | VERIFIED | Identical A/B logic to EN |
| `web/src/pages/es/blog/index.astro` | experimentsMap + variant resolution | VERIFIED | Identical A/B logic to EN |
| `web/src/components/content/ArticleCard.astro` | Variant title + ab-click tracking | VERIFIED | `experimentDocId?`, `activeVariant?` props, conditional `data-umami-event="ab-click"` |
| `scripts/agents/ab_tester.py` | Weekly A/B analysis agent | VERIFIED | `two_proportion_ztest` (math.erfc), `should_declare_winner` (500imp/7d/p<0.05), `--dry-run`, Telegram reporting, Brevo integration |
| `scripts/agents/tests/test_ab_tester.py` | Unit tests for z-test and thresholds | VERIFIED | 7 pytest tests — all passing |
| `scripts/agents/lib/brevo_client.py` | Brevo A/B campaign client | VERIFIED | `get_ab_campaign_results(campaign_id)` and `list_recent_ab_campaigns(limit)` present |
| `scripts/agents/lib/umami_client.py` | Extended with get_event_data() | VERIFIED | `get_event_data(event_name, start_ms, end_ms)` function at line 86 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `web/src/middleware.ts` | `web/src/lib/ab.ts` | `import { isBot, generateAbId }` | WIRED | Line 6: `import { isBot, generateAbId } from '@lib/ab'` |
| `web/src/middleware.ts` | `context.cookies` | `cookies.set ab_id` | WIRED | Lines 26-36: get + conditional set |
| `web/src/pages/en/blog/[slug].astro` | Strapi ab-experiments API | `fetchCollection<StrapiAbExperiment>('ab-experiments'` | WIRED | Line 53: filters by blog_post documentId and status=active |
| `web/src/pages/en/blog/[slug].astro` | `web/src/lib/ab.ts` | `import { assignVariant, VARIANT_NAMES }` | WIRED | Line 21 |
| `web/src/components/content/ArticleCard.astro` | Umami | `data-umami-event="ab-click"` | WIRED | Lines 67-70: conditional data attributes on anchor |
| `scripts/agents/ab_tester.py` | `scripts/agents/lib/umami_client.py` | `import umami_client; umami.get_event_data(...)` | WIRED | Lines 95-96 |
| `scripts/agents/ab_tester.py` | `scripts/agents/lib/telegram.py` | `telegram.send(...)` | WIRED | Line 310: `telegram.send(report, parse_mode="HTML")` |
| `scripts/agents/ab_tester.py` | `scripts/agents/lib/strapi_client.py` | `strapi.find('ab-experiments', ...)` | WIRED | Lines 158-163 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `web/src/pages/en/blog/[slug].astro` | `displayTitle` | `fetchCollection<StrapiAbExperiment>('ab-experiments', { filters: { blog_post... }, status: active })` → `experiment.variant_a/b/c` | Yes — real Strapi query with filters | FLOWING |
| `web/src/pages/en/blog/index.astro` | `cardTitle` | `experimentsMap.get(post.documentId)` populated from `fetchCollection<StrapiAbExperiment>` with pageSize 50 | Yes — real Strapi query, keyed map lookup | FLOWING |
| `web/src/components/content/ArticleCard.astro` | `data-umami-event-experiment` | Props passed from listing pages — `cardExpDocId` from experiment.documentId | Yes — Strapi documentId from real query | FLOWING |
| `scripts/agents/ab_tester.py` | `stats` | `umami.get_event_data('ab-impression'/'ab-click', start_ms, end_ms)` via Umami API | Yes — live API query with time range | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| ab.ts tests pass | `cd web && npx vitest run src/lib/ab.test.ts` | 13/13 passed in 511ms | PASS |
| ab_tester.py unit tests pass | `python -m pytest scripts/agents/tests/test_ab_tester.py -v` | 7/7 passed in 0.39s | PASS |
| Cloudflare does not cache SSR blog pages | `curl -sI https://bbq-experience.com/en/blog/ | grep cf-cache-status` | `cf-cache-status: DYNAMIC` | PASS |
| Webhook service active on Hetzner | `systemctl is-active webhook` | `active` | PASS |
| ab-experiment excluded from webhook | `grep -B 5 "ab-experiment" /opt/webhooks/hooks.json` | Found inside `"not": { "match": { "value": "ab-experiment" } }` | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AB-01 | 16-01 | Author can define 2 or 3 headline variants on any BlogPost via Strapi | SATISFIED | schema.json with variant_a (required), variant_b (required), variant_c (optional), blog_post manyToOne relation — content type registers on Strapi restart |
| AB-02 | 16-01, 16-02 | Astro middleware assigns sticky variant via ab_id cookie (30-day TTL, deterministic) without client-side swap | SATISFIED | middleware.ts sets cookie server-side, assignVariant is FNV-1a hash (deterministic), no client-side content swap |
| AB-03 | 16-02 | System tracks variant impressions and clicks via Umami; h1 and URL slug remain stable | SATISFIED | ab-impression events in [slug].astro, ab-click data attributes in ArticleCard; seoTitle/canonicalUrl/JSON-LD headline all use original post.title |
| AB-04 | 16-03 | Weekly Python agent with two-proportion z-test, minimum thresholds, Telegram recommendation | SATISFIED | ab_tester.py with math.erfc z-test, MIN_IMPRESSIONS=500, MIN_DAYS=7, one-active-per-post, telegram.send() |
| AB-05 | 16-01, 16-02 | Bot UAs excluded from A/B allocation, always receive control variant | SATISFIED | isBot() with 16 patterns, `if (!Astro.locals.isBot)` guard before experiment lookup in all detail + listing pages |
| AB-06 | 16-03 | Webhook pipeline excludes ab-experiment content type from rebuild | SATISFIED | hooks.json "not" rule on Hetzner, `systemctl is-active webhook` = active |
| AB-07 | 16-03 | Newsletter subject-line A/B via Brevo surfaced in weekly Telegram digest | SATISFIED | brevo_client.py with `list_recent_ab_campaigns` + `get_ab_campaign_results`, integrated in ab_tester.py analyze_experiments() |

Note: REQUIREMENTS.md checkbox markers for AB-01, AB-02, AB-03, AB-05 show `[ ]` (pending) — these were not updated after phase completion and do not reflect actual implementation state.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `web/src/pages/en/blog/[slug].astro` | `{experimentDocId && ...}` — experimentDocId is null when no experiment active | Info | Correct use of conditional rendering — no stub concern |
| Pre-existing: 89 `astro check` errors | Pre-existing TypeScript warnings in non-A/B files | Info | None are in A/B phase files; pre-existing debt not introduced by this phase |

No blockers or stubs found in phase 16 code.

---

### Human Verification Required

#### 1. Bot UA smoke test

**Test:** `curl -A 'Googlebot/2.1' https://bbq-experience.com/en/blog/{slug-of-post-with-active-experiment}/` after creating an active ab-experiment in Strapi
**Expected:** Response h1 contains the original post.title, not variant_a or variant_b text
**Why human:** Requires an active experiment to exist in Strapi production; cannot be verified without one

#### 2. ab_id cookie end-to-end

**Test:** `curl -v https://bbq-experience.com/en/blog/ 2>&1 | grep -i 'set-cookie.*ab_id'`
**Expected:** Response includes `Set-Cookie: ab_id=...; Max-Age=2592000; Path=/; SameSite=Lax; Secure`
**Why human:** Should be verifiable via curl, but requires confirmation the cookie is not stripped by Cloudflare or Caddy in the actual request chain

#### 3. Umami events appear within 24h

**Test:** Create active ab-experiment in Strapi linked to a blog post. Visit the blog post page in a non-bot browser. Check Umami dashboard for `ab-impression` custom event.
**Expected:** Non-zero impression count for the variant within 24 hours
**Why human:** Requires Strapi admin access, Umami dashboard access, and real browser visit

#### 4. ab_tester.py --dry-run output

**Test:** On Hetzner server: `python3 /opt/services/bbqexperience/scripts/agents/ab_tester.py --dry-run`
**Expected:** Formatted report printed to stdout with "A/B Test Weekly Report", headline experiments section, and Brevo A/B section — no Telegram send
**Why human:** Requires .env with live API credentials (BREVO_API_KEY, UMAMI credentials) on the server

#### 5. Webhook exclusion end-to-end

**Test:** In Strapi admin, edit an existing ab-experiment entry (e.g. change variant_a text). Check `/opt/webhooks/logs/bbqexperience.log` — should NOT show a new rebuild entry.
**Expected:** No rebuild triggered by the ab-experiment edit
**Why human:** Requires manual Strapi interaction and SSH log monitoring

---

### Gaps Summary

One partial gap found:

**SC6 — variant-impression webhook exclusion**: The ROADMAP success criterion 6 states that BOTH `ab-experiment` AND `variant-impression` must be excluded from the webhook rebuild trigger. The `ab-experiment` exclusion is implemented and verified. However, a `variant-impression` Strapi content type was never created — the design evolved to use Umami custom events for impression tracking instead of a dedicated Strapi content type. This makes the `variant-impression` webhook exclusion meaningless (there is nothing to exclude), but the ROADMAP SC wording has not been updated.

**Resolution options (choose one):**
1. Update ROADMAP SC6 to remove the `variant-impression` reference, reflecting the design decision to use Umami events
2. Add an override to this VERIFICATION.md frontmatter accepting the deviation with a reason

This is not a functional gap — the A/B testing system works without a `variant-impression` content type. It is a documentation consistency gap.

---

_Verified: 2026-04-21T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
