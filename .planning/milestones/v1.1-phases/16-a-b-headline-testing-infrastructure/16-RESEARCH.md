# Phase 16: A/B Headline Testing Infrastructure - Research

**Researched:** 2026-04-21
**Domain:** A/B testing, Astro SSR middleware, Strapi content types, Umami custom events, Brevo A/B campaigns, adnanh/webhook filtering
**Confidence:** HIGH

## Summary

This phase builds a complete A/B headline testing loop for blog posts: Strapi stores variants, Astro middleware assigns sticky cookies, Umami tracks impressions/clicks, a weekly Python agent computes statistical significance, and Brevo's native A/B feature handles newsletter subject lines. The architecture is deliberately simple -- no edge workers, no client-side swaps, no rebuild cascades.

The critical research flags from STATE.md are resolved: (1) adnanh/webhook supports `not` trigger rules that can exclude Strapi `ab-experiment` payloads by matching the `model` field in the JSON body, and (2) Astro SSR middleware can set cookies via `context.cookies.set()` which works correctly because the site is fully SSR (output: 'server') and Cloudflare does not cache dynamic HTML responses by default.

**Primary recommendation:** Use Strapi's `model` field in webhook payloads combined with adnanh/webhook's `not` rule to suppress rebuilds. Implement variant assignment as a deterministic hash of `ab_id + postDocumentId` in Astro middleware. Use Python's `math` module for the z-test (no scipy dependency). Track via Umami `data-umami-event` attributes + `umami.track()` JS calls.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AB-01 | Author defines 2-3 headline variants via Strapi `ab-experiment` content type linked to blog post | Strapi collectionType schema with relation to blog-post, i18n localized, documented in Architecture Patterns |
| AB-02 | Sticky `ab_id` cookie (30-day TTL, nanoid) set by middleware, deterministic variant assignment, stable h1/slug | Astro SSR middleware `context.cookies.set()` works in SSR mode; nanoid available as transitive dep; hash-based assignment pattern documented |
| AB-03 | Umami custom events `ab-impression` and `ab-click` with variant identifiers | Umami `umami.track(name, data)` and `data-umami-event-*` attributes; event-data API for retrieval documented |
| AB-04 | Weekly agent computes two-proportion z-test with thresholds (>=500 impressions, >=7 days, one active test per post) | Pure Python z-test implementation (no scipy needed); agent pattern matches existing umami_feedback.py |
| AB-05 | Bot/crawler UA gets control variant, excluded from counts | Middleware UA sniffing pattern; Umami already excludes known bots from pageviews |
| AB-06 | ab-experiment edits do NOT trigger Astro rebuild | Strapi webhook payload includes `model` field; adnanh/webhook `not` rule can exclude `ab-experiment` model |
| AB-07 | Brevo newsletter A/B subject-line winner in Telegram digest | Brevo API `abTesting=true` + `subjectA`/`subjectB`; campaign stats endpoint for winner detection |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.x | SSR middleware for cookie assignment | Already running, `output: 'server'`, middleware.ts exists |
| Strapi | 5.x | Content type for ab-experiment | Already running, 14 content types, i18n plugin active |
| Umami | self-hosted | Event tracking (impressions + clicks) | Already deployed at analytics.bbq-experience.com, script tag in BaseLayout |
| Python 3.12 | 3.12.3 | Weekly agent (ab_tester.py) | Already on server, agent patterns established |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.x (5.1.9) | Generate `ab_id` cookie value | Direct dependency in web/package.json for cookie ID generation [VERIFIED: npm registry] |

**Installation:**
```bash
cd web && npm install nanoid
```

No new Python dependencies needed. The two-proportion z-test uses only `math` from the standard library. Brevo API calls use `urllib.request` (already used by all agents).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid for ab_id | crypto.randomUUID() | UUID is 36 chars vs nanoid 21 chars; nanoid is more cookie-friendly. Both work. |
| Pure math z-test | scipy.stats | scipy is 150MB+ install, not on server, overkill for a single formula |
| Middleware cookie | Cloudflare Worker | Out of scope per REQUIREMENTS.md; middleware-at-origin is sufficient |

## Architecture Patterns

