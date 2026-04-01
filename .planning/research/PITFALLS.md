# Domain Pitfalls

**Domain:** Editorial portal / Headless CMS with multilingual content, product reviews, recipes
**Project:** BBQ Experience
**Researched:** 2026-04-01

---

## Critical Pitfalls

Mistakes that cause rewrites, timeline blowouts, or fundamental architecture problems.

### Pitfall 1: Content Model Over-Engineering

**What goes wrong:** Teams new to headless CMS try to model every future use case upfront -- dozens of content types, deeply nested references, shared components for hypothetical channels. The result is a CMS that is slow to query, confusing to use as an author, and painful to migrate when the model inevitably needs to change.

**Why it happens:** Headless CMS gives you total freedom in content modeling. Without the guardrails of a traditional CMS, the temptation is to "do it right from the start" by anticipating every possible content shape. For a single-author site like BBQ Experience, this is pure overhead.

**Consequences:** Matteo (sole author) faces a slow, complex editing experience. API queries become nested and slow. Changing the model later requires data migration.

**Prevention:**
- Start with 5-6 content types max: Review, Recipe, Tutorial, BlogPost, Product (reference), Author (singleton)
- Use flat structures over deep nesting -- a Review references a Product by ID, not a nested object graph
- Scoring system fields go directly on the Review type as structured JSON or flat numeric fields, not as a separate "Score" content type with relations
- Add content types only when a real need materializes, not speculatively

**Detection:** If the CMS admin has more than 8-10 content types before launch, or if creating a single review requires filling in more than 3 separate content entries, the model is over-engineered.

**Phase to address:** Phase 1 (Content modeling / CMS setup)

---

### Pitfall 2: Animations That Destroy Performance

**What goes wrong:** The project demands "bold design with animations and micro-interactions" AND "90+ Lighthouse scores." These goals are in direct tension. Teams add GSAP scroll animations, parallax effects, animated page transitions, and heavy hero videos -- then discover mobile Lighthouse scores are in the 40s.

**Why it happens:** Designers and developers treat animation as a visual layer on top of a finished page. But non-composited animations (anything that triggers layout: width, height, top, left, margin changes) cause Cumulative Layout Shift and block the main thread. 39% of mobile pages have non-composited animations hurting CLS.

**Consequences:** Lighthouse performance tanks. Mobile users on mid-range devices see jank. CLS scores fail Core Web Vitals. Reworking animations after the fact means redesigning interactions.

**Prevention:**
- Establish an animation budget from day one: only `transform` and `opacity` properties for all animations (GPU-composited, zero layout impact)
- No scroll-hijacking, no parallax that triggers layout
- Use CSS animations or Framer Motion with `layout` prop -- never animate positional CSS properties
- Hero images/videos: use poster frames, lazy-load video, set explicit dimensions to prevent CLS
- Test on real mobile hardware (not just Chrome DevTools throttling) every sprint
- Set Lighthouse CI in the build pipeline with a threshold of 90 -- fail the build if it drops

**Detection:** Run Lighthouse on mobile emulation after every significant UI change. If performance drops below 85 at any point during development, animations need to be reconsidered immediately.

**Phase to address:** Phase 2 (Frontend / Design system) -- establish rules before any animation work begins

---

### Pitfall 3: Instagram API Integration Assumptions

**What goes wrong:** The project assumes "bidirectional Instagram integration" is a simple API call. In reality, Meta's Instagram Graph API has been drastically restricted. The Basic Display API was killed in December 2024. Rate limits dropped 96% (from ~5,000 to ~200 calls/hour). Several Insights metrics were deprecated in January 2025. Only Business/Creator accounts connected to a Facebook Page have API access.

**Why it happens:** Instagram integration sounds simple in a project brief. The reality is that Meta continuously tightens API access for privacy/platform integrity. What worked in 2023 may not work in 2026.

**Consequences:** Features planned around Instagram data may be impossible or severely limited. Building around the API creates a dependency on Meta's whims -- any future API change can break the integration.

