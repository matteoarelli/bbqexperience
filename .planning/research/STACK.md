# Stack Research — v1.1 Content Depth & Growth Loop

**Domain:** Additive stack research for v1.1 features on top of shipped BBQ Experience (Astro 6 + Svelte 5 + Strapi 5 editorial site)
**Researched:** 2026-04-15
**Confidence:** HIGH (most additions use native/existing patterns — minimal new surface area)
**Scope:** Only NEW capabilities for (1) newsletter multi-surface signup, (2) review filters & taxonomy, (3) recipe collections, (4) Growth Engine v2 (Umami feedback + A/B testing)

> Previous project-level stack (Astro 6, Svelte 5, Strapi 5, Tailwind 4, GSAP, Pagefind, Docker/Caddy, Umami, Brevo, custom i18n JSON, SQLite rate-limit) is **shipped and stable** — see `CLAUDE.md` stack block and `docs/architecture.md`. This document covers **only the delta** for v1.1.

## Executive summary (one-liner)

**Add almost nothing.** One tiny runtime dep (`nanoid`), optional `@nanostores/persistent`, two new Strapi content types (`recipe-collection`, `product-category`) plus an `ab-experiment` config type, and three thin in-house modules (exit-intent detector, A/B variant assignment, Umami reader for Python). Every existing convention (SQLite rate-limit, custom i18n, direct `fetch` against Brevo via `api-key` header, Strapi API token, `AbortSignal.timeout(10_000)`) is reused as-is. **No SaaS** added; infra cost stays at ~$100/yr.

---

## Recommended Stack Additions

### Core additions (frontend / runtime)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `nanoid` | 5.1.7 | Stable per-visitor ID for A/B bucket assignment (stored in first-party cookie) | 118-byte zero-dep ID generator, secure RNG, URL-safe. Works in Node runtime and browser. 96M weekly downloads, industry standard. Used to seed a deterministic hash so returning visitors stay in the same variant. | HIGH |
| `@nanostores/persistent` *(optional)* | 1.x | Persist filter state across navigations for reviews index (brand/category/price/score) when URL-sync is insufficient | Sub-1KB. Explicitly recommended in Astro docs for islands state. Main plan is URL-first; only add if UX testing shows URL params are too noisy. | MEDIUM |
| **In-house exit-intent module** | n/a (≈40 LOC) | Detect exit intent to trigger newsletter modal | DIY in `web/src/lib/exit-intent.ts`. Listens to `mouseleave` on `document.documentElement` with `e.clientY <= 0`, plus tab visibility + idle fallback. Published libs (`exit-intent-js`, `bounceback`) are ~30-80 LOC — not worth a dep. Lives in a Svelte island mounted once in `BaseLayout`. Respects "seen this session" flag in `sessionStorage`. Desktop-only (mobile gets sticky footer bar instead). | HIGH |
| **In-house A/B assignment module** | n/a (≈60 LOC) | Assign visitor to variant A or B deterministically, emit Umami event on impression + conversion | Lives in `web/src/lib/ab-test.ts`. Reads/sets `bbq_vid` cookie (1-year, `SameSite=Lax`, `Secure`). Hash `(visitorId + experimentId) → 0-99` via `crypto.subtle.digest('SHA-256')` → bucket split. Emits Umami custom events via `window.umami.track(event, { experiment, variant })`. No SSR variant needed — headline variants swap client-side on hydration to keep SSG/Cloudflare cache intact. For newsletter subject-line A/B, Python agent picks variant and tags Brevo contact attribute `AB_SUBJECT`. | HIGH |
| **In-house filter module** | n/a (native Svelte 5) | Client-side review filtering with URL sync | `URLSearchParams` + Svelte 5 `$state` + `$derived` + `$effect`. Progressive enhancement — filters work with JS; without JS server returns unfiltered list. Hydrates on the existing reviews index island. No library. | HIGH |

### Backend additions (Strapi / CMS)