### Recommended Project Structure
```
cms/src/api/
  ab-experiment/
    content-types/ab-experiment/schema.json
    routes/ab-experiment.js
    controllers/ab-experiment.js
    services/ab-experiment.js

web/src/
  middleware.ts              # Extended: A/B cookie + variant assignment
  lib/ab.ts                 # A/B helper: hash assignment, bot detection, variant resolution
  pages/en/blog/[slug].astro # Modified: inject variant headline from ab-experiment

scripts/agents/
  ab_tester.py              # NEW: weekly agent, z-test, Telegram report
  lib/umami_client.py       # Extended: get_event_data() for custom events
  lib/brevo_client.py       # NEW: create A/B campaign, get winner stats
```

### Pattern 1: Strapi ab-experiment Content Type Schema
**What:** Separate content type linked to blog-post via relation, NOT extra fields on blog-post
**When to use:** Always -- keeps experiment lifecycle separate from content lifecycle
**Schema:**
```json
{
  "kind": "collectionType",
  "collectionName": "ab_experiments",
  "info": {
    "singularName": "ab-experiment",
    "pluralName": "ab-experiments",
    "displayName": "AB Experiment"
  },
  "options": { "draftAndPublish": true },
  "pluginOptions": { "i18n": { "localized": true } },
  "attributes": {
    "blog_post": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::blog-post.blog-post"
    },
    "variant_a": {
      "type": "string",
      "required": true,
      "pluginOptions": { "i18n": { "localized": true } }
    },
    "variant_b": {
      "type": "string",
      "required": true,
      "pluginOptions": { "i18n": { "localized": true } }
    },
    "variant_c": {
      "type": "string",
      "pluginOptions": { "i18n": { "localized": true } }
    },
    "status": {
      "type": "enumeration",
      "enum": ["active", "completed", "paused"],
      "default": "active"
    },
    "winner": {
      "type": "enumeration",
      "enum": ["control", "a", "b", "c"]
    },
    "started_at": { "type": "datetime" },
    "completed_at": { "type": "datetime" }
  }
}
```
[VERIFIED: schema pattern matches existing content types in cms/src/api/]

**Key design:** `variant_a` and `variant_b` are the test headlines. The blog post's own `title` field is the control. `variant_c` is optional (supports 2-3 variants as required). The `status` field lets the agent mark experiments complete. `winner` records the outcome.

### Pattern 2: Deterministic Variant Assignment in Middleware
**What:** Hash-based assignment using ab_id cookie + post documentId
**When to use:** Every request to a blog post with an active experiment
```typescript
// web/src/lib/ab.ts
import { nanoid } from 'nanoid';

// Elenco User-Agent pattern per bot/crawler
const BOT_UA_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /ia_archiver/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /petalbot/i, /gptbot/i, /claudebot/i, /twitterbot/i,
];

export function isBot(userAgent: string): boolean {
  return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Assegnazione deterministica variante basata su hash di ab_id + postId.
 * Garantisce che lo stesso utente veda sempre la stessa variante.
 */
export function assignVariant(abId: string, postDocId: string, variantCount: number): number {
  // FNV-1a hash semplice — deterministico, nessuna dipendenza
  let hash = 2166136261;
  const input = `${abId}:${postDocId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % variantCount;
}
```
[ASSUMED: FNV-1a hash distribution is sufficient for A/B -- standard practice but not verified against this specific use case]

### Pattern 3: Middleware Cookie + Variant Injection
**What:** Extend existing middleware.ts to set ab_id cookie and pass variant to page context
```typescript
// In middleware.ts — BEFORE the existing try/next() block
const abId = context.cookies.get('ab_id')?.value || nanoid();
if (!context.cookies.get('ab_id')) {
  context.cookies.set('ab_id', abId, {
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
    httpOnly: false,  // Leggibile da JS per tracking Umami
    sameSite: 'lax',
    secure: true,
  });
}
context.locals.abId = abId;
context.locals.isBot = isBot(context.request.headers.get('user-agent') || '');
```
[VERIFIED: Astro SSR middleware context.cookies.set() works for on-demand rendered pages — docs.astro.build/en/guides/middleware/]

### Pattern 4: Umami Event Tracking
**What:** Track impressions on page load, clicks on listing cards
```html
<!-- Impression tracking in blog [slug].astro -->
<script define:vars={{ variant, experimentId }}>
  if (typeof umami !== 'undefined' && variant !== 'control-bot') {
    umami.track('ab-impression', {
      experiment: experimentId,
      variant: variant,
    });
  }
</script>

