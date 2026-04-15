# Architecture Research — v1.1 Content Depth & Growth Loop

**Domain:** Editorial content portal (integrating 5 new feature clusters into a live Astro 6 SSR + Strapi 5 + Python Growth Engine stack)
**Researched:** 2026-04-15
**Confidence:** HIGH (built from direct inspection of production codebase, not hypothetical)

> This document architects how v1.1 features slot into the existing live architecture at bbq-experience.com. All recommendations reuse established patterns (SQLite rate-limit, Brevo wiring, Strapi v5 locale PUT, retry wrappers, atomic writes). No greenfield decisions.

---

## System Overview (v1.1 deltas only)

```
+------------------------------------------------------------------------+
|                           EDGE / DELIVERY                              |
|  Cloudflare CDN  ->  Caddy  ->  Astro SSR (:4321)                      |
|                                  |                                     |
|                                  +-- [NEW] middleware.ts               |
|                                  |       A/B variant cookie assignment |
|                                  |                                     |
|                                  +-- /api/newsletter   (EXISTS, extend)|
|                                  +-- /api/brevo-webhook (EXISTS)       |
|                                  +-- [NEW] /api/ab/track               |
|                                  +-- [NEW] /api/reviews-manifest.json  |
|                                           (optional facet cache)       |
+------------------------------------------------------------------------+
|                         SVELTE 5 ISLANDS (client)                      |
|  Existing: BookmarkButton.svelte  ThemeToggle.svelte  SearchDialog     |
|  [NEW] NewsletterInlineForm.svelte   (replaces inline <script>)        |
|  [NEW] NewsletterExitIntent.svelte   (mousemove/visibilitychange)      |
|  [NEW] NewsletterStickyBar.svelte    (scroll-threshold reveal)         |
|  [NEW] ReviewFilters.svelte          (URL-sync'd facets)               |
|  [NEW] AbTracker.svelte              (emits umami.track impressions)   |
+------------------------------------------------------------------------+
|                         STRAPI 5 (:1337) - CMS                         |
|  Existing: review . product . recipe . blog-post . tutorial .          |
|            subscriber . brand . content-queue . ...                    |
|                                                                        |
|  [NEW] product-category   (collectionType, i18n)                       |
|  [NEW] collection         (collectionType, i18n - recipe groupings)    |
|  [NEW] headline-variant   (collectionType, non-i18n - A/B defs)        |
|  [NEW] variant-impression (collectionType - aggregated analytics)      |
|                                                                        |
|  EXTENDED: product.product_category (relation mTo)                     |
|            review.price_range (enum, cached from product for filter)   |
|            review/blog-post/recipe/tutorial.traffic_score              |
|            review/blog-post/recipe/tutorial.traffic_score_updated      |
|            subscriber.source (enum inline|exit_intent|landing|sticky)  |
+------------------------------------------------------------------------+
|                    POSTGRES 16  (shared instance "postgres")           |
+------------------------------------------------------------------------+
|                GROWTH ENGINE (Python) - Hetzner cron                   |
|  Existing: seo_optimizer.py  keyword_scout.py  competitor_monitor.py   |
|            partnership_outreach.py  content_generator.py  ...          |
|                                                                        |
|  [NEW] umami_feedback.py   (pulls Umami API -> writes traffic_score)   |
|  [NEW] ab_tester.py        (reads variant-impression -> picks winner)  |
|  [NEW] lib/umami_client.py (reusable, same retry pattern as strapi)    |
+------------------------------------------------------------------------+
|                       ANALYTICS (separate stack)                       |
|  Umami self-hosted (:3000) + umami-pg - already live                   |
|  Custom events: newsletter-signup (exists + source property),          |
|                 ab-impression (NEW), ab-click (NEW),                   |
|                 filter-applied (NEW), exit-intent-shown (NEW)          |
+------------------------------------------------------------------------+
```

---

## Integration Map — What Each Feature Touches

### Feature 1 — Newsletter Signup (4 surfaces)

**Good news:** `/api/newsletter` endpoint, `subscriber` content type, Brevo wiring, HMAC webhook, and SQLite rate-limit are ALL already shipped in v1.0. The work is **surface expansion + double-opt-in hardening**, not plumbing.

| Surface | Mount location | Implementation |
|---------|---------------|----------------|
| Inline end-of-article | `ContentLayout.astro` slot after article body (blog/recipe/review/tutorial) | Reuse `NewsletterSignup.astro` full variant |
| Exit-intent modal | `BaseLayout.astro` body root (same pattern as `MobileMenuPanel` — avoids the backdrop-filter containing-block bug noted in CLAUDE.md) | **NEW** `NewsletterExitIntent.svelte` — listens to `mouseleave` (desktop) + `visibilitychange` (mobile fallback); `sessionStorage` key prevents re-trigger in same session; cookie `bbq-nl-seen` blocks for 30 days |
| Dedicated `/[locale]/newsletter/` page | NEW route per locale (3 files) | Full-page hero + social proof + signup form; added to `localizedRoutes` in `i18n.ts` |
| Sticky footer bar | `BaseLayout.astro` body root | **NEW** `NewsletterStickyBar.svelte` — reveals after 50% scroll, dismissible with cookie persist |

**CSRF/Rate-limit:** Extend existing `/api/newsletter` to accept a `source` field (`"inline" | "exit_intent" | "landing" | "sticky"`). Keep the existing 5/min rate limit. No CSRF token — the endpoint is idempotent and creates only `pending` state; Brevo double-opt-in is the security boundary.

