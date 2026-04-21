---
phase: 16-a-b-headline-testing-infrastructure
plan: "02"
subsystem: web-frontend
tags: [a-b-testing, umami, blog, variants, tracking]
dependency_graph:
  requires: [16-01]
  provides: [ab-variant-display, ab-impression-tracking, ab-click-tracking]
  affects: [blog-detail-pages, blog-listing-pages, article-card]
tech_stack:
  added: []
  patterns: [deterministic-variant-assignment, umami-custom-events, bot-guard-pattern]
key_files:
  created: []
  modified:
    - web/src/pages/en/blog/[slug].astro
    - web/src/pages/it/blog/[slug].astro
    - web/src/pages/es/blog/[slug].astro
    - web/src/pages/en/blog/index.astro
    - web/src/pages/it/blog/index.astro
    - web/src/pages/es/blog/index.astro
    - web/src/components/content/ArticleCard.astro
decisions:
  - "displayTitle replaces post.title only in visible h1 and breadcrumb; SEO elements (seoTitle, canonicalUrl, JSON-LD headline, og:image) always use original post.title"
  - "ab-impression fires for ALL non-bot visitors when experiment is active (control included), matching plan simplification"
  - "ArticleCard ab-click uses Umami data attributes (data-umami-event) for automatic click tracking, no custom JS needed"
metrics:
  duration: 6min
  completed: "2026-04-21T17:19:20Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
---

# Phase 16 Plan 02: A/B Variant Display & Umami Tracking Summary

A/B variant headlines wired into blog detail (3 locales) and listing pages (3 locales) with Umami ab-impression and ab-click event tracking. Bot visitors always see control title; SEO elements untouched.

## What Was Done

### Task 1: Blog Detail Pages (EN/IT/ES)
- Added experiment lookup via `fetchCollection<StrapiAbExperiment>` filtered by blog_post documentId and active status
- `displayTitle` variable replaces `post.title` in ContentLayout h1 and breadcrumb last crumb
- SEO elements (`seoTitle`, `canonicalUrl`, `ArticleSchema headline`, `og:image`) remain unchanged with original `post.title`
- Umami `ab-impression` event fires via `define:vars` script when experiment is active (bot-guarded by `!Astro.locals.isBot`)
- Variant resolution uses `assignVariant()` deterministic FNV-1a hash from Plan 16-01

### Task 2: ArticleCard + Blog Listing Pages (EN/IT/ES)
- Extended ArticleCard Props with optional `experimentDocId` and `activeVariant`
- Added conditional `data-umami-event="ab-click"` with experiment/variant data attributes on the card `<a>` tag
- All 3 locale blog listing pages fetch active experiments in bulk (`pageSize: 50`) and build `experimentsMap` keyed by blog_post documentId
- Variant title resolution applied per card in both featured and regular post loops
- No A/B code added to review/recipe/tutorial listing pages (per REQUIREMENTS.md out of scope)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e9f65be | feat(16-02): inject A/B variant headlines into blog detail pages with Umami impression tracking |
| 2 | ba350ae | feat(16-02): add variant title and ab-click tracking to ArticleCard and blog listings |

## Decisions Made

1. **displayTitle scope**: Only the visible h1 (ContentLayout title) and breadcrumb last crumb use `displayTitle`. All SEO-critical elements use original `post.title` to prevent variant leakage into Google index.
2. **ab-impression for all non-bot visitors**: Both control and variant visitors fire the impression event when an experiment is active. This provides complete impression data for statistical analysis.
3. **Umami data attributes for ab-click**: Using `data-umami-event` attributes on the ArticleCard `<a>` tag for automatic Umami click tracking rather than custom JS event listeners. Simpler and more reliable.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new endpoints, auth paths, or trust boundaries introduced. Variant text rendered via Astro template expressions (auto-escaped, no `set:html`). Experiment IDs (UUIDs) visible in page source per T-16-06 accepted disposition.

## Self-Check: PASSED
