---
phase: 14-recipe-collections
verified: 2026-04-21T16:40:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Strapi admin: verify recipe-collection content type has description + author_note fields in admin UI and can create + localize a collection"
    expected: "Fields visible in Content Manager. Translating to IT/ES via PUT ?locale=xx + slug in body works via update-localized.ts helper."
    why_human: "Schema fields are code-side only until Strapi restarts and picks them up on the server. Cannot verify Strapi admin UI or field availability without live access."
  - test: "Browse /en/collections/, /it/raccolte/, /es/colecciones/ — verify collections appear with cover image, title, recipe count badge, and short description"
    expected: "Responsive 3-column grid of collection cards. Empty collections excluded. CollectionPageSchema JSON-LD present in source."
    why_human: "Listing pages are SSR; they depend on Strapi publishing actual collection entries. Cannot verify rendered output without live Strapi data."
  - test: "Open a collection detail page — verify hero image renders with title overlay, editorial intro section, ordered recipe grid (thumbnail + title + cook time), and author's note section"
    expected: "Full-width hero with white title + text-shadow. Editorial intro via renderMarkdown. Recipe grid using RecipeCard. Author's note section conditional on field presence."
    why_human: "Detail page requires a published collection with recipes assigned in Strapi. SSR output depends on CMS data."
  - test: "Open a recipe that belongs to a collection — verify 'Part of [Collection Name]' badge appears between breadcrumbs and metadata line, links to collection"
    expected: "Fire-orange pill badge with collection title. Click navigates to /{locale}/{collectionsRoute}/{slug}/. Badge absent on recipes without a collection."
    why_human: "Badge renders conditionally from recipe.collection data which requires a recipe-to-collection relation in Strapi."
  - test: "Visit /sitemap.xml and inspect collection URL entries — verify xhtml:link hreflang alternates present for collection URLs"
    expected: "Collection URLs appear with <xhtml:link rel='alternate' hreflang='en/it/es/x-default'> entries. Only locales with published translations included."
    why_human: "Sitemap fetches slugs live from Strapi. Cannot verify actual output without deployed server."
  - test: "Verify navigation on desktop and mobile — Collections link appears after Recipes"
    expected: "Desktop nav shows Collections link. Hamburger mobile menu panel shows Collections link in same position."
    why_human: "Visual navigation rendering and mobile menu panel interaction require browser."
---

# Phase 14: Recipe Collections — Verification Report

**Phase Goal:** The author can curate themed recipe groupings that readers browse as a first-class section of the site in all three locales.
**Verified:** 2026-04-21T16:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | In Strapi, Matteo can create a RecipeCollection with title, slug, hero image, editorial intro, ordered recipe list, and translate every field to IT and ES using the shared locale helper | VERIFIED (code) | Schema has all required fields with i18n pluginOptions. `cms/src/lib/update-localized.ts` exists from Phase 11. Fields: title, slug, hero_image, editorial_intro, description, author_note, order, recipes relation — all present. |
| 2 | `/en/collections/`, `/it/raccolte/`, `/es/colecciones/` each list every published collection with cover image, title, recipe count, and short description; unpublished or empty (<1 recipe) collections excluded | VERIFIED (code) | All 6 listing pages created. Filter `c.recipes && c.recipes.length > 0` applied. CollectionCard renders hero image, title, recipe count badge, and truncated description. |
| 3 | `/{locale}/{collections-route}/{slug}/` renders editorial intro, ordered recipes (thumbnail + title + cook time), and author's note; hreflang only points to sibling locales where a translation actually exists | VERIFIED (code) | Detail pages exist for all 3 locales. `renderMarkdown()` used for editorial_intro and author_note. RecipeCard used (includes cook_time). `availableLocales` computed from Strapi localizations.publishedAt. Forwarded through BaseLayout to SEOHead which filters hreflang to published locales only. |
| 4 | Any recipe that belongs to a collection renders a "Part of [Collection Name]" badge on its detail page linking back to that collection in the same locale | VERIFIED (code) | CollectionBadge imported and conditionally rendered (`{recipe.collection && ...}`) on all 3 recipe detail pages. Populate uses `'*'` which includes manyToOne collection relation. StrapiRecipe type extended with `collection?: { title: string; slug: string } \| null`. |
| 5 | All published collection URLs appear in the per-locale sitemap with correct `<xhtml:link rel="alternate" hreflang="...">` entries and a CollectionPage JSON-LD block on each detail page | VERIFIED (code) | `sitemap.xml.ts` has dedicated section 5 for recipe-collections with per-locale slug fetching and alternates construction. `xmlns:xhtml` declared. `x-default` added when EN variant exists. Excluded from standard section 4 loop to prevent duplicates. CollectionPageSchema component used in both listing and detail pages. Vitest tests: 3/3 pass. |

