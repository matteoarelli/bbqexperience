# Feature Research — v1.1 Content Depth & Growth Loop

**Domain:** Editorial portal (BBQ niche) — 5 new feature buckets on top of shipped v1.0
**Researched:** 2026-04-15
**Confidence:** HIGH (newsletter, filters, collections), MEDIUM (A/B bandits, analytics loop — less prior art in editorial vs ecommerce)

> This document supersedes the v1.0 feature research (previously at this path). v1.0 research archived in milestone v1.0 phase notes.

---

## Scope Recap

Five feature buckets for v1.1, layered on the live v1.0 site (25 reviews, 23 recipes, 88 blog posts across EN/IT/ES):

1. **Newsletter on-site signup** (multi-surface capture → Brevo)
2. **Review filters & taxonomy** (brand + category + price + score)
3. **Recipe collections** (new Strapi content type, curated groupings)
4. **Growth Engine v2 analytics loop** (Umami → agents)
5. **A/B headline testing** (blog + reviews + recipes + newsletter subjects)

Shipped v1.0 primitives already in place that these buckets depend on: Strapi 5 content types, i18n EN/IT/ES, Pagefind search, Growth Engine 9 agents, Umami self-hosted, Brevo account (backend-only), Svelte 5 islands pattern, SQLite rate-limit.

---

## Bucket 1 — Newsletter On-Site Signup

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inline form at end of article | Every modern editorial site has it — NYT, Wirecutter, Serious Eats, Bon Appetit all close articles with a topical newsletter plug | **S** | Astro component rendered after article body on BlogPost/Review/Recipe/Tutorial detail pages. Email-only field. 4.82% avg signup rate per 2026 Omnisend data |
| Dedicated `/newsletter` landing page | Users search "[brand] newsletter" directly; needed for social bio links and IG story CTA | **S** | 3-locale static page. Value prop + sample content + form. Owns meta title/description + OG image for shareable link |
| Double opt-in (DOI) flow | GDPR compliance (EU audience), Brevo's recommended pattern, prevents bot signups | **S** | Brevo's native DOI on the list handles it. Our frontend just POSTs to Brevo API (or captures → Brevo contact with `attributes.OPT_IN=false` → DOI email from Brevo template) |
| One-click unsubscribe | GDPR Article 7 — must be as easy to leave as join. Gmail/Apple require List-Unsubscribe header too | **S** | Brevo adds unsubscribe link + List-Unsubscribe header automatically on all sends. Nothing to implement on our side beyond ensuring it's not stripped |
| Welcome email (immediate) | Sets expectation, confirms opt-in, delivers promised lead magnet | **S** | Brevo automation triggered by list-add event. Markdown → HTML template with our brand, link to top 3 reviews/recipes/tutorials |
| Privacy policy link + consent checkbox | GDPR lawful basis (consent). Must link to existing `/privacy` page | **S** | Unchecked-by-default checkbox ("I agree to receive the BBQ Experience newsletter and accept the [privacy policy]"). Record timestamp + IP server-side for consent proof |
| Success + error states | User needs confirmation the form submitted; errors must be actionable ("Check your email", "That address is already subscribed") | **S** | Inline message replacing form on success, field-level errors on validation. Svelte island for the form |
| Honeypot or basic bot protection | Open signup forms attract bots; dirty list kills deliverability | **S** | Hidden honeypot field + SQLite rate-limit (1 signup per IP per 60s). Avoid reCAPTCHA — hurts UX + GDPR concerns |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Exit-intent modal (desktop only) | Captures leaving readers — top editorial exit-intent conversions hit 19.77%. Makes sense for this site because content depth is the draw and readers otherwise bounce after one article | **M** | Desktop-only: mouse-leave-to-top trigger. On mobile, exit-intent is unreliable (no cursor) — use scroll-up-fast + tab-switch heuristics instead, OR skip mobile entirely and lean on inline + sticky footer. Frequency cap: 1 show per 7 days per visitor (localStorage flag). Never show on first page of session (let readers read first). Suppress if already subscribed (localStorage flag set on success) |
| Sticky footer bar | Persistent low-friction CTA that doesn't block content. Works on mobile where exit-intent fails | **S** | Thin bar at viewport bottom ("Join 2.4k BBQ fans — weekly recipes + reviews"). Dismissible with X. Dismissal persists 30 days via localStorage. Hidden when other modals open. Hidden on `/newsletter` page (redundant) |
| Scroll-depth trigger (60% article) | Reader who scrolled 60% demonstrates interest — higher quality signup than random popup. Pairs well with existing reading-progress island | **M** | Reuses existing ScrollProgress Svelte island. Fires once per session at 60%, only on content detail pages (blog/review/recipe/tutorial). Show subtle inline CTA, not blocking modal. Suppressed if exit-intent already fired |
| Content-specific lead magnet | Reviews page offers "Top 10 grills under $500" PDF; recipe page offers "BBQ cheat sheet" PDF; tutorial offers "Temp control guide" — specific > generic. 30-50% lift per 2026 research | **M** | 3-4 PDFs created by Matteo, each tied to a page type. Astro middleware reads URL category → inline form passes `lead_magnet` attribute to Brevo contact → welcome automation delivers the right PDF |
| Preference center | Reduces unsubscribes: frequency choice (weekly/monthly) and topic choice (reviews/recipes/tutorials/news). #1 unsubscribe reason is "too much email" | **M** | Brevo list segments + an authenticated `/newsletter/preferences?token=xxx` page. Token = HMAC of email (so no account system needed). Updates Brevo contact attributes via API |
| Social proof counter | "Join 2,437 BBQ fans" — concrete numbers lift conversion 20-30% per Omnisend | **S** | Cached Brevo contact count, refreshed daily via cron. Only show when count > 500 (before that, vanity metric backfires) |
| Multi-language forms (EN/IT/ES) | Non-negotiable given existing i18n; forms + Brevo templates must match the reader's locale | **S** | i18n JSON keys for all form copy. Pass `locale` attribute to Brevo contact → Brevo sends locale-specific welcome + newsletter via template conditionals or separate lists per locale (simpler: 3 lists) |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Popup on page load / <3s delay | "More eyeballs = more signups" | Hurts bounce rate (Google Core Web Vitals penalty), annoys readers, violates best practice (never fire on load). 2026 data: specific value prop beats aggressive timing | Scroll-depth or exit-intent only. Never on load. |
| Intrusive fullscreen modal (Welcome mat) | Feels high-conversion | Destroys first impression for search-referral traffic. Google's interstitial penalty applies. Brand says "editorial authority," not "email trap" | Inline + sticky footer + single exit-intent. Respect first-time visitor. |
| 5-field form (name, country, interests, etc.) | "We can segment better" | Every field drops conversion 15-25%. Matteo is single author — segmentation value is low until list >5k | Email-only at signup. Profile completion CTA in welcome email (optional). |
| Account system to manage subscription | "Users expect accounts" | PROJECT.md explicitly rules out user accounts ("community lives on IG"). Builds GDPR burden, auth complexity, zero editorial value | HMAC-token preference center. No passwords. |
| In-article overlay blocking content | "Aggressive capture" | Google penalizes, reader bounces, hurts SEO authority (core brand goal) | Inline at end of article only. |
| Auto-resubscribe via dark patterns | "Recover unsubscribes" | Illegal under GDPR. Brand damage when discovered | Honor unsubscribes instantly. Re-engagement via separate winback campaign to existing list only. |
| On-site "Newsletter archive" of past issues | "SEO content reuse" | Past newsletter HTML rarely matches site visual standards; orphan pages dilute brand. Better to convert newsletter content into proper blog posts | Cross-post high-performing newsletter essays as blog posts (manual curation). |