| Addition | Type | Purpose | Why | Confidence |
|----------|------|---------|-----|------------|
| `recipe-collection` | New content type (Strapi 5) | Curated recipe groupings ("Brisket masterclass", "Summer BBQ", "Low & Slow") | Native Strapi pattern. i18n **enabled**. Fields: `title` (localized), `slug` (localized), `description` (rich text, localized), `hero_image` (media, shared), `recipes` (relation many-to-many to `recipe`, **non-localized**), `featured` (boolean, shared). SEO component shared with other content types. | HIGH |
| `product-category` | New content type (Strapi 5) | Taxonomy for review filtering ("Pellet Grills", "Charcoal Smokers", "Accessories"…) | Small flat taxonomy (8-15 items). i18n **enabled** (category names translate). Fields: `name` (localized), `slug` (localized), `icon` (media optional, shared), `sort_order` (integer, shared). Relation: `product.category` many-to-one. | HIGH |
| `price_range` enum | New field on existing `product` | Enable price-bucket filtering | Enum on existing `product` type (shared / non-localized): `budget`, `mid`, `premium`, `luxury`. Matteo selects manually — avoids currency-conversion mess across EN/IT/ES. | HIGH |
| `ab-experiment` | New content type (Strapi 5) | Declarative experiment registry — Matteo defines experiments in admin, agents read results | Fields: `experiment_id` (uid, shared), `description` (shared), `status` (enum: draft/running/completed), `variant_a_value` (text), `variant_b_value` (text), `target_content_type` (enum: blog-post/review/recipe/newsletter), `target_slug` (text, nullable for newsletter), `traffic_split` (integer, default 50), `started_at`, `ended_at`, `winner` (enum). **No i18n** — experiments are language-agnostic (create a separate experiment per locale if needed). Consumed by: Astro island (reads via SSR endpoint at build time → embeds into static HTML) and `ab_tester.py` agent. | HIGH |
| Brevo list attributes | Config only | Multi-surface source tracking + A/B subject tagging | Add Brevo contact attributes: `SURFACE` (inline / exit_intent / landing / sticky_footer), `AB_SUBJECT` (variant_a / variant_b). `LOCALE` already present. Zero code beyond `attributes: { ... }` payload. **Must be created in Brevo dashboard before first signup.** | HIGH |

### Python Growth Engine v2 additions

| Module | Size | Purpose | Why | Confidence |
|--------|------|---------|-----|------------|
| `scripts/agents/lib/umami_client.py` | new (~80 LOC) | Umami REST wrapper: auth, `/stats`, `/metrics` (top pages, referrers), `/events` (custom events incl. A/B conversions) | Mirrors existing `strapi_client.py` pattern: retry with exponential backoff (3 tries), in-module token cache with ~58min TTL, `timeout=10`. Auth: `POST /api/auth/login` with `UMAMI_USERNAME`/`UMAMI_PASSWORD` env vars (pattern already in `scripts/agents/telegram_bot.py`). Rate-limit: Umami self-hosted has no enforced limit; self-throttle at 1 req/s. | HIGH |
| `scripts/agents/analytics_feedback.py` | new (~200 LOC) | Nightly agent: pull top pages, bounce, avg time, scroll depth → score each article → feed `claude_strategist.py` | Hetzner cron 04:00 daily. Reads Umami `/metrics` for last 7d. Joins with Strapi content via slug. Writes `state/analytics_signals.json` (atomic via `os.replace()`). Strategist reads on Sunday run. | HIGH |
| `scripts/agents/ab_tester.py` | new (~150 LOC) | Monitor `ab-experiment` entries, pull Umami events, compute p-value, mark winner | Hetzner cron every 6h. Reads running experiments from Strapi. Queries Umami events `ab_impression` + `ab_conversion` grouped by `variant`. Hand-rolled two-proportion z-test (10 lines, no scipy). Stops experiment when `n >= min_sample` per variant AND `p < 0.05` AND `days >= 7`. Marks winner and writes winning headline back to source content. | HIGH |
| `scripts/agents/subject_line_ab.py` | new (~100 LOC) | A/B test newsletter subject lines across Brevo sends | Runs from `weekly_newsletter.py`. Picks 2 subject variants (stored in `ab-experiment`), splits contacts by hash of email, tags each with `AB_SUBJECT=variant_a/b`, sends via Brevo with per-variant subject. Reads open-rate back via Brevo `/v3/smtp/statistics/events` → feeds winner to `ab_tester.py`. | HIGH |

