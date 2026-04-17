---
phase: 11-strapi-schema-migration-localization-helper
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - cms/scripts/migrate-v11.mjs
  - cms/src/api/product-category/content-types/product-category/schema.json
  - cms/src/api/product-category/controllers/product-category.ts
  - cms/src/api/product-category/routes/product-category.ts
  - cms/src/api/product-category/services/product-category.ts
  - cms/src/api/product/content-types/product/schema.json
  - cms/src/api/recipe-collection/content-types/recipe-collection/schema.json
  - cms/src/api/recipe-collection/controllers/recipe-collection.ts
  - cms/src/api/recipe-collection/routes/recipe-collection.ts
  - cms/src/api/recipe-collection/services/recipe-collection.ts
  - cms/src/api/recipe/content-types/recipe/schema.json
  - cms/src/api/subscriber/content-types/subscriber/schema.json
  - cms/src/lib/update-localized.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase introduces three new Strapi schemas (product-category, recipe-collection, and updates to recipe/subscriber/product), a one-shot migration script (`migrate-v11.mjs`), and a shared `updateLocalized` helper for i18n PUT operations.

The schemas are structurally correct and follow Strapi v5 conventions. The CRD files (controller, router, service) for product-category and recipe-collection are standard Strapi core factory boilerplate with no issues.

There are two areas of concern: (1) the subscriber schema `source` field has a default of `"legacy"` which will mis-tag all future subscribers, and (2) the migration script silently truncates at 100 records with no pagination loop. A secondary concern is a potential mismatch between the CLAUDE.md convention requiring `slug` in all locale PUT bodies and the `product-category` schema having `slug` as a non-localized `uid` field.

---

## Critical Issues

### CR-01: `source` default in subscriber schema poisons all future records

**File:** `cms/src/api/subscriber/content-types/subscriber/schema.json:46`

**Issue:** The `source` field has `"default": "legacy"`. This default will be applied to every new subscriber who subscribes via the website (inline form, footer, exit-intent) unless the calling code explicitly passes a `source` value. If any subscription endpoint omits the field, the subscriber is silently tagged `"legacy"` instead of the correct acquisition channel. The migration intent is to tag pre-existing records as "legacy" — but the schema default inverts this: new records default to legacy, old ones stay null until the migration runs.

**Fix:** Remove the default from the schema. The migration script already handles the backfill correctly (tagging only subscribers where `sub.source` is null). New subscribers should have `source` supplied explicitly by the API endpoint.

```json
"source": {
  "type": "enumeration",
  "enum": ["inline", "landing", "footer", "exit-intent", "legacy"]
}
```

If a safe default is needed, use `"inline"` or `null` (no default), not `"legacy"`.

---

## Warnings

### WR-01: Pagination truncation — migration silently misses records beyond 100

**File:** `cms/scripts/migrate-v11.mjs:143-145` and `192-194`

**Issue:** Both `backfillProducts` and `tagSubscribers` fetch exactly 100 records (`pagination[pageSize]=100`) and iterate only over that single page. If the dataset grows beyond 100 entries, the excess records are silently skipped. While 25 products and a small subscriber list are known today, this is a brittle assumption for a migration that claims to be idempotent and re-runnable.

**Fix:** Add a pagination loop for both fetches.

```js
async function fetchAll(path) {
  let page = 1;
  const allData = [];
  while (true) {
    const res = await apiFetch(
      `${STRAPI_URL}${path}&pagination[page]=${page}&pagination[pageSize]=100`
    );
    allData.push(...res.data);
    if (res.data.length < 100) break;
    page++;
  }
  return allData;
}
```

Then replace the single-page fetch with `await fetchAll(...)`.

---

### WR-02: Empty token sent silently as `Bearer ` in `updateLocalized`

**File:** `cms/src/lib/update-localized.ts:46-47`

**Issue:** When `config?.token` and `process.env.STRAPI_API_TOKEN` are both absent or empty, `token` becomes an empty string. The function then sends `Authorization: Bearer ` (with an empty credential). Strapi will respond with a 401, but the error message from the `response.text()` body is the only clue — there is no fast-fail guard with a descriptive error. The migrate script performs its own early `process.exit(1)` check, but `updateLocalized` is a shared helper intended for use in Phase 14+, where callers may not guard the token.