**Prevention:**
- Define "bidirectional" precisely: displaying recent IG posts on the site (read) is feasible via Instagram Graph API with a Business account. "Driving traffic from IG to site" is just link-in-bio and story links -- no API needed.
- Cache IG content aggressively (refresh every 1-6 hours, not per request) to stay within rate limits
- Store IG post data in your own database after fetching -- never query the API live on page load
- Build the IG embed section as a fully optional component that degrades gracefully if the API is down or rate-limited
- Have a fallback: manually curated IG highlights if the API fails
- Do NOT build features that depend on deprecated metrics (video_views for non-Reels, profile_views, website_clicks)

**Detection:** If the IG integration requires more than 100 API calls per hour in normal operation, the architecture is wrong. If any page load depends on a live API call to Instagram, the architecture is wrong.

**Phase to address:** Phase 3 or 4 (Integrations) -- research API limits before committing to features

---

### Pitfall 4: Multilingual Content as an Afterthought

**What goes wrong:** The site is built in English first, with i18n added later. This leads to: hardcoded strings throughout components, URL structures that don't account for locale prefixes, SEO metadata only in English, content model without locale awareness, and a CMS workflow that makes translation painful.

**Why it happens:** Building in one language is faster for initial development. "We'll add translations later" feels pragmatic but creates massive rework.

**Consequences:** Retrofitting i18n requires touching every component, every route, every SEO tag. Content that exists only in English gets served to Italian/Spanish users with no graceful fallback. Google indexes duplicate content across locales without proper hreflang tags, causing SEO penalties. The CMS has no translation workflow, so Matteo has to manually track what's been translated.

**Prevention:**
- Set up i18n routing from day one: `/en/`, `/it/`, `/es/` URL prefixes with proper `hreflang` tags
- All UI strings through a translation system (next-intl or similar) from the first component
- CMS content model must have locale as a first-class concept -- every content entry exists per-locale
- Handle missing translations gracefully: serve default locale (EN) content with a "not yet translated" indicator, never a 404
- Pluralization rules differ between languages -- use ICU message format, not string concatenation
- Date/time/measurement formats: use locale-aware formatters from day one (Intl API)
- Generate separate sitemaps per locale

**Detection:** If any component renders a raw string literal instead of a translation key, the i18n approach is leaking. If switching locale in the CMS requires creating an entirely new content entry rather than adding a translation to an existing one, the content model is wrong.

**Phase to address:** Phase 1 (Architecture / Content model) -- locale-aware from the foundation

---

### Pitfall 5: SEO Structure Missing from Headless Architecture

**What goes wrong:** Headless CMS decouples content from presentation, which means all the SEO features that traditional CMS provide out of the box (meta tags, sitemaps, canonical URLs, structured data, og tags) must be built manually. Teams forget or implement them partially.

**Why it happens:** Traditional CMS like WordPress has plugins for everything SEO. With headless, there are no plugins -- every SEO element is code you write and maintain.

**Consequences:** The site launches without proper structured data (Recipe schema, Product/Review schema), missing or incorrect meta tags per page, no dynamic sitemap, broken canonical URLs across locales, and no OpenGraph tags for social sharing. For a site that needs to be "the most complete BBQ review result," poor SEO is fatal to the mission.

**Prevention:**
- Build an SEO component system early: reusable `<SEOHead>` component that handles meta, og, canonical, hreflang per page type
- Implement structured data schemas from the content model:
  - `Recipe` schema for recipes (Google confirmed recipe structured data impacts rankings in 2025)
  - `Product` + `Review` schema for product reviews with aggregate ratings
  - `Article` schema for blog/tutorial content
  - `Organization` schema site-wide
- Use exact time values in Recipe schema (not ranges -- Google rejected those in 2025)
- Do NOT put multiple Recipe schemas on one page
- Generate dynamic XML sitemaps per locale with proper lastmod dates
- Add CMS validation rules: require meta description, og:image, and alt text before content can be published
- Add `robots.txt` and handle pagination/archive pages correctly

**Detection:** Run Google Rich Results Test on every content type page. If structured data is invalid or missing, fix immediately. Check Google Search Console weekly after launch for crawl errors and structured data warnings.

**Phase to address:** Phase 2 (Frontend architecture) for the SEO component system, Phase 3 (Content integration) for CMS validation rules

