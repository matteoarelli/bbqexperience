# Phase 13: Review Filters & Taxonomy - Research

**Researched:** 2026-04-21
**Domain:** Faceted filtering UI, SSR query-param routing, SEO for filtered URLs
**Confidence:** HIGH

## Summary

Phase 13 adds multi-facet filtering (brand, category, price bucket, score threshold) to the reviews index page across 3 locales. The existing reviews index (`/en/reviews/`, `/it/recensioni/`, `/es/resenas/`) is already SSR with `prerender: false` and handles category filtering via query params and sort controls. This phase replaces the simple category filter bar with a full multi-facet system, adds price and score filters, implements SEO guardrails (canonical + noindex on filtered URLs), and builds a mobile bottom-sheet drawer.

Key data constraints from production: 25 reviews, 5 product categories (Grill, Smoker, Pellet Grill, Thermometer, Accessory), 22 brands, ALL price fields are currently NULL (Phase 11 created the decimal field but migration did not populate values), score range 5.8-8.8. The null prices are a blocker for FILT-03 and must be addressed before the price filter can function.

**Primary recommendation:** Build the filter system server-side in the existing SSR Astro pages using URL query params (`?brand=weber&category=grill&price=300-800&score=7`), with a Svelte 5 island for the mobile bottom-sheet drawer. Use `noindex, follow` + canonical to unfiltered index for all filtered URLs. Do NOT use client-side-only filtering -- the 25-item corpus is small enough for server-side to be fast, and SSR ensures filter state is shareable/bookmarkable with proper SEO signals.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-01 | Filter reviews by brand (from `brand_relation`) | Production has 22 brands, 12 with associated products. Strapi filter: `product.brand_relation.slug`. See Architecture section for Strapi query pattern. |
| FILT-03 | Filter reviews by price bucket (<300, 300-800, 800-1500, >1500) | **BLOCKER**: All 25 product `price` fields are NULL in production. Prices must be populated before this filter works. Filter uses `$gte`/`$lte` on `product.price`. |
| FILT-04 | Filter by Pitmaster score threshold (6+, 7+, 8+) | Production score distribution: 6+ = 23, 7+ = 15, 8+ = 5. Filter uses `score_overall[$gte]`. |
| FILT-05 | Per-facet count badges + empty-state with "clear filters" | Requires a separate count query per facet option OR a single unfiltered fetch + client-side counting. See Architecture section. |
| FILT-06 | Filter state in URL query params, canonical to unfiltered, noindex on filtered | SEOHead.astro currently hardcodes `<meta name="robots" content="index, follow">`. Must add conditional noindex. See SEO section. |
| FILT-07 | Mobile bottom-sheet drawer with "Apply (N)" button | Svelte 5 island with `client:visible`. Follows existing pattern (ComparisonTool, BookmarkButton). See Architecture section. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.x | SSR page rendering with query param routing | Already in use, `prerender: false` on reviews pages |
| Svelte 5 | latest | Interactive island for mobile filter drawer | Project pattern: Svelte 5 runes for all interactive islands |
| Tailwind CSS | 4.x | Styling filter UI, bottom-sheet | Already in use, project-wide |

### No Additional Libraries Needed

The filter system requires zero new dependencies. All filtering is server-side via Strapi REST API query params (already supported by `fetchCollection` in `web/src/lib/strapi.ts`). The mobile drawer is a Svelte 5 component with CSS transitions.

**Installation:** None required.

## Architecture Patterns

### How Filtering Works (Server-Side)

The reviews index is already SSR. The filter flow:

1. User clicks filter option (or submits mobile drawer)
2. Browser navigates to `/{locale}/reviews/?brand=weber&category=grill&score=7&price=300-800`
3. Astro SSR reads query params from `Astro.url.searchParams`
4. Builds Strapi API filters and fetches filtered results
5. Renders HTML with active filter state highlighted
6. SEOHead emits `noindex, follow` + canonical to unfiltered base

### Strapi Query Pattern for Multi-Facet Filtering