**Sample-size calculator** — inline formula in `ab_tester.py`, no library:
```
n = 2 * (z_α/2 + z_β)² * p(1-p) / Δ²
# 80% power, α=0.05, baseline CTR 10%, MDE 2pp → n ≈ 3,842 per variant
```
Precompute per experiment at start; refuse experiments whose target traffic can't reach n within 30 days.

---

## Integration points (where each addition attaches)

| New thing | Integration point | Existing code that changes |
|-----------|-------------------|----------------------------|
| Newsletter inline form | `web/src/components/newsletter/NewsletterInline.svelte` mounted by blog/review/recipe/tutorial detail layouts | Existing `web/src/components/common/NewsletterSignup.astro` refactored to accept `surface` prop, or kept as-is and new inline island added |
| Exit-intent modal | Single instance in `BaseLayout.astro`, Svelte island with `client:idle` | `BaseLayout.astro`: one line added |
| `/newsletter` landing page | `web/src/pages/[locale]/newsletter.astro` + route translations | Add `newsletter` slug to `LOCALIZED_ROUTES` in `web/src/lib/i18n.ts` (same slug in EN/IT/ES is fine); add SEO block, CollectionPage or WebPage JSON-LD |
| Sticky footer bar | `web/src/components/newsletter/StickyFooterBar.svelte` mounted in `BaseLayout`, dismissible via `localStorage` flag | `BaseLayout.astro` |
| Newsletter API endpoint | `web/src/pages/api/newsletter.ts` — extend with `surface` in body → pass as Brevo attribute | Tiny edit: add `surface` validation + forward |
| Brevo webhook | `web/src/pages/api/brevo-webhook.ts` — already HMAC-validated | No change |
| Review filters UI | New `web/src/components/reviews/ReviewFilters.svelte` island on `web/src/pages/[locale]/reviews/index.astro` | Index page passes pre-rendered full list + taxonomy JSON to the island as props |
| Product category taxonomy | Strapi: new content type; CMS migration to backfill categories on existing 25 reviews | `scripts/backfill_product_categories.py` one-off + manual tagging in admin |
| Recipe collections | Strapi: new content type; `web/src/pages/[locale]/recipes/collections/[slug].astro` + `collections/index.astro` | `@astrojs/sitemap` already picks up dynamic routes — confirm `sitemap.xml` includes new paths. Add `CollectionPage` JSON-LD (existing `CollectionPageSchema` emitter convention from v3.2). |
| A/B variant swap | Svelte headline island reads `data-experiment` attr → `assignVariant()` from `lib/ab-test.ts` | Headline component in blog/review/recipe detail layouts (1 new island, reused across 3 content types) |
| Umami event tracking | `window.umami.track(event, data)` called from `lib/ab-test.ts` | Umami tracking script already loaded in `BaseLayout` — no change |
| Growth Engine v2 Python | `scripts/agents/` following existing pattern | Cron additions on Hetzner; env vars `UMAMI_USERNAME`/`UMAMI_PASSWORD`/`UMAMI_URL`/`UMAMI_SITE_ID` already present per `telegram_bot.py` |

---

## Installation