---

## Moderate Pitfalls

### Pitfall 6: Image Pipeline Gaps

**What goes wrong:** An editorial BBQ site is image-heavy -- product photos, recipe step shots, hero images with smoke and fire. Without a proper image pipeline, pages balloon to 5-10MB, killing performance. Authors upload 4000x3000 DSLR photos directly into the CMS.

**Prevention:**
- Implement automatic image processing on upload: resize to max dimensions, convert to WebP/AVIF, generate responsive srcsets
- Use Next.js `<Image>` component for all images -- never raw `<img>` tags
- Set explicit `width` and `height` on all images to prevent CLS
- Implement a CDN for image serving (Cloudflare or similar, already implied by Hetzner + Caddy setup)
- CMS should enforce: max upload size (e.g., 5MB), and auto-generate thumbnails
- Lazy-load all images below the fold; eager-load the LCP image

**Phase to address:** Phase 1 (CMS setup) for upload processing, Phase 2 (Frontend) for rendering

---

### Pitfall 7: Review Scoring System Rigidity

**What goes wrong:** The product review scoring system (overall + per-category scores) is designed once and then becomes impossible to evolve. Categories that make sense for grills don't apply to accessories. The scoring formula is hardcoded. Adding a new scoring dimension requires a database migration.

**Prevention:**
- Design scoring as a flexible JSON structure, not fixed database columns: `{ categories: [{ name: "Build Quality", score: 8.5, weight: 0.3 }, ...], overall: 8.2 }`
- Allow different product types to have different scoring categories
- Calculate overall score dynamically from category scores and weights, not as a stored value
- Store the scoring schema version so old reviews can be displayed correctly even if categories change
- Build the comparison feature to handle products with different category sets gracefully

**Phase to address:** Phase 1 (Content modeling)

---

### Pitfall 8: ISR/Caching Mismatch with Multilingual Routes

**What goes wrong:** ISR (Incremental Static Regeneration) treats each locale path as a separate cached page. Revalidating `/en/reviews/weber-summit` does NOT revalidate `/it/reviews/weber-summit`. On-demand revalidation via webhooks must hit every locale variant. Middleware rewrites don't trigger ISR correctly.

**Prevention:**
- When CMS content updates, trigger revalidation for ALL locale paths of that content, not just the default
- Use `revalidateTag()` with locale-aware tags rather than `revalidatePath()` to batch invalidation
- Test cache behavior explicitly: update content in CMS, verify all 3 locale variants refresh
- If using middleware for locale detection, ensure ISR paths are the actual rendered paths, not pre-rewrite paths

**Phase to address:** Phase 3 (Content integration / caching strategy)

---

### Pitfall 9: Third-Party Script Bloat

**What goes wrong:** Analytics (Google Analytics, Meta Pixel), Instagram embeds, YouTube embeds, and other third-party scripts are loaded eagerly, adding 500KB-1MB of JavaScript and destroying LCP/TBT scores.

**Prevention:**
- Load all third-party scripts with `next/script` strategy `lazyOnload` or `afterInteractive` -- never `beforeInteractive`
- Use facade patterns for embeds: show a static image/thumbnail that loads the actual YouTube/IG embed only on click
- Instagram embed: use oEmbed endpoint to get static HTML representation, not the full IG embed SDK
- Consider privacy-respecting analytics (Plausible, Umami) that are 1-5KB vs Google Analytics at 45KB+
- Run bundle analysis (`@next/bundle-analyzer`) monthly to catch script creep

**Phase to address:** Phase 2 (Frontend) and Phase 4 (Analytics/integrations)

---

### Pitfall 10: Font Loading Performance

**What goes wrong:** Custom fonts (especially display/heading fonts for the "bold BBQ aesthetic") cause Flash of Invisible Text (FOIT) or Flash of Unstyled Text (FOUT), adding 200-500ms to FCP.

**Prevention:**
- Use `next/font` for all fonts -- it eliminates render-blocking font requests
- Self-host fonts (no Google Fonts CDN calls)
- Limit to 2 font families max (one display, one body)
- Use `font-display: swap` as fallback
- Subset fonts to only needed characters (especially for display fonts)