```typescript
// Source: existing web/src/lib/strapi.ts fetchCollection
const filters: Record<string, unknown> = {};

// Brand filter — via product.brand_relation.slug
if (activeBrand) {
  filters.product = { ...filters.product, brand_relation: { slug: { $eq: activeBrand } } };
}

// Category filter — via product.product_category.slug
if (activeCategory) {
  filters.product = { ...filters.product, product_category: { slug: { $eq: activeCategory } } };
}

// Score threshold — direct field on review
if (activeScore) {
  filters.score_overall = { $gte: parseFloat(activeScore) };
}

// Price bucket — via product.price range
if (activePriceBucket) {
  const [min, max] = PRICE_BUCKETS[activePriceBucket];
  const priceFilter: Record<string, unknown> = {};
  if (min !== null) priceFilter.$gte = min;
  if (max !== null) priceFilter.$lte = max;
  filters.product = { ...filters.product, price: priceFilter };
}

// Populate must include relations for filter display
const fetchOptions = {
  locale,
  populate: ['product', 'product.brand_relation', 'product.product_category', 'gallery'],
  filters,
  sort: sortMap[activeSort],
  pageSize: 12,
  page: currentPage,
};
```

### Count Badges Strategy

With only 25 reviews, the most efficient approach is to fetch ALL reviews (unfiltered, fields-only) in a single request and compute counts client-side in the Astro template:

```typescript
// Fetch minimal data for all reviews to compute facet counts
const allReviews = await fetchCollection<StrapiReview>('reviews', {
  locale,
  populate: ['product', 'product.brand_relation', 'product.product_category'],
  fields: ['score_overall'],
  pageSize: 100, // 25 reviews, well under limit
});

// Compute counts per brand, category, price bucket, score threshold
// Then pass counts to filter UI as props
```

This avoids N+1 API calls for counts. At 25 items this is ~2KB of data, negligible. [VERIFIED: production query confirms 25 reviews total]

### Price Bucket Definitions

```typescript
// Source: REQUIREMENTS.md FILT-03
const PRICE_BUCKETS = {
  'under-300':  [null, 299.99],   // <EUR 300
  '300-800':    [300, 800],       // EUR 300-800
  '800-1500':   [800, 1500],     // EUR 800-1500
  'over-1500':  [1500.01, null],  // >EUR 1500
} as const;
```

### SEO: Canonical + Noindex Strategy

**Decision: `noindex, follow` on ALL filtered URLs.** [CITED: developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation]

Rationale for this small editorial site (25 reviews):
- With only 25 reviews, filtered views do NOT create unique content worth indexing -- they are subsets of the already-indexed unfiltered page
- Google's faceted navigation docs recommend preventing crawl of filtered URLs; `noindex, follow` is the middle ground that preserves link discovery while blocking index bloat
- The `canonical` tag pointing to the unfiltered index tells Google "this is a view of THAT page"
- `follow` ensures any internal links on filtered pages still pass equity
- The existing `category/[category].astro` pages (static route, NOT query param) are a different pattern and can stay indexed if desired, but they use the OLD string enum and will need updating or removal

**What about promoting high-value filters to indexable taxonomy pages?** Not recommended for v1.1:
- 25 reviews across 5 categories = average 5 per category. Too thin for standalone landing pages.
- Brand pages (e.g., `/reviews/weber/`) would have 3-4 reviews max. Not enough for a quality landing page.
- Revisit when corpus reaches 50+ reviews. At that point, "Best Weber Grills" or "Best Smokers Under $800" become viable indexable pages.
- For now, the unfiltered reviews index is the only page worth indexing.

### Implementation: SEOHead Modification

The `SEOHead.astro` component currently hardcodes `<meta name="robots" content="index, follow">` (line 71). This must become conditional:

```astro
// Add to SEOHead Props interface
noindex?: boolean;

// In the template, replace hardcoded line 71:
<meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow'} />
```