**Double opt-in — who sends the email:** **Brevo sends it**, not our code. In Brevo dashboard -> List settings -> "Enable double opt-in" -> Brevo serves the confirmation page + link. Our code only POSTs `/v3/contacts` (already done). The `contact_updated` webhook (already wired in `/api/brevo-webhook.ts`) fires when the user clicks confirm and flips Strapi `status: pending -> active`. **Zero custom email code needed.**

**Form state on static pages:** The existing `NewsletterSignup.astro` uses a vanilla `<script>` which works for one surface but duplicates logic across 4. Promote the shared state (already-subscribed check, submit, success) into a single Svelte 5 island `NewsletterInlineForm.svelte` (runes: `$state`, `$derived`) so all 4 surfaces import the same component. Hydration: `client:visible` for inline/landing, `client:idle` for exit-intent + sticky.

**Modified files:**
- `web/src/components/common/NewsletterSignup.astro` — thin wrapper around the new Svelte island
- `web/src/pages/api/newsletter.ts` — add `source` field to Strapi payload

**New files:**
- `web/src/islands/NewsletterInlineForm.svelte`
- `web/src/islands/NewsletterExitIntent.svelte`
- `web/src/islands/NewsletterStickyBar.svelte`
- `web/src/pages/en/newsletter.astro`, `…/it/newsletter.astro`, `…/es/newsletter.astro`
- `cms/src/api/subscriber/content-types/subscriber/schema.json` — add `source` enum field

**Env vars:** None new. `BREVO_API_KEY` + `BREVO_LIST_ID` + `BREVO_WEBHOOK_SECRET` all already set.

---

### Feature 2 — Review Filters + Product Category Taxonomy

**Current state:** `reviews/index.astro` is **already SSR** (`prerender = false`) with `?category=X&sort=Y&page=N` query-driven filtering via Strapi `filters[product][category][$eq]`. Categories are a hard-coded enum on `product.category`.

**Architectural decision — DO NOT switch to a full build-time manifest + pure client-side filter.** Reasons:
1. Filter UX is already URL-synced (shareable, SEO-friendly, cacheable at Cloudflare per-query-string)
2. Review collection is ~25 items — SSR fetch is <100ms at origin
3. Build-time manifest forces a rebuild on every review publish (webhook latency 30-90s) and breaks preview mode
4. SSR keeps the page crawlable without JS

**What changes:**
- **Enum -> relation.** Current `product.category` is a fixed enum. Replace with `product_category` relation to a new collection type -> lets Matteo add sub-categories (pellet_grill, kamado, offset_smoker) without schema migration. Seed the new type with the 6 existing enum values for clean migration.
- **New filter dimensions:** brand, price_range, score_threshold. Price range + score are already on data; brand is already a relation. Work is only UI exposure.
- **Hybrid state model:** SSR default list + `ReviewFilters.svelte` island that owns interactive filter state, syncs to URL via `history.pushState` (instant visual feedback), then triggers a debounced full navigation to the same URL. **Recommendation: full navigation** — Strapi stays single source of truth, no duplicate rendering logic, native Back/Forward, zero new endpoint.
- **Facet counts (optional polish):** Ship small SSR helper `getReviewFacets(locale)` that fetches all published reviews with minimal fields (`fields=product.category,product.brand_relation,product.price_range,score_overall`, <10KB payload) and computes counts. In-memory cache for 5 min on the SSR process.

**Modified files:**
- `cms/src/api/product/content-types/product/schema.json` — swap `category` enum for `product_category` relation; keep enum as deprecated alias for 1 release for safety
- `web/src/pages/en/reviews/index.astro`, `…/it/recensioni/index.astro`, `…/es/resenas/index.astro` — add brand/price/score filter params, pass to `fetchCollection`
- `web/src/lib/strapi.ts` — extend filter types
- `cms/src/api/review/content-types/review/schema.json` — optional: denormalize `price_range` onto review for faster filters (avoid nested populate)

**New files:**
- `cms/src/api/product-category/content-types/product-category/schema.json` (i18n=true; fields: name, slug, description, icon_name, parent relation)
- `web/src/islands/ReviewFilters.svelte`
- `web/src/lib/review-facets.ts`
- Migration script `cms/scripts/migrate-product-category.ts` -> creates 6 default categories + reassigns all products

---

### Feature 3 — Recipe Collections

**New Strapi content type `collection`** (collectionType, i18n=true):

```json
{
  "title":           "string (i18n, required)",
  "slug":            "uid (targetField: title)",
  "description":     "text (i18n)",
  "editorial_intro": "richtext (i18n)",
  "hero_image":      "media (single, images)",
  "cover_image":     "media (single, images)",
  "recipes":         "relation manyToMany -> api::recipe.recipe",
  "recipe_order":    "json  (array of recipe documentIds for display order)",
  "featured":        "boolean (default false)",
  "seo_title":       "string (i18n)",
  "seo_description": "text (i18n)",
  "published_date":  "date"
}
```

**Why `recipe_order` as json instead of Strapi relation order:** Strapi manyToMany doesn't preserve ordering reliably across locales and re-saves. A `json` array of documentIds is the idiomatic v5 workaround — authored once, consumed in Astro as an index into the populated recipes array.