**Score:** 5/5 truths verified (code-level)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `cms/src/api/recipe-collection/content-types/recipe-collection/schema.json` | Schema with description, author_note i18n fields | VERIFIED | Both fields present with `pluginOptions.i18n.localized: true`. description (text), author_note (richtext). |
| `web/src/lib/types.ts` | StrapiRecipeCollection interface + ContentType union update | VERIFIED | Interface at line 99 with all fields. `'recipe-collections'` in ContentType union at line 17. Optional `collection?` field added to StrapiRecipe at line 170. |
| `web/src/lib/i18n.ts` | collections route in localizedRoutes | VERIFIED | `collections: { en: 'collections', it: 'raccolte', es: 'colecciones' }` at line 27. |
| `web/src/i18n/en.json` | collections.* translation keys + nav.collections | VERIFIED | partOf key confirmed present. |
| `web/src/i18n/it.json` | collections.* translation keys (IT) | VERIFIED | Raccolte confirmed present. |
| `web/src/i18n/es.json` | collections.* translation keys (ES) | VERIFIED | Colecciones confirmed present. |
| `web/src/components/collection/CollectionCard.astro` | Card component for collection listing | VERIFIED | Full implementation — hero image, CF srcset, recipe count badge, description truncation, hover styles. |
| `web/src/components/collection/CollectionBadge.astro` | Badge component for recipe detail pages | VERIFIED | Full implementation — pill link with fire-orange styling, partOf translation key, localizedRoutes.collections routing. |
| `web/src/pages/en/collections/index.astro` | EN collection listing page | VERIFIED | SSR, fetchCollection with recipe-collections, empty filter, CollectionCard grid, CollectionPageSchema. |
| `web/src/pages/en/collections/[slug].astro` | EN collection detail page | VERIFIED | fetchBySlug, availableLocales conditional hreflang, hero, editorial intro, recipes, author_note, renderMarkdown. |
| `web/src/pages/it/raccolte/index.astro` | IT collection listing page | VERIFIED | 130 lines, locale='it', same pattern as EN. |
| `web/src/pages/it/raccolte/[slug].astro` | IT collection detail page | VERIFIED | 250 lines, locale='it', correct breadcrumb paths. |
| `web/src/pages/es/colecciones/index.astro` | ES collection listing page | VERIFIED | 130 lines, locale='es', same pattern as EN. |
| `web/src/pages/es/colecciones/[slug].astro` | ES collection detail page | VERIFIED | 250 lines, locale='es', correct breadcrumb paths. |
| `web/src/components/common/SEOHead.astro` | availableLocales prop | VERIFIED | Optional prop at line 20, hreflangLocales computed at line 42, replaces hard-coded locales in hreflang loop. Backward-compatible. |
| `web/src/layouts/BaseLayout.astro` | availableLocales forwarded to SEOHead | VERIFIED | Prop at line 41, forwarded to SEOHead at line 92. |
| `web/src/pages/sitemap.xml.ts` | recipe-collections + xhtml:link hreflang | VERIFIED | Content type added, routeKeyMap updated, dedicated section 5 with alternates, xmlns:xhtml, x-default logic. |
| `web/src/components/common/Nav.astro` | Collections link in desktop nav | VERIFIED | navLinks array includes 'collections' at position after 'recipes'. |
| `web/src/components/common/MobileMenuPanel.astro` | Collections link in mobile menu | VERIFIED | navLinks array includes 'collections'. Plan referenced MobileMenu.astro but executor correctly used MobileMenuPanel.astro (per CLAUDE.md mobile menu convention). |
| `web/tests/sitemap-collections.test.ts` | Sitemap hreflang unit test | VERIFIED | 3 tests all pass: alternates rendering, no-alternates case, x-default logic. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `en/collections/index.astro` | Strapi recipe-collections API | fetchCollection('recipe-collections') | WIRED | Import confirmed, fetch confirmed with locale + populate + sort. |
| `en/collections/[slug].astro` | Strapi recipe-collections API | fetchBySlug('recipe-collections') | WIRED | fetchBySlug call confirmed with locale, populate (recipes.cover_image, hero_image, localizations). |
| `en/collections/[slug].astro` | SEOHead hreflang | availableLocales via BaseLayout | WIRED | availableLocales constructed from localizations.publishedAt, passed to BaseLayout, forwarded to SEOHead. |
| `en/recipes/[slug].astro` | CollectionBadge | recipe.collection conditional render | WIRED | Import at line 33, render at line 87 with `{recipe.collection && ...}`. Populate '*' includes collection relation. |
| `sitemap.xml.ts` | Strapi recipe-collections API | fetchAllSlugs('recipe-collections', locale) | WIRED | Section 5 fetches slugs per locale, builds alternates array. |
| `sitemap.xml.ts` | localizedRoutes | localizedRoutes.collections | WIRED | Route translation applied per locale for URL construction. |
| `BaseLayout.astro` | SEOHead.astro | availableLocales prop forwarded | WIRED | Prop in BaseLayout interface, forwarded in SEOHead tag. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `en/collections/index.astro` | collections[] | fetchCollection('recipe-collections', { populate: ['recipes', 'hero_image'] }) | Yes — live Strapi query | FLOWING |
| `en/collections/[slug].astro` | collection | fetchBySlug('recipe-collections', slug) | Yes — live Strapi query with slug param | FLOWING |
| `en/recipes/[slug].astro` CollectionBadge | recipe.collection | populate: '*' on recipe fetchBySlug | Yes — Strapi v5 populates manyToOne first-level | FLOWING |
| `sitemap.xml.ts` | collectionSlugsByLocale | fetchAllSlugs('recipe-collections', locale) per each locale | Yes — live Strapi query | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sitemap hreflang unit test | npx vitest run tests/sitemap-collections.test.ts | 3 passed (3) | PASS |
| schema.json parseable | node -e "JSON.parse(...schema.json)" | Valid JSON confirmed | PASS |
| author_note in schema | grep author_note schema.json | Found | PASS |
| StrapiRecipeCollection interface | grep StrapiRecipeCollection types.ts | Found (1 match) | PASS |
| recipe-collections in ContentType union | grep recipe-collections types.ts | Found (1 match) | PASS |
| raccolte in localizedRoutes | grep raccolte i18n.ts | Found | PASS |
| IT/ES slug pages exist | test -f it/raccolte/[slug].astro | 250 lines each | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| COLL-01 | 14-01 | Author creates RecipeCollection in Strapi with title, slug, hero, intro, ordered recipes, localized EN/IT/ES | SATISFIED (code) | Schema has all fields with i18n, TS locale helper from Phase 11 exists. Needs live Strapi verification. |
| COLL-02 | 14-02 | Reader browses collections at /collections per locale with cover, title, recipe count, description | SATISFIED (code) | 3 listing pages with CollectionCard, empty filter, all locale URLs correct. |
| COLL-03 | 14-02 | Reader opens collection detail with editorial intro, ordered recipes, author's note | SATISFIED (code) | 3 detail pages with all sections, RecipeCard (has cook_time), renderMarkdown, conditional author_note. |
| COLL-04 | 14-02 | Recipe detail pages show "Part of [Collection]" badge when recipe belongs to collection | SATISFIED (code) | CollectionBadge wired on all 3 recipe detail pages with correct conditional guard. |
| COLL-05 | 14-03 | Collection URLs in sitemap with correct hreflang tags | SATISFIED | sitemap.xml.ts has recipe-collections + xhtml:link + x-default. Vitest tests pass. REQUIREMENTS.md already marked [x]. |