### Dependencies

- **Privacy policy page**: already live at `/privacy` (per CLAUDE.md)
- **Brevo API access**: already used by weekly_newsletter.py agent
- **SQLite rate-limit**: shipped v3.1 (`src/lib/rate-limit.ts`) — reuse for signup endpoint
- **Astro SSR endpoint**: NEW — `/api/newsletter/subscribe` (POST) proxies to Brevo (hide API key server-side)
- **Brevo lists**: NEW — 3 locale-specific lists (or 1 list + locale attribute, then segments)
- **Brevo DOI template + welcome automation**: NEW — configure in Brevo UI, not code
- **Svelte 5 island**: NEW — `NewsletterForm.svelte` (reusable across 4 surfaces)
- **Preference center page + HMAC token utility**: NEW — shared secret in env vars

---

## Bucket 2 — Review Filters & Taxonomy

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Brand facet (multi-select) | Most common first filter on any review site. Wirecutter, Serious Eats equipment guides all start here | **M** | Requires Brand content type (already exists per CLAUDE.md: `brand_relation` on Product). Just need to surface it as facet. OR logic within the brand group |
| Category facet (grill / smoker / pellet / kamado / accessories) | Product type is the single most important taxonomy for BBQ — a "best grill" reader will not care about thermometer reviews | **M** | NEW taxonomy: extend Product content type with `category` relation or enum. Needs migration for 25 existing products. Matteo tags each manually (fast — <30 min) |
| Price range facet | Budget is a primary BBQ buying criterion. Typical slider or bucket ("Under $200", "$200-500", "$500-1000", "$1000+") | **M** | Product already has price? Verify schema. Buckets > sliders for mobile UX and for SEO (discrete URLs crawlable). Buckets also survive missing prices gracefully (show as "Price on request") |
| Score threshold facet ("8+ only") | Review-site-specific — readers want best-of-the-best shortcut. Pitmaster score already in data | **S** | Fixed options: "All / 7+ / 8+". Low cardinality keeps UI clean. Score is already computed field on Review |
| Product counts next to each option | "(47)" tells the shopper products exist; "(0)" warns of dead-end. 2026 consensus: prevents most common filter failure | **M** | Computed at build time (or on-demand in SSR) by counting matching reviews per facet combination. Requires joining Review × Product × Brand × Category |
| OR within group, AND across groups | "Weber OR Traeger" AND "Under $500" AND "Pellet" — the pattern every shopper expects per Algolia/NN/g research | **S** | Standard faceted query logic. Flatten to Strapi filter query: `$or` within group, `$and` across groups |
| Clear all filters | Users need a recovery button when over-filtered | **S** | Single "Clear all" link when any filter active. Keyboard-accessible |
| URL persistence (query params) | Bookmarkable, shareable, back-button-friendly, crawlable by Google. Non-negotiable for SEO | **M** | `pushState` updates `?brand=weber,traeger&category=pellet&price=200-500&score=8plus`. Astro SSR reads params → filters Strapi query → renders results. Canonical handling below |
| Mobile filter drawer (bottom sheet) | Mobile-first traffic. Inline filters don't fit mobile viewport. Bottom-sheet pattern dominates 2026 ecommerce | **M** | Svelte 5 island. "Filter" button opens drawer. Sticky "Apply (47)" button at bottom. Full viewport. Back gesture closes |
| Empty state UX | Over-filtered → "No products match" with "Clear filters" + suggested alternatives ("Try removing price") | **S** | Dedicated empty component. Offer "Browse all reviews" fallback. Critical for SEO — don't let Google index empty pages |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Facet counts update live without full reload | Feels instant, reduces perceived friction, matches Algolia-grade UX | **M** | Recompute counts from cached JSON of all review×facet matrix loaded client-side once. Avoids per-click roundtrip. ~10KB gzipped for 25 reviews, well under any budget |
| Canonicalize filtered URLs to avoid SEO bloat | Filtered combos (2^4 = 16+ combinations) would otherwise generate crawl traps per Search Engine Land | **M** | Rule: single-facet URLs get `canonical` = filtered URL (indexable). Multi-facet combos get `canonical` = base reviews URL (not indexable) + `noindex` meta. Or use robots.txt + GSC handling |
| Score threshold with "editor's pick" badge | Pitmaster 8+ score + editorial flag combined = "best of the best" shortcut | **S** | Add optional `editors_pick: boolean` on Review. Separate facet option "Editor's picks only" |
| Sort controls (score high→low, price low→high, newest) | Users who filter then want secondary ordering | **S** | Dropdown next to facets. Default: score desc. Encoded as URL param (`?sort=score_desc`) |
| Price range buckets localized | €/$/£ adjusted per locale (ES shows €, UK would show £). BBQ prices vary wildly by region | **S** | Product prices stored in one currency (EUR or USD). Display layer converts + formats per locale. No per-locale data entry needed |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Price slider (draggable) | "Feels modern" | Unusable on mobile (fat-finger precision), accessibility nightmare, creates infinite URL combinations killing crawl budget | Discrete buckets. 4-5 options max. |
| 15+ facets | "More filtering = better UX" | NN/g research: >7 facets fatigue users, inflate crawl URLs exponentially, dilute each facet's signal. 25 reviews don't support 15 facets | 4 facets for v1.1 (brand, category, price, score). Add only when content volume justifies |
| Color / material / weight facets | "Comprehensive like Amazon" | Editorial review site ≠ marketplace. Color irrelevant to buying decision for grills. Spec-level facets clutter UI | Spec data lives in SpecsTable on detail page, not as filter |
| Filter-as-you-type search within facets | "Scales to many brands" | With 25 reviews and ~15 brands, overkill. Adds JS weight + complexity | Static checkbox list. Revisit at 50+ brands |
| AI-generated filters per user | "Personalization!" | No user accounts (PROJECT.md). Implicit personalization = privacy/GDPR risk. Adds complexity for no measurable gain on static-site editorial | Same faceted UX for everyone. Consistent, cacheable, SEO-friendly |
| Separate filter page | "Clean listing page" | Extra click + navigation friction. Industry consensus 2026: filters on same page as results | Inline (desktop) + drawer (mobile). |

