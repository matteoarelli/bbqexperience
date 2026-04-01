# Phase 5: Recipe Pages - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Users can follow BBQ recipes with interactive tools: adjustable servings, unit conversion (metric/imperial), cook mode for hands-free use, and printable recipe cards with QR codes. Recipe pages include step-by-step photos, Schema.org Recipe structured data, and "Jump to Recipe" buttons.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints:
- Recipe structure: ingredients, step-by-step instructions with photos, prep/cook/total time, difficulty, servings
- "Jump to Recipe" button to skip editorial intro
- Cook Mode: keep-screen-awake, large text, step-by-step progression, minimal UI
- Serving size adjuster with automatic ingredient recalculation
- Metric/imperial toggle
- Print recipe card (ingredients + steps only) with QR code
- Schema.org Recipe JSON-LD (prepTime, cookTime, ingredients, instructions)
- Must work in all 3 locales
- Interactive features should use Svelte 5 islands (Astro islands architecture)

</decisions>

<code_context>
## Existing Code Insights

- `web/src/lib/strapi.ts` — API client
- `web/src/lib/types.ts` — StrapiRecipe, RecipeIngredient, RecipeInstruction types
- `web/src/lib/media.ts` — Media helpers
- `web/src/layouts/BaseLayout.astro` — Base layout
- `web/src/styles/tokens.css` — Design tokens
- `cms/src/api/recipe/content-types/recipe/schema.json` — Recipe schema

</code_context>

<specifics>
## Specific Ideas
No specific requirements.
</specifics>

<deferred>
## Deferred Ideas
None.
</deferred>
