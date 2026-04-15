# Pitfalls Research

**Domain:** Editorial multilingual site (live production) — adding newsletter capture, faceted review navigation, recipe collections, analytics-driven agents, A/B headline testing
**Researched:** 2026-04-15
**Confidence:** HIGH (SEO/GDPR/Strapi) · MEDIUM (A/B flicker, exit-intent mobile, agent statistical significance)

Scope note: this file catalogs pitfalls specific to ADDING v1.1 features to the existing bbq-experience.com production stack (Astro 6 + Strapi 5.41 + Postgres + Brevo + Umami + Growth Engine AI). Generic "web app" mistakes are excluded; each pitfall is anchored to an integration touchpoint that already exists in the repo.

---

## Critical Pitfalls

### Pitfall 1: Faceted review filters spawn indexable URL combinatorial explosion

**What goes wrong:**
Review filters (brand × category × price × score) generate `/reviews?brand=weber&category=pellet&price=500-1000&score=7` style URLs. Google crawls every combination, each returns near-duplicate content. Crawl budget drains away from the 25 canonical review pages that actually rank. Within 4–8 weeks of shipping, Search Console shows "Crawled — currently not indexed" for legitimate reviews while junk filter URLs climb the "Discovered" queue.

**Why it happens:**
Default Astro/Svelte filter components use reactive URL params. Devs wire `history.pushState` to keep state shareable — which is correct for UX — but forget that every new permutation becomes a crawlable URL unless explicitly blocked. With 25 reviews × (~8 brands × 5 categories × 4 price buckets × 4 score tiers) = ~640 possible URLs for 25 products. Zero SEO value, real crawl cost. Google removed the URL Parameters tool from Search Console, so you can't fix it retroactively from the UI — it has to be prevented at code time.

