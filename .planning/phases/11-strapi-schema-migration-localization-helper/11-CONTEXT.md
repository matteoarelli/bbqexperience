# Phase 11: Strapi Schema Migration & Localization Helper - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Land all v1.1 schema changes in one CMS rebuild window: product-category taxonomy (replacing string enum), subscriber.source field, recipe-collection content type with recipe→collection relation, shared locale PUT helper (TS), and migrate 25 existing products. Frontend UI for these changes ships in later phases (12–14).

</domain>

<decisions>
## Implementation Decisions

### Product Category Taxonomy (FILT-02, FILT-08)
- **D-01:** Replace the existing `category` string enum on Product with a `product_category` manyToOne relation to a new localized `product-category` content type.
- **D-02:** Seed 5 categories: grill, smoker, pellet, thermometer, accessory. Translations (IT/ES names) determined by planner/researcher.
- **D-03:** Map existing products tagged `fuel` → accessory, `other` → accessory during migration.
- **D-04:** Remove the old `category` enum field completely from the Product schema after migration. Clean break, no deprecated field.
- **D-05:** Replace `price_range` enum (budget/mid-range/premium/luxury) with a `price` decimal field on Product. This enables Phase 13 to filter by € buckets (<€300, €300–800, €800–1500, >€1500) directly from real values.

### Subscriber Source Field (NEWS-05)
- **D-06:** Add `source` enum to Subscriber content type with values: `inline`, `landing`, `footer`, `exit-intent`, `legacy`.
- **D-07:** Any existing subscribers at migration time get tagged `legacy`.

### Recipe Collection Scaffold (COLL-06)
- **D-08:** Create new `recipe-collection` content type with: title, slug, hero image, editorial intro (richtext), ordered recipe list (relation), localized in EN/IT/ES.
- **D-09:** Add `collection` relation on the Recipe content type (manyToOne to recipe-collection). Phase 14 builds the frontend; this phase delivers the CMS schema only.

### Locale Helper Strategy (COLL-06)
- **D-10:** Create a TypeScript helper (e.g., `cms/src/lib/update-localized.ts`) for CMS-side locale PUT operations following the Strapi v5 pattern (`PUT ?locale=xx` + slug in body).
- **D-11:** Audit all Python agent `strapi_client.update()` calls to verify slug is included in the body per CLAUDE.md convention. Fix any calls missing slug. Document the pattern.

### Claude's Discretion
- Locale helper refactoring extent: Claude evaluates agent code and decides what actually needs fixing vs what's already compliant.
- Recipe-collection schema field details (field types, constraints, ordering mechanism for the recipe list).
- product-category slug convention and admin panel display configuration.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strapi Schema
- `cms/src/api/product/content-types/product/schema.json` — Current Product schema with `category` enum and `price_range` enum to replace
- `cms/src/api/subscriber/content-types/subscriber/schema.json` — Current Subscriber schema (no `source` field)
- `cms/src/api/recipe/content-types/recipe/schema.json` — Current Recipe schema (no `collection` relation)
- `cms/src/api/brand/content-types/brand/` — Brand content type pattern (relation reference for product-category)

### Agent Library
- `scripts/agents/lib/strapi_client.py` — Existing `update()` with `locale` param; audit target for slug-in-body compliance
- `scripts/agents/translation_agent.py` — Primary locale PUT consumer
- `scripts/agents/content_generator.py` — Creates content with locale
- `scripts/agents/seo_optimizer.py` — Updates content with locale

### Project Conventions
- `CLAUDE.md` §Conventions — "Strapi v5 localizzazioni: PUT con ?locale=xx nel query param, sempre includere slug nel body"
- `CLAUDE.md` §Conventions — "Product brand: usare SOLO `brand_relation` (relazione a Brand), NON il campo stringa `brand`"
- `CLAUDE.md` §Conventions — "Container names: PostgreSQL: 'postgres' (non 'bbqexperience-postgres')"

### Requirements
- `.planning/REQUIREMENTS.md` — FILT-02, FILT-08, NEWS-05, COLL-06 are the 4 requirements mapped to this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/agents/lib/strapi_client.py` — Already has `update(content_type, document_id, data, locale=xx)` with retry + backoff. The Python locale helper essentially exists.
- `cms/src/api/brand/` — Brand content type with localized name/slug pattern. Same structure to replicate for `product-category`.
- Product schema already has `brand_relation` manyToOne — same relation pattern for `product_category`.

### Established Patterns
- Strapi v5 content types: each in `cms/src/api/{name}/content-types/{name}/schema.json`
- i18n opt-in per field via `pluginOptions.i18n.localized: true`
- Relations use `type: "relation"`, `relation: "manyToOne"`, `target: "api::{type}.{type}"`
- Draft+publish enabled for editorial content, disabled for utility types (subscriber)
- Deploy: `docker compose up -d --build strapi` triggers `npm run build` inside container

### Integration Points
- Frontend fetches via `web/src/lib/strapi.ts` — will need `populate: product_category` when Phase 13 builds filter UI
- Growth Engine agents: `strapi_client.update()` calls may reference old `category` enum — migration script must not break agents
- Docker Compose on Hetzner: rebuild `strapi` service only, postgres stays up

</code_context>

<specifics>
## Specific Ideas

- Migration via Node.js script in `cms/scripts/` using Strapi's internal entityService (closer to CMS runtime than external REST)
- Off-peak deploy, no maintenance mode needed (single author = Matteo just avoids admin during rebuild)
- 25 products is small enough for a reliable one-shot migration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-strapi-schema-migration-localization-helper*
*Context gathered: 2026-04-17*