```bash
# Frontend (web/)
npm install nanoid                             # A/B bucket seed (~118B)
npm install @nanostores/persistent nanostores  # OPTIONAL — only if URL-only state proves insufficient for filters

# Nothing else — exit-intent and A/B assignment are in-house modules (no deps)

# Python (scripts/agents/) — no new deps beyond the standard set
# umami_client.py uses urllib (already used in telegram_bot.py) or requests (already in lib/)
```

**Explicitly NOT installed:**
- ❌ No `exit-intent` npm package — ~40 LOC in-house
- ❌ No A/B SaaS (GrowthBook/Optimizely/VWO/PostHog) — Umami + declarative Strapi config covers it
- ❌ No `nuqs` / `nuqs-svelte` — Svelte 5 runes + `URLSearchParams` is enough
- ❌ No `@getbrevo/brevo` SDK — direct `fetch` to `api.brevo.com/v3` matches existing `newsletter.ts`; we touch only 3 endpoints (`/contacts`, `/contacts/lists/{id}/contacts`, `/smtp/statistics/events`)
- ❌ No `scipy` — z-test hand-rolled in 10 lines
- ❌ No Paraglide / i18next — convention forbids
- ❌ No React or any framework swap — Astro + Svelte 5 islands stays

---

## Alternatives Considered

| Recommended | Alternative | When the alternative would win |
|-------------|-------------|-------------------------------|
| DIY exit-intent (~40 LOC) | `exit-intent-js` (~2KB) or `bounceback` | If we needed multiple heuristics (idle + blur + visibility) and didn't want to maintain them. We only need `mouseleave`+`sessionStorage` — DIY wins on clarity. |
| DIY A/B cookie assignment + Umami events | **GrowthBook** (self-hosted OSS) | If we ran >5 concurrent experiments with complex targeting (geo, device, segments). At 1-2 experiments it's over-engineering. Would also add a second DB/service on the Hetzner box. |
| DIY A/B + Umami | **PostHog** (cloud) | If we wanted funnels + session replay too. PostHog free tier caps at 1M events/mo and adds 3rd-party tracking. Umami self-hosted keeps privacy story clean. |
| DIY A/B | **Ablit** (Astro-native A/B) | Ablit targets SSR variants at Cloudflare Pages edge. We're SSG + Cloudflare in front of Caddy (no Workers). Rejected. |
| Direct `fetch` to Brevo | `@getbrevo/brevo@5.0.4` SDK | If we used >5 endpoints (transactional, templates, SMS). We touch 3. SDK bundles ~50KB of TS types we'd never use. |
| URL query state + Svelte 5 runes | `@nanostores/persistent` | Accept if UX testing shows filters are too noisy in URL (6+ params). Default is URL-first. |
| URL query state | `nuqs-svelte` | Great typed API but adds a dep for ~30 LOC of `URLSearchParams` + Svelte runes. Revisit if we grow to many filter screens. |
| New `product-category` content type | Free-form tags on product | Tags are unfiltered strings with no i18n, no icons, no sort. A custom content type with 8-15 entries is cleaner and admin UX is nicer for Matteo. |
| `recipe-collection` as content type | Component inside `recipe` (many-to-one field) | Components can't have their own URL, slug, or listing page. Collections need routing → content type is correct. |
| Hand-rolled `umami_client.py` | Official `umami-analytics` PyPI package | PyPI package has narrow scope. We need 4 endpoints; 80 LOC matches `strapi_client.py` conventions for retry/backoff. |
| Hand-rolled z-test | `scipy.stats.proportions_ztest` | Scipy adds ~30MB to the Docker image for one function. 10-line hand-rolled z-test is auditable. |
| A/B variant swap client-side (on hydration) | Edge variant selection (Cloudflare Worker) | Edge would eliminate flash but require varying cache by cookie → CDN hit-rate drops. SSG + client swap preserves our 90+ Lighthouse score. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Mailchimp / ConvertKit / Substack | Brevo already wired + free tier covers current volumes; double opt-in + webhook validated in v1.0 | Keep Brevo |
| `react` / `react-dom` | Forbidden by Astro-first decision; all islands are Svelte 5 | Svelte 5 runes |
| Optimizely / VWO / AB Tasty | Paid SaaS, third-party cookies, bundle impact | Umami + in-house cookie assignment |
| GA4 / Google Analytics | Privacy + Cloudflare proxy noise; Umami covers needs | Umami (self-hosted, already live) |
| Mixpanel / Amplitude | SaaS event warehousing; we don't need funnels yet | Umami events + Python agents |
| Intercom / Hotjar | Heavy bundles, GDPR pain | Out of scope for v1.1 |
| SvelteKit | No framework swap needed; Svelte 5 islands inside Astro is the shipped pattern | Keep Astro 6 + Svelte 5 islands |
| Lenis | Removed v1.0 (convention) | Native `scroll-behavior: smooth` |
| Paraglide / i18next | Convention forbids | Custom JSON in `web/src/i18n/` |
| `cookie-parser` / Express middleware | `Astro.cookies` + `request.headers.get('cookie')` is enough in Astro endpoints | Astro built-in |
| `jsonwebtoken` for A/B cookie | We only need a random ID, not a signed token | `nanoid()` — sign only if we later need server-side integrity |
| Redis for session / rate-limit | Rate limit is already SQLite; no auth = no sessions | Keep SQLite `web/src/lib/rate-limit.ts` |
| Algolia / Meilisearch for filters | Filters operate on a small dataset (~25 reviews); client-side is instant | Client-side filter + existing Pagefind for search |

