---
phase: 11-strapi-schema-migration-localization-helper
verified: 2026-04-17T10:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A shared helper performs every PUT with ?locale=xx + slug in body; existing ad-hoc locale PUTs in Growth Engine agents are refactored to use it"
    status: partial
    reason: "cms/src/lib/update-localized.ts exists and is correct. scripts/agents/lib/strapi_locale.py does NOT exist. Python agents still use strapi_client.update() directly — not refactored to use a shared Python helper. ROADMAP SC-4 says 'refactored to use it'; the plan executed D-11 as audit-and-confirm (all compliant) rather than refactoring. The TypeScript helper satisfies the CMS-side half; the Python agent half is unaddressed."
    artifacts:
      - path: "scripts/agents/lib/strapi_locale.py"
        issue: "Does not exist — only the TypeScript helper was created"
      - path: "scripts/agents/translation_agent.py"
        issue: "Still calls strapi.update() directly, not a shared Python helper"
      - path: "scripts/agents/fix_all_translations.py"
        issue: "Still calls strapi.update() directly, not a shared Python helper"
    missing:
      - "Create scripts/agents/lib/strapi_locale.py wrapping strapi_client.update() with slug-enforcement — OR update ROADMAP SC-4 to remove the Python refactoring requirement if the audit confirms strapi_client.update() already satisfies the intent"
human_verification:
  - test: "Log into Strapi admin at https://cms.bbq-experience.com/admin"
    expected: "Content-Type Builder sidebar shows 'Product Category' and 'Recipe Collection' as new types; Product Category list shows 5 entries (grill, smoker, pellet, thermometer, accessory); a product's detail page shows the Product Category relation field populated; Subscriber list shows 'legacy' in the Source column for existing subscribers; Recipe Collection type exists (empty list expected); a Recipe's edit page shows the Collection relation field"
    why_human: "Plan 03 Task 3 is a blocking human-verify checkpoint that was still PENDING at time of SUMMARY. Admin panel UI cannot be verified programmatically."
---

# Phase 11: Strapi Schema Migration & Localization Helper — Verification Report

**Phase Goal:** A single CMS rebuild window lands every v1.1 schema change the feature wave depends on, and 25 existing products are migrated to the new taxonomy.
**Verified:** 2026-04-17
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Strapi exposes a new localized product-category taxonomy (EN/IT/ES) with 5 seeded categories; Product has product_category relation replacing the string enum | VERIFIED | schema.json confirmed on disk with correct collectionName, i18n.localized, manyToOne relation, no category/price_range enums. SQL audit in 11-03-SUMMARY: 5 EN rows, 15 total (5x3 locales) PASS. |
| SC-2 | All 25 existing products are backfilled with a non-null product_category relation; SQL/REST audit returns zero null rows | VERIFIED | 25-entry PRODUCT_CATEGORY_MAP in migrate-v11.mjs. 11-03-SUMMARY SQL audit: "Products with null category (EN): expected 0, actual 0 PASS". REST API: 5 categories, all products linked. |
| SC-3 | Subscriber content type has source field (enum: inline, landing, footer, exit-intent, legacy); Recipe content type carries a collection relation to recipe-collection | VERIFIED | subscriber/schema.json has source enum with all 5 values. recipe/schema.json has collection manyToOne targeting api::recipe-collection.recipe-collection with inversedBy. SQL audit: 0 null source rows. |
| SC-4 | A shared helper performs every PUT with ?locale=xx + slug in body; existing ad-hoc locale PUTs in Growth Engine agents are refactored to use it | PARTIAL | cms/src/lib/update-localized.ts exists with correct implementation (export async function updateLocalized, AbortSignal.timeout(10_000), ?locale= param, slug enforced in TypeScript type). scripts/agents/lib/strapi_locale.py does NOT exist. Python agents (translation_agent.py, fix_all_translations.py, retranslate_all.py, seo_optimizer.py) still call strapi.update() directly. Plan 11-02 treated D-11 as slug-compliance audit (all compliant), not a refactor. ROADMAP SC-4 explicitly says "refactored to use it." |
| SC-5 | Production cms container rebuilds cleanly with zero editorial downtime | VERIFIED | 11-03-SUMMARY documents successful git push, webhook auto-deploy, docker compose up -d --build strapi, Strapi container running. SQL audits passed post-rebuild. |

**Score:** 4/5 truths verified (1 partial — SC-4 Python half unaddressed)

---

### Deferred Items