**i18n model:** Collection title/description/SEO are localized (title "Labor Day Grill Menu" -> IT "Menu BBQ di Ferragosto"). **Recipe relations are shared across locales** — Strapi i18n v5.40 mirrors relations into localized entries automatically, so IT collection auto-shows IT versions of the same recipes. Do NOT duplicate the recipe list manually per locale.

**Routing — new localized segments:**

| Locale | Index | Detail |
|--------|-------|--------|
| EN | `/en/collections/` | `/en/collections/[slug]/` |
| IT | `/it/raccolte/` | `/it/raccolte/[slug]/` |
| ES | `/es/colecciones/` | `/es/colecciones/[slug]/` |

Add to `web/src/lib/i18n.ts` -> `localizedRoutes.collections = { en: 'collections', it: 'raccolte', es: 'colecciones' }`. Add to `seo_optimizer.py` -> `ROUTE_BY_LOCALE['collections']` + `CONTENT_FIELD['collections'] = 'editorial_intro'` so internal linking agent picks them up.

**Build-time vs SSR:** Collections edited rarely (weekly cadence). `prerender = true` (static). Strapi publish webhook already rebuilds Astro — latency acceptable.

**Affect existing recipe pages:** Yes — add a **"Part of X collection(s)"** block on `recipes/[slug].astro` via reverse query `filters[recipes][documentId][$eq]=<recipe-id>`. New component `CollectionBadges.astro`. Populate at build time alongside the existing recipe fetch (one extra query per recipe).

**Modified files:**
- `web/src/lib/i18n.ts` — add `localizedRoutes.collections`
- `web/src/lib/types.ts` — `StrapiCollection` type
- `web/src/pages/*/recipes/[slug].astro` (3 locales) — add `CollectionBadges` block
- `scripts/agents/seo_optimizer.py` — add `collections` to ROUTE_BY_LOCALE and CONTENT_FIELD

**New files:**
- `cms/src/api/collection/…/schema.json` + controllers/services (Strapi CLI scaffold)
- `web/src/pages/en/collections/index.astro`, `/[slug].astro`
- `web/src/pages/it/raccolte/index.astro`, `/[slug].astro`
- `web/src/pages/es/colecciones/index.astro`, `/[slug].astro`
- `web/src/components/content/CollectionBadges.astro`
- `web/src/components/content/CollectionCard.astro`
- `web/src/components/content/CollectionHero.astro`
- `web/src/components/content/CollectionJsonLd.astro` (Schema.org `CollectionPage` — reuses existing `CollectionPageSchema.astro` pattern)

---

### Feature 4 — Umami -> Agents Feedback Loop

**Where Python runs:** Hetzner cron (existing infra). Append to `/opt/webhooks/scripts/crontab` alongside `seo_optimizer`. Umami API lives on the same machine (`analytics.bbq-experience.com` -> `umami:3000` container). Internal Docker network call avoids public round-trip.

**Umami REST API (self-hosted v2):**

```
POST /api/auth/login            -> { token }
GET  /api/websites/:id/pageviews?startAt=X&endAt=Y&unit=day
GET  /api/websites/:id/metrics?startAt=X&endAt=Y&type=url
GET  /api/websites/:id/events?startAt=X&endAt=Y          (custom events)
```

**Data flow (new cron `umami_feedback.py`, daily 04:00 UTC):**

```
1. umami_client.login() -> Bearer token (cache 23h in /tmp/umami-token.json)
2. GET /api/websites/<id>/metrics?type=url&startAt=-7d
   -> [{ x: "/en/reviews/weber-genesis-ii/", y: 482 }, ...]
3. Parse URL -> (locale, content_type, slug)
4. For each published content item in Strapi:
   - Compute traffic_score =
        (pageviews_last_7d * 0.6)
      + (avg_session_duration * 0.2)
      + (ab_click_rate * 0.2)     # from variant-impression aggregate
   - Normalize per-content-type (reviews outrank blog posts naturally;
     percentile WITHIN type, not absolute)
5. PUT /api/<type>/<documentId>?locale=<locale>
   { data: { traffic_score, traffic_score_updated: now, traffic_pageviews_7d } }
6. Atomic state write: /opt/state/umami-feedback-state.json (os.replace)
7. Telegram summary: top 5 gainers / top 5 losers
```

**Decisions driven by `traffic_score`:**
- `keyword_scout.py` — prioritize keywords correlating with high-scoring content
- `content_generator.py` — use top-scoring reviews/recipes as structural templates
- `content_promoter.py` (IG) — promote high-scoring items to IG (virtuous loop)
- `claude_strategist.py` — weekly roll-up includes traffic gainers/losers

**New Strapi fields** (applied to blog-post, review, recipe, tutorial):
- `traffic_score` decimal (0-100, percentile-normalized)
- `traffic_score_updated` datetime
- `traffic_pageviews_7d` integer (raw, for debugging)

**Honor existing conventions:**
- `umami_client.py` mirrors `strapi_client.py` retry pattern (3 attempts, backoff 1/2/4s, skip 4xx, respect 10s timeout)
- Atomic writes for state JSON via `os.replace()` (CLAUDE.md rule: avoids cron concurrency corruption)
- Telegram alert on failure via existing `lib/telegram.py`

**New files:**
- `scripts/agents/umami_feedback.py`
- `scripts/agents/lib/umami_client.py`
- `scripts/agents/run-umami-feedback.sh`
- Strapi migration: add 3 fields to 4 content types