**How to avoid:**
1. Client-side filter state by default: use `?` query params that are NOT exposed in `<a href>` navigation. Facet UI reads/writes via JS; links on the reviews index go only to canonical review slugs.
2. Add `<link rel="canonical" href="/{locale}/reviews">` on every filtered state (canonical points to the unfiltered index).
3. Add `<meta name="robots" content="noindex, follow">` when any filter param is present in the URL (follow lets link equity flow to canonical reviews).
4. Add `Disallow: /*?brand=` patterns in `robots.txt` AFTER confirming no filter URL is already indexed (otherwise Google can't see the noindex).
5. Only promote to indexable landing pages the filter combinations with real search volume (e.g., `/reviews/pellet-grills` as a real taxonomy page, not a filter URL).

**Warning signs:**
- Search Console "Pages" report shows `/reviews?...` URLs in "Discovered" or "Crawled — not indexed" buckets.
- Crawl stats in GSC show daily crawl spikes without content growth.
- Organic traffic on canonical `/reviews/[slug]` plateaus or drops after filter launch.
- Server logs show Googlebot hitting filter param URLs.

**Phase to address:** Phase for "Review filters & taxonomy" (dedicated feature phase). Must land in the same PR as the feature, not as follow-up.

---

### Pitfall 2: Newsletter signup without double opt-in = GDPR violation + Brevo deliverability penalty

**What goes wrong:**
Single opt-in flow (user enters email, gets subscribed immediately) is shipped. EU users complain, one files a DPA complaint with the Italian Garante. Separately, Brevo's abuse detection flags the list for low engagement / bounce rate because no confirmation step filters typos and bot submissions. Sender reputation tanks, weekly Brevo newsletter starts landing in spam.

**Why it happens:**
Brevo documentation technically says double opt-in is "not required by GDPR" — this is a trap. GDPR Art. 7 requires provable consent. Without DOI, the only proof is a server log of a form POST, which the Garante has rejected as insufficient in past Italian cases. Also, single-opt-in with exit-intent popups is the number-one source of typo emails and disposable-address signups — exactly the pattern Brevo flags.

**How to avoid:**
1. Use Brevo DOI template (built-in) for all 4 surfaces (inline, exit-intent, `/newsletter`, sticky footer). Every signup creates a `doubleOptinConfirmation` event.
2. Store consent metadata on Brevo contact: form source (inline/exit/page/footer), timestamp, IP, locale, language version of the consent text shown.
3. Render consent checkbox text in the user's current locale (EN/IT/ES) — not only EN. The "legally valid consent" must be in a language the user understands, and IT audience is large.
4. Link to localized `/privacy` and `/terms` from the form. Both already exist in the repo.
5. Add a honeypot field (`<input name="website" tabindex="-1" style="position:absolute;left:-9999px">`) — server-side reject if filled. More effective than CAPTCHA for low-volume signups and doesn't trip screen readers.
6. Rate-limit the signup endpoint via the existing SQLite `src/lib/rate-limit.ts` (per-IP, 5/min/IP). Do NOT use an in-memory Map (CLAUDE.md convention).
7. Store the consent record also server-side (Strapi `subscriber` content type already exists) — don't rely on Brevo alone.

**Warning signs:**
- Brevo dashboard "bounce rate" > 2% or "complaint rate" > 0.1%.
- Subscriber confirmation rate < 60% (signal of bot traffic or intent mismatch).
- Umami shows 10× signup events compared to the previous week with no traffic change (bot floods).
- Any user email arrives to `privacy@` asking to see their data and you can't show them locale + source of consent.

**Phase to address:** Phase for "Newsletter on-site signup" — consent + DOI must be day-one, not added later.

---

### Pitfall 3: Exit-intent modal accessibility failure + mobile false-positive flood

**What goes wrong:**
Desktop implementation uses `mouseleave` on `document`. Works fine on desktop. On mobile, the equivalent trigger (tab switch, scroll direction reversal, page visibility change) fires on every legitimate user action — switching apps, pulling down notification center, rotating the device. Modal pops up 3–5× per session per mobile user. Bounce rate spikes, INP degrades, Lighthouse drops below the 90 target in DES-04.

Separately, screen reader users cannot escape the modal: no `role="dialog"`, no `aria-modal="true"`, no focus trap, no `Escape` key handler. Focus stays in whatever link was last focused while the modal covers it visually — invisible content keyboard trap. This is a WCAG 2.2 violation and with the EU Accessibility Act in force from June 2025 for sites doing business in the EU, it's a legal exposure.

**Why it happens:**
Copy-paste from exit-intent marketing tutorials assumes desktop. Many popular libraries (OptiMonk, Privy legacy examples) historically used Page Visibility API on mobile — which fires far too often. Accessibility is an afterthought because developers test with a mouse, not a screen reader.

**How to avoid:**
1. Desktop only: `mouseleave` on document with `clientY < 10` AND throttle to once per session per user (localStorage flag).
2. Mobile: do NOT use exit-intent modal. Replace with a passive inline banner at article end OR a sticky footer bar with clear dismiss. This matches TPGi/Claspo guidance: non-modal patterns on mobile, modal only on desktop.
3. Accessibility baseline:
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the modal container.
   - Move focus to the email input on open.
   - Trap Tab/Shift+Tab inside the modal.
   - `Escape` closes and returns focus to the last interactive element.
   - Close button is the first focusable element, visible, keyboard-operable, `aria-label="Close newsletter signup"` in current locale.
4. Show max once per user per 7 days (localStorage).
5. Do NOT show on transactional pages (`/newsletter` itself, `/privacy`, `/terms`, 404, confirmation pages).
6. Suppress on first visit (wait until user has scrolled 50%+ of any article — otherwise it's a "before you've read anything" popup, which Google's Core Web Vitals guidance and Chrome's intrusive interstitial policy penalize).

**Warning signs:**
- Umami shows `modal_shown` event count on mobile > 3× session count (false-firing).
- INP on pages with the modal > 200ms.
- CLS > 0.1 on article pages.
- Lighthouse Accessibility audit fails on "dialog elements have accessible names" or "focus is trapped".
- Bounce rate on mobile jumps > 10% week-over-week after launch.

**Phase to address:** Phase for "Newsletter on-site signup" — accessibility + mobile strategy are not follow-up work, they are the feature.

---

### Pitfall 4: A/B headline test cloaking via different content to Googlebot

**What goes wrong:**
A/B infrastructure picks variant server-side based on cookie or random assignment. Someone writes a rule like "if no cookie and UA is Googlebot, always serve variant A" — thinking it ensures Google sees "the canonical version". Google classifies this as cloaking. Manual action appears in Search Console. Organic traffic drops 30–60% within 2–4 weeks. Recovery after lifting the manual action takes 2–3 months of restored rankings.

Alternatively: client-side variant swap. H1 renders server-side, then JS mutates `document.querySelector('h1').textContent = variant`. Googlebot executes JS (it does), sees a different H1 than the SSR response, and the "original" indexed H1 is the SSR one. Meanwhile users see a flicker (CLS spike) where H1 changes 100–300ms after paint.

**Why it happens:**
Developers overthink SEO-safety and try to "protect" Google from seeing variants. Or they underthink it and swap client-side without understanding CLS impact and that Googlebot renders JS. Both Google's public A/B guidance (SearchEngineLand 2025) and Convert's documentation confirm: treat Googlebot like any other user, serve the same variant logic, and use canonicals.

**How to avoid:**
1. Never branch variant assignment on User-Agent or Googlebot detection. Googlebot is a user. If it gets variant B randomly, that's fine.
2. All variants must live at the same canonical URL. Do NOT create `/article?v=b`. Use the original URL, swap content server-side at render time.
3. Every variant MUST share the same `<link rel="canonical">`, same hreflang set, same metadata. Only the tested element (headline H1 + `<title>` if testing title) differs.
4. Render variants SSR in the Astro page (Astro supports SSR on demand via `export const prerender = false` for specific routes — but NOT for review/recipe/blog pages, because they're pre-built).
5. Because the entire site is static SSG, A/B must be implemented as: build-time multi-variant emission + edge-side variant selection (Cloudflare Worker at CDN) OR client-side assignment with variant content pre-rendered into the HTML in a hidden block and swapped BEFORE first paint (synchronous inline script in `<head>`). The synchronous-script approach avoids CLS but must run before the H1 paints.
6. Run the experiment for a fixed, pre-declared duration and sample size. Do not peek and stop early. Do not run > 1 experiment per page at the same time.
7. Keep the test short (2–4 weeks max) so Google doesn't index a specific variant as the canonical rendering.
8. Once the test concludes, ship the winning variant as the permanent content. Do not leave the A/B infrastructure running indefinitely on pages that won.

**Warning signs:**
- CLS score on tested pages > 0.1 (client-side swap flicker).
- Search Console manual action "Cloaking" notice — this is the nuclear warning.
- Organic impressions on tested pages drop >20% within 2 weeks of launch.
- Different variants ranking for different keywords simultaneously (signal Google is indexing each variant separately).
- Experiment "winner" has p-value 0.048 at day 3 (peeking → false significance).

**Phase to address:** Phase for "A/B headline testing infrastructure". SEO review must be part of phase acceptance criteria, not a follow-up.

---

### Pitfall 5: A/B test statistical invalidity on low-traffic editorial site

**What goes wrong:**
Team ships A/B infra, runs a headline test on a review page that gets 400 visits/week. After 5 days, variant B has 18 CTR vs variant A's 12. Team declares winner. Real effect: random noise; the review actually needed 6–8 weeks to reach statistical significance at that sample size. Six months of "winner" headlines later, nothing moved on real traffic or conversions.

Also common: multiple simultaneous tests on the same article (headline + CTA + hero image) with no multi-armed bandit or factorial design. Results are uninterpretable — you can't attribute any lift to any variable.

**Why it happens:**
A/B testing tools make it trivial to start tests but rarely enforce sample-size gates. Editorial sites have low per-page traffic — Pitmaster review pages get hundreds, not thousands, of weekly visits. Classical A/B tests assume large samples. Small-sample peeking is the number-one cause of false wins across the marketing tech industry.

**How to avoid:**
1. Compute required sample size BEFORE launching: for a page getting 400/week with baseline CTR 10% and MDE (minimum detectable effect) of 20% relative, required visitors per variant ≈ 3,900. That means 20 weeks. If you can't afford to wait, either raise MDE (only find big winners) or pool pages (test headline patterns across all reviews, not per-review).
2. Only test one variable at a time per page. If testing headlines AND CTA, use a factorial design — and be honest that it needs 4× the sample.
3. Use a pre-registered stopping rule: minimum N visitors per variant, minimum M days of test runtime, and only then evaluate. No peeking.
4. Compute statistical significance with the correct test (Fisher's exact for CTR proportions, not Student's t-test on means of per-session metrics).
5. Acknowledge that on 88 blog posts × 3 locales × 400 visits each, per-page testing is nearly impossible. Instead, test headline PATTERNS at the category level (all reviews, all recipes), pool traffic, learn about patterns not articles.
6. Persist variant assignment per user (cookie) so returning visitors see the same variant — not a fresh coin flip (that inflates variance).

**Warning signs:**
- "Winner declared" within first week of test on a page with < 1000 weekly visits.
- No documented pre-registration of sample size and stopping criteria.
- Declared lifts always in the 5–15% range (classic range of random noise at small samples).
- No one can answer "what's the power of this test?"
- Multiple tests running on the same page at the same time.

**Phase to address:** Phase for "A/B headline testing infrastructure" — statistical discipline is a design constraint, not a research topic.

---

### Pitfall 6: Recipe Collections content type misses Strapi v5 localization pattern

**What goes wrong:**
New `recipe-collection` content type is created with i18n enabled. First test article gets localized EN→IT via Ollama agent. IT version has slug `raccolta-grigliate-estive`, but when published the EN slug is used in the IT URL because the PUT request omitted the slug in the body — it only passed `?locale=it` in the query string. Result: `/it/recipe-collections/summer-grilling` exists in production for 3 days before Search Console starts showing soft 404s (EN title on IT URL) and the Umami bounce rate on IT collection pages shows users exiting in <5s.

Separately, when a recipe is deleted, its membership in collections is silently dropped by Strapi, but the collection page still renders because the relation still resolves to null in the first 5 items shown. Orphan collection: "Grilling with charcoal" collection now has 8 recipes instead of 10, but the page pretends nothing happened. Even worse — if the IT locale of a recipe is deleted but EN remains, the IT collection page shows a broken card where the recipe title is blank.

**Why it happens:**
CLAUDE.md convention: "Strapi v5 localizzazioni — PUT con ?locale=xx nel query param, sempre includere slug nel body." This is a LEARNED pattern from v1.0 bugs. Every new content type in v1.1 is a fresh opportunity to forget it. The content-type builder UI does not remind you.

The orphan issue is deeper: Strapi 5 localizations are modeled as sibling entries linked by a shared `documentId`, but relations are per-locale. A recipe collection → recipe relation in EN does not automatically apply to IT. The translation agent must re-establish each relation per locale, and if it doesn't, you get phantom collections.

**How to avoid:**
1. Write the localization PUT code path once, as a shared helper in `scripts/agents/lib/strapi_client.py`, used by every content type that has i18n. Include: query param locale, body slug, body-level relations.
2. Unit test (Python) that asserts: EN recipe collection with 10 recipes, translate to IT → IT collection must have the same 10 recipe references (resolved to their IT locale versions).
3. E2E test (Playwright) that asserts: `/it/recipe-collections/[slug]` renders with IT titles, IT slugs, and IT recipe cards.
4. Strapi lifecycle hook: on `recipe` delete, notify `recipe-collection` entries that referenced it and either (a) auto-remove from the collection, (b) flag for review. Don't silently allow broken references.
5. On the collection page, filter out null/missing references at render time AND log the missing ones to Sentry.
6. Sitemap generation: for `recipe-collection`, only include a URL if the collection has ≥ 3 published recipes in that locale. Otherwise skip — no thin content.
7. Hreflang: only emit a `hreflang` alternate if the collection actually exists in that locale with ≥ 3 published recipes. Do NOT emit `hreflang="it"` pointing to `/it/recipe-collections/foo` if IT version doesn't exist — that's the same class of bug that created 135 404s in Search Console (see conventions, "Hreflang").

**Warning signs:**
- Search Console shows "Submitted URL has crawl issue" on collection URLs.
- Soft 404s on collection pages (content present but Google classifies as empty).
- Umami shows <10s time-on-page on collection pages.
- Growth Engine translation agent logs show "slug missing in body" warnings.
- Manual QA: open `/it/recipe-collections/[slug]`, see EN titles in recipe cards.

**Phase to address:** Phase for "Recipe collections" — schema design + i18n contract + lifecycle hooks must all ship in that phase.

---

### Pitfall 7: Umami → agents feedback loop amplifies noise and stale data

**What goes wrong:**
Growth Engine v2 queries Umami daily to find "underperforming articles" and triggers a rewrite. Umami's data is based on the previous 24h, which on a 400 visits/week page means 50–60 visits. One article gets unlucky (shared on a slow Instagram day), drops to 20 visits, agent sees 66% dip, triggers a rewrite. Next week, traffic recovers to baseline — but now the article is also rewritten, so you can't tell whether the rewrite helped or the natural variance regressed. Agent keeps rewriting content chasing noise.

Second failure: Umami time zone is UTC by default, Strapi is also UTC, but the agent runs on Windows at `06:00 local time` (Europe/Rome, CEST = UTC+2). The "last 24h" query from 06:00 Rome = 04:00 UTC minus 24h = 04:00 previous day UTC. Missing 2 hours of data every day. Week-over-week comparisons drift.

Third failure: agent caches Umami query results for 24h "to save API calls". Decision at 06:00 Monday is based on data fetched at 06:00 Sunday. Growth Engine rewrites an article Tuesday based on Saturday's data. Feedback loop lags reality by 3 days.

**Why it happens:**
Umami is lightweight and self-hosted — devs assume data quality is a given. But low-traffic editorial sites have naturally high variance. Agents trained on marketing analytics blog posts assume 10k+ daily sessions. Time zones in cron jobs are a classic footgun. Aggressive caching to "be nice to APIs" defeats the purpose of a feedback loop.

**How to avoid:**
1. Require minimum sample size before any agent decision: 500+ visits OR 4 weeks of data, whichever comes first. Below that, agent abstains.
2. Use 7-day rolling window for comparisons, not 24h. Smooths variance.
3. Use percentile-based thresholds, not absolute: "bottom 20% of the content catalog" instead of "< 100 visits".
4. Set Umami query time zone explicitly to `Europe/Rome` in every query. Document this in agent config.
5. Cache TTL on Umami queries = 1 hour max. Editorial decisions can wait one hour; they can't wait one day.
6. Never trigger a rewrite based on one metric. Require: low traffic AND low engagement AND no recent edits. Multi-signal decisioning.
7. A/B anything the agent rewrites (canary 10% traffic for 2 weeks before full rollout) — so you can measure whether the agent helped or hurt.
8. Log every agent decision to a local file (`scripts/agents/state/umami_decisions.jsonl`) with the raw data that drove it. Allows post-hoc debugging.
9. GDPR / privacy: Umami is cookieless and PII-free by default — do not add custom events that include query strings, user emails, form inputs. Agent queries must never request per-user data.

**Warning signs:**
- Same article rewritten > 2× in a month.
- Agent decisions show temporal periodicity matching natural traffic patterns (Sunday dips trigger Monday rewrites).
- Umami dashboard disagrees with agent state file on visit counts for the same time range.
- Rewrites happen but aggregate traffic doesn't move.
- Decision state file shows < 500 visits in the basis for decisions.

**Phase to address:** Phase for "Analytics feedback loop" — statistical guardrails and time zone discipline must be in the design doc for the phase, not learned post-launch.

---

### Pitfall 8: Webhook rebuild cascade on every A/B variant tweak

**What goes wrong:**
A/B variants are stored as Strapi content (new field on blog-post/review/recipe: `headline_variants: json`). Editor tweaks a variant, hits Save, Strapi publishes, webhook fires, `/opt/webhooks/scripts/deploy-bbqexperience.sh` rebuilds the whole Astro site. Full site rebuild takes ~4 minutes. During iteration, editor makes 10 variant tweaks in a row → 10 rebuilds queued. Deploy log fills up. Worse: if two rebuilds race, the later one can ship with a broken build-time env var that the first one resolved correctly.

Separately, the variant assignment logic needs to run at request time (per user), but the site is SSG. Every variant change requires rebuild. Cannot iterate on test content without waiting for deploy.

**Why it happens:**
Content → rebuild is a correct pattern for editorial content (article body changes) but wrong for variant metadata (which is a parameter of an experiment, not content). The webhook config in `/opt/webhooks/hooks.json` doesn't distinguish between content types.

**How to avoid:**
1. Store A/B variants separately from main content. Options:
   - (a) A new Strapi content type `ab-experiment` that is NOT in the webhook rebuild trigger list. Frontend fetches variants at request time via edge function (Cloudflare Worker) or at build time but with a partial-rebuild mechanism.
   - (b) Variants stored in a Cloudflare KV or D1 (separate data layer, not in Astro build).
2. Add Strapi lifecycle hook: content-type whitelist for webhook trigger. Editing `ab-experiment` does NOT fire the webhook.
3. Debounce rebuilds at webhook level: collapse multiple pushes within 60s to a single rebuild.
4. Separate "preview variant" mode (querystring `?ab_preview=variant_b`) so editor can see variants without changing production.
5. Decide upfront: is the variant assignment client-side (static HTML has all variants, JS selects) or edge-side (Cloudflare Worker)? Client-side is simpler, edge-side avoids flicker.

**Warning signs:**
- Webhook log `/opt/webhooks/logs/bbqexperience.log` shows > 3 rebuilds per hour during editorial work.
- Editor complains "it takes 4 minutes to see my change".
- Build queue errors: "previous build still in progress".
- Site briefly 500s during deploy because a variant update triggered rebuild during image regeneration.

**Phase to address:** Phase for "A/B headline testing infrastructure". Must be addressed BEFORE the A/B feature, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip double opt-in on newsletter ("just track consent server-side") | Higher signup conversion (~20% uplift) | GDPR exposure; Brevo sender reputation decay; 6 months later, weekly newsletter lands in spam | **Never** (EU audience) |
| Client-side-only A/B variant swap (JS mutates H1 after paint) | Fastest to ship; no edge infra | CLS spike (fails Lighthouse 90+ target); flicker visible to readers; possible SEO issue if Googlebot's render catches wrong variant | Only for elements below the fold (CTA button copy, not H1/title) |
| Use in-memory Map for signup rate limiting | Skip SQLite setup | Container restart wipes state; first 5 requests after every restart bypass rate limit | **Never** (CLAUDE.md convention explicitly forbids it) |
| Include all filter combinations in sitemap because "more URLs = more SEO" | Feels like coverage | Crawl budget destroyed; canonical reviews de-prioritized by Google | **Never** |
| Peek at A/B results daily and ship early winners | Fast iteration narrative | 80%+ of declared winners are noise; six months of "optimization" moves nothing | When running a non-SEO experiment with pre-registered sequential-testing framework (mSPRT / Bayesian) — not our case in v1.1 |
| Use same webhook for all Strapi content including A/B experiments | One less config touchpoint | Editor iterations stall every 4 minutes; race conditions on concurrent saves | **Never** — v1.1 introduces too many content-type writes to keep the blanket trigger |
| Skip localized consent text (show EN only on all locales) | Saves translation time on 4 signup forms | IT/ES users cannot give legally valid consent (language comprehension requirement); Garante exposure | **Never** — site already supports i18n, cost to add is minutes |
| Build exit-intent modal without `role="dialog"` + focus trap | Faster to ship | WCAG 2.2 failure; EU Accessibility Act exposure (in force June 2025 for EU commerce); keyboard users locked out | **Never** |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Brevo signup API** | Fire-and-forget POST from browser with API key in client code | Server-side POST from Astro endpoint with Brevo key from env var; return anonymized success/failure; use SDK timeout (`AbortSignal.timeout(10_000)` per CLAUDE.md convention) |
| **Brevo DOI** | Use Brevo's default English DOI email template for all users | Create 3 DOI templates (EN/IT/ES) and pick by user locale at signup time; update them together when branding changes |
| **Brevo rate limits** | Assume unlimited because free tier "is generous" | Explicit per-endpoint limits apply (Feb 2026 changelog). Batch contact updates; retry with exponential backoff on 429. Already handled in agent retry helper — reuse it, don't re-implement |
| **Umami API** | Call Umami API from every page render to drive A/B variant decisions | Umami is for batch analytics; query it from agents on cron schedule, cache results, feed into agent state. Never call from the hot path |
| **Umami + Growth Engine bot traffic** | Allow Growth Engine agent scripts to hit live pages and pollute Umami stats | Agents query Strapi API directly or use a UA that Umami is configured to ignore. Verify Umami dashboard: total pageviews should not spike on cron minutes |
| **Strapi i18n PUT** | PUT body contains `{ slug: "..." }` without `?locale=it` → writes to EN | Shared helper `strapi_client.update_localized(id, locale, data)` that always sets `?locale=` query + slug in body. CLAUDE.md convention |
| **Strapi relations across locales** | Create recipe-collection EN with 10 recipe refs, translate to IT, relations are empty | Translation pipeline must re-link recipe refs in IT to their IT locale counterparts (resolve via shared `documentId`) |
| **Pagefind index** | Rebuild Pagefind on every webhook → 4min builds become 6min | Pagefind only needs rebuild when content (blog/review/recipe/tutorial) changes. Do NOT rebuild when only `ab-experiment` content changes. Webhook-type-aware trigger. |
| **Sitemap + filters** | Auto-include all filter URLs as "they exist" | Sitemap only includes canonical URLs (reviews index, individual reviews, taxonomy landing pages with real search demand). Never filter permutations. |
| **Hreflang + recipe collections** | Emit hreflang for all 3 locales even when 2 are empty | Only emit `<link rel="alternate" hreflang="it" ...>` if the IT collection has ≥ 3 published recipes. Same rule as applied in v3.2 hreflang fix |
| **Cookie consent banner + newsletter modal** | Both show simultaneously; modal traps focus behind consent banner | Suppress newsletter modal until consent has been granted/declined; layer management via single modal controller |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Client-side review filtering hydrates all 25 reviews + images on /reviews** | Large JS payload (>150KB); LCP > 2.5s on mobile | Server-side filter on an SSR endpoint, or static pre-built taxonomy pages + Pagefind-style client search. Only hydrate the filter widget, not the result list | At ~50 reviews or first slow-3G user load |
| **Exit-intent modal loaded in main bundle for every page** | INP regression on article pages by 50–100ms; JS parse time on low-end Android +200ms | Lazy-load modal JS on first scroll-50%, not on DOMContentLoaded. Use dynamic `import()` | Immediately on any mobile device (modal rarely fires, JS cost is 100% of users) |
| **A/B variant stored as large JSON blob fetched per-request** | TTFB +100–200ms per pageview; Cloudflare cache-miss storms on new deploys | Emit variants at build time (each variant as a separate pre-rendered HTML block); client picks via cookie assignment | When variants are fetched from Strapi per page (SSR, not SSG path) |
| **Pagefind rebuild on every publish including `ab-experiment`** | Deploy time goes 4min → 8min → 12min | Webhook classifies content types; Pagefind only rebuilds when searchable content changes | Immediately — every A/B edit doubles deploy time |
| **Umami query inside agent triggered per-article on every cron run (e.g., for each of 88 blog posts)** | Umami API hits 429; agent runs fail intermittently | Fetch aggregate dashboard once per cron run, filter client-side in agent memory. One query, not N | On days when blog post count grows past ~50 (you're already there) |
| **Recipe collection page loads all recipe details eagerly** | First collection page with 20 recipes = 20 image loads (LCP > 3s on mobile) | Collection detail page loads cards (title, hero image, 1 line summary) from a projection endpoint; full recipe only on click | At collection size ≥ 8 recipes |
| **Newsletter inline form included on EVERY article including 404 + privacy + terms** | Brevo-domain DNS prefetch on every page; tiny but cumulative | Include only on blog/review/recipe/tutorial pages; omit on legal/system pages (already a CLAUDE.md rule for JSON-LD, same pattern) | Never technically "breaks" but wastes ~10KB per non-article pageview |
| **Double opt-in confirmation link goes through Brevo's tracking redirect then to Astro, which rebuilds site before showing confirmation** | First confirmation can take 4+ minutes if it races with a rebuild | Confirmation page is served by a small Astro SSR endpoint (not part of SSG rebuild), pulls status from Brevo API directly | On any day with active editorial work + confirmation traffic |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Brevo API key in client-side code for newsletter signup | Attacker extracts key, sends spam on your domain; sender reputation destroyed | Server-side endpoint (Astro SSR route) with key from `process.env.BREVO_API_KEY`; endpoint rate-limited via SQLite (CLAUDE.md convention) |
| No honeypot on newsletter form | Bots flood Brevo with fake signups → GDPR requests from real people who never signed up; sender reputation hit | Hidden field with CSS-displaced-offscreen + `tabindex="-1"` + `autocomplete="off"`; server rejects if populated. Invisible to screen readers if done correctly (not `display:none`, use `position:absolute;left:-9999px` + `aria-hidden="true"`) |
| Exit-intent modal captures email but sends before HTTPS certificate check (on dev build accidentally shipped) | Email leaked in plaintext | All form POSTs validated in CI: endpoint is HTTPS; deploy smoke test fails if any form action points to HTTP |
| A/B variant assignment cookie not marked `Secure; SameSite=Lax; HttpOnly` | XSS can read assignment, flip users into test manipulation; CSRF possible | All cookies set from server explicitly; never from client JS. `Secure; HttpOnly; SameSite=Lax` for assignment cookies |
| Filter query params reflected unsanitized into JSON-LD or meta tags | XSS via crafted URL sent to user via email | Server-side allowlist of filter param names AND values (enumerated brand/category/price/score tokens); anything outside allowlist → 404 |
| Umami admin credentials in env file committed to repo | Dashboard compromise → analytics tampering, data exfiltration | Already rotated per v3.2. Enforce: `.env.windows` gitignored (CLAUDE.md convention), secret scanning in CI (add to phase acceptance) |
| Recipe collection allows embedding `<script>` in user-provided description | XSS on collection pages | Strapi field-level sanitization on rich text; Astro's `renderMarkdown()` (CLAUDE.md convention: markdown rendering CMS) — do NOT bypass to `set:html` with raw content |
| A/B preview mode (`?ab_preview=`) accessible in production without auth | Competitors/public can preview all variants | `?ab_preview=` requires a signed token or basic auth; reject without auth in production; allow freely only on staging |
| Subscriber PII (email, IP, locale, consent timestamp) stored in Strapi without encryption at rest | DB compromise → full GDPR Art. 33 breach notification within 72h | DB-level encryption on the subscriber table OR store only a Brevo contact ID server-side (no email). Review Strapi `subscriber` content type fields |
| No right-to-erasure endpoint for newsletter subscribers | GDPR Art. 17 violation; Garante complaint exposure | `/unsubscribe` page that accepts the Brevo unsubscribe link AND a "delete my data entirely" option that calls both Brevo delete + Strapi delete; logs erasure event |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Newsletter signup success modal blocks the article the user was reading | User came to read, now is interrupted by their own success; back button often closes the tab | Inline success state on the form itself (form becomes "Thanks! Check your inbox to confirm"); no modal interrupt |
| Filter UI with no "clear all" or result count | User applies 4 filters, sees zero reviews, can't figure out why | Live result count ("12 reviews matching"); "Clear filters" button; empty-state message that tells them WHICH filter is most restrictive |
| Filter checkboxes without keyboard/touch affordance | Keyboard users can't navigate filter group; touch users mis-tap adjacent options | `<fieldset>` + `<legend>` grouping; 44px min touch target; `aria-describedby` linking to result count |
| Recipe collection shows 3 recipes from 10 with "+7 more" link that leads to a duplicate of the current page | User clicks expecting more content, lands on the same view | Collection detail page is THE page; don't truncate on detail, only on related-collections widgets |
| A/B test shows different headlines on the index and detail page of the same article | User clicks headline A on index, reads headline B on detail → confusion, bounce | Variant assignment persists per user (cookie); same variant on index, detail, social share cards |
| Exit-intent modal on mobile blocks the back gesture area | iOS/Android back gesture doesn't work; user tries 3× before force-closing | Don't use modal on mobile at all (see pitfall #3); or ensure modal close zone doesn't overlap swipe-back 20px edge |
| Newsletter signup form has no indication of frequency ("weekly" isn't shown) | User unsubscribes within 2 weeks because they expected monthly | Explicit "One email per week, weekly BBQ roundup. Unsubscribe anytime." below the field, localized |
| Review filter state is lost on back-navigation from a review | User browses to review, clicks back, filters are reset | Store filter state in URL query params (shallow) AND preserve scroll position; use Astro View Transitions where possible |
| A/B test headline differs from social share card (OG title) | User shares via variant B, friend sees the generic/variant A og:title | Social share cards regenerated with the variant the sharing user saw; OR pick one og:title and keep it stable across variants |
| Localized newsletter consent text is a Google-translated blob | Italian copy reads awkward; trust signal destroyed on the most-critical micro-copy | Native-speaker copy (Matteo) for consent; treat it with the same care as hero copy |
| Cookie banner + newsletter modal + scroll-reveal animation all fire in first 3 seconds | First-time visitor drowns in UI | Sequence: cookie banner (mandatory) → wait for interaction OR 50% scroll → newsletter modal only if consent granted. Never overlap |

---

## "Looks Done But Isn't" Checklist

- [ ] **Newsletter signup inline form:** ships, confirms client-side, but server endpoint never actually writes to Brevo due to missing env var in production Dockerfile (CLAUDE.md convention: env vars must be both ARG in Dockerfile AND -e in docker run). Verify: actual signup on production creates a Brevo contact within 30s.
- [ ] **Newsletter DOI:** "works in EN" but IT/ES templates fall back to EN copy. Verify: sign up from `/it/newsletter`, confirm DOI email arrives in Italian with localized unsubscribe link.
- [ ] **Exit-intent modal:** triggers on desktop, never tested with NVDA/VoiceOver/TalkBack. Verify: screen reader announces modal on open, focus moves, Escape closes, focus returns.
- [ ] **Review filters:** UI works, but indexed Google URLs have no canonical. Verify: `curl -sI https://bbq-experience.com/en/reviews?brand=weber | grep -i canonical` → points to `/en/reviews`.
- [ ] **Review filters:** filter by brand works, but the IT locale filter labels are in EN. Verify: `/it/reviews` shows "Marca", "Categoria", "Prezzo", "Punteggio" not "Brand", "Category", "Price", "Score".
- [ ] **Recipe collections:** EN page publishes, IT page reachable but has EN content. Verify: PUT includes `?locale=it` + slug in body; IT page has native IT titles.
- [ ] **Recipe collections:** collection renders with 10 cards, but 2 recipes have been deleted → null reference errors in console, Sentry silent. Verify: intentional delete of a member recipe shows graceful card omission + Sentry alert.
- [ ] **Hreflang on collections:** emits all 3 locale alternates even when IT/ES versions don't exist. Verify: collection with only EN version emits only `hreflang="en"` + `hreflang="x-default"`.
- [ ] **Umami → agents:** cron job runs on Windows in Rome time, but agent code assumes UTC. Verify: Umami query range in logs matches the documented Rome timezone expectation.
- [ ] **Umami → agents:** agent triggers a rewrite, but no evidence the rewrite improved metrics because no A/B or canary. Verify: every rewrite is paired with a measurement plan.
- [ ] **A/B variant rendering:** variant B renders, but `<meta property="og:title">` still shows variant A. Verify: all meta tags reflect the assigned variant.
- [ ] **A/B variant SSR:** variants render client-side, CLS > 0.1 measurable in Lighthouse. Verify: Lighthouse run with & without variant shows CLS difference ≤ 0.02.
- [ ] **A/B variant persistence:** cookie assignment not set, user gets different variants across page navigation. Verify: assign variant, navigate 3 pages, cookie sets once, same variant served each time.
- [ ] **A/B variant respects `Do-Not-Track` / opted-out analytics users:** test participation tied to analytics consent. Verify: DNT=1 or consent declined → user forced to control variant, not counted in experiment.
- [ ] **Webhook rebuild:** A/B variant edit triggers full rebuild. Verify: editing `ab-experiment` content type does NOT appear in `/opt/webhooks/logs/bbqexperience.log` as a rebuild trigger.
- [ ] **Pagefind index:** rebuilds include the filter URLs → search returns results that 404 once clicked. Verify: Pagefind only indexes canonical URLs.
- [ ] **Sitemap:** includes `/reviews?brand=weber` and similar. Verify: `curl https://bbq-experience.com/sitemap.xml | grep '?'` returns nothing.
- [ ] **Sitemap:** recipe-collection URLs with <3 recipes still appear. Verify: sitemap only lists collections ≥ 3 published recipes in that locale.
- [ ] **GDPR data export / erasure:** newsletter signup confirms compliance but no path for a user to request deletion. Verify: manual test — a user emails privacy request, team can delete within 30 days (Art. 17 timeline).
- [ ] **Lighthouse post-v1.1:** all pages scored before v1.1 still scored after. Verify: DES-04 re-measured post-ship, not only post-debt-phase.
- [ ] **Bot/agent traffic in Umami:** agents running cron pollute analytics. Verify: Umami dashboard totals exclude known bot UAs + scripted-agent UAs.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Filter URLs got indexed by Google | MEDIUM (weeks) | 1. Add canonical + noindex on all filter URLs (must be CRAWLABLE, so NOT blocked in robots.txt yet). 2. Resubmit sitemap with only canonical URLs. 3. Wait 4–8 weeks for reprocessing. 4. Once de-indexed, ADD robots.txt block to save future crawl. Do NOT robots.txt block first — Google can't see noindex if the page is blocked. |
| Brevo sender reputation tanked | HIGH (2–3 months) | 1. Identify source: check DOI confirm rate, spam complaints. 2. Remove unconfirmed/stale subscribers (> 30 days unopened). 3. Send re-permission campaign to remaining list. 4. Warm up from low volume. 5. Consider dedicated Brevo sub-account for transactional vs. marketing. |
| A/B test got flagged as cloaking (Search Console manual action) | HIGH (2–3 months of restored rankings) | 1. Remove all user-agent-based variant branching immediately. 2. Ensure all variants share canonical. 3. Request reconsideration in Search Console with written remediation. 4. Rankings typically return 4–12 weeks after lift; some queries may not fully recover. |
| Recipe collection hreflang bug generated 404s in Search Console | LOW (days) | 1. Fix: only emit hreflang alternates that actually resolve. 2. 301-redirect any 404-alternate URLs already indexed to the canonical collection OR return proper 404 with a helpful page. 3. Resubmit sitemap. Proven pattern from v3.2 hreflang fix. |
| Agent rewrites chasing noise → content quality drifts | MEDIUM (weeks) | 1. Freeze agent content generation for affected articles. 2. Review each auto-rewritten article manually. 3. Restore from Strapi revision history (if enabled) or Git history of Growth Engine logs. 4. Add statistical guardrails before re-enabling. |
| Exit-intent modal caused mobile bounce rate spike | LOW (hours) | 1. Disable modal on mobile via feature flag. 2. Ship fix: mobile gets sticky footer or inline variant. 3. Monitor bounce rate for 7 days. Keep desktop modal if accessibility confirmed. |
| GDPR complaint filed with Garante | HIGH (legal + reputation) | 1. Immediate: document all consent records for the complainant. 2. If found insufficient: delete + notify. 3. Art. 33: evaluate if breach notification is required. 4. Engage DPO/counsel. Prevention is orders of magnitude cheaper. |
| Webhook rebuild storm | LOW (minutes) | 1. SSH to Hetzner, check `/opt/webhooks/logs/bbqexperience.log`. 2. Kill hanging docker builds. 3. Add debounce to `/opt/webhooks/scripts/deploy-bbqexperience.sh` (wait 60s then rebuild once). 4. Ship the webhook whitelist change to exclude `ab-experiment`. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. Phase names are placeholders to be assigned in ROADMAP.md.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Faceted filter indexable URL explosion | Review filters & taxonomy phase | Search Console shows no `?brand=` / `?category=` URLs indexed 2 weeks post-ship; canonical header test in CI |
| Single-opt-in GDPR violation | Newsletter signup phase | DOI confirmation template active in EN/IT/ES; server-side consent record exists; legal review sign-off |
| Exit-intent modal a11y + mobile false trigger | Newsletter signup phase | NVDA/VoiceOver manual test passes; Umami shows modal-shown count < 1.2× session count on mobile; Lighthouse a11y = 100 |
| A/B cloaking / canonical violation | A/B headline testing phase | No user-agent branching in code (grep); all variants share canonical URL (E2E test); manual canonical inspection of 10 live tests |
| A/B statistical invalidity | A/B headline testing phase | Sample-size calculator in code; stopping rule documented per test; no test declared winner with < required N; peer review |
| Strapi i18n slug-in-body for new content type (recipe collections) | Recipe collections phase | Shared `update_localized` helper used; Playwright test asserts IT collection has IT slugs + IT titles |
| Orphan collection on recipe delete | Recipe collections phase | Strapi lifecycle hook tested; intentional delete → card omitted + Sentry event |
| Umami feedback loop noise | Analytics feedback loop phase | Minimum-sample-size guardrail in code; 7-day rolling window; decision log shows no rewrite with < 500 visits basis |
| Webhook rebuild cascade on A/B edits | A/B headline testing phase (must land BEFORE A/B feature) | Editing `ab-experiment` does NOT appear in webhook log as a rebuild trigger |
| Collection hreflang mismatches | Recipe collections phase | Reuse v3.2 hreflang helper (`getLocalizedPath` + existence check); sweep_pages audit passes |
| Newsletter PII storage / right-to-erasure | Newsletter signup phase | `/unsubscribe` endpoint deletes from both Brevo and Strapi; documented in privacy policy (EN/IT/ES) |
| Bot traffic polluting Umami | Analytics feedback loop phase | Umami excludes agent UAs; dashboard total matches expected user sessions within 5% of Cloudflare analytics |
| Performance regression (LCP/CLS/INP) from new features | All feature phases; explicit verification in debt-closure Lighthouse re-measurement phase | Lighthouse 90+ maintained across all pages post-each-phase; ship-gate in phase acceptance criteria |
| Localized consent text missing | Newsletter signup phase | Playwright test visits `/it/newsletter` and `/es/newsletter`, asserts consent checkbox text matches locale |

---

## Sources

- [Google Developers: Managing crawling of faceted navigation URLs](https://developers.google.com/crawling/docs/faceted-navigation) — authoritative canonical/noindex pattern for facets
- [Search Engine Land: Faceted navigation SEO guide](https://searchengineland.com/guide/faceted-navigation) — 2026-refreshed best practices after URL Parameters tool removal
- [Brevo: Guidelines for a GDPR-compliant sign-up form](https://help.brevo.com/hc/en-us/articles/360000454204-Guidelines-for-a-GDPR-compliant-sign-up-form) — official DOI requirements
- [Brevo: Double opt-in (DOI): What it is and how to track user sign-ups](https://help.brevo.com/hc/en-us/articles/208733449-Double-opt-in-DOI-What-it-is-and-how-to-track-user-sign-ups) — event logging for consent proof
- [Brevo API Rate Limits documentation](https://developers.brevo.com/docs/api-limits) — Feb 2026 dedicated endpoint limits
- [Brevo GDPR compliance page](https://www.brevo.com/company/gdpr/) — EU data residency (France/Germany)
- [SearchAtlas: SEO Split Testing Risks — Cloaking & Canonical Tag Dangers 2026](https://searchatlas.com/blog/dangers-seo-split-testing-cloaking-canonical-risks-2026/) — documented 40% traffic drop case study for UA-based variant serving
- [Convert: A/B Testing Doesn't Impact SEO (If You Do It Right)](https://www.convert.com/blog/a-b-testing/ab-testing-doesnt-impact-seo/) — canonical + same-URL variant pattern
- [Google's SEO Guide On A/B & Multivariate Testing (Search Engine Land)](https://searchengineland.com/googles-seo-guide-on-ab-multivariate-testing-130093) — "don't special-case Googlebot"
- [Dynamic Yield: Impact of A/B Testing and Personalization on SEO](https://www.dynamicyield.com/lesson/impact-of-ab-testing-on-seo/) — 302 redirect guidance for URL-variant tests
- [Wally: How To Build Accessible Exit-Intent Modal Popups](https://wallyax.com/blog/how-to-build-accessible-exit-intent-modal-popups) — role=dialog, aria-modal, focus trap, Escape
- [TPGi: The current state of modal dialog accessibility](https://www.tpgi.com/the-current-state-of-modal-dialog-accessibility/) — focus management patterns (2025)
- [Claspo: Exit-Intent Popups on Mobile](https://claspo.io/blog/exit-intent-popups-on-mobile/) — mobile false-positive triggers; non-modal alternatives
- [Privy: Does Exit Intent Work on Mobile?](https://www.privy.com/blog/does-exit-intent-work-on-mobile) — double-tap tab switch false-fire pattern
- [Strapi 5 i18n Complete Guide](https://strapi.io/blog/strapi-5-i18n-complete-guide) — `localizations` relationship for hreflang; Screaming Frog verification of orphan locales
- [Strapi 5: Internationalization Documentation](https://docs.strapi.io/cms/features/internationalization) — locale query param pattern
- [Strapi 5: Locale REST API](https://docs.strapi.io/cms/api/rest/locale) — `?locale=xx` convention
- [Strapi forum: Localization key not defined on new collection type](https://forum.strapi.io/t/strapi-v5-localization-key-not-define-new-collection-type/52812) — new content-type gotcha
- Internal: `C:\Users\Matteo\Desktop\Progetti\bbqexperience\CLAUDE.md` Conventions section — Strapi v5 localization, fetch timeouts, markdown rendering, hreflang calculation, cross-locale anchors, SQLite rate-limit, atomic file writes, webhook deploy
- Internal: `.planning/PROJECT.md` — v1.0 validated requirements, v1.1 active scope, Lighthouse 90+ constraint, tech debt inventory

---

*Pitfalls research for: v1.1 Content Depth & Growth Loop — adding newsletter capture, review filters, recipe collections, analytics feedback loop, A/B headline testing to existing production editorial site*
*Researched: 2026-04-15*
