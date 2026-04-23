# Phase 14: Recipe Collections - Research

**Researched:** 2026-04-21
**Domain:** Strapi content type evolution + Astro SSR pages + i18n routing + SEO (JSON-LD, sitemap, hreflang)
**Confidence:** HIGH

## Summary

Phase 14 adds a first-class "Recipe Collections" section to the site. The Strapi `recipe-collection` content type already exists (scaffolded in Phase 11) with `title`, `slug`, `hero_image`, `editorial_intro`, `order`, and a `oneToMany` relation to `recipes`. The `recipe` schema already has a `manyToOne` `collection` back-reference. The shared locale helper (`cms/src/lib/update-localized.ts`) is also in place (COLL-06 complete).

The work divides into: (1) evolving the Strapi schema with missing fields (`description`, `author_note`), (2) creating 6 new Astro page files (index + detail x3 locales), (3) adding `recipe-collections` to the `ContentType` union and creating a `StrapiRecipeCollection` interface, (4) adding a "Part of [Collection]" badge on recipe detail pages, (5) extending the sitemap with collection URLs + xhtml:link hreflang entries, and (6) emitting CollectionPage JSON-LD on the detail page. No new libraries needed.

**Primary recommendation:** Follow the exact patterns of the recipes/reviews pages. Add `collections` to `localizedRoutes` (en: `collections`, it: `raccolte`, es: `colecciones`). Populate `collection` on recipe fetches to power the badge. Use `populate[0]=recipes&populate[1]=hero_image` for collection detail fetches.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLL-01 | Author creates recipe collection in Strapi with title, slug, hero, intro, ordered recipes, localized EN/IT/ES | Schema already scaffolded; needs `description` and `author_note` fields added. Locale helper exists (COLL-06). |
| COLL-02 | Reader browses `/collections` listing with cover, title, recipe count, description | New index pages x3 locales following recipes/index.astro pattern. Filter out unpublished and empty (<1 recipe) collections. |
| COLL-03 | Reader opens collection detail with intro, ordered recipes, author's note; hreflang only for existing translations | New detail pages x3 locales. Need conditional hreflang via Strapi `localizations` populate or cross-locale slug check. |
| COLL-04 | Recipe detail shows "Part of [Collection]" badge linking back | Populate `collection` on recipe fetchBySlug; new CollectionBadge component. |
| COLL-05 | Collection URLs in sitemap with hreflang | Extend sitemap.xml.ts to include `recipe-collections` content type + add `<xhtml:link>` hreflang entries. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives relevant to this phase:

- **i18n custom JSON** -- translations in `src/i18n/{locale}.json`, NOT Paraglide. Translation keys type-safe via `src/i18n/types.ts`
- **Strapi v5 localizations** -- PUT with `?locale=xx` in query param, always include slug in body (helper already exists)
- **Fetch timeouts** -- ALL `fetch()` to external services must have `signal: AbortSignal.timeout(10_000)`
- **Markdown rendering CMS** -- content passes through `renderMarkdown()` before `set:html`
- **CollectionPage JSON-LD** -- emitted automatically on listing pages via CollectionPageSchema
- **Hreflang** -- SEOHead calculates hreflang via `getLocalizedPath()` translating route slugs per locale target
- **Mobile menu panel** -- backdrop and panel live in BaseLayout, not Header
- **Hero/FeaturedHero text** -- forced `color: #fff` + text-shadow on titles over dark overlays
- **Product brand** -- use ONLY `brand_relation`, NOT string `brand`
- **Container names** -- PostgreSQL: "postgres"
- **Secrets** -- NEVER commit tokens/API keys
- **Deploy** -- webhook auto on push

## Standard Stack

No new libraries needed. This phase uses existing project infrastructure only.

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Astro | 6.x | SSR pages for collection listing/detail | [VERIFIED: already in project] |
| Strapi | 5.x | CMS backend, recipe-collection content type | [VERIFIED: schema exists in cms/src/api/recipe-collection/] |
| Tailwind CSS | 4.x | Styling | [VERIFIED: already in project] |

### No Installation Needed
This is a pure feature phase using existing stack. Zero new dependencies.