<!-- Click tracking in ArticleCard.astro (when experiment active) -->
<a href={href}
  data-umami-event="ab-click"
  data-umami-event-experiment={experimentId}
  data-umami-event-variant={variant}
>
```
[VERIFIED: umami.track(name, data) API — docs.umami.is/docs/tracker-functions]

### Pattern 5: Webhook Exclusion for ab-experiment
**What:** Modify adnanh/webhook trigger-rule to reject Strapi payloads where `model === "ab-experiment"`
```json
{
  "id": "bbqexperience-rebuild",
  "execute-command": "/opt/webhooks/scripts/rebuild-bbqexperience-web.sh",
  "command-working-directory": "/opt/services",
  "response-message": "Rebuild bbqexperience web triggered",
  "trigger-rule": {
    "and": [
      {
        "match": {
          "type": "value",
          "value": "434aecc06f303ed888225d36eed83e2d89ab8873",
          "parameter": {
            "source": "header",
            "name": "X-Rebuild-Secret"
          }
        }
      },
      {
        "not": {
          "match": {
            "type": "value",
            "value": "ab-experiment",
            "parameter": {
              "source": "payload",
              "name": "model"
            }
          }
        }
      }
    ]
  }
}
```
[VERIFIED: Strapi webhook payload contains "model" field — confirmed via Strapi v5 docs]
[VERIFIED: adnanh/webhook supports "not" + "and" compound trigger rules — github.com/adnanh/webhook/blob/master/docs/Hook-Rules.md]

### Pattern 6: Brevo A/B Campaign via API
**What:** Create email campaign with A/B subject testing
```python
# In brevo_client.py o ab_tester.py
def create_ab_campaign(subject_a: str, subject_b: str, html: str, list_id: int) -> int:
    """Crea campagna Brevo con A/B test su subject line."""
    payload = {
        "sender": {"name": "BBQ Experience", "email": "admin@bbq-experience.com"},
        "htmlContent": html,
        "recipients": {"listIds": [list_id]},
        "abTesting": True,
        "subjectA": subject_a,
        "subjectB": subject_b,
        "splitRule": 25,       # 25% test, 75% winner
        "winnerCriteria": "open",
        "winnerDelay": 48,     # 48 ore prima di inviare al resto
        "name": f"AB Test {datetime.now().strftime('%Y-%m-%d')}",
    }
    # POST https://api.brevo.com/v3/emailCampaigns
    ...
```
[VERIFIED: Brevo API abTesting/subjectA/subjectB/splitRule/winnerCriteria/winnerDelay params — developers.brevo.com/reference/create-email-campaign]

### Anti-Patterns to Avoid
- **Client-side headline swap:** Never use JS to swap `<h1>` after render. Causes CLS, breaks SEO, visible flicker. Set variant server-side in SSR.
- **Variant in URL:** Never put variant identifier in the URL slug. Breaks canonical, creates duplicate content, Googlebot sees different pages.
- **ab-experiment fields on blog-post:** Never add A/B fields directly to blog-post schema. Pollutes content model, creates rebuild dependency, harder to clean up completed experiments.
- **Multiple active tests per post:** The agent MUST enforce one-active-test-per-post. Overlapping tests invalidate both.
- **Caching variant HTML at CDN:** Cloudflare does not cache dynamic SSR responses by default (no file extension, no explicit cache headers). Do NOT add cache-control headers to blog post responses while A/B is active.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie ID generation | Custom random string | nanoid | Collision-resistant, URL-safe, well-tested |
| Bot detection regex | Exhaustive UA database | Simple pattern list (15-20 major bots) | Googlebot/Bingbot cover 95%+ of crawler traffic; exhaustive lists are maintenance burden |
| Email A/B testing | Custom split/send logic | Brevo native A/B (abTesting=true) | Brevo handles split, tracking, winner selection for email; only need API call |
| Statistical test | scipy or custom CDF | Inline z-test with math.erf | Two-proportion z-test is 15 lines of Python with math.erf for the normal CDF |

## Common Pitfalls

### Pitfall 1: Cloudflare Stripping Set-Cookie on Cached Responses
**What goes wrong:** If Cloudflare caches an SSR response, it strips Set-Cookie headers, so new visitors never get their ab_id cookie.
**Why it happens:** Cloudflare default behavior removes Set-Cookie from cacheable responses.
**How to avoid:** The site runs SSR (output: 'server') with no explicit cache-control headers on HTML. Cloudflare does NOT cache dynamic HTML by default (no file extension match). Verify after deploy: `curl -I https://bbq-experience.com/en/blog/some-slug/ | grep cf-cache-status` should show `DYNAMIC` or `BYPASS`, never `HIT`.
**Warning signs:** cf-cache-status: HIT on blog post URLs.