**Phase to address:** Phase 2 (Design system / Frontend)

---

## Minor Pitfalls

### Pitfall 11: CMS Preview Workflow Missing

**What goes wrong:** Matteo publishes content blind because there's no preview mode showing how content will look on the actual site. He ends up publishing, checking live, editing, re-publishing in a loop.

**Prevention:**
- Implement Next.js Draft Mode from the start -- a preview URL in the CMS that renders unpublished content
- Since it's a single-author site, this can be simple: a secret preview token in the URL, not a full auth system

**Phase to address:** Phase 3 (CMS integration)

---

### Pitfall 12: Deployment Pipeline Fragility on Hetzner

**What goes wrong:** The project uses webhook-based deploy on Hetzner (not Vercel). ISR, image optimization, and other Next.js features that rely on a Node.js server need proper configuration in a Docker environment. `next/image` optimization requires Sharp to be installed in the Docker image.

**Prevention:**
- Ensure the Docker image includes Sharp for image optimization
- Configure standalone output mode in `next.config.js` for smaller Docker images
- Set up proper health checks in Docker Compose
- ISR works with self-hosted Next.js but requires persistent file system for cache -- mount a volume
- Test the full deploy pipeline early (Phase 1), don't wait until launch

**Phase to address:** Phase 1 (Infrastructure setup)

---

### Pitfall 13: Measurement Unit Localization

**What goes wrong:** BBQ content is full of measurements -- temperatures (F vs C), weights (lbs vs kg), grill dimensions (inches vs cm). Hardcoding imperial units for EN and forgetting to convert for IT/ES audiences.

**Prevention:**
- Store measurements in a canonical unit (metric) in the CMS
- Display with locale-aware conversion: EN shows Fahrenheit/inches, IT/ES show Celsius/centimeters
- Build a small conversion utility, not inline math in templates

**Phase to address:** Phase 2 (Component library)

---

## Integration Gotchas

| Integration | Gotcha | Mitigation |
|-------------|--------|------------|
| Instagram Graph API | Basic Display API dead since Dec 2024; only Business/Creator accounts work | Verify BBQ Experience account type, connect to Facebook Page |
| Instagram Graph API | Rate limit: ~200 calls/hour (down from ~5,000) | Cache IG data in own DB, refresh every 1-6 hours |
| Instagram Graph API | Deprecated metrics (video_views non-Reels, profile_views, website_clicks) as of Jan 2025 | Do not build features depending on deprecated metrics |
| Recipe Schema | Google rejects time ranges, requires exact values | Use exact prep/cook times, not "10-15 minutes" |
| Recipe Schema | Image in structured data no longer affects search result image (2025 change) | Ensure page-level og:image and quality hero images for search results |
| Strapi i18n | Relations are forcefully localized -- you may want some shared across locales | Use Strapi 5 (i18n in core) and plan which relations should be locale-independent |
| Strapi i18n | `findOne` routes don't support locale parameter by default | Use `findMany` with filters or community plugins for locale-specific single queries |
| Next.js ISR on Hetzner | ISR cache needs persistent file system | Mount a Docker volume for `.next/cache` |
| Next.js ISR | Middleware rewrites don't trigger ISR revalidation correctly | Call `revalidate()` on exact rendered paths, not pre-rewrite paths |

---

## Performance Traps