## Architecture Patterns

### New Files to Create

```
web/src/
  pages/
    en/collections/
      index.astro            # EN listing
      [slug].astro           # EN detail
    it/raccolte/
      index.astro            # IT listing
      [slug].astro           # IT detail
    es/colecciones/
      index.astro            # ES listing
      [slug].astro           # ES detail
  components/
    collection/
      CollectionCard.astro   # Card per listing (cover, title, count, description)
      CollectionBadge.astro  # "Part of [X]" badge per recipe detail
```

### Files to Modify

```
web/src/lib/i18n.ts          # Add 'collections' to localizedRoutes
web/src/lib/types.ts         # Add 'recipe-collections' to ContentType, add StrapiRecipeCollection interface
web/src/i18n/en.json         # Add collections.* translation keys
web/src/i18n/it.json         # Add collections.* translation keys
web/src/i18n/es.json         # Add collections.* translation keys
web/src/i18n/types.ts        # Add new translation key types
web/src/pages/sitemap.xml.ts # Add recipe-collections to contentTypes + hreflang
web/src/pages/en/recipes/[slug].astro  # Add CollectionBadge when recipe.collection exists
web/src/pages/it/ricette/[slug].astro  # Same
web/src/pages/es/recetas/[slug].astro  # Same
cms/src/api/recipe-collection/content-types/recipe-collection/schema.json  # Add description, author_note fields
```

### Pattern 1: Strapi Schema Evolution

**What:** Add missing fields to the existing recipe-collection schema [VERIFIED: current schema lacks `description` and `author_note`]

**Current schema fields:** `title`, `slug`, `hero_image`, `editorial_intro`, `order`, `recipes` (relation)

**Fields to add:**
```json
{
  "description": {
    "type": "text",
    "pluginOptions": {
      "i18n": { "localized": true }
    }
  },
  "author_note": {
    "type": "richtext",
    "pluginOptions": {
      "i18n": { "localized": true }
    }
  }
}
```

**Note on recipe ordering:** The current `order` field is on the collection itself (for sorting collections relative to each other). Recipe ordering within a collection is handled by the Strapi relation order (the order recipes appear in the `recipes` array). This is the standard Strapi v5 pattern for ordered relations -- the admin panel lets you drag-reorder relation entries. [ASSUMED]

### Pattern 2: Collection Listing Page (follows recipes/index.astro exactly)

**What:** SSR page fetching collections with `prerender = false`

```typescript
// Fetch published collections with recipe count
const response = await fetchCollection<StrapiRecipeCollection>('recipe-collections', {
  locale,
  populate: ['recipes', 'hero_image'],
  sort: 'order:asc',
  pageSize: 50,
});

// Filtra collezioni vuote (< 1 ricetta)
const collections = response.data.filter(c => c.recipes && c.recipes.length > 0);
```

### Pattern 3: Collection Detail Page (follows recipes/[slug].astro)

**What:** Fetch single collection by slug with populated recipes

```typescript
const collection = await fetchBySlug<StrapiRecipeCollection>('recipe-collections', slug!, {
  locale,
  populate: ['recipes.cover_image', 'hero_image'],
  status,
});

if (!collection || !collection.recipes?.length) {
  return new Response(null, { status: 404, statusText: 'Not Found' });
}
```

### Pattern 4: "Part of [Collection]" Badge on Recipe Detail

**What:** When fetching a recipe, also populate its `collection` relation

```typescript
// In recipe [slug].astro — modify the existing fetchBySlug call
const recipe = await fetchBySlug<StrapiRecipe>('recipes', slug!, {
  locale,
  populate: ['cover_image', 'gallery', 'collection'],  // aggiunta collection
  status,
});

// Nel template, se la ricetta appartiene a una collezione:
{recipe.collection && (
  <CollectionBadge
    collectionTitle={recipe.collection.title}
    collectionSlug={recipe.collection.slug}
    locale={locale}
    translations={translations}
  />
)}
```

### Pattern 5: Conditional Hreflang (COLL-03 requirement)

**What:** Collection detail pages emit hreflang only for locales where a translation exists.