### Pitfall 2: Variant Flicker / CLS on Client
**What goes wrong:** If variant assignment happens client-side, user sees original title then it swaps to variant -- causes CLS penalty.
**Why it happens:** Client-side JS runs after initial render.
**How to avoid:** Variant is resolved in Astro middleware/page frontmatter (server-side). The `<h1>` is rendered with the variant text on first paint. Zero client-side manipulation of headline text.
**Warning signs:** Any JS code that modifies `<h1>` text content.

### Pitfall 3: SEO Cloaking Signal
**What goes wrong:** Google crawls the page, sees headline A. Next crawl sees headline B. Google flags as cloaking.
**Why it happens:** Bot UA is not consistently mapped to control variant.
**How to avoid:** AB-05 requirement -- all bot UAs ALWAYS get the control variant (original blog post title). The `isBot()` check runs in middleware BEFORE variant assignment.
**Warning signs:** Search Console showing different titles for same URL across crawls.

### Pitfall 4: Strapi Webhook Rebuild Storm
**What goes wrong:** Every edit to ab-experiment triggers a full Astro rebuild (4+ minutes).
**Why it happens:** Current Strapi webhook fires on ALL entry.publish/unpublish/delete events.
**How to avoid:** AB-06 -- add `not` rule to adnanh/webhook config to exclude `model: ab-experiment` from rebuild trigger.
**Warning signs:** Rebuild logs showing frequent rebuilds after ab-experiment edits.

### Pitfall 5: Insufficient Sample Size Leading to False Positives
**What goes wrong:** Agent declares a winner with 100 impressions, result is noise.
**Why it happens:** Small sample z-test has high false positive rate.
**How to avoid:** Hard-coded thresholds: >=500 impressions per variant AND >=7 days runtime. Agent reports recommendation only; Matteo confirms manually via Telegram.
**Warning signs:** Winner declared in <7 days or with <500 impressions per variant.

### Pitfall 6: ab_id Cookie Not Readable by Umami Tracker
**What goes wrong:** Umami tracking script can't include ab_id in custom events because cookie is httpOnly.
**Why it happens:** httpOnly cookies are not accessible from JavaScript.
**How to avoid:** Set `httpOnly: false` on the ab_id cookie. This is safe -- the cookie contains only a random ID, no sensitive data.
**Warning signs:** Umami events missing the ab_id or variant data.

## Code Examples

### Two-Proportion Z-Test (Pure Python)
```python
# Nessuna dipendenza esterna — usa solo math dalla stdlib
import math

def two_proportion_ztest(
    successes_a: int, trials_a: int,
    successes_b: int, trials_b: int,
) -> tuple[float, float]:
    """Calcola z-statistic e p-value per test a due proporzioni.

    Returns: (z_stat, p_value) — p_value bilaterale.
    """
    p_a = successes_a / trials_a
    p_b = successes_b / trials_b
    p_pool = (successes_a + successes_b) / (trials_a + trials_b)

    se = math.sqrt(p_pool * (1 - p_pool) * (1 / trials_a + 1 / trials_b))
    if se == 0:
        return 0.0, 1.0

    z = (p_a - p_b) / se
    # p-value bilaterale via funzione errore complementare
    p_value = math.erfc(abs(z) / math.sqrt(2))
    return z, p_value
```
[VERIFIED: math.erfc is available in Python 3.12 stdlib — docs.python.org/3/library/math.html]

### Umami Event Data Retrieval (Python Agent)
```python
# Estensione di umami_client.py
def get_event_data(
    event_name: str,
    start_ms: int,
    end_ms: int,
) -> list[dict]:
    """Recupera dati eventi custom da Umami per un evento specifico."""
    url = (
        f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/event-data/fields"
        f"?startAt={start_ms}&endAt={end_ms}"
        f"&eventName={event_name}"
    )
    result = _request(url)
    return result if isinstance(result, list) else []
```
[VERIFIED: Umami API endpoint /api/websites/:id/event-data/fields exists — docs.umami.is/docs/api/events]