---

## Stack Patterns (reference implementations)

### Pattern 1 — Newsletter surface tagging (extends existing endpoint)

```ts
// web/src/pages/api/newsletter.ts — add `surface` validation and forward to Brevo
const allowedSurfaces = ['inline','exit_intent','landing','sticky_footer'] as const;
type Surface = typeof allowedSurfaces[number];
const surface: Surface = allowedSurfaces.includes(body.surface) ? body.surface : 'inline';

// In the existing Brevo POST /v3/contacts call:
body: JSON.stringify({
  email,
  listIds: [BREVO_LIST_ID],
  attributes: { LOCALE: locale, SURFACE: surface },
  updateEnabled: true,
}),
signal: AbortSignal.timeout(10_000),
```
Rate limit already `checkRateLimit(clientIp, 'newsletter', 5)` — **no change**. CSRF: Astro endpoints same-origin; rely on `SameSite=Lax` cookies + rate limit (no auth flow, low value target).

### Pattern 2 — Exit-intent island (desktop)

```svelte
<!-- web/src/components/newsletter/ExitIntentNewsletter.svelte -->
<script>
  import { onMount } from 'svelte';
  import NewsletterForm from './NewsletterForm.svelte';
  let shown = $state(false);
  onMount(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;         // skip on mobile/tablet
    if (sessionStorage.getItem('bbq_exit_seen')) return;
    const handler = (e) => {
      if (e.clientY <= 0) {
        shown = true;
        sessionStorage.setItem('bbq_exit_seen','1');
        document.documentElement.removeEventListener('mouseleave', handler);
      }
    };
    document.documentElement.addEventListener('mouseleave', handler);
    return () => document.documentElement.removeEventListener('mouseleave', handler);
  });
</script>
{#if shown}
  <NewsletterForm surface="exit_intent" onClose={() => shown = false} />
{/if}
```
Mount once in `BaseLayout.astro` as `<ExitIntentNewsletter client:idle />`.

### Pattern 3 — A/B variant assignment (deterministic, SSG-safe)