**Current behavior:** SEOHead emits hreflang for ALL 3 locales unconditionally. [VERIFIED: web/src/components/common/SEOHead.astro lines 89-92]

**Options:**
1. **Add `availableLocales` prop to SEOHead** -- pass only the locales that have a published translation. SEOHead filters the hreflang links. This is the cleanest approach and doesn't break existing pages (which always have all 3).
2. **Populate `localizations` from Strapi** -- Strapi v5 returns sibling localizations when you `populate=localizations`. Use this to determine which locales exist.

**Recommendation:** Option 1 + 2 combined. Fetch `populate: [..., 'localizations']`, extract available locales from the response, pass to SEOHead as optional `availableLocales?: Locale[]` prop.

```typescript
// Estrarre locali disponibili dalle localizations Strapi
const availableLocales = [locale as Locale];
if (collection.localizations) {
  for (const loc of collection.localizations) {
    if (loc.publishedAt) availableLocales.push(loc.locale as Locale);
  }
}
```

### Pattern 6: Sitemap Extension with Hreflang

**What:** The current sitemap.xml.ts does NOT emit `<xhtml:link>` hreflang entries. [VERIFIED: web/src/pages/sitemap.xml.ts has no xhtml namespace or alternate links]

**COLL-05 requires** `<xhtml:link rel="alternate" hreflang="...">` entries in the sitemap for collection URLs.

**Implementation:** Add `recipe-collections` to the `contentTypes` array and `routeKeyMap`. For hreflang, add the xmlns declaration and alternate links per URL. This improvement could apply to ALL content types, but scope to collections for this phase.

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://bbq-experience.com/en/collections/summer-grilling/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://bbq-experience.com/en/collections/summer-grilling/" />
    <xhtml:link rel="alternate" hreflang="it" href="https://bbq-experience.com/it/raccolte/summer-grilling/" />
    <xhtml:link rel="alternate" hreflang="es" href="https://bbq-experience.com/es/colecciones/summer-grilling/" />
  </url>