Then in reviews index pages:
```astro
// Detect if any filter is active
const hasFilters = Astro.url.searchParams.has('brand') ||
  Astro.url.searchParams.has('category') ||
  Astro.url.searchParams.has('score') ||
  Astro.url.searchParams.has('price');

<BaseLayout
  canonicalPath={`/${reviewRoute}/`}
  canonicalQuery=""  // Always canonical to unfiltered (no query params in canonical)
  noindex={hasFilters}
>
```

### Mobile Bottom-Sheet Drawer

A Svelte 5 island component (`ReviewFilterDrawer.svelte`) using the project's established pattern:

```svelte
<!-- Pattern from BookmarkButton.svelte / ComparisonTool.svelte -->
<script lang="ts">
  let { filters, counts, activeFilters, locale, labels }: Props = $props();
  let isOpen = $state(false);
  let pendingSelections = $state<Record<string, string[]>>({});
  let pendingCount = $derived(/* count changed selections */);
</script>
```

Mount in Astro template with `client:visible`:
```astro
<ReviewFilterDrawer
  client:visible
  filters={filterConfig}
  counts={facetCounts}
  activeFilters={currentFilters}
  locale={locale}
  labels={filterLabels}
/>
```

The drawer shows on viewports <= 768px (CSS media query). On desktop, filters render inline (no drawer, no Svelte island needed -- pure Astro/HTML links).

### Recommended Project Structure

```
web/src/
  components/
    review/
      ReviewFilterBar.astro       # Desktop: inline filter pills (server-rendered)
      ReviewFilterDrawer.svelte   # Mobile: bottom-sheet Svelte 5 island
      ReviewEmptyState.astro      # Zero-match state with "Clear filters" link
  lib/
    filters.ts                    # Shared filter types, price bucket defs, URL builders
    types.ts                      # Updated StrapiProduct type (price decimal, product_category relation)
  pages/
    en/reviews/index.astro        # Updated with multi-facet filtering
    it/recensioni/index.astro     # Same updates, locale=it
    es/resenas/index.astro        # Same updates, locale=es
```

### Existing Category Pages Decision

The existing `category/[category].astro` pages (EN, IT, ES) use the OLD string enum pattern (`product.category.$eq`). Phase 11 replaced the string enum with a `product_category` relation. These pages are currently broken or will be after the types update. Options:

1. **Remove them** -- the new query-param filter replaces their functionality
2. **Keep and update** -- point to `product.product_category.slug.$eq`

**Recommendation: Remove them.** The query-param filter (`?category=grill`) provides identical functionality with better UX (multi-select, combinable with other facets). Keeping both creates duplicate content problems. Add a redirect from `/reviews/category/grill/` to `/reviews/?category=grill` for any existing links.

### Anti-Patterns to Avoid

- **Client-side-only filtering (fetch all, filter in JS):** Breaks shareability, no SSR for SEO, no proper URL state. The requirements explicitly demand URL query params and server-rendered results.
- **Indexing filtered URLs:** With 25 reviews, filtered views are thin content. Google may penalize or ignore them. Use noindex, follow.
- **Using `canonical` + `noindex` pointing to different URLs:** Google receives mixed signals. The canonical must point to the unfiltered index (same page without query params), and noindex must be on the same page. This is consistent usage. [CITED: searchengineland.com/guide/faceted-navigation]
- **Blocking filtered URLs in robots.txt:** Would prevent Googlebot from discovering internal links on those pages. `noindex, follow` is better for a small site.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL query param parsing | Custom string splitting | `Astro.url.searchParams` (built-in URLSearchParams) | Standard API, handles encoding, edge cases |
| Filter URL construction | String concatenation | `URLSearchParams` builder utility in `lib/filters.ts` | Handles param ordering, encoding, empty removal |
| Mobile bottom-sheet animation | Custom JS animation | CSS `transform: translateY()` + `transition` | GPU-accelerated, no GSAP needed for this |
| Facet count computation | N separate Strapi queries | Single full fetch + in-memory counting | 25 items, one request is faster than 20+ |