**Env vars:**
- `UMAMI_URL=http://umami:3000` (server-internal) with `https://analytics.bbq-experience.com` fallback
- `UMAMI_USERNAME`, `UMAMI_PASSWORD` (read-only service account in Umami admin; rotate quarterly)
- `UMAMI_WEBSITE_ID=<uuid>` (from Umami dashboard)

Must be present as **both** Dockerfile ARG and `docker run -e` per CLAUDE.md convention.

---

### Feature 5 — A/B Headline Testing

**Design decision: edge assignment + client tracking.** Variant picker runs in **Astro middleware** (not client JS, not build-time) because:
- Cookie-based visitor stickiness (same visitor always sees same variant)
- Works for crawlers consistently (user-agent hash fallback = no cloaking flag)
- Zero CLS / no flash-of-default-headline (variant chosen before render)
- SSR infra already exists for reviews/recipes/tutorials; extending to blog-post is a `prerender = false` flip on A/B-enabled posts only (trade: lose static caching on those — acceptable, "hero" articles rare)

**Astro middleware** (`web/src/middleware.ts` — new):

```ts
// Pseudocode
export const onRequest = async (context, next) => {
  const url = new URL(context.request.url);
  if (!needsVariantAssignment(url.pathname)) return next();

  const cookie = context.cookies.get('bbq-ab');
  let bucket = cookie?.value;
  if (!bucket) {
    bucket = crypto.randomUUID().slice(0, 8);
    context.cookies.set('bbq-ab', bucket, {
      maxAge: 60*60*24*90, path: '/', sameSite: 'lax', httpOnly: false,
    });
  }
  context.locals.abBucket = bucket;
  return next();
};
```

**Storage model in Strapi:**

```
headline-variant (collectionType, non-i18n)
  .- id, documentId
  .- content_type: enum ["blog-post","review","recipe","newsletter"]
  .- content_document_id: string   (loose fk - covers 4 types without relation per type)
  .- locale: enum ["en","it","es"]
  .- variant_key: string           ("A","B","C")
  .- headline: string              (actual text shown)
  .- active: boolean
  .- is_winner: boolean (default false - admin toggle declares winner)

variant-impression (collectionType, non-i18n, daily aggregate)
  .- variant: relation manyToOne -> headline-variant
  .- date: date                    (daily bucket)
  .- impressions: integer
  .- clicks: integer
```

**Why NOT put `headline_variants: string[]` directly on blog-post:** Stats table needs a separate entity; relation lets `ab_tester.py` aggregate without polluting content type admin UI.

**Variant assignment** (in page frontmatter for review/recipe/blog-post):

```ts
const variants = await fetchVariants(page.documentId, locale);
const variant = variants.length > 1
  ? pickVariant(variants, Astro.locals.abBucket)
  : null;
const displayHeadline = variant?.headline ?? page.title;
// emit data-variant-id on <h1> for tracker pickup
```

**Click tracking — Umami custom events:**

```js
// Hydrated via AbTracker.svelte:
umami.track('ab-impression', { variant_id, content_type, bucket });
// On any click of card/link with [data-variant-tracked]:
umami.track('ab-click',     { variant_id, content_type, bucket });
```

**Winner declaration — agent-driven, admin-confirmed:**
- `ab_tester.py` (weekly, Sunday 06:00 Hetzner cron) reads `variant-impression`, computes CTR, applies Bayesian A/B significance (>95% posterior) -> writes a Telegram recommendation
- Matteo toggles `is_winner` in Strapi admin -> other variants `active=false` -> only winner rendered next
- **No auto-promotion** — single author + editorial site = human-in-the-loop preferred

**Consistency per visitor:** Guaranteed by cookie bucket (90-day maxAge). Bucket -> variant mapping = deterministic hash `(bucket + content_document_id) % variant_count`. Same bucket always gets same variant per content, independently across content items.

**New files:**
- `web/src/middleware.ts`
- `web/src/lib/ab.ts` (pickVariant, hashBucket, fetchVariants)
- `web/src/islands/AbTracker.svelte` (emits umami.track on mount + link-click capture)
- `web/src/pages/api/ab/track.ts` (fallback endpoint if Umami script blocked)
- `cms/src/api/headline-variant/…`
- `cms/src/api/variant-impression/…`
- `scripts/agents/ab_tester.py`
- Umami dashboard: add 2 custom events (`ab-impression`, `ab-click`)

**Env vars:**
- `AB_TEST_ENABLED=true` (kill-switch; Dockerfile ARG + docker run -e)
- `AB_MIN_IMPRESSIONS=500` (minimum before winner declaration)

---

## End-to-End Data Flow Diagrams

### Flow 1 — Newsletter signup (exit-intent modal)

```
1. User lands on /en/reviews/weber-genesis/
2. After 30s inactivity OR mouseleave top-of-viewport:
   NewsletterExitIntent.svelte shows modal
3. sessionStorage check blocks re-trigger in same session
4. User submits email
5. POST /api/newsletter { email, locale:'en', source:'exit_intent' }
   .- checkRateLimit(ip, 'newsletter', 5)                [SQLite]
   .- Strapi POST /api/subscribers {status:'pending'}    [10s timeout]
   .- Brevo POST /v3/contacts {listIds, updateEnabled}   [10s timeout]
       .- Brevo queues double-opt-in email (native)
6. 200 OK -> modal shows success, cookie bbq-nl-seen set (30d)
7. User clicks confirm link in Brevo email
8. Brevo POST webhook -> /api/brevo-webhook (HMAC validated)
   .- Strapi PUT /api/subscribers/{documentId} {status:'active'}
9. umami.track('newsletter-signup', { source: 'exit_intent' })
```