```ts
// web/src/lib/ab-test.ts
import { nanoid } from 'nanoid';

export function getVisitorId(): string {
  const m = document.cookie.match(/(?:^|;\s*)bbq_vid=([^;]+)/);
  if (m) return m[1];
  const id = nanoid(16);
  document.cookie = `bbq_vid=${id}; Max-Age=${60*60*24*365}; Path=/; SameSite=Lax; Secure`;
  return id;
}

export async function assignVariant(experimentId: string, splitA = 50): Promise<'a'|'b'> {
  const vid = getVisitorId();
  const buf = new TextEncoder().encode(`${vid}:${experimentId}`);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bucket = new DataView(hash).getUint8(0) % 100;
  return bucket < splitA ? 'a' : 'b';
}

export function trackImpression(exp: string, variant: 'a'|'b') {
  window.umami?.track('ab_impression', { experiment: exp, variant });
}
export function trackConversion(exp: string, variant: 'a'|'b', goal: string) {
  window.umami?.track('ab_conversion', { experiment: exp, variant, goal });
}
```
First render shows default (variant A) headline; island swaps to B after hydration if assigned. Acceptable flash because GSAP already animates headline entry. **SSG cache unchanged.**

### Pattern 4 — Filter state with URL sync (no library)

```svelte
<!-- web/src/components/reviews/ReviewFilters.svelte -->
<script>
  let { reviews, brands, categories } = $props();
  const params = new URLSearchParams(location.search);
  let brand     = $state(params.get('brand') ?? '');
  let category  = $state(params.get('category') ?? '');
  let priceRange = $state(params.get('price') ?? '');
  let minScore  = $state(Number(params.get('score') ?? 0));

  const filtered = $derived(reviews.filter(r =>
    (!brand     || r.product.brand_relation?.slug === brand) &&
    (!category  || r.product.category?.slug === category) &&
    (!priceRange|| r.product.price_range === priceRange) &&
    (!minScore  || r.overall_score >= minScore)
  ));

  $effect(() => {
    const p = new URLSearchParams();
    if (brand)      p.set('brand', brand);
    if (category)   p.set('category', category);
    if (priceRange) p.set('price', priceRange);
    if (minScore)   p.set('score', String(minScore));
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  });
</script>
```
Progressive enhancement: index page server-renders full list; JS filters client-side; shareable URLs. No library needed.

### Pattern 5 — Umami reader for Python agents

```python
# scripts/agents/lib/umami_client.py
import os, json, time
from urllib.request import Request, urlopen
from urllib.error import URLError

_URL      = os.environ["UMAMI_URL"].rstrip("/")
_SITE_ID  = os.environ["UMAMI_SITE_ID"]
_USERNAME = os.environ.get("UMAMI_USERNAME", "admin")
_PASSWORD = os.environ["UMAMI_PASSWORD"]

_tok: dict = {"token": None, "exp": 0}

def _token() -> str:
    if _tok["token"] and time.time() < _tok["exp"]:
        return _tok["token"]
    body = json.dumps({"username": _USERNAME, "password": _PASSWORD}).encode()
    req = Request(f"{_URL}/api/auth/login", data=body,
                  headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as r:
        tok = json.loads(r.read())["token"]
    _tok.update(token=tok, exp=time.time() + 3500)
    return tok

def _get(path: str, params: dict | None = None) -> dict:
    qs = ("?" + "&".join(f"{k}={v}" for k, v in (params or {}).items())) if params else ""
    req = Request(f"{_URL}/api/websites/{_SITE_ID}{path}{qs}",
                  headers={"Authorization": f"Bearer {_token()}"})
    for attempt in range(3):
        try:
            with urlopen(req, timeout=10) as r:
                return json.loads(r.read())
        except URLError:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def stats(start_iso: str, end_iso: str) -> dict:
    return _get("/stats", {"startAt": start_iso, "endAt": end_iso})

def top_pages(start_iso: str, end_iso: str, limit: int = 50) -> list:
    return _get("/metrics", {"startAt": start_iso, "endAt": end_iso, "type": "url", "limit": limit})

def events(start_iso: str, end_iso: str, event_name: str | None = None) -> list:
    p = {"startAt": start_iso, "endAt": end_iso}
    if event_name: p["event"] = event_name
    return _get("/events", p)
```
Mirrors `strapi_client.py` retry style. Token cached ~58min.