## Common Pitfalls

### Pitfall 1: NULL Prices Block Price Filter
**What goes wrong:** FILT-03 requires price bucket filtering, but ALL 25 products have `price: null` in production.
**Why it happens:** Phase 11 created the `price` decimal field but the migration script did not populate real prices.
**How to avoid:** Include a data population step in Phase 13 that sets realistic EUR prices on all 25 products before the filter UI goes live. Alternatively, mark FILT-03 as blocked pending price data entry.
**Warning signs:** Price filter shows 0 results for all buckets.

### Pitfall 2: Missing Brand Relations
**What goes wrong:** 12 of 25 products have `brand_relation: null`, meaning the brand filter undercounts.
**Why it happens:** Not all products were linked to their Brand entity during Phase 11 migration.
**How to avoid:** Fix brand_relation for all products where the brand exists (e.g., "Yoder YS640s" should link to Yoder if the brand exists, "Lodge Cast Iron" to Lodge, etc.).
**Warning signs:** Brand filter shows fewer results than expected.

### Pitfall 3: Stale TypeScript Types
**What goes wrong:** `web/src/lib/types.ts` still defines `StrapiProduct` with old `category` string enum and `price_range` enum. No `StrapiProductCategory` type exists.
**Why it happens:** Phase 11 updated CMS schemas but did not update frontend types.
**How to avoid:** Update `types.ts` as the first task: replace `category`/`price_range` with `product_category` relation and `price` decimal, add `StrapiProductCategory` interface, add `product-categories` to `ContentType` union.
**Warning signs:** TypeScript compilation errors, runtime type mismatches.

### Pitfall 4: SEOHead Hardcoded robots
**What goes wrong:** Filtered URLs get `index, follow` because SEOHead.astro line 71 is hardcoded.
**Why it happens:** No conditional noindex was needed before this phase.
**How to avoid:** Add `noindex` prop to SEOHead and BaseLayout, wire through from reviews pages.
**Warning signs:** `curl -s https://bbq-experience.com/en/reviews/?brand=weber | grep robots` shows `index, follow`.

### Pitfall 5: Three Locale Pages Must Be Updated in Sync
**What goes wrong:** EN gets filters but IT/ES pages are forgotten or lag behind.
**Why it happens:** Each locale has its own reviews index file (copy-paste pattern, not shared component).
**How to avoid:** Extract filter logic into a shared utility (`lib/filters.ts`), keep locale-specific pages thin (just set locale and import shared logic). Update all 3 in the same plan.
**Warning signs:** One locale has filters, others show old category bar only.

## Code Examples

### Filter URL Builder Utility

```typescript
// web/src/lib/filters.ts
// Source: project conventions, URLSearchParams standard API

export const PRICE_BUCKETS = {
  'under-300': { min: null, max: 299.99, label: { en: 'Under EUR300', it: 'Sotto EUR300', es: 'Menos de EUR300' } },
  '300-800': { min: 300, max: 800, label: { en: 'EUR300-EUR800', it: 'EUR300-EUR800', es: 'EUR300-EUR800' } },
  '800-1500': { min: 800, max: 1500, label: { en: 'EUR800-EUR1500', it: 'EUR800-EUR1500', es: 'EUR800-EUR1500' } },
  'over-1500': { min: 1500.01, max: null, label: { en: 'Over EUR1500', it: 'Oltre EUR1500', es: 'Mas de EUR1500' } },
} as const;

export const SCORE_THRESHOLDS = [
  { value: '8', label: '8+' },
  { value: '7', label: '7+' },
  { value: '6', label: '6+' },
] as const;

export function buildFilterUrl(
  basePath: string,
  filters: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
```

### Strapi Nested Filter for Brand

```typescript
// Source: existing serializeFilters in web/src/lib/strapi.ts
// Filter by brand slug through the product relation chain
const filters = {
  product: {
    brand_relation: {
      slug: { $eq: 'weber' }
    }
  }
};
// serializeFilters produces: filters[product][brand_relation][slug][$eq]=weber
```