### Astro Locals Type Extension
```typescript
// web/src/env.d.ts — estendere App.Locals
declare namespace App {
  interface Locals {
    isPreview: boolean;
    abId: string;
    isBot: boolean;
  }
}
```
[VERIFIED: Astro App.Locals pattern — docs.astro.build/en/guides/middleware/]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side A/B (Google Optimize) | Server-side variant in SSR middleware | Google Optimize shut down 2023 | No CLS, no flicker, SEO-safe |
| Separate A/B service (Optimizely/VWO) | Self-hosted via CMS + analytics | N/A | Zero cost, full control, no 3rd party JS |
| scipy for statistical tests | math.erfc in stdlib | Always available | No heavy dependency for a single formula |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FNV-1a hash provides sufficiently uniform distribution for A/B variant assignment | Architecture Patterns (Pattern 2) | Slight imbalance in variant distribution; mitigated by sample size requirement of 500+ per variant |
| A2 | Umami's `/api/websites/:id/event-data/fields` endpoint returns data filterable by eventName query param | Code Examples | Would need alternative endpoint; may require iterating all events and filtering client-side |
| A3 | Strapi webhook payload `model` field contains the API singularName (e.g., "ab-experiment") not the displayName | Architecture Patterns (Pattern 5) | Webhook exclusion rule won't match; would need to test actual payload and adjust value |
| A4 | Cloudflare does not cache SSR HTML responses for bbq-experience.com | Pitfall 1 | If Cloudflare caches, Set-Cookie would be stripped; verify with curl after deploy |

## Open Questions (RESOLVED)

1. **Strapi webhook `model` field exact value** (RESOLVED)
   - What we know: Strapi docs say payload includes `model` field with content type name
   - What was unclear: Whether value is `ab-experiment` (singularName) or `ab_experiment` (collectionName) or `AB Experiment` (displayName)
   - Resolution: Plan 16-03 Task 2 plans around this ambiguity — the executor reads the current hooks.json before editing, and the action includes an explicit note that the `model` value must be verified against the actual Strapi webhook payload at deploy time. A verification step after restarting the webhook confirms `ab-experiment` matches by checking the rebuild log after editing a test ab-experiment entry. Assumption A3 stands; executor adjusts if the value differs.

2. **Umami event data API filtering capabilities** (RESOLVED)
   - What we know: Endpoints exist at /api/websites/:id/event-data/fields and /event-data/events
   - What was unclear: Exact query parameters for filtering by custom property values (e.g., filter events where experiment=X)
   - Resolution: Plan 16-03 Task 1 implements the primary path (`?eventName=ab-impression`) and the fallback explicitly: if the response is not a filterable list, `get_experiment_stats()` fetches all ab-impression events and filters by `experiment` property in Python. No blocking dependency.

3. **Brevo campaign stats retrieval for winner detection** (RESOLVED)
   - What we know: Brevo creates A/B campaigns with automatic winner selection after winnerDelay hours
   - What was unclear: Exact API endpoint to retrieve which subject won after the test period
   - Resolution: Plan 16-03 Task 1 uses `GET /v3/emailCampaigns/{campaignId}` as primary. Brevo_client handles the "stats unavailable" case (campaign still in test period, or abTesting key absent from response) by returning `None` from `get_ab_campaign_results()`. The agent digest section gracefully omits winner data for those campaigns with a note "pending winner selection".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | Astro 6 middleware | Yes | 22 LTS | -- |