### Pattern 6 — Strapi 5 i18n for recipe collections (convention-critical)

**Rule from CLAUDE.md:** "Strapi v5 localizzazioni — PUT con `?locale=xx` nel query param, sempre includere slug nel body."

```python
# Create base EN entry
doc = strapi.post("recipe-collections?locale=en",
                  data={"title": "Brisket Masterclass",
                        "slug": "brisket-masterclass",
                        "description": "...",
                        "recipes": [doc_id_1, doc_id_2]})
# Add IT translation (same document)
strapi.put(f"recipe-collections/{doc['documentId']}?locale=it",
           data={"title": "Maestria del Brisket", "slug": "maestria-del-brisket"})
# Add ES translation
strapi.put(f"recipe-collections/{doc['documentId']}?locale=es",
           data={"title": "Maestría del Brisket", "slug": "maestria-del-brisket-es"})
```
The `recipes` relation is **non-localized** — a collection references the same recipe documents regardless of locale (Strapi resolves per-locale version at query time). Set `"pluginOptions": {"i18n": {"localized": false}}` on the relation field.

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `nanoid` | 5.1.7 | Node 22, ESM-only | v5 is ESM-only — matches Astro 6 module setup. No CJS pitfalls. |
| `@nanostores/persistent` (optional) | 1.x | `nanostores@0.11+`, Svelte 5 | Svelte 5 via `$` subscription pattern documented in Astro recipes. |
| Strapi | 5.41.1 (installed) | Node 22, PostgreSQL 16 | New content types require `npm run build` in `cms/` before container rebuild (admin is compiled). Schema auto-sync in dev; manual migration review for prod. Remember `"pluginOptions": {"i18n": {"localized": false}}` on shared fields. |
| Brevo REST `/v3` | stable | n/a | `api-key` header auth. Rate limit 100 req/s (never approached). Double opt-in is list-level config in dashboard. |
| Umami self-hosted | current | PostgreSQL 16 | Auth token 1h TTL. Endpoints stable (not versioned). |

---

## Budget Alignment (unchanged)

| Line item (v1.1 delta) | Cost | Notes |
|------------------------|------|-------|
| `nanoid` | Free | MIT, 118 bytes |
| `@nanostores/persistent` (optional) | Free | MIT |
| Brevo free tier | Free | 300 emails/day, 100k contacts. Covers newsletter broadcast + transactional. If we exceed 300/day, Brevo Lite ~€25/mo (budget allows). |
| Umami self-hosted | Paid (in Hetzner CX21) | Zero additional cost |
| PostgreSQL storage for new content types | Paid (in Hetzner CX21) | Tiny marginal storage |
| **Infra delta for v1.1** | **€0** | Total infra stays at ~$100/yr |

---

## Risks / flags for roadmap

1. **SSG cache vs A/B variants** — Cloudflare caches HTML. Variant swap happens client-side only; we must NOT vary cache by cookie. Safe as designed. Flag if any phase proposes SSR variants.
2. **Umami ingestion lag** — ~1-2 min delay on metrics. Acceptable for nightly analytics agent; `ab_tester.py` must wait ≥5 min after experiment close before final query.
3. **Strapi schema migration on prod** — adding `product-category`, `recipe-collection`, `ab-experiment`, `price_range` requires admin rebuild + CMS container restart. Webhook deploy handles web rebuild; CMS rebuild is a separate `docker compose up -d --build strapi` on Hetzner. Backfill script for category tagging must run during maintenance window.
4. **Exit-intent is desktop-only** — `mouseleave` doesn't fire on mobile. Plan: sticky footer bar is the mobile-primary CTA. Alternative (scroll-up intent) adds complexity without evidence — defer.
5. **Brevo attribute provisioning** — existing contacts lack `SURFACE` / `AB_SUBJECT`. Must create attribute schema in Brevo dashboard **before** first new signup. Safe default: empty string.
6. **Sample-size reality check** — at ~500 visitors/day across 3 locales, a 10% baseline CTR with 2pp MDE needs ~3,800 per variant → ~15 days per experiment in an optimistic case. Roadmap should include a "traffic baseline audit" phase before A/B testing goes live.
7. **Filter URL pollution** — 4 filter params in share links. Consider compact encoding (`?f=b:traeger,c:pellet,p:premium,s:7`) only if UX complaints arise. Defer.
8. **i18n pitfall** — `product-category` and `recipe-collection` slugs must be localized. Don't reuse EN slug across locales; use `getLocalizedPath()` pattern from existing `web/src/lib/i18n.ts` (v3.2 hreflang fix).
9. **Umami password in env** — existing convention via `.env` on server. New agents inherit. Rotate per v3.1 security hardening schedule.
10. **Brevo webhook signing** — already HMAC-validated (convention). Don't regress when adding attribute-based triggers.