### Flow 2 — Review filter applied

```
1. User on /en/reviews/ (SSR, 12 reviews rendered)
2. User clicks brand=Weber in ReviewFilters.svelte island
3. Svelte updates URL: /en/reviews/?brand=weber&page=1 via history.pushState
   (instant visual feedback, no nav yet)
4. [debounced 200ms] island sets location.href = newUrl (full nav)
5. Astro SSR re-runs reviews/index.astro frontmatter
   .- fetchCollection('reviews', { filters: { product: {
         brand_relation: { slug: { $eq: 'weber' } } }}, populate: '*' })
   .- Strapi responds ~80ms
6. Page re-renders with filtered list
7. umami.track('filter-applied', { filters: { brand: 'weber' }})
```

### Flow 3 — Umami feedback -> content decision

```
Daily 04:00 UTC on Hetzner:
1. umami_feedback.py starts
2. umami_client.login() -> token (cached 23h)
3. GET /api/websites/<id>/metrics?type=url&startAt=-7d
4. Parse 1000+ URL rows into (locale, type, slug, pageviews)
5. For each Strapi content item:
   .- Lookup pageviews by matching URL
   .- Lookup ab_click_rate from variant-impression aggregate
   .- Compute percentile-normalized traffic_score
   .- PUT /api/<type>/<documentId>?locale=<locale>
       { data: { traffic_score, traffic_score_updated, traffic_pageviews_7d } }
6. os.replace() atomic state write
7. Telegram: "Top gainer: 'Weber Genesis review' +180% this week"

Monday 05:00 UTC:
8. keyword_scout.py reads content_queue; boosts priority of items
   whose same-category peers have traffic_score > 70 percentile
```

### Flow 4 — A/B headline display + tracking

```
1. Request: GET /en/blog/best-pellet-grills-2026/
2. Astro middleware runs:
   .- URL matches /[locale]/(blog|reviews|recipes)/[slug]/ -> needs variant
   .- Read cookie bbq-ab -> bucket='a3f7b218' (existing visitor)
   .- context.locals.abBucket = bucket
3. Page frontmatter:
   .- fetchVariants(documentId, 'en')
   .-   -> [{A:"Best Pellet Grills 2026"}, {B:"The 7 Pellet Grills Worth It"}]
   .- idx = hash('a3f7b218' + documentId) % 2 = 1
   .- displayHeadline = variants[1].headline
4. Render <h1 data-variant-id="<doc-id>">{displayHeadline}</h1>
5. AbTracker.svelte hydrates (client:idle):
   .- umami.track('ab-impression', { variant_id, bucket, content_type })
6. User clicks internal link with [data-variant-tracked]:
   .- umami.track('ab-click', { variant_id, bucket, content_type })

Sunday 06:00 UTC:
7. ab_tester.py queries variant-impression, computes CTR + Bayesian posterior,
   alerts Telegram on >95% significance winners
8. Matteo toggles is_winner=true in Strapi
9. Next request -> only winning variant returned by fetchVariants
```

### Flow 5 — Recipe collection page build

```
At Strapi publish of collection "labor-day-menu":
1. Strapi webhook -> Hetzner webhook listener -> rebuild-web.sh
2. npm run build:
   .- All 3 locales' /collections/ and /collections/[slug]/ regenerated
   .- Each collection page:
      GET /api/collections/<id>?locale=en&populate[recipes][populate]=cover_image
   .- Recipes re-render with new "Part of: Labor Day Menu" badge
3. pagefind re-indexes (collections now searchable)
4. Sitemap regenerates (+3 URLs per locale)
5. Smoke test: 200 OK on /en/collections/labor-day-menu/
```

---

## Comprehensive Change Inventory

### NEW Strapi content types (4)

| Type | i18n | Reason |
|------|------|--------|
| `product-category` | YES | Replaces hard-coded enum, localized names (Griglie IT / Parrillas ES) |
| `collection` | YES | Recipe collections with localized title/description/intro |
| `headline-variant` | NO | Variant lives at (content, locale) tuple — locale is a field not i18n plugin |
| `variant-impression` | NO | Pure analytics aggregate |

### MODIFIED Strapi content types

| Type | Change |
|------|--------|
| `product` | Add `product_category` relation (manyToOne); deprecate `category` enum for 1 release |
| `review` | Add denormalized `price_range` (for fast filter); add `traffic_score`, `traffic_score_updated`, `traffic_pageviews_7d` |
| `blog-post` | Add same 3 traffic fields |
| `recipe` | Add same 3 traffic fields |
| `tutorial` | Add same 3 traffic fields |
| `subscriber` | Add `source` enum (`inline | exit_intent | landing | sticky`) |

### NEW Astro components (.astro)

- `web/src/components/content/CollectionBadges.astro`
- `web/src/components/content/CollectionCard.astro`
- `web/src/components/content/CollectionHero.astro`
- `web/src/components/content/CollectionJsonLd.astro`
- `web/src/components/review/FilterFacetCount.astro`

### NEW Svelte 5 islands (.svelte)