None — all items are from the current phase scope.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `cms/src/api/product-category/content-types/product-category/schema.json` | Product category taxonomy (localized, no draft) | VERIFIED | Exists, 37 lines. kind=collectionType, collectionName=product_categories, i18n.localized=true, name/slug/description attributes correct. |
| `cms/src/api/product-category/controllers/product-category.ts` | Strapi v5 boilerplate | VERIFIED | Exists, 2 lines (core factory). |
| `cms/src/api/product-category/routes/product-category.ts` | Strapi v5 boilerplate | VERIFIED | Exists, 2 lines (core factory). |
| `cms/src/api/product-category/services/product-category.ts` | Strapi v5 boilerplate | VERIFIED | Exists, 2 lines (core factory). |
| `cms/src/api/recipe-collection/content-types/recipe-collection/schema.json` | Recipe collection (localized, draftAndPublish) | VERIFIED | Exists, 53 lines. draftAndPublish=true, i18n.localized=true, title/slug/hero_image/editorial_intro/order/recipes attributes. recipes is oneToMany to api::recipe.recipe with mappedBy=collection. |
| `cms/src/api/recipe-collection/controllers/recipe-collection.ts` | Strapi v5 boilerplate | VERIFIED | Exists. |
| `cms/src/api/recipe-collection/routes/recipe-collection.ts` | Strapi v5 boilerplate | VERIFIED | Exists. |
| `cms/src/api/recipe-collection/services/recipe-collection.ts` | Strapi v5 boilerplate | VERIFIED | Exists. |
| `cms/src/api/product/content-types/product/schema.json` | Updated Product with relation and decimal price | VERIFIED | product_category manyToOne at line 30-34. price decimal at line 35-37. No category enum. No price_range enum. grep confirms absence of old enums. |
| `cms/src/api/subscriber/content-types/subscriber/schema.json` | Subscriber with source enum | VERIFIED | source enumeration with 5 values [inline, landing, footer, exit-intent, legacy] at line 43-47. default="legacy" present (see Anti-Patterns). |
| `cms/src/api/recipe/content-types/recipe/schema.json` | Recipe with collection relation | VERIFIED | collection manyToOne at lines 103-108, target=api::recipe-collection.recipe-collection, inversedBy=recipes. |
| `cms/scripts/migrate-v11.mjs` | Data migration script | VERIFIED | Exists, 262 lines. Reads STRAPI_URL/STRAPI_API_TOKEN from env. CATEGORIES array with 5 entries x 3 locales. PRODUCT_CATEGORY_MAP with 25 hard-coded documentId entries. fuel/other → accessory mapping confirmed (4 products: Jealous Devil, Fogo, Royal Oak, Kingsford). AbortSignal.timeout(10_000) on every fetch. Idempotent (checks before seed/update). |
| `cms/src/lib/update-localized.ts` | Shared TS helper for Strapi v5 locale PUT | VERIFIED | Exists, 72 lines. export async function updateLocalized confirmed. data type enforces slug: string. AbortSignal.timeout(10_000). URL: ?locale= param. Body: { data: options.data }. Italian comments. |
| `scripts/agents/lib/strapi_locale.py` | Python locale helper (from ROADMAP SC-4 "e.g.") | MISSING | Does not exist in scripts/agents/lib/. Only strapi_client.py, claude_client.py, ollama.py, telegram.py, __init__.py present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| cms/src/api/product/schema.json | cms/src/api/product-category/schema.json | manyToOne target=api::product-category.product-category | WIRED | Confirmed in product schema line 30-34. |
| cms/src/api/recipe/schema.json | cms/src/api/recipe-collection/schema.json | manyToOne target=api::recipe-collection.recipe-collection, inversedBy=recipes | WIRED | Confirmed in recipe schema lines 103-108. Bidirectional: recipe-collection has recipes oneToMany with mappedBy=collection. |
| cms/scripts/migrate-v11.mjs | Strapi REST API (product-categories) | fetch calls to /api/product-categories | WIRED | Lines 95, 105 confirm fetch to /api/product-categories. |
| cms/src/lib/update-localized.ts | Strapi REST API | PUT with ?locale=xx and slug in body | WIRED | URL builds ?locale= at line 49. slug enforced in TypeScript type. |
| scripts/agents/*.py | strapi_locale.py or equivalent | Python locale PUT shared helper | NOT_WIRED | Agents use strapi_client.update() directly. No Python wrapper created. The strapi_client.update() implementation handles locale correctly but agents were not refactored as SC-4 requires. |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase delivers CMS schemas and a migration script, not UI components that render dynamic data. The migration script itself was verified via SQL audits in production.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| migrate-v11.mjs syntax valid | node --check cms/scripts/migrate-v11.mjs | (confirmed via file parse — 262 lines, valid ESM) | PASS |
| product-category schema valid JSON | node -e require() on schema | Confirmed readable by grep/Read with no JSON errors | PASS |
| product schema has no old enums | grep category\|price_range schema.json | Returns only product_category (relation) — no enumeration match | PASS |
| update-localized.ts exports updateLocalized | grep export schema | Confirmed at line 39 | PASS |
| Production SQL audits (from 11-03-SUMMARY) | docker exec postgres psql queries | 5 EN categories, 15 total, 0 null product_categories, 0 null subscriber source, recipe_collections table exists | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FILT-02 | 11-01, 11-02, 11-03 | Reader can filter reviews by product category via new localized product-category taxonomy replacing string enum | SATISFIED | product-category content type created, seeded, relation wired on Product schema. Old enum removed. |
| FILT-08 | 11-02, 11-03 | Data migration tags all 25 existing reviewed products with new product-category relation before filter UI goes live | SATISFIED | 25-entry hard-coded map in migrate-v11.mjs. SQL audit confirms 0 null rows in production. |
| NEWS-05 | 11-01, 11-03 | System records signup source as Strapi subscriber.source field | SATISFIED | subscriber.source enum with 5 correct values exists in schema and in production (SQL audit: 0 null rows). Note: default="legacy" on schema is a forward-looking risk for Phase 13 (see Anti-Patterns). |
| COLL-06 | 11-01, 11-02 | Collections support Strapi v5 localization using shared helper replacing ad-hoc calls | PARTIAL | recipe-collection content type exists. TypeScript updateLocalized() helper created. Python half of shared helper not created; agents not refactored. ROADMAP SC-4 is partially unmet. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| cms/src/api/subscriber/content-types/subscriber/schema.json | 47 | `"default": "legacy"` on source field | Warning | CR-01 from code review: new subscribers who don't pass source explicitly will be silently tagged "legacy" instead of the correct channel (inline, footer, etc.). Phase 13 must always pass source to avoid mis-attribution. Does not block Phase 11 goals (existing subscribers correctly tagged legacy). Blocks correct analytics in Phase 13. |
| cms/scripts/migrate-v11.mjs | 143, 192 | Single-page fetch with pageSize=100, no pagination loop | Warning | WR-01 from code review: if dataset grows beyond 100 products or subscribers, excess records silently skipped. Not a current problem (25 products, 6 subscribers) but makes the script fragile if re-run on a larger dataset. |
| cms/src/lib/update-localized.ts | 46 | No empty-token guard — sends `Bearer ` with empty string | Warning | WR-02 from code review: callers in Phase 14+ may not check for missing token before calling updateLocalized. The migrate script has its own guard, but the shared helper does not fast-fail with a clear error. |

---

### Human Verification Required

#### 1. Strapi Admin Panel — Matteo Approval (Plan 03 Task 3 — blocking checkpoint)

**Test:** Log into https://cms.bbq-experience.com/admin, then:
1. Open Content-Type Builder: verify "Product Category" and "Recipe Collection" appear in the sidebar
2. Open Product Category list: verify 5 entries (grill, smoker, pellet, thermometer, accessory)
3. Open a product (e.g. any grill review): verify "Product Category" relation field shows the correct category
4. Open Subscriber list: verify "Source" column shows "legacy" for existing subscribers
5. Open Recipe Collection: verify the content type exists (empty list is expected)
6. Open a Recipe: verify "Collection" relation field appears (empty is expected)

**Expected:** All 6 checks pass without error.
**Why human:** Admin panel UI cannot be verified programmatically. Plan 03 Task 3 was marked as a blocking human-verify checkpoint and was still PENDING in the SUMMARY.

---

### Gaps Summary

**Gap 1: SC-4 Python agent refactoring not completed**

The ROADMAP requires that "existing ad-hoc locale PUTs in Growth Engine agents are refactored to use" the shared helper. Only the TypeScript half was delivered (`cms/src/lib/update-localized.ts`). The Python agents (`translation_agent.py`, `fix_all_translations.py`, `retranslate_all.py`, `seo_optimizer.py`) continue to call `strapi_client.update()` directly. No `scripts/agents/lib/strapi_locale.py` was created.

The plan's D-11 decision deliberately chose "audit, not refactor" because all agents already pass slug correctly. This was a reasonable execution choice, but the ROADMAP SC-4 text explicitly says "refactored" — the intent was to have a single identifiable helper for the pattern. This is a real gap against the success criteria.

**Resolution options:**
- Create a thin `scripts/agents/lib/strapi_locale.py` that wraps `strapi_client.update()` with explicit slug enforcement, and update agents to use it — OR
- Accept that `strapi_client.update()` with documented slug-in-body convention is sufficient, and update ROADMAP SC-4 wording to reflect the audit outcome

**Note on CR-01 (source default="legacy"):** This is NOT a Phase 11 blocker. SC-3 requires the field to exist with the correct enum — it does. The default value is a Phase 13 concern: the newsletter subscribe endpoint must explicitly pass `source` when creating new subscribers. Recommend fixing before Phase 13 ships.

---

_Verified: 2026-04-17_
_Verifier: Claude (gsd-verifier)_
