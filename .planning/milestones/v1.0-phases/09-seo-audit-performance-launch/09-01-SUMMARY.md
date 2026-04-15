---
phase: 09-seo-audit-performance-launch
plan: 01
subsystem: seo
tags: [schema-org, breadcrumbs, json-ld, ogimage, sitemap, i18n]
dependency_graph:
  requires: []
  provides: [BreadcrumbJsonLd, sitemap-i18n, ogImage-coverage]
  affects: [all-content-pages]
tech_stack:
  added: []
  patterns: [Schema.org BreadcrumbList JSON-LD, sitemap i18n locale mapping]
key_files:
  created:
    - web/src/components/common/BreadcrumbJsonLd.astro
  modified:
    - web/astro.config.mjs
    - web/src/pages/en/reviews/[slug].astro
    - web/src/pages/it/recensioni/[slug].astro
    - web/src/pages/es/resenas/[slug].astro
    - web/src/pages/en/tutorials/[slug].astro
    - web/src/pages/it/guide/[slug].astro
    - web/src/pages/es/tutoriales/[slug].astro
    - web/src/pages/en/blog/[slug].astro
    - web/src/pages/it/blog/[slug].astro
    - web/src/pages/es/blog/[slug].astro
    - web/src/pages/en/recipes/[slug].astro
    - web/src/pages/it/ricette/[slug].astro
    - web/src/pages/es/recetas/[slug].astro
decisions:
  - BreadcrumbJsonLd omits item URL on last element per Google structured data guidelines
  - Homepage pages skipped for ogImage since no default image exists and SEOHead conditionally renders og:image
metrics:
  duration: 6min
  completed: 2026-04-01
---

# Phase 09 Plan 01: SEO Structured Data, OG Images, and Sitemap Summary

BreadcrumbList Schema.org JSON-LD on all 12 content pages, ogImage social sharing on all content pages with cover images, and per-locale sitemap with hreflang via @astrojs/sitemap i18n config.

## What Was Done

### Task 1: BreadcrumbJsonLd component and sitemap i18n
- Created `BreadcrumbJsonLd.astro` component generating Schema.org BreadcrumbList JSON-LD
- Component accepts `items` (same BreadcrumbItem interface as Breadcrumbs.astro) and optional `siteUrl`
- Last breadcrumb item omits URL per Google guidelines (current page)
- Updated `astro.config.mjs` sitemap integration with i18n locale mapping for en/it/es

### Task 2: BreadcrumbJsonLd and ogImage across all content pages
- **Review pages (EN/IT/ES):** Added BreadcrumbJsonLd, visual Breadcrumbs, breadcrumbItems array, and ogImage prop
- **Tutorial pages (EN/IT/ES):** Added BreadcrumbJsonLd and ogImage prop (already had visual breadcrumbs)
- **Blog pages (EN/IT/ES):** Added BreadcrumbJsonLd and ogImage prop (already had visual breadcrumbs)
- **Recipe pages (EN/IT/ES):** Added BreadcrumbJsonLd, visual Breadcrumbs, breadcrumbItems array (already had ogImage)

## Decisions Made

1. BreadcrumbJsonLd omits `item` URL on the last element (current page) per Google structured data guidelines
2. Homepage pages skipped for ogImage -- no default image exists and SEOHead conditionally renders og:image only when truthy

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b658c65 | feat(09-01): add BreadcrumbJsonLd component and configure sitemap i18n |
| 2 | 549fdcb | feat(09-01): add BreadcrumbJsonLd and ogImage to all content pages |