- `web/src/islands/NewsletterInlineForm.svelte`
- `web/src/islands/NewsletterExitIntent.svelte`
- `web/src/islands/NewsletterStickyBar.svelte`
- `web/src/islands/ReviewFilters.svelte`
- `web/src/islands/AbTracker.svelte`

(Note: project currently has no `src/islands/` directory — Svelte components live alongside Astro components today. Introducing `islands/` as a convention for new interactive Svelte components keeps the hybrid architecture explicit.)

### NEW Astro routes

- `/en/newsletter/`, `/it/newsletter/`, `/es/newsletter/`
- `/en/collections/`, `/en/collections/[slug]/`
- `/it/raccolte/`, `/it/raccolte/[slug]/`
- `/es/colecciones/`, `/es/colecciones/[slug]/`

### NEW API endpoints

- `web/src/pages/api/ab/track.ts` (fallback if Umami script blocked)

### NEW middleware

- `web/src/middleware.ts` (A/B variant cookie assignment)

### MODIFIED existing files (high-signal)

- `web/src/pages/api/newsletter.ts` — add `source` field pass-through
- `web/src/components/common/NewsletterSignup.astro` — thin wrapper around Svelte island
- `web/src/layouts/BaseLayout.astro` — mount exit-intent + sticky bar islands at body root
- `web/src/components/content/ContentLayout.astro` — inline newsletter slot after article
- `web/src/pages/{en,it,es}/{reviews,recensioni,resenas}/index.astro` — brand/price/score filters
- `web/src/pages/{en,it,es}/{recipes,ricette,recetas}/[slug].astro` — CollectionBadges block
- `web/src/lib/i18n.ts` — add `collections` localized route
- `web/src/lib/strapi.ts` — extend filter types, add `fetchCollections` helper
- `web/src/lib/types.ts` — `StrapiCollection`, `StrapiProductCategory`, `StrapiHeadlineVariant`
- `scripts/agents/seo_optimizer.py` — add `collections` to ROUTE_BY_LOCALE + CONTENT_FIELD

### NEW Python modules

- `scripts/agents/umami_feedback.py`
- `scripts/agents/ab_tester.py`
- `scripts/agents/lib/umami_client.py`
- `scripts/agents/run-umami-feedback.sh`
- `scripts/agents/run-ab-tester.sh`

### NEW env vars (all need Dockerfile ARG + docker run -e per CLAUDE.md convention)

| Name | Consumer | Purpose |
|------|----------|---------|
| `UMAMI_URL` | Python agents | Umami API base (internal Docker net preferred) |
| `UMAMI_USERNAME` | Python agents | Read-only service account |
| `UMAMI_PASSWORD` | Python agents | Rotate quarterly |
| `UMAMI_WEBSITE_ID` | Python agents | Umami website UUID |
| `AB_TEST_ENABLED` | Astro + Python | Global kill-switch |
| `AB_MIN_IMPRESSIONS` | `ab_tester.py` | Winner threshold |

### NEW cron jobs (append to existing Hetzner crontab)

```cron
# Umami feedback -> writes traffic_score to Strapi. Daily 04:00 UTC.
0 4 * * * cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/umami_feedback.py >> /opt/webhooks/logs/umami-feedback.log 2>&1

# A/B winner detector. Sundays 06:00 UTC.
0 6 * * 0 cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/ab_tester.py >> /opt/webhooks/logs/ab-tester.log 2>&1
```

### NEW Umami custom events (configure in dashboard)

- `newsletter-signup` (already exists, add `source` property)
- `ab-impression` `{ variant_id, content_type, bucket }`
- `ab-click` `{ variant_id, content_type, bucket }`
- `filter-applied` `{ category, brand, price_range, score_min }`
- `exit-intent-shown`
- `sticky-bar-dismissed`

---

## Suggested Build Order (dependency-driven)

### Phase A — Debt closure (per PROJECT.md sequencing)
Retroactive VERIFICATION.md for phases 03-09, REQUIREMENTS.md traceability reconciliation, Lighthouse 90+ re-measurement. **No v1.1 feature work until this is done.**

### Phase B — Foundation (no feature dependencies, gates C-E-G)
**B1 — Strapi schema migrations** (pure CMS, no UI impact)
- Add `product-category` content type + migration seeding 6 defaults + reassign products
- Add `collection` content type
- Add `headline-variant` + `variant-impression` content types
- Add `source` field to `subscriber`
- Add `traffic_score` + `traffic_score_updated` + `traffic_pageviews_7d` to 4 content types
- **Deploy Strapi** (restart-only, no frontend change)
- **Gate:** admin panel can create instances of each new type; migration script reassigned all products successfully

### Phase C — Newsletter multi-surface (independent)
1. Refactor `NewsletterSignup.astro` -> `NewsletterInlineForm.svelte` island (behavior-preserving extraction)
2. Add `source` field to `/api/newsletter.ts` + subscriber schema (depends on B1)
3. `NewsletterExitIntent.svelte` — mount in `BaseLayout.astro`
4. `NewsletterStickyBar.svelte` — mount in `BaseLayout.astro`
5. `/newsletter/` landing page (3 locales)
6. Configure Brevo double-opt-in in list settings; verify webhook end-to-end
- **Gate:** real signup from exit-intent modal reaches Brevo, confirmation email arrives, `brevo-webhook` flips `active`

### Phase D — Review filters (depends on B1)
1. `web/src/lib/review-facets.ts` facet aggregator + in-memory cache
2. `ReviewFilters.svelte` island with URL-sync
3. Wire into 3 reviews/index pages; extend Strapi filters with brand/price/score
- **Gate:** 4 filter dimensions work via URL; facet counts match DB truth