All 5 requirements declared for Phase 14 are accounted for. COLL-06 is assigned to Phase 11 (already complete) — not a Phase 14 concern.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `web/src/components/collection/CollectionCard.astro` | 44 | `collection-card__placeholder` div | Info | Intentional fallback for collections without hero images — not a stub. Renders SVG icon as visual placeholder. Does not block goal. |

No blocking anti-patterns found. All stub indicators checked are intentional fallbacks or no-data states, not unimplemented functionality.

### Human Verification Required

#### 1. Strapi Admin — New Fields Available

**Test:** Log into Strapi admin on https://strapi.bbq-experience.com. Go to Content Manager > Recipe Collection. Create a new collection and verify the description and author_note fields appear in the editing form. Test localization: create an IT translation using the Locales panel.
**Expected:** Fields description (textarea) and author_note (rich text editor) visible. Locale switcher allows creating IT and ES versions.
**Why human:** Schema changes only take effect after Strapi process restart on the server. Cannot verify admin UI availability programmatically.

#### 2. Collection Listing Pages with Real Data

**Test:** After creating a test collection with 2-3 recipes in Strapi and publishing it, visit https://bbq-experience.com/en/collections/, /it/raccolte/, and /es/colecciones/.
**Expected:** Test collection appears as a card with hero image, title, recipe count badge, and description text. Empty collections are absent.
**Why human:** SSR pages require live Strapi data. Listing requires at least one published non-empty collection.