**Fix:** Add an early guard at the top of `updateLocalized`.

```ts
const token = config?.token || process.env.STRAPI_API_TOKEN || "";
if (!token) {
  throw new Error(
    "updateLocalized: STRAPI_API_TOKEN non configurato. Impossibile autenticarsi."
  );
}
```

---

### WR-03: `slug` in locale PUT body for non-localized `uid` field

**File:** `cms/scripts/migrate-v11.mjs:117-119` and `124-126`
**Related:** `cms/src/api/product-category/content-types/product-category/schema.json:27-29`

**Issue:** The CLAUDE.md convention requires `slug` to always be included in locale PUT bodies. However, `product-category`'s `slug` is a `uid` field with no `pluginOptions.i18n.localized` marker — meaning Strapi treats it as a shared, non-localizable field. Strapi v5 may silently ignore or reject the `slug` in the PUT body for a locale update on a non-localized field. In the best case it is a no-op; in the worst case Strapi v5 raises a validation error and the locale is not created.

**Fix (two options):**

Option A — mark `slug` as localized in the schema (if per-locale slugs are desired):
```json
"slug": {
  "type": "uid",
  "targetField": "name",
  "pluginOptions": {
    "i18n": { "localized": true }
  }
}
```

Option B — remove `slug` from the locale PUT body in the migration (if a single shared slug per document is intended):
```js
body: JSON.stringify({ data: { name: cat.it, description: "" } }),
```

The same applies to `updateLocalized`'s enforced `slug` requirement in the TypeScript interface — this type constraint will be incorrect for content types with non-localized slugs.

---

### WR-04: `status=draft` in product backfill may miss published-only records

**File:** `cms/scripts/migrate-v11.mjs:144-145`

**Issue:** The product fetch uses `status=draft`. In Strapi v5, `status=draft` returns only the draft version of entries, not the published version. Records that were published without a surviving draft may not appear in this query. The comment says "status=draft include anche published in Strapi v5" — this is incorrect. In Strapi v5, a document always has a draft counterpart, but relying on this undocumented behavior is fragile. If any product was published and the draft was somehow cleaned up, the migration skips it silently.

**Fix:** Use `status=published` or omit the `status` parameter entirely (Strapi v5 defaults to returning published records). If draft-only fields need to be read, use `status=draft` explicitly and accept the constraint. Document the intent clearly.

```js
// Recupera tutti i prodotti pubblicati (Strapi v5 default)
const products = await apiFetch(
  `${STRAPI_URL}/api/products?locale=en&pagination[pageSize]=100&populate=product_category`
);
```

---

## Info

### IN-01: Hard-coded `documentId` map is a maintenance liability

**File:** `cms/scripts/migrate-v11.mjs:34-60`

**Issue:** The 25-entry `PRODUCT_CATEGORY_MAP` hard-codes production `documentId` values. These are environment-specific and will break if the records are ever re-created (e.g., after a DB restore or a staging migration). The comment documents this as a known limitation ("da produzione 2026-04-17"), which is good. No immediate fix needed, but this file should not be re-run against a fresh environment without regenerating the map.

**Fix (documentation only):** Add a comment block warning that this map is environment-specific and must be regenerated for non-production environments.

---

### IN-02: `recipe.total_time` is not enforced as `prep_time + cook_time`

**File:** `cms/src/api/recipe/content-types/recipe/schema.json:60-63`

**Issue:** `total_time` is an independent `integer` field with no computed or validated relationship to `prep_time + cook_time`. Editors can enter inconsistent values (e.g., prep=10, cook=30, total=20). For Schema.org Recipe structured data (used for rich results), this inconsistency can cause validation warnings from Google's rich results test.

**Fix:** Either remove `total_time` and compute it at the frontend layer (`prep_time + cook_time`), or add a lifecycle hook in the Strapi service to enforce consistency. The simpler approach is to drop the field from the schema and derive it where needed.

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