</urlset>
```

### Anti-Patterns to Avoid

- **Do NOT use `populate: '*'` for collections** -- it will pull ALL recipe fields recursively. Use specific field populations: `populate: ['recipes.cover_image', 'hero_image']`
- **Do NOT hand-roll recipe ordering** -- Strapi v5 relation arrays preserve admin panel order. Just iterate in order.
- **Do NOT create a separate SSR endpoint for recipe count** -- fetch recipes relation and use `.length` at render time
- **Do NOT duplicate the SEOHead component** -- add an optional `availableLocales` prop to the existing one

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collection listing card | Custom card from scratch | Follow RecipeCard.astro pattern | Consistent styling, reuse grid layout |
| JSON-LD | Manual JSON string | CollectionPageSchema.astro (exists) | Already handles Schema.org CollectionPage |
| i18n route translation | Manual slug mapping | localizedRoutes in i18n.ts | getLocalizedPath() handles all translation |
| Hreflang generation | Manual link tags | SEOHead.astro (extend with availableLocales) | Consistent with all other pages |
| Markdown rendering | Raw set:html | renderMarkdown() from lib/markdown.ts | Handles GFM, nested anchors, soft hyphens |

## Common Pitfalls

### Pitfall 1: Strapi populate depth for nested relations
**What goes wrong:** Using `populate: '*'` on recipe-collections pulls all recipe fields and their nested relations, causing slow API responses and potential timeouts.
**Why it happens:** `*` is shallow by default in Strapi v5 but still pulls more than needed.
**How to avoid:** Use explicit populate: `['recipes.cover_image', 'recipes.slug', 'recipes.title', 'hero_image']` or `populate: ['recipes', 'hero_image']` if you need all recipe fields.
**Warning signs:** API response > 1 second, large JSON payloads.

### Pitfall 2: Empty collection rendering
**What goes wrong:** Collections with 0 recipes show as empty pages or broken cards.
**Why it happens:** A collection can exist in Strapi but have no recipes assigned yet.
**How to avoid:** Filter out collections with `recipes.length < 1` in the listing page. Return 404 on detail page if no recipes.

### Pitfall 3: Hreflang pointing to non-existent translations
**What goes wrong:** Google indexes hreflang links that return 404 because the collection hasn't been translated to that locale yet.
**Why it happens:** SEOHead currently emits all 3 locales unconditionally.
**How to avoid:** Populate `localizations` from Strapi, pass available locales to SEOHead. Only emit hreflang for locales with a published translation.

### Pitfall 4: ContentType union missing recipe-collections
**What goes wrong:** TypeScript errors when calling `fetchCollection('recipe-collections', ...)`.
**Why it happens:** The `ContentType` union in `types.ts` doesn't include `'recipe-collections'`.
**How to avoid:** Add `| 'recipe-collections'` to the ContentType union early.

### Pitfall 5: Recipe detail populate breaking existing pages
**What goes wrong:** Changing `populate: '*'` to an array that omits fields currently used.
**Why it happens:** Recipe [slug].astro currently uses `populate: '*'`.
**How to avoid:** When adding `collection` to the recipe populate, keep the existing `'*'` or add `collection` explicitly: `populate: ['*', 'collection']` -- or better, switch to explicit fields.

### Pitfall 6: Sitemap xhtml namespace missing
**What goes wrong:** Hreflang entries in sitemap are ignored by Google because the `xmlns:xhtml` declaration is missing.
**Why it happens:** The current sitemap template doesn't include the namespace.
**How to avoid:** Add `xmlns:xhtml="http://www.w3.org/1999/xhtml"` to the `<urlset>` element.

## Code Examples

### StrapiRecipeCollection Type Definition
```typescript
// Source: derived from cms schema.json [VERIFIED]
export interface StrapiRecipeCollection {
  title: string;
  slug: string;
  description: string | null;
  editorial_intro: string | null;
  author_note: string | null;
  hero_image: StrapiMedia | null;
  order: number;
  recipes: (StrapiRecipe & StrapiEntity)[] | null;
  localizations?: { locale: string; publishedAt: string | null }[];
}
```

### localizedRoutes Addition
```typescript
// Source: web/src/lib/i18n.ts [VERIFIED: pattern from existing routes]
collections: { en: 'collections', it: 'raccolte', es: 'colecciones' },
```

### Translation Keys (en.json)
```json
{
  "collections": {
    "title": "Recipe Collections",
    "allCollections": "All Collections",
    "recipes": "{count} recipes",
    "partOf": "Part of",
    "authorsNote": "Author's Note",
    "emptyState": "No collections available yet.",
    "viewCollection": "View Collection"
  }
}
```

### SEOHead availableLocales Extension
```typescript
// Add optional prop to SEOHead.astro
interface Props {
  // ... existing props
  availableLocales?: Locale[];  // NEW: if provided, only emit hreflang for these
}

// In template:
const hreflangLocales = availableLocales || locales;

{hreflangLocales.map((lang) => (
  <link rel="alternate" hreflang={lang} href={hrefForLocale(lang)} />
))}
{hreflangLocales.includes('en' as Locale) && (
  <link rel="alternate" hreflang="x-default" href={hrefForLocale('en')} />
)}
```

### CollectionBadge Component
```astro
---
// CollectionBadge.astro -- "Part of [Collection]" badge per recipe detail
import { localizedRoutes, getTranslation } from '@lib/i18n';
import type { Locale } from '@lib/i18n';

interface Props {
  collectionTitle: string;
  collectionSlug: string;
  locale: Locale;
  translations: Record<string, any>;
}

const { collectionTitle, collectionSlug, locale, translations } = Astro.props;
const collectionsRoute = localizedRoutes.collections[locale];
---

<a
  href={`/${locale}/${collectionsRoute}/${collectionSlug}/`}
  class="collection-badge"
>
  {getTranslation(translations, 'collections.partOf')} {collectionTitle}