---

## Sources

- [nanoid npm](https://www.npmjs.com/package/nanoid) — v5.1.7 current, 118-byte bundle, 96M weekly downloads
- [@getbrevo/brevo npm](https://www.npmjs.com/package/@getbrevo/brevo) — v5.0.4 current (reference only; not installed)
- [Brevo Changelog & API docs](https://developers.brevo.com/) — `api-key` header auth verified
- [Umami API overview](https://docs.umami.is/docs/api) — `/api/auth/login` + Bearer token pattern
- [Umami API authentication](https://docs.umami.is/docs/api/authentication) — token TTL behavior
- [Umami API client](https://docs.umami.is/docs/api/api-client) — endpoint list (`/stats`, `/metrics`, `/events`, `/pageviews`)
- [Astro i18n routing](https://docs.astro.build/en/guides/internationalization/) — pattern already in use
- [Astro state sharing recipe (nanostores)](https://docs.astro.build/en/recipes/sharing-state-islands/) — islands pattern
- [nanostores GitHub](https://github.com/nanostores/nanostores) — 286-byte core
- [Strapi 5 i18n guide](https://strapi.io/blog/strapi-5-i18n-complete-guide) — v5 i18n in core, non-localized relations pattern
- [Strapi 5 i18n docs](https://docs.strapi.io/cms/features/internationalization) — `?locale=xx` query param convention
- [Strapi 5 relations docs](https://docs.strapi.io/cms/api/rest/relations) — locale-aware relation resolution
- [Cloudflare Pages A/B pattern](https://developers.cloudflare.com/pages/how-to/use-worker-for-ab-testing-in-pages/) — cookie-based variant reference
- [Ablit (Astro A/B)](https://ablit.dev/) — evaluated, rejected (SSR-only, edge)
- [PostHog Astro A/B tutorial](https://posthog.com/tutorials/astro-ab-tests) — evaluated, rejected (SaaS)
- [exit-intent-js](https://github.com/julesbravo/exit-intent-js) — reference implementation (we DIY)
- [bounceback](https://github.com/AMKohn/bounceback) — reference implementation
- [bugfactory — detecting exit intent vanilla JS](https://bugfactory.io/articles/tracking-exit-intent-with-vanilla-javascript/) — `mouseleave` + `clientY<=0` pattern
- [nuqs-svelte](https://github.com/rtrampox/nuqs-svelte) — evaluated, rejected (over-kill for 4 filters)
- Existing repo files verified:
  - `web/src/pages/api/newsletter.ts` — current Brevo `fetch` pattern + rate limit + timeout conventions
  - `web/src/lib/rate-limit.ts` — SQLite rate-limit convention
  - `scripts/agents/telegram_bot.py` — Umami auth pattern to mirror
  - `docs/architecture.md` — service topology, webhook deploy, Brevo flow

---
*Stack research for: v1.1 Content Depth & Growth Loop — additive only*
*Researched: 2026-04-15*