| Python 3.12 | ab_tester.py agent | Yes | 3.12.3 | -- |
| nanoid (npm) | ab_id cookie gen | No (transitive only) | 5.1.9 available | crypto.randomUUID() as fallback |
| scipy | z-test | No | -- | math.erfc (stdlib) -- USE THIS |
| Umami | Event tracking | Yes | Self-hosted | -- |
| Brevo API | Newsletter A/B | Yes | v3 | -- |
| adnanh/webhook | Rebuild exclusion | Yes | Running on Hetzner | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- nanoid: Not a direct dependency yet; install via npm. Fallback: crypto.randomUUID()
- scipy: Not installed; USE math.erfc instead (no install needed)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already configured in web/) |
| Config file | web/vitest.config.ts |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AB-01 | ab-experiment schema valid, relation to blog-post | manual (Strapi admin) | N/A | N/A |
| AB-02 | Variant assignment deterministic, cookie set | unit | `cd web && npx vitest run src/lib/ab.test.ts -t "assignVariant"` | Wave 0 |
| AB-02 | Cookie persistence across requests | smoke | `curl -c - https://bbq-experience.com/en/blog/test-post/` | N/A |
| AB-03 | Umami events emitted with correct data | manual (Umami dashboard) | N/A | N/A |
| AB-04 | z-test computes correctly | unit | `python3 -m pytest scripts/agents/tests/test_ab_tester.py -x` | Wave 0 |
| AB-05 | Bot UA gets control variant | unit | `cd web && npx vitest run src/lib/ab.test.ts -t "isBot"` | Wave 0 |
| AB-06 | ab-experiment webhook excluded | smoke | SSH test: create ab-experiment, verify no rebuild log entry | N/A |
| AB-07 | Brevo A/B campaign created | integration | `python3 scripts/agents/ab_tester.py --dry-run` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run src/lib/ab.test.ts`
- **Per wave merge:** `cd web && npx vitest run` + `python3 -m pytest scripts/agents/tests/ -x`
- **Phase gate:** Full suite green + manual smoke test on production

### Wave 0 Gaps
- [ ] `web/src/lib/ab.test.ts` -- covers AB-02 (assignVariant determinism, distribution) and AB-05 (isBot detection)
- [ ] `scripts/agents/tests/test_ab_tester.py` -- covers AB-04 (z-test math, threshold enforcement)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | Partially | ab_id cookie is not a session token; no auth data. SameSite=Lax + Secure flags sufficient |
| V4 Access Control | No | -- |
| V5 Input Validation | Yes | Validate ab-experiment data from Strapi API before rendering; sanitize variant text (no raw HTML in h1) |
| V6 Cryptography | No | ab_id is a random identifier, not a secret |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie tampering (user changes ab_id to manipulate variant) | Tampering | Acceptable risk -- ab_id only affects headline shown, no privilege impact. Hash is server-side. |
| XSS via variant text in h1 | Tampering | Astro auto-escapes template expressions in .astro files; never use `set:html` for variant text |
| Bot gaming impressions | Spoofing | UA pattern check + Umami's built-in bot filtering; thresholds (500+ impressions) dilute noise |
| Webhook secret exposure | Information Disclosure | Secret already in hooks.json on server; no change needed |

## Sources

### Primary (HIGH confidence)
- adnanh/webhook Hook-Rules.md -- `not` operator, payload matching, nested field access [github.com/adnanh/webhook/blob/master/docs/Hook-Rules.md]
- Strapi v5 Webhooks docs -- payload structure with `event`, `model`, `entry` fields [docs.strapi.io/cms/backend-customization/webhooks]
- Umami Track Events -- umami.track() API, data attributes [docs.umami.is/docs/track-events]
- Umami Tracker Functions -- umami.track(name, data) signature, event data constraints [docs.umami.is/docs/tracker-functions]
- Umami Events API -- /api/websites/:id/event-data/* endpoints [docs.umami.is/docs/api/events]
- Brevo Create Email Campaign API -- abTesting, subjectA/B, splitRule, winnerCriteria, winnerDelay [developers.brevo.com/reference/create-email-campaign]
- Astro Middleware docs -- context.cookies.set() in SSR [docs.astro.build/en/guides/middleware/]
- Cloudflare Cache Behavior -- Set-Cookie handling, dynamic response bypass [developers.cloudflare.com/cache/concepts/cache-behavior/]

### Secondary (MEDIUM confidence)
- Strapi community forum -- no native content-type webhook filtering [forum.strapi.io/t/how-to-create-webhook-only-for-a-specific-content-type/30969]
- Hetzner server direct inspection -- Strapi webhooks table, hooks.json, deploy scripts [SSH verified 2026-04-21]
- nanoid npm registry -- version 5.1.9 [VERIFIED: npm view nanoid version]

### Tertiary (LOW confidence)
- Umami event-data API query parameters (A2 in assumptions) -- exact filtering behavior needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already in project, only nanoid is new
- Architecture: HIGH -- patterns verified against actual codebase, webhook config, and Strapi DB
- Pitfalls: HIGH -- verified Cloudflare behavior, Astro SSR cookie handling, webhook payload structure
- Brevo A/B: MEDIUM -- API params verified but end-to-end flow needs testing
- Umami event retrieval: MEDIUM -- endpoints documented but exact filtering capabilities assumed

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- all tools are established, no breaking changes expected)