</a>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SEOHead emits all locales | Should filter by available translations | This phase | Prevents 404 hreflang (Google penalty) |
| Sitemap without xhtml:link | Must add hreflang alternate links | This phase | Required for COLL-05 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Strapi v5 relation arrays preserve admin panel drag order | Architecture Pattern 2 | Would need a `sort_order` field on recipe or a junction table; medium impact |
| A2 | Strapi v5 `populate=localizations` returns sibling locale info with publishedAt | Architecture Pattern 5 | Would need to query each locale separately to check existence; low impact |
| A3 | Route slugs `raccolte` (IT) and `colecciones` (ES) are the correct translations | Code Examples | Wrong translation would need URL redirect; low impact -- Matteo can confirm |

## Open Questions

1. **Recipe ordering within a collection**
   - What we know: Strapi v5 relations preserve order set in admin panel
   - What's unclear: Whether this is guaranteed or implementation-dependent
   - Recommendation: Test with 3+ recipes in a collection after schema deploy. If order is not preserved, add a `sort_order` integer field on Recipe.

2. **Sitemap hreflang scope**
   - What we know: COLL-05 requires hreflang in sitemap for collections
   - What's unclear: Whether to also backfill hreflang for existing content types (reviews, recipes, tutorials, blog-posts)
   - Recommendation: Add hreflang ONLY for recipe-collections in this phase. Backfill others in a future debt phase to keep scope tight.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (config: web/vitest.config.ts) + Playwright (config: web/playwright.config.ts) |
| Config file | `web/vitest.config.ts`, `web/playwright.config.ts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLL-01 | Schema has required fields, localizations enabled | manual | Verify via Strapi admin after deploy | N/A |
| COLL-02 | Listing pages render, empty collections filtered | smoke/e2e | `npx playwright test collections-listing` | No -- Wave 0 |
| COLL-03 | Detail page renders, hreflang conditional | smoke/e2e | `npx playwright test collections-detail` | No -- Wave 0 |
| COLL-04 | Recipe badge renders when collection exists | smoke/e2e | `npx playwright test recipe-collection-badge` | No -- Wave 0 |
| COLL-05 | Sitemap includes collections + hreflang | unit | `npx vitest run sitemap` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd web && npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `web/tests/sitemap-collections.test.ts` -- unit test for sitemap hreflang output (COLL-05)
- [ ] Playwright tests for collection pages (COLL-02, COLL-03, COLL-04) -- requires running Strapi with test data

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- read-only public pages |
| V3 Session Management | No | N/A |
| V4 Access Control | No | Strapi admin handles collection CRUD |
| V5 Input Validation | Yes | Strapi validates schema; Astro renders escaped by default |
| V6 Cryptography | No | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via CMS richtext | Tampering | renderMarkdown() sanitizes; Astro auto-escapes |
| Slug injection in URL | Tampering | fetchBySlug returns null -> 404 for invalid slugs |

## Sources

### Primary (HIGH confidence)
- `cms/src/api/recipe-collection/content-types/recipe-collection/schema.json` -- current schema fields verified
- `cms/src/api/recipe/content-types/recipe/schema.json` -- `collection` manyToOne relation verified
- `web/src/lib/i18n.ts` -- localizedRoutes pattern verified, no `collections` entry yet
- `web/src/lib/types.ts` -- ContentType union verified, no `recipe-collections` entry yet
- `web/src/lib/strapi.ts` -- fetchCollection, fetchBySlug patterns verified
- `web/src/pages/sitemap.xml.ts` -- current sitemap lacks xhtml:link hreflang, verified
- `web/src/components/common/SEOHead.astro` -- hreflang emits all locales unconditionally, verified
- `web/src/components/common/CollectionPageSchema.astro` -- existing JSON-LD component, verified
- `web/src/pages/en/recipes/index.astro` -- listing page pattern, verified
- `web/src/pages/en/recipes/[slug].astro` -- detail page pattern, verified
- `cms/src/lib/update-localized.ts` -- shared locale helper exists, verified

### Secondary (MEDIUM confidence)
- Strapi v5 documentation on relation ordering and localizations populate

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing
- Architecture: HIGH -- follows established page patterns exactly
- Pitfalls: HIGH -- derived from verified codebase analysis
- Schema evolution: MEDIUM -- `description` and `author_note` fields need adding; ordering assumption needs validation

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no fast-moving dependencies)