| Trap | Impact | Solution |
|------|--------|---------|
| `"use client"` on everything | Ships all JS to browser, kills TTI | Default to Server Components; only use `"use client"` for interactive elements |
| Raw `<img>` tags | No lazy loading, no responsive sizes, no format optimization | Always use Next.js `<Image>` component |
| Unoptimized hero videos | 10-50MB video files kill LCP | Use poster frames, lazy-load video, compress to 1-2MB max, consider WebM |
| Google Analytics / Meta Pixel | 45KB+ blocking scripts | Use lightweight analytics (Plausible ~1KB) or load GA with `lazyOnload` strategy |
| GSAP/heavy animation libraries | 30-60KB added JS, main thread blocking | Prefer CSS animations + Framer Motion; GSAP only if CSS can't achieve the effect |
| Tailwind CSS unpurged | Full Tailwind is ~3MB | Ensure purge is configured for production builds (default in Tailwind v3+) |
| Web fonts over CDN | Render-blocking external requests | Self-host with `next/font`, subset to needed glyphs |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CMS admin exposed publicly | Unauthorized content changes | Restrict CMS admin to VPN or IP whitelist on Hetzner; since single author, no need for public access |
| API keys in frontend code | Token theft | CMS API calls must happen server-side (API routes or server components), never client-side |
| No rate limiting on API routes | DDoS on custom API endpoints | Add rate limiting middleware to any custom API routes |
| Instagram token hardcoded | Token leak in repo | Store IG tokens in environment variables, rotate regularly (Meta tokens expire) |
| Preview mode secret guessable | Unauthorized content preview | Use a strong random token for draft mode, not something like `preview=true` |

---

## UX Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Language switcher changes page but loses scroll position | Frustrating for users reading reviews | Preserve scroll position on locale switch, or navigate to the same content section |
| Product comparison doesn't work cross-locale | Italian user can't compare products reviewed in English | Store product data locale-independently; comparison logic works on canonical data |
| Recipe print view missing | Users want to print recipes without site chrome | Add a print stylesheet or dedicated print view for recipe pages |
| Mobile navigation blocks content with animations | 60%+ of traffic from IG is mobile | Test navigation on actual phones; ensure hamburger menu doesn't cause CLS |
| Search missing or poor | Users can't find specific reviews/recipes | Implement search from Phase 2; even a simple static search (Pagefind) beats no search |

---

## "Looks Done But Isn't" Checklist

These items are frequently forgotten at launch and discovered post-launch:

- [ ] **404 page** -- Custom, branded, with navigation back to content
- [ ] **Sitemap per locale** -- `/sitemap-en.xml`, `/sitemap-it.xml`, `/sitemap-es.xml` with hreflang cross-references
- [ ] **robots.txt** -- Correct for production (not blocking crawlers as in staging)
- [ ] **Favicon set** -- Full set including apple-touch-icon, manifest.json for PWA metadata
- [ ] **OpenGraph images per page** -- Not just a global og:image; each review/recipe needs its own
- [ ] **RSS feed** -- Expected by BBQ enthusiast audience; simple to add, often forgotten
- [ ] **Canonical URLs** -- Every page must have a canonical pointing to itself, with hreflang alternates
- [ ] **Error handling for CMS downtime** -- What happens when the CMS API is unreachable? Stale cache should serve, not a blank page
- [ ] **Meta description per page** -- CMS must require it, not leave it optional
- [ ] **Image alt text** -- CMS must require it for accessibility and SEO
- [ ] **Cookie consent banner** -- Required for IT/ES (EU) users even without ads; analytics alone triggers GDPR
- [ ] **Lighthouse CI in pipeline** -- Not just a manual check; automated regression detection
- [ ] **Content backup strategy** -- CMS data backup (especially if self-hosting Strapi on Hetzner)
- [ ] **Social sharing preview** -- Test that sharing a review URL on WhatsApp/Telegram/Twitter shows correct title, image, description

---

## Recovery Strategies

If a pitfall is hit despite prevention:

| Pitfall | Recovery |
|---------|----------|
| Content model too complex | Create a migration script to flatten; Strapi allows model changes with data migration CLI |
| Performance below 90 Lighthouse | Audit with Chrome DevTools Performance tab; usually 2-3 specific issues (images, scripts, animations) cause 80% of the problem |
| Instagram API breaks | Degrade gracefully to manually curated content; the site must never depend on IG API for core functionality |
| i18n retrofitting needed | Use codemod tools (jscodeshift) to extract hardcoded strings; painful but automatable |
| SEO structured data errors | Google Search Console shows exactly what's wrong; fix schema and request re-crawl |
| ISR cache serving stale content | Add a manual "purge all" button/endpoint as escape hatch; revalidateTag with a global tag |

---