### Dependencies

- **Product content type already has `brand_relation`**: confirmed (per CLAUDE.md)
- **Product category taxonomy**: NEW — add `category` field (enum or relation) to Product schema. Strapi migration + re-tag 25 products
- **Price field verification**: verify Product schema has price. Add if missing (Matteo backfills 25 products)
- **Score field**: exists on Review (overall_score)
- **Build-time facet count computation**: NEW Astro integration or SSR endpoint
- **Pagefind integration**: shipped v1.0 — keep for free-text search; filters are orthogonal
- **Existing reviews listing page**: EXTEND `/reviews`, `/it/reviews`, `/es/reviews` with filter UI
- **SEO canonical/noindex handling**: NEW logic in SEOHead component

---

## Bucket 3 — Recipe Collections

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Collection as first-class content type | NYT Cooking, Bon Appetit, Serious Eats all have curated collections ("Summer Grilling", "Weeknight Dinners"). It's the primary editorial navigation mode for recipe sites | **M** | New Strapi content type `recipe-collection`. Fields: title, slug, description, cover_image, seo_*, recipes (many-to-many to Recipe), locale. i18n enabled |
| Cover imagery | Hero image sells the collection. Without it, collections feel like dry list pages | **S** | Single required `cover_image` field. Reuse existing OptimizedImage component |
| Manual ordering of recipes within collection | Editorial intent matters (sequence: appetizer → main → dessert, or beginner → advanced) | **S** | Strapi v5 has drag-to-reorder for relation fields, or store as `order` integer on the relation |
| Collection listing page (`/collections`) | Index of all collections, per-locale. Top-level nav item | **S** | Static Astro page. Grid of collection cards (cover + title + count). `/en/collections`, `/it/collections`, `/es/collections` |
| Collection detail page | Shows recipes in defined order with cover, intro, description | **M** | Template: hero cover + editor's intro + recipe grid. JSON-LD `CollectionPage` schema (already used elsewhere per CLAUDE.md) |
| Recipe card shows "Part of X collection" | Cross-link boosts internal linking + reader discovery | **S** | Reverse lookup: on Recipe detail page, fetch collections containing this recipe. Render as "Part of:" chip(s) |
| 3-locale support | Non-negotiable per project constraints | **M** | Strapi i18n plugin handles per-locale collection copy. Same recipes can appear in all locales; collection metadata (title, desc, slug) is translated |
| SEO: sitemap + hreflang | Collections are valuable landing pages for long-tail searches ("best BBQ sides recipes") | **S** | Include in existing sitemap generation. hreflang per locale (reuse SEOHead pattern) |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Seasonal / themed collections with publish dates | NYT Cooking flags "Summer 2026" collections — creates recurring content hooks | **S** | Optional `published_at` + `season` enum (spring/summer/fall/winter/any). Sort by most recent on listing page |
| Author's note at top of collection | Bon Appetit "Basically" pattern — editorial voice elevates beyond list | **S** | Rich-text `intro` field. Renders above recipe grid. Personal, conversational, signed by Matteo |
| Featured / hero collection on homepage | Editorial promotion slot, drives session depth | **S** | `is_featured` boolean or homepage hand-picks by slug. Existing FeaturedHero component extended |
| Collection-level filter within (difficulty, cook time) | Power user refines inside collection when it grows >15 recipes | **S** | Reuse Recipe facet primitives (if Recipe already has difficulty + cook_time fields — verify). Only show filters if collection has >10 recipes |
| Save/bookmark collection for later | Encourages return visits without requiring accounts | **M** | localStorage-based bookmark (already have `/bookmarks` page per CLAUDE.md). Extend to save collections alongside recipes |
| Collection RSS feed | BBQ nerds want to know when Matteo ships a new collection | **S** | Standard Astro RSS generation. `/en/collections/rss.xml` etc |
| "From the community" thumbnail strip | Pulls Instagram posts tagged with collection topic (existing IG integration) | **M** | Reuse existing InstagramFeed component with hashtag filter matching collection slug |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Algorithmic collection generation | "AI curates collections from tags" | Defeats editorial differentiator (curation IS the value). Pattern match mistakes ("sweet + sour" ≠ good collection) damage brand | Manual curation by Matteo. Growth Engine can SUGGEST groupings to review, not publish autonomously |
| User-created collections ("My Recipes") | "Pinterest-like engagement" | Requires accounts (ruled out). Huge GDPR surface. Competes with existing `/bookmarks` localStorage pattern | Keep existing bookmarks. Defer user collections to future milestone |
| Sub-collections (nested) | "Organize at scale" | With 23 recipes, sub-collections are premature. Adds URL/breadcrumb/SEO complexity | Flat collections until 50+ recipes |
| Collection paywalls | "Monetize premium collections" | Kills SEO (Google won't index gated content). Conflicts with brand authority goal | Free-access. Monetize via existing affiliate links in recipes |
| Duplicate recipe content across collections | "SEO for each collection" | Thin/duplicate content penalty, crawl dilution | Single canonical Recipe page. Collections are references/links, not copies |

### Dependencies

- **New Strapi content type**: NEW — `recipe-collection` with i18n enabled
- **Recipe content type**: exists, need bidirectional relation with collection
- **Collection listing + detail page templates**: NEW Astro pages, 3 locales
- **Sitemap integration**: EXTEND existing `@astrojs/sitemap` config
- **Growth Engine impact**: Translation agent must handle new `recipe-collection` type (already pattern per CLAUDE.md: PUT with `?locale=xx` + slug in body)
- **Bookmarks extension** (optional differentiator): EXTEND existing `/bookmarks` localStorage logic
- **Homepage slot** (optional): EXTEND existing FeaturedHero or add new section

---

## Bucket 4 — Growth Engine v2 Analytics Loop

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Umami API data pull | Umami exposes REST API with pageviews, referrers, sessions, events — this is the raw material for decisions | **M** | Hetzner cron → new Python agent `umami_sync.py` in `scripts/agents/`. Authenticates via Umami API key, pulls daily metrics per URL, stores in local SQLite or JSON state file |
| Per-URL performance snapshot (7d / 30d) | Editorial decisions are "is THIS post working?" — need URL-level data, not site-level | **M** | Store `{url, locale, pageviews_7d, pageviews_30d, avg_duration, bounce_rate}`. Map URL → Strapi content ID via slug lookup |
| Top pages report | "What's working?" is the #1 editorial question. Chartbeat-style ranked list drives Matteo's weekly check-in | **S** | Cron output → Markdown/JSON report. Delivered via existing Telegram daily dashboard bot OR email digest |
| Under-performing content flag | "What to fix?" — bottom-decile posts after 30 days = refresh candidates | **S** | Simple query: posts with pageviews_30d < threshold AND older than 30 days. Flag in ContentQueue for refresh agent |
| Privacy-compliant | Umami is already privacy-first (cookie-free, GDPR-OK). No PII in feedback loop | **S** | Inherited from Umami. No changes. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Topic selection driven by high-performers | Claude Max strategist agent (existing, Sunday 07:00 per CLAUDE.md) receives "top 10 posts last 30d" as context → recommends similar-topic new content | **M** | Extend `claude_strategist.py` to read umami_sync.py output + existing competitor/keyword data. Output: prioritized topics list written to ContentQueue |
| Refresh cadence from decay signals | Post losing pageviews week-over-week = SEO decay signal. Auto-flag for content refresh agent | **M** | Compare pageviews_7d vs pageviews_7d_prior. >30% drop + post age >60 days = refresh flag. Refresh agent (new OR extension of seo_optimizer) reruns content gen with "update and republish" prompt |
| Keyword focus from referrer data | Umami referrer data shows which search terms drive traffic — prioritize those in keyword_scout agent | **M** | Parse Umami referrer data for search query strings (where available; Google strips most). Cross-reference with Google Search Console data (if integrated) to expand keyword_scout inputs |
| Headline direction from click-through | If A/B bandit shows "How to" headlines win 60% on BBQ topics, strategist agent biases future titles toward that pattern | **M** | Requires A/B headline bucket (Bucket 5) to be operational first. Bandit winners logged → strategist prompt includes "prefer these headline patterns" |
| Content format signals | Time-on-page + scroll-depth events from Umami reveal whether recipes or reviews get deeper engagement — informs editorial mix | **M** | Add custom Umami events: `scroll_50`, `scroll_90`, `read_complete`. Aggregate per content type. Feed into strategist weekly |
| Dashboard surfaced in Telegram bot | Matteo already has daily Telegram dashboard — extend with top/bottom content + refresh queue | **S** | New Telegram command `/content_report`. Reuses existing bot daemon |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully autonomous "refresh loop" (agent updates without review) | "Maximum automation" | Claude/Ollama drift, hallucination risk, brand voice drift. Matteo's Pitmaster 5.8-8.8 tone (per CLAUDE.md) requires taste | Agents DRAFT refresh in ContentQueue. Matteo approves in Strapi. Keeps human in loop |
| Vanity metrics-driven decisions (pageviews only) | "Just pick what gets views" | Views ≠ engagement. A clickbait winner hurts brand. Already called out in project constraints | Combine pageviews + avg_duration + scroll_90 completion. Weighted score |
| Real-time dashboards | "Newsroom live dash" | Single-author site doesn't need second-by-second. Daily cron is enough | Daily Telegram digest + weekly strategist run |
| Aggressive content culling based on low traffic | "Unpublish losers" | Destroys long-tail SEO (evergreen content wins over years). Also: small sample misleading | Refresh, don't delete. Unpublish only if explicitly obsolete (e.g., discontinued product reviews) |
| External analytics (GA4, Mixpanel) | "More powerful data" | Umami already meets needs. Adding GA4 means consent banner (cookie) — brand-damaging on editorial site | Stick with Umami. Integrate Search Console for query data (already minor work) |

### Dependencies

- **Umami self-hosted**: live (per CLAUDE.md)
- **Umami API key + endpoint**: verify + add to `.env` on server
- **Python agent stack**: pattern exists (`scripts/agents/lib/`)
- **New agent**: `umami_sync.py` (raw pull + state store)
- **Strapi ContentQueue**: exists (per CLAUDE.md content types)
- **Strategist agent extension**: EXTEND `claude_strategist.py` to ingest Umami data
- **Refresh agent**: NEW or extension of `seo_optimizer.py` (conservative — prefer extension to avoid proliferation)
- **Telegram bot**: exists, extend with command
- **Custom Umami events** (for scroll/read): NEW JS snippets on content pages (Svelte island already tracks scroll)

---

## Bucket 5 — A/B Headline Testing

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Variant storage per content item | Each article needs 2-3 headline variants tied to it | **S** | Add `title_variants: json` array field to BlogPost, Review, Recipe, Tutorial, and `subject_variants` to newsletter automation. Format: `[{id, text, impressions, clicks}]` |
| Deterministic variant assignment | Same reader sees same variant across sessions (avoids flicker) | **M** | Hash `visitor_id` (anonymous cookie OR IP+UA hash) mod N variants. Cookie stored locally, no server lookup needed |
| Click-tracking | Need clicks-on-card from listing/home/social vs clicks-on-article to measure headline effectiveness | **M** | On card click, fire Umami custom event `headline_click` with `{content_id, variant_id, source_surface}`. Impressions tracked on card render via IntersectionObserver |
| Winner-declaration logic | Rotate traffic toward winner after sufficient data | **M** | See "Multi-armed bandit" differentiator below. Table stakes: at minimum, stop losing variants after clear signal |
| Minimum sample size per variant | Avoid premature winners. Industry baseline: 100+ conversions per variant OR fixed time window (1+ week) | **S** | Don't allocate any traffic-skewing decision until each variant has ≥100 impressions AND 7 days elapsed |
| Same variant on every surface for that reader | Reader sees "How to smoke brisket" on home card AND /blog index AND social share — not different wording | **S** | Variant ID stored in localStorage keyed by content_id. All surfaces read same key |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-armed bandit (Thompson Sampling) | Research shows batched Thompson Sampling outperforms fixed A/B by 3.69% click lift on news headlines (arXiv 1908.06256). Perfect fit for editorial where content has short half-life | **L** | Implementation: lightweight TS in Python (`agents/ab_bandit.py`), runs in batches (e.g., hourly cron recomputes variant weights from impressions/clicks). Stores Beta(alpha, beta) posteriors per variant. Assignment endpoint samples from posteriors to pick variant. Keeps simple: no contextual features in v1 |
| Early-stopping safeguards | Prevents false-positive winners when peeking. Stanford research: naive daily peeking inflates false positive rate 5% → 30% | **S** | Enforce minimum batch size + minimum duration before bandit can drop a variant below 5% traffic. Explicit threshold checks in bandit code |
| LLM-generated variants | Claude Max generates 3 headline variants per new post (already generating content). Zero incremental cost | **S** | Extend content-gen prompt: "Also produce 3 distinct SEO-safe headline variants, 60 chars max, varying in style: declarative, question, listicle" |
| Newsletter subject line testing | Brevo supports A/B subject tests natively. Same bandit approach possible via Brevo API | **M** | Either use Brevo's built-in A/B (simple, locked into Brevo flow) OR emit N sends via API to seed list slices and measure in our bandit. Start with Brevo native for v1 |
| Fairness: reader consistency across devices | Same reader on mobile + desktop sees same variant? Only possible with cookie-sync or auth. Skip for v1 | N/A | Accept per-device consistency (localStorage). Explicitly documented limitation. Low impact — most readers are single-device per session |
| Bandit winner feeds back into strategist | When a variant wins, log the "winning pattern" (e.g., starts with number, uses "best") and feed to content-gen agent as style guidance | **M** | Post-hoc analysis job: cluster winning variants by lexical features (numbers, questions, lists). Strategist prompt includes "patterns that work". Human-readable log for Matteo to spot-check |
| Per-locale bandits | EN, IT, ES likely differ in headline patterns. Don't pool data | **S** | Separate bandit state per `{content_id, locale}`. Trade-off: slower convergence per locale, but per-locale correctness |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| A/B test everything (images, CTAs, colors) | "Full CRO" | Multiple simultaneous tests interfere (interaction effects). Complexity spikes. Editorial site gains are mostly in headlines | Only headlines + newsletter subjects in v1. Revisit after proof of value |
| Peek-and-stop manually | "Call a winner when it's obviously winning" | Inflates false-positive rate 30% per Stanford research. Winners often regress | Pre-commit thresholds. Bandit handles allocation. Matteo sees results, doesn't override |
| Per-visitor personalization of headlines | "Show me what I like" | Requires user tracking beyond anonymous visitor ID. GDPR issue. Echo chamber risk for editorial | Non-personalized bandit (same winner for all visitors). Defer contextual bandits to future |
| Endless variant count (5-10 per article) | "More variants = more data" | Each variant starves the winner of samples. Research consensus: 2-3 variants optimal for editorial | 3 variants per article max. 2 for newsletter subjects |
| Changing headline after publish (SEO risk) | "Iterate on the title" | Google ranks on URL + title stability. Changing title post-indexing hurts rankings | Variant is the ON-SITE card title (listing, home, social share). CANONICAL title on detail page + URL slug stays fixed. This resolves the SEO concern |
| Running bandits on low-traffic posts | "Optimize everything" | Posts with <1000 views/week won't reach significance in any reasonable window | Only enable bandit on posts expected to hit >500 impressions/week (featured, home-slot, or high-referrer content). Others show fixed variant[0] |
| Bandits on permanent navigation (nav labels, button text) | "Optimize the whole site" | Ship-gates broken navigation if variants fail, accessibility gets weird | Content headlines only. Leave chrome stable |

### Dependencies

- **Variant storage in Strapi**: EXTEND BlogPost, Review, Recipe, Tutorial schemas with `title_variants` JSON
- **Variant generation in content agents**: EXTEND Claude content-gen prompt
- **Umami custom events**: NEW — `headline_impression`, `headline_click` with properties
- **Visitor ID cookie**: NEW — anonymous UUIDv4, 1-year expiry, localStorage + cookie for SSR fallback
- **Bandit computation agent**: NEW — `ab_bandit.py` in `scripts/agents/`, hourly cron
- **Frontend variant resolver**: NEW — middleware/island reads `content_id` + visitor_id → returns variant
- **Fallback for no-JS users / bots**: serve variant[0] always. Google sees canonical title on detail page
- **Newsletter A/B**: EXTEND `weekly_newsletter.py` agent OR use Brevo native A/B (simpler, recommended for v1)
- **Analytics loop dependency**: Bucket 4 must land before Bucket 5 winner-pattern feedback is meaningful

---

## Feature Dependencies (Cross-Bucket)

```
[Shipped v1.0 primitives: Strapi, i18n, Pagefind, Umami, Brevo, Svelte islands, SQLite rate-limit]
    |
    +---> [Newsletter signup]
    |         +-- requires: Astro SSR endpoint, Brevo DOI + automation, HMAC utility
    |         +-- feeds: Brevo list -> newsletter A/B subject testing (Bucket 5)
    |
    +---> [Review filters]
    |         +-- requires: Product schema extension (category taxonomy + verify price field)
    |
    +---> [Recipe collections]
    |         +-- requires: new Strapi content type + translation agent extension
    |
    +---> [Analytics loop (Bucket 4)]
    |         +-- requires: Umami API key, umami_sync.py agent
    |         +-- enables: strategist agent topic decisions
    |         +-- enables: Bucket 5 winner-pattern feedback
    |
    +---> [A/B headlines (Bucket 5)]
              +-- requires: Strapi schema extension (title_variants), Umami custom events, bandit agent
              +-- benefits from: Bucket 4 (pattern feedback loop)
              +-- benefits from: Newsletter signup (subject-line testing makes sense only with real list)
```

### Critical Path Observations

- **Filters (Bucket 2) requires Product schema migration** — do early to avoid blocking
- **Collections (Bucket 3) is independent** — can ship in parallel with filters
- **Newsletter (Bucket 1) is independent** — can ship in parallel with filters/collections
- **Analytics loop (Bucket 4) should precede A/B (Bucket 5)** — Bucket 5 feedback requires Bucket 4 infrastructure. Bucket 5 CAN ship without Bucket 4, but without the feedback loop it's dumber
- **A/B newsletter subjects (Bucket 5 sub-feature) requires Bucket 1 to be live** — no list = no test
- **Debt closure (v1.1 sequencing per PROJECT.md) blocks all features** — land VERIFICATION.md backfill + REQUIREMENTS.md reconciliation + Lighthouse re-measure first

---

## MVP Definition (v1.1)

### Launch With (v1.1 core)

Ruthless minimum to achieve "Content Depth & Growth Loop" goal:

- [ ] **Newsletter** — inline + `/newsletter` page + DOI + welcome email + preference center (skip exit-intent + sticky footer to v1.1.x)
- [ ] **Review filters** — brand + category + price bucket (skip score threshold if schedule tight, re-add in v1.1.x)
- [ ] **Recipe collections** — content type + listing + detail + 3 locales (skip sub-features: bookmark extension, RSS, Instagram strip -> v1.1.x)
- [ ] **Analytics loop MVP** — umami_sync.py + top/bottom page report in Telegram dashboard (skip refresh agent + keyword feedback -> v1.1.x)
- [ ] **A/B headlines MVP** — simple A/B (not bandit) on BlogPost only, fixed sample size winner call, click tracking via Umami events (skip bandit + newsletter subjects -> v1.1.x)

### Add After Validation (v1.1.x iterations)

- [ ] Exit-intent modal (desktop) + sticky footer bar (newsletter)
- [ ] Scroll-depth trigger (newsletter)
- [ ] Content-specific lead magnets (newsletter)
- [ ] Score threshold facet + sort controls (filters)
- [ ] Live facet count updates (filters)
- [ ] Seasonal collections + author's note (collections)
- [ ] Collection bookmark + RSS (collections)
- [ ] Multi-armed bandit (A/B)
- [ ] Newsletter subject-line A/B (A/B)
- [ ] A/B across Review + Recipe + Tutorial (A/B)
- [ ] Refresh agent + keyword-scout feedback from Umami (analytics)

### Future Consideration (v1.2+)

- [ ] Collection sub-features (sub-collections, user collections) — needs >50 recipes + likely user accounts discussion
- [ ] Contextual bandits (per-locale × per-referrer) — only if volume justifies
- [ ] Editorial A/B on non-headline elements (hero image, CTA copy) — only after headline test proves ROI
- [ ] Search Console integration for keyword feedback — depends on keyword_scout output value demonstrated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Newsletter inline form + DOI + welcome | HIGH | LOW (Brevo does heavy lifting) | **P1** |
| `/newsletter` landing page | HIGH | LOW | **P1** |
| Review brand + category + price filters | HIGH | MEDIUM (schema change + UI) | **P1** |
| Recipe collections (content type + pages) | HIGH | MEDIUM | **P1** |
| Umami top/bottom pages report | MEDIUM | LOW | **P1** |
| A/B simple test on BlogPost | MEDIUM | MEDIUM | **P1** |
| Newsletter exit-intent + sticky footer | MEDIUM | LOW | **P2** |
| Newsletter preference center | MEDIUM | MEDIUM | **P2** |
| Newsletter lead magnets | MEDIUM | LOW (content creation, not code) | **P2** |
| Score threshold facet | MEDIUM | LOW | **P2** |
| Facet live counts | LOW | MEDIUM | **P2** |
| Collection author's note + seasonal | MEDIUM | LOW | **P2** |
| Collection bookmark | LOW | LOW | **P2** |
| Refresh agent (decay detection) | MEDIUM | MEDIUM | **P2** |
| Multi-armed bandit | MEDIUM | HIGH | **P2** |
| Newsletter subject A/B | MEDIUM | LOW (Brevo native) | **P2** |
| Headline pattern feedback loop | LOW | MEDIUM | **P3** |
| Custom Umami scroll events | LOW | LOW | **P3** |
| Collection RSS | LOW | LOW | **P3** |
| Collection IG strip | LOW | MEDIUM | **P3** |
| Contextual bandits | LOW (at current volume) | HIGH | **P3** |

**Priority key:**
- **P1**: Must have for v1.1 launch (MVP)
- **P2**: Add in v1.1.x iterations within milestone
- **P3**: Defer to v1.2+ unless trivial hitchhiker

---

## Competitor / Reference Feature Analysis

Editorial sites inform the pattern library. All references verified via 2026 research; specific implementation details noted as "observed" vs "inferred."

| Feature | NYT Cooking | Serious Eats | Wirecutter | Bon Appetit | Our Approach |
|---------|-------------|--------------|------------|-------------|--------------|
| Newsletter capture surfaces | Dedicated landing + inline + modal (paywall-tied) | Inline + sticky banner | Inline + footer + dedicated | Inline + modal | Inline + `/newsletter` + sticky footer + exit-intent (phased). More surfaces than Serious Eats, less aggressive than paywall sites |
| Review filters | N/A (recipe-only) | Equipment guides use tag pages (no faceted) | Full faceted search (brand/price/feature/rating) — industry benchmark | N/A | Wirecutter-style faceted (brand/category/price/score), drawer on mobile, URL-persistent |
| Recipe collections | "Curated by our editors" hero + Collections section with seasonal/themed groupings | Less prominent — relies on category tags | N/A | "Basically" section = technique-focused collections. Seasonal rotating features | Matteo-curated collections with editor's note. Lighter-weight than NYT (no paywall gating). Stronger editorial voice than tag pages |
| A/B headline testing | Yes, deep A/B ML per Digiday coverage | Unknown (likely, given Dotdash Meredith) | Yes (part of NYT infra) | Yes, part of Condé infra | Start simple A/B, graduate to bandit. Variants card-only (detail page title stable for SEO) |
| Analytics -> editorial loop | Chartbeat + proprietary (scale beyond us) | Parse.ly-style | Internal NYT stack | Parse.ly | Umami + custom Python agents. Not real-time — daily cron fits single-author cadence |

---

## Implementation Sizing Summary

Rough effort per bucket (assumes Claude-assisted development, single author, Matteo approving design):

| Bucket | MVP Effort | Full Effort (with P2s) | Key Risks |
|--------|-----------|------------------------|-----------|
| Newsletter | 3-5 days | 7-10 days | Brevo DOI flow config; GDPR consent record storage |
| Review filters | 5-7 days | 8-12 days | Schema migration of 25 existing products; SEO canonical strategy |
| Recipe collections | 4-6 days | 7-10 days | Translation agent update for new content type; cover-image curation workload for Matteo |
| Analytics loop | 3-5 days | 7-10 days | Umami API rate limits; cron orchestration with existing agents |
| A/B headlines | 5-7 days MVP / 10-14 days full | 12-16 days | Bandit math correctness; variant generation quality; per-locale split reduces sample size |

Total rough estimate: **20-30 days MVP, 40-60 days including all P2s**. Budget and 3-month runway accommodate this comfortably.

---

## Quality Gate Check

- [x] Categories clear: Newsletter, Filters, Collections, Analytics, A/B — separate sections
- [x] Complexity noted per feature (S/M/L inline + implementation cost in priority matrix)
- [x] Dependencies identified (both within-bucket and cross-bucket section)
- [x] Anti-features called out per bucket with alternatives
- [x] Real editorial site examples cited (NYT Cooking, Bon Appetit, Serious Eats, Wirecutter)
- [x] Actionable for requirements scoping (MVP vs P2 vs P3 split + effort estimates)

---

## Sources

### Newsletter Signup
- [25 Newsletter Signup Examples That Convert in 2026 (Omnisend)](https://www.omnisend.com/blog/newsletter-signup-examples/)
- [Exit Intent Popup: The Complete 2026 Conversion Guide (HelloBar)](https://www.hellobar.com/blog/exit-intent-popup-guide/)
- [Popup Statistics 2026 (OptiMonk)](https://www.optimonk.com/popup-statistics/)
- [Ultimate guide to high-converting signup forms 2026 (Omnisend)](https://www.omnisend.com/blog/best-signup-forms-conversions/)
- [Exit Intent Popups vs Scroll Based Popups: 2026 Guide (HelloBar)](https://www.hellobar.com/blog/exit-intent-popups-vs-scroll-based-popups/)
- [Mobile Exit-Intent: How Do Popup Surveys Work on Mobile? (Contentsquare)](https://contentsquare.com/guides/exit-intent-survey/mobile/)
- [Brevo Double Opt-in documentation](https://help.brevo.com/hc/en-us/articles/208733449-Double-opt-in-DOI-What-it-is-and-how-to-track-user-sign-ups)
- [Brevo Review 2026 (Hackceleration)](https://hackceleration.com/brevo-review/)
- [GDPR-compliant newsletter unsubscribes (CleverReach)](https://www.cleverreach.com/en-de/push-magazin/email-addresses-newsletter-subscribers/gdpr-compliant-newsletter-unsubscribes/)
- [Email Preference Centers best practices (Digioh)](https://www.digioh.com/blog/email-preference-center)
- [Email Marketing and GDPR (beehiiv)](https://www.beehiiv.com/blog/email-marketing-and-gdpr-a-compliance-guide-for-creators)

### Review Filters
- [Faceted Search Best Practices for E-commerce 2026 (BrokenRubik)](https://www.brokenrubik.com/blog/faceted-search-best-practices)
- [Ecommerce Filter UX Design Patterns 2026 (BTNG.studio)](https://www.btng.studio/articles/top-ecommerce-ux-filter-design-patterns-practical-tips-for-2025/)
- [Defining Helpful Filter Categories and Values (NN/g)](https://www.nngroup.com/articles/filter-categories-values/)
- [Create a great faceted search & navigation UX (Algolia)](https://www.algolia.com/blog/ux/faceted-search-and-navigation)
- [Faceted navigation in SEO: Best practices (Search Engine Land)](https://searchengineland.com/guide/faceted-navigation)
- [Faceted filtering for better ecommerce experiences (LogRocket)](https://blog.logrocket.com/ux-design/faceted-filtering-better-ecommerce-experiences/)
- [Filter UX/UI design patterns (LogRocket)](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/)

### Recipe Collections
- [NYT Cooking editor-curated collections (Recipe Notes analysis)](https://recipenotes.app/free-nyt-cooking-alternative)
- [NYT Cooking newsletter editorial approach (Editor and Publisher)](https://www.editorandpublisher.com/stories/the-new-york-times-nyt-cookings-newsletter-editor,261014)
- [Bon Appétit editorial model (Wikipedia)](https://en.wikipedia.org/wiki/Bon_App%C3%A9tit)

### Analytics Loop
- [Umami Analytics API Guide (Medium)](https://medium.com/@m22kats/a-guide-to-using-umami-analytics-data-collection-and-api-usage-a40d8834c65c)
- [Umami Analytics Docs](https://docs.umami.is/docs)
- [Content Analytics for Publishers (Parse.ly)](https://www.parse.ly/content-analytics-dashboard/)
- [Content marketing dashboard metrics (HockeyStack)](https://www.hockeystack.com/blog-posts/content-marketing-dashboard)
- [Content Analytics Software for Publishers 2025 (SODP)](https://www.stateofdigitalpublishing.com/digital-platform-tools/best-content-analytics-software/)

### A/B Headline Testing
- [A Batched Multi-Armed Bandit Approach to News Headline Testing (arXiv 1908.06256)](https://arxiv.org/pdf/1908.06256)
- [Multi-Armed Bandit Testing (VWO)](https://vwo.com/blog/multi-armed-bandit-algorithm/)
- [Beyond A/B testing: Multi-armed bandit (Dynamic Yield)](https://www.dynamicyield.com/lesson/contextual-bandit-optimization/)
- [A/B Testing Statistical Significance 2026 (Nicola Lazzari)](https://nicolalazzari.ai/guides/ab-test-statistical-significance)
- [Stopping A/B Tests Too Early (Kameleoon)](https://www.kameleoon.com/blog/stopping-ab-tests-too-early)
- [A/B Testing Sample Size (Invesp)](https://www.invespcro.com/blog/calculating-sample-size-for-an-ab-test/)
- [A/B Testing Statistical Significance Complete Guide (Analytics-Toolkit)](https://blog.analytics-toolkit.com/2017/statistical-significance-ab-testing-complete-guide/)

---

*Feature research for: BBQ Experience v1.1 Content Depth & Growth Loop*
*Researched: 2026-04-15*