#### 3. Collection Detail Page Content Rendering

**Test:** Click into the test collection from the listing page. Verify all sections render correctly.
**Expected:** Full-width hero with white title + text-shadow overlay. Editorial intro section below hero. Ordered recipe grid with RecipeCard thumbnails, titles, and cook times. Author's note section (if field has content).
**Why human:** Detail page depends on live CMS data. Visual quality of hero overlay and typography requires browser.

#### 4. "Part of Collection" Badge on Recipe Pages

**Test:** Open a recipe that was assigned to the test collection. Check the recipe detail page.
**Expected:** Fire-orange pill badge reading "Part of [Collection Name]" appears between breadcrumbs and recipe metadata. Badge links to the collection detail page. A recipe NOT in any collection shows no badge.
**Why human:** Badge renders conditionally from Strapi's populated collection relation. Requires recipe-to-collection assignment in CMS.

#### 5. Sitemap hreflang Output

**Test:** Visit https://bbq-experience.com/sitemap.xml after deploy and after publishing collection entries.
**Expected:** Collection URLs present with `<xhtml:link rel="alternate" hreflang="en/it/es/x-default">` entries. Only locales with published translations appear. Listing routes (collections/raccolte/colecciones) appear in the listing section.
**Why human:** Sitemap output depends on live Strapi data and server deployment.

#### 6. Navigation Links

**Test:** Visit the site on desktop and trigger the mobile menu.
**Expected:** Desktop nav bar shows "Collections" link after "Recipes". Mobile hamburger panel shows "Collections" in the same order. Links navigate to the correct locale-specific collection listing URL.
**Why human:** Navigation visual rendering and mobile menu interaction require browser.

### Gaps Summary

No automated gaps found. All 5 must-haves verify as fully implemented at code level (artifacts exist, are substantive, wired, and data flows to real Strapi queries). The 6 human verification items are required before marking the phase as passed because they depend on live Strapi data and browser rendering that cannot be verified programmatically.

The ROADMAP shows 14-02-PLAN.md as unchecked (`[ ]`) while the Summary confirms it completed. This is a bookkeeping inconsistency in ROADMAP.md only — the actual files from plan 02 are all present and correct.

---

_Verified: 2026-04-21T16:40:00Z_
_Verifier: Claude (gsd-verifier)_