### Conditional Noindex in SEOHead

```astro
// Source: project pattern from SEOHead.astro
// Add to Props interface:
noindex?: boolean;

// Replace line 71:
<meta name="robots" content={Astro.props.noindex ? 'noindex, follow' : 'index, follow'} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `product.category` string enum | `product.product_category` relation | Phase 11 (2026-04) | Filter queries change from `category.$eq` to `product_category.slug.$eq` |
| `product.price_range` enum (budget/mid-range/premium/luxury) | `product.price` decimal field | Phase 11 (2026-04) | Enables exact EUR bucket filtering, but field is currently NULL for all products |
| Hardcoded categories array in page | Dynamic from Strapi `product-categories` API | Phase 11 (2026-04) | Categories can be added/edited in CMS without code change |
| Old `category/[category].astro` static routes | Query param filtering on index page | This phase | Static category routes become redundant, remove + redirect |

**Deprecated/outdated:**
- `product.category` string enum: removed from CMS schema, still in frontend types.ts
- `product.price_range` string enum: removed from CMS schema, still in frontend types.ts
- `categories/[category].astro` pages: use old enum, functionally replaced by query-param filters

## Production Data Inventory

| Facet | Values in Production | Distribution | Notes |
|-------|---------------------|-------------|-------|
| Category | Grill (7), Smoker (6), Accessory (8), Thermometer (4), Pellet Grill (0) | Uneven, Pellet Grill empty | "Pellet Grill" category exists but has 0 products |
| Brand | 22 brands total, 12 linked to products | Weber (3), ThermoWorks (2), etc. | 13 products have NULL brand_relation |
| Price | ALL NULL | N/A | **BLOCKER for FILT-03** |
| Score | Range 5.8-8.8 | 6+ (23), 7+ (15), 8+ (5) | Good distribution for threshold filter |

[VERIFIED: production Strapi API queries on 2026-04-21]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Price data must be populated manually by Matteo or via a script before FILT-03 works | Production Data Inventory | If prices can be scraped from affiliate links or existing data, a script could automate this |
| A2 | Existing `category/[category].astro` routes can be removed with redirects | Architecture | If Google has indexed these and they have backlinks, redirects must be 301 permanent |
| A3 | 25-item corpus is too small for indexable taxonomy landing pages | SEO Strategy | If Matteo plans rapid content growth (100+ reviews soon), building indexable pages now avoids rework |

## Open Questions (RESOLVED)

1. **Price Data Population** — RESOLVED: Plan 03 Task 1 creates `scripts/fix_review_data.py` with hard-coded EUR price estimates for all 25 products. Plan 03 Task 2 (checkpoint) has Matteo verify and correct prices in Strapi admin before filter goes live.
   - What we know: All 25 products have `price: null`. Phase 11 created the field but did not populate values.
   - What's unclear: Does Matteo want to enter prices manually in Strapi admin, or should we build a script to scrape/estimate from affiliate URLs?
   - Recommendation: Include a data entry task in the plan. If manual, Matteo fills prices in Strapi admin before filter goes live. The plan should handle the NULL case gracefully (hide price filter when no prices exist, or show "Price data coming soon").

2. **Missing Brand Relations (13 of 25 products)** — RESOLVED: Plan 03 Task 1 creates `BRAND_FIXES` dict in `scripts/fix_review_data.py` with hard-coded product-slug → brand-slug mappings for all 13 unlinked products. Script PUTs brand_relation via Strapi REST API.
   - What we know: Products like "Yoder YS640s", "Lodge Cast Iron Sportsman Grill", "Char-Broil Kettleman" have NULL brand_relation despite matching brands existing in the Brand content type.
   - What's unclear: Whether this is intentional or a migration gap.
   - Recommendation: Fix as part of this phase. A small migration script can match product names to brand names and set the relation.

3. **Pellet Grill Category: 0 Products** — RESOLVED: Plan 03 Task 1 creates `PELLET_RECLASSIFY` list in `scripts/fix_review_data.py` to recategorize Traeger Ironwood 885 and Camp Chef Woodwind WiFi 24 from "Smoker" to "Pellet Grill" via Strapi REST API. Plan 02 hides empty categories in ReviewFilterBar (count > 0 guard).
   - What we know: Category exists but no products are tagged "Pellet Grill". Two products (Traeger Ironwood 885, Camp Chef Woodwind WiFi 24) are pellet grills but categorized as "Smoker".
   - What's unclear: Whether these should be recategorized.
   - Recommendation: Recategorize pellet grills. Show Pellet Grill in filter only if count > 0 (hide empty categories).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured) + Playwright (E2E) |
| Config file | `web/vitest.config.ts` (if exists) / `web/playwright.config.ts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | Brand filter returns correct results | unit | `npx vitest run tests/filters.test.ts` | Wave 0 |
| FILT-03 | Price bucket filter returns correct results | unit | `npx vitest run tests/filters.test.ts` | Wave 0 |
| FILT-04 | Score threshold filter returns correct results | unit | `npx vitest run tests/filters.test.ts` | Wave 0 |
| FILT-05 | Count badges show correct numbers, empty state renders | unit + E2E | E2E: `npx playwright test tests/review-filters.spec.ts` | Wave 0 |
| FILT-06 | Filtered URL has noindex+canonical, unfiltered has index | unit | `npx vitest run tests/seo-head.test.ts` | Wave 0 |
| FILT-07 | Mobile drawer opens, shows pending count, applies filters | E2E | `npx playwright test tests/review-filters-mobile.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=verbose`
- **Per wave merge:** Full Vitest + curl verification of noindex on production
- **Phase gate:** All tests green + `curl` verify canonical/noindex on all 3 locales