### Phase E — Recipe collections (depends on B1)
1. Scaffold Astro routes + types (empty state OK initially)
2. `CollectionCard`, `CollectionHero`, `CollectionJsonLd` components
3. `CollectionBadges` on recipe detail pages (reverse lookup)
4. Seed 3 demo collections in Strapi (one per locale)
5. Update sitemap generator + `seo_optimizer.py` `ROUTE_BY_LOCALE` to include collections
- **Gate:** `/en/collections/labor-day-menu/` renders; hreflang points to `/it/raccolte/…`; JSON-LD validates

### Phase F — Umami feedback loop (parallelizable with C/D/E — backend-only)
1. `lib/umami_client.py` (login + retry + 23h token cache)
2. `umami_feedback.py` dry-run mode (prints scores, no Strapi writes)
3. Enable writes; add Hetzner cron entry
4. Wire `traffic_score` consumers: `keyword_scout.py` + `content_promoter.py` + `claude_strategist.py`
- **Gate:** 7 days of consistent traffic_score updates in Strapi; no cron failures; daily Telegram summary lands

### Phase G — A/B headline testing (depends on B1, benefits from F)
1. `middleware.ts` + `lib/ab.ts` deterministic bucket assignment
2. Variant fetching + rendering in review/recipe/blog-post frontmatter
3. `AbTracker.svelte` + Umami custom events wired
4. Configure Umami dashboard: `ab-impression` / `ab-click` event definitions
5. `ab_tester.py` (stats only, Telegram alerts, no auto-promote)
6. Author 2 variants on 1 blog post + 2 reviews; observe 1 week
- **Gate:** impressions + clicks tracked per bucket; Bayesian significance computes; Matteo gets weekly recommendation

### Build order rationale

- **B1 must ship before C-E-G** — schemas are the foundation. One Strapi deploy delivers all new types (cheaper than staged deploys).
- **C (newsletter) independent** after B1 — only touches existing endpoint + new islands. Highest user-facing value per week.
- **D (filters) independent** after B1 — no overlap with newsletter surfaces.
- **E (collections) independent** after B1 — reuses i18n patterns from existing content types.
- **F (Umami) parallelizable** — separate Python codebase, no UI overlap.
- **G (A/B) last** — benefits from F's `traffic_score` for auto-prioritizing which headlines to test; also highest complexity (middleware + client tracking + stats).

**Suggested calendar:** A (debt, 2 weeks) -> B1 (1-2 days) -> C + F parallel (2 weeks) -> D + E parallel (2 weeks) -> G (1-2 weeks observation). Total ~7-9 weeks, matching the pre-July launch window.

---

## Anti-Patterns to Avoid (v1.1 specific)

### AP1 — Building a reviews build-time manifest for filters
**What people do:** Export review metadata at build time to JSON, filter entirely client-side.
**Why wrong:** Every publish invalidates manifest -> full rebuild (slow feedback). Breaks preview mode. Loses SEO-discoverable filtered URLs.
**Instead:** Keep `reviews/index.astro` SSR (already is), URL-sync'd filters, Strapi filters on query.

### AP2 — Adding in-memory Map rate-limit for newsletter surfaces
**What people do:** New surface -> new `Map` cache for rate limit.
**Why wrong:** CLAUDE.md explicit rule: "TUTTI gli endpoint devono usare questo [SQLite rate-limit], non in-memory Map". Map resets on container restart.
**Instead:** Reuse `checkRateLimit(ip, 'newsletter', 5)` — already shipped.

### AP3 — Sending confirmation email from our code
**What people do:** Write custom Astro endpoint that signs a token, emails via Brevo transactional API, verifies on click.
**Why wrong:** Brevo does this natively with list double-opt-in. Duplication = bugs + compliance risk + double-email surface.
**Instead:** Flip the switch in Brevo dashboard. Done.

### AP4 — Client-side A/B variant picker (flicker + SEO risk)
**What people do:** Render default headline, JS replaces with variant on mount.
**Why wrong:** Flash-of-default-content (Lighthouse CLS ding). Crawlers see inconsistent content across visits -> Google flags cloaking.
**Instead:** Middleware assigns variant at SSR time; cookie for stickiness; crawlers get deterministic UA-hash fallback.

### AP5 — A/B variant stats as fields on blog-post/review/recipe
**What people do:** Add `headline_A_impressions`, `headline_A_clicks`, ... to each content type.
**Why wrong:** Schema bloat, admin clutter, locks variant count to schema.
**Instead:** Separate `headline-variant` + `variant-impression` types. Admin stays clean.

### AP6 — Umami writes straight into content Postgres
**What people do:** Python agent reads Umami, writes pageview logs into Strapi's Postgres tables directly.
**Why wrong:** Bypasses Strapi audit trail, breaks content type integrity, can't populate in API responses.
**Instead:** Write `traffic_score` via Strapi REST with API token — same pattern as every existing agent (`strapi_client.py` retry wrapper).

### AP7 — Collection i18n via duplicated recipe lists per locale
**What people do:** Author IT collection with IT-only recipes, ES with ES-only, etc.
**Why wrong:** Strapi i18n v5.40 already mirrors relations into localized entries. Manual duplication = drift and maintenance burden.
**Instead:** Share recipe relation across locales; localize only title/description/SEO.