## Pitfall-to-Phase Mapping

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | Content modeling | Over-engineering content types | Start with 5-6 types, flat structure, flexible scoring JSON |
| Phase 1 | i18n architecture | Locale as afterthought | Locale-aware routing and content model from day one |
| Phase 1 | Infrastructure | Docker/ISR misconfiguration | Test full deploy pipeline early, mount cache volumes |
| Phase 2 | Design system | Animations killing performance | Animation budget: only transform/opacity, Lighthouse CI gate |
| Phase 2 | Frontend | Font/script bloat | next/font, lazy-load scripts, bundle analysis |
| Phase 2 | SEO components | Missing structured data | Build SEO component system with all schema types |
| Phase 3 | CMS integration | Preview workflow missing | Implement Next.js Draft Mode with CMS webhook |
| Phase 3 | Caching | ISR + multilingual mismatch | Revalidate all locale paths on content update |
| Phase 3 | Content validation | Missing meta/alt text | CMS validation rules enforce required SEO fields |
| Phase 4 | Instagram API | Rate limits, deprecated endpoints | Cache in own DB, graceful degradation, no live API calls on page load |
| Phase 4 | Analytics | Third-party script bloat | Lightweight analytics, lazyOnload strategy |
| Launch | SEO | Stale robots.txt from staging | Pre-launch checklist with robots.txt, sitemaps, canonical verification |
| Launch | Compliance | Missing cookie consent | GDPR banner for EU locales (IT, ES) |

---

## Sources

- [Headless CMS SEO Pitfalls - Successive Digital](https://successive.tech/blog/headless-cms-seo-avoid-these-common-pitfalls)
- [Building Headless CMS: API Integration Pitfalls 2025 - Dre Dyson](https://dredyson.com/building-a-headless-cms-the-definitive-step-by-step-guide-to-avoiding-api-integration-pitfalls-in-2025/)
- [Headless CMS for Business: Best Practices - Strapi](https://strapi.io/blog/headless-cms-for-business-best-practices-and-expert-tips)
- [Instagram Graph API Developer Guide 2026 - Elfsight](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram API Rate Limits Explained 2026 - CreatorFlow](https://creatorflow.so/blog/instagram-api-rate-limits-explained/)
- [Instagram API Deprecated? Alternatives 2026 - SociaVault](https://sociavault.com/blog/instagram-api-deprecated-alternative-2026)
- [Next.js Performance Tuning for Lighthouse - QED42](https://www.qed42.com/insights/next-js-performance-tuning-practical-fixes-for-better-lighthouse-scores)
- [Achieving 95+ Lighthouse in Next.js 15 - Medium](https://medium.com/@sureshdotariya/achieving-95-lighthouse-scores-in-next-js-15-modern-web-application-part1-e2183ba25fc1)
- [Next.js Performance Optimization 2026 Guide - DEV Community](https://dev.to/bean_bean/nextjs-performance-optimization-the-2026-complete-guide-1a9k)
- [Avoid Non-Composited Animations - Chrome DevDocs](https://developer.chrome.com/docs/lighthouse/performance/non-composited-animations)
- [i18n Best Practices - Shopify Engineering](https://shopify.engineering/internationalization-i18n-best-practices-front-end-developers)
- [20 i18n Mistakes in React Apps - TranslatedRight](https://www.translatedright.com/blog/20-i18n-mistakes-developers-make-in-react-apps-and-how-to-fix-them/)
- [Multilingual Website Mistakes - BLEND](https://www.getblend.com/blog/common-mistakes-to-avoid-when-building-a-multilingual-website/)
- [Recipe Schema Basics for Food Blogs - Foodie Digital](https://foodiedigital.com/schema-basics-for-food-blogs/)
- [Google Recipe Structured Data Update 2025 - Osumare](https://osumare.com/google-2025-recipe-structured-data-update-what-you-need-to-know)
- [Strapi 5 i18n Guide - Strapi](https://strapi.io/blog/strapi-5-i18n-complete-guide)
- [Strapi Advanced i18n Plugin - GitHub](https://github.com/amicaldo/strapi-plugin-advanced-i18n)
- [ISR in Next.js - Official Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Headless CMS Image CDN - imgix](https://www.imgix.com/blog/headless-cms-image-cdn-for-web-performance-cosmic)