### Wave 0 Gaps
- [ ] `web/tests/filters.test.ts` -- unit tests for filter URL builder, price bucket logic, Strapi filter construction
- [ ] `web/tests/seo-head.test.ts` -- unit tests for conditional noindex/canonical behavior
- [ ] E2E tests deferred to integration wave (require running Strapi + Astro)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (public page) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A (public read-only) |
| V5 Input Validation | yes | Validate query params server-side (whitelist allowed values) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Query param injection (brand=`<script>`) | Tampering | Whitelist-validate all filter values against known brands/categories from Strapi before using in API calls or rendering |
| Filter enumeration (testing all brand slugs) | Information Disclosure | Low risk for public content. No sensitive data exposed. |
| Denial of service via complex filter combos | Denial of Service | Strapi pagination limit (pageSize=12) already caps response size. 25-item corpus = negligible DB cost. |

## Sources

### Primary (HIGH confidence)
- Production Strapi API queries (2026-04-21) -- 25 reviews, 5 categories, 22 brands, all prices NULL, score range 5.8-8.8
- `web/src/pages/en/reviews/index.astro` -- existing SSR reviews page with category filter
- `web/src/lib/strapi.ts` -- existing fetchCollection with filter serialization
- `web/src/components/common/SEOHead.astro` -- hardcoded robots meta tag
- `cms/src/api/product/content-types/product/schema.json` -- product_category relation + price decimal (Phase 11)
- `cms/src/api/product-category/content-types/product-category/schema.json` -- 5 localized categories

### Secondary (MEDIUM confidence)
- [Google: Managing crawling of faceted navigation URLs](https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation) -- canonical + noindex strategy
- [Search Engine Land: Faceted navigation in SEO](https://searchengineland.com/guide/faceted-navigation) -- noindex vs robots.txt tradeoffs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns verified in codebase
- Architecture: HIGH -- SSR + query params follows existing pattern, Svelte 5 island pattern established
- SEO strategy: HIGH -- Google's official docs confirm canonical + noindex approach
- Data readiness: MEDIUM -- prices are NULL, brand relations incomplete

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no fast-moving dependencies)