### AP8 — Exit-intent modal inside `<header>` (Chrome backdrop-filter bug)
**What people do:** Nest modal/backdrop inside `<header>` or any ancestor with `backdrop-filter`.
**Why wrong:** Documented project bug (CLAUDE.md): `backdrop-filter` creates a containing block, trapping `position:fixed` children in Chrome.
**Instead:** Mount exit-intent + sticky bar at body root in `BaseLayout.astro`, same pattern as `MobileMenuPanel.astro`.

### AP9 — Nested anchors from A/B click tracking
**What people do:** Wrap headlines in `<a>` inside cards that are already `<a>` to emit click events.
**Why wrong:** Nested anchors = invalid HTML, triggers existing sweep tool failures (`web/scripts/sweep_pages.py`).
**Instead:** Track via delegated document click listener reading `[data-variant-tracked]` closest-anchor; never wrap.

### AP10 — Strapi PUT without `?locale=` query param on localized fields
**What people do:** `PUT /api/reviews/<documentId>` to update `traffic_score`, forgetting `?locale=en`.
**Why wrong:** CLAUDE.md rule: "Strapi v5 localizzazioni — PUT con ?locale=xx nel query param". Without it, writes to default locale only and desyncs EN/IT/ES rows.
**Instead:** `umami_feedback.py` iterates `for locale in LOCALES` and appends `?locale={locale}` on every PUT (mirrors `seo_optimizer.py`).

---

## Integration Points Summary

### External services

| Service | Integration pattern | Existing/New | Gotchas |
|---------|---------------------|--------------|---------|
| Brevo REST v3 | POST `/v3/contacts` from Astro API | EXISTS — extend with `source` attribute | Enable double-opt-in in list settings (not API-controlled); webhook secret in `BREVO_WEBHOOK_SECRET` |
| Brevo webhook | POST -> `/api/brevo-webhook` (HMAC-SHA256) | EXISTS, production-ready | Fail-closed on missing secret (already implemented) |
| Umami API | `/api/auth/login` -> Bearer -> `/api/websites/:id/metrics` | **NEW** | Token cache (23h) avoids rate limits; use internal Docker net URL on Hetzner |
| Instagram Graph | Already wired | UNCHANGED in v1.1 | — |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Astro SSR <-> Strapi | REST + API token, `AbortSignal.timeout(10_000)` | **Reuse existing pattern** on all new endpoints |
| Astro middleware <-> pages | `Astro.locals.abBucket` | Set in middleware, read in frontmatter |
| Python agents <-> Strapi | `strapi_client.py` (retry + backoff + 4xx fail-fast) | Umami client uses SAME pattern |
| Svelte islands <-> Astro API | `fetch` + JSON | Same-origin, no CORS |
| Strapi <-> Postgres | Native ORM | Container name `postgres` (not `bbqexperience-postgres` per CLAUDE.md) |
| Strapi publish -> Astro rebuild | Webhook -> `adnanh/webhook` -> `rebuild-web.sh` | EXISTING, triggers on collection publish automatically |

---

## Scaling Considerations (v1.1 reality check)

| Concern | Today | v1.1 launch (+3 mo) | Mitigation |
|---------|-------|---------------------|------------|
| Newsletter signups/day | ~0 | 10-50 | SQLite rate-limit handles thousands/min; Brevo free tier = 300 contacts/day OK |
| Review filter traffic | SSR, 25 reviews | 100 reviews | 5-min in-memory cache in `review-facets.ts` |
| A/B tracking events | — | 5-10k impressions/day | Umami handles; variant-impression aggregate = ~1 row/variant/day (trivial) |
| Umami API calls | — | 1 call/day | Token caching |
| Collections | 0 | 10-30 | Static build, no runtime concern |

**First bottleneck expected:** Brevo free tier (300 contacts/day) if exit-intent over-fires. Mitigated by 30-day `bbq-nl-seen` cookie (already designed).

**Second bottleneck:** Umami self-hosted Postgres writes if A/B events exceed ~50k/day. Unlikely; if it happens, sample at 25% in the tracker.

---

## Sources

- Direct inspection of production codebase at `C:/Users/Matteo/Desktop/Progetti/bbqexperience/`:
  - `web/src/pages/api/newsletter.ts`, `brevo-webhook.ts`
  - `web/src/lib/rate-limit.ts`
  - `web/src/components/common/NewsletterSignup.astro`
  - `web/src/pages/en/reviews/index.astro`
  - `cms/src/api/{review,product,recipe,subscriber,brand}/content-types/*/schema.json`
  - `scripts/agents/seo_optimizer.py`, `lib/strapi_client.py`, `crontab.txt`
- `docs/architecture.md` — current request/deploy/content-sync flow
- `.planning/PROJECT.md` — v1.1 milestone scope + decision log
- `CLAUDE.md` + `.claude/CLAUDE.md` — project conventions (SQLite rate-limit, fetch timeouts, atomic writes, Strapi v5 locale PUT, container names, mobile menu Chrome fix, nested anchor sweep)
- Strapi v5.41 docs — i18n plugin relation mirroring
- Umami v2 REST API reference (self-hosted)
- Brevo API v3 — contacts + webhooks + double-opt-in list flag

---

*Architecture research for: BBQ Experience v1.1 Content Depth & Growth Loop*
*Researched: 2026-04-15*
*Confidence: HIGH — grounded in direct codebase inspection, not hypothetical*
