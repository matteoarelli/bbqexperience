---
phase: 12-newsletter-on-site-signup-brevo
plan: 01
subsystem: web/newsletter
tags: [newsletter, brevo, doi, honeypot, i18n, inline-signup]
dependency_graph:
  requires: []
  provides: [hardened-newsletter-api, newsletter-signup-component, inline-article-signups]
  affects: [web/src/pages/api/newsletter.ts, web/src/components/common/NewsletterSignup.astro, web/src/components/common/Footer.astro]
tech_stack:
  added: []
  patterns: [honeypot-anti-bot, double-opt-in, source-attribution]
key_files:
  created: []
  modified:
    - web/src/pages/api/newsletter.ts
    - web/src/components/common/NewsletterSignup.astro
    - web/src/components/common/Footer.astro
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json
    - web/src/lib/i18n.ts
    - web/Dockerfile
    - web/src/pages/api/brevo-webhook.ts
    - web/src/pages/en/blog/[slug].astro
    - web/src/pages/en/reviews/[slug].astro
    - web/src/pages/en/recipes/[slug].astro
    - web/src/pages/en/tutorials/[slug].astro
    - web/src/pages/it/blog/[slug].astro
    - web/src/pages/it/recensioni/[slug].astro
    - web/src/pages/it/ricette/[slug].astro
    - web/src/pages/it/guide/[slug].astro
    - web/src/pages/es/blog/[slug].astro
    - web/src/pages/es/resenas/[slug].astro
    - web/src/pages/es/recetas/[slug].astro
    - web/src/pages/es/tutoriales/[slug].astro
decisions:
  - Honeypot field returns 403 before any processing (silent rejection, no error detail for bots)
  - DOI confirm message shown instead of success message (user must check inbox)
  - SURFACE attribute synced both in DOI request and as fallback in brevo-webhook
metrics:
  duration: ~9 min
  completed: 2026-04-17
  tasks: 2/2
---

# Phase 12 Plan 01: Newsletter API Hardening + Inline Article Signups Summary

Hardened newsletter endpoint with honeypot (403), Brevo DOI (doubleOptinConfirmation), source attribution (Strapi + Brevo SURFACE), 5/hr rate-limit; upgraded NewsletterSignup component with source prop, honeypot field, DOI confirm/error states; placed inline signups on all 12 article detail pages.

## Task Results

### Task 1: Harden newsletter API + upgrade component + i18n keys
**Commit:** a7b2ee1

**API changes (newsletter.ts):**
- Added honeypot check: `body.website` non-empty returns 403
- Rate-limit upgraded from default 60s to 3,600,000ms (5/IP/hour)
- Replaced `POST /v3/contacts` with `POST /v3/contacts/doubleOptinConfirmation`
- Added DOI template IDs per locale (BREVO_DOI_TEMPLATE_EN/IT/ES)
- Added `source` field validation against allowlist, passed to Strapi + Brevo SURFACE attribute
- Added `redirectionUrl` for post-confirmation redirect

**Component changes (NewsletterSignup.astro):**
- Added `source` prop with type union `'inline' | 'landing' | 'footer' | 'exit-intent'`
- Added `data-newsletter-source` attribute for client-side JS
- Added honeypot input field (off-screen, invisible)
- Added DOI confirm message element (`data-newsletter-confirm`)
- Added error message element (`data-newsletter-error`) with rate-limit/generic/email variants
- Client-side email validation before fetch
- Error text stored as data attributes for i18n

**Footer change:** Added `source="footer"` to existing NewsletterSignup call.

**i18n additions (all 3 locales):**
- `newsletter.confirmMessage` - DOI confirmation instruction
- `newsletter.errorGeneric/errorRateLimit/errorInvalidEmail` - error states
- `newsletter.stickyBarCta/exitModalAriaLabel/close` - for Plans 02/03
- `newsletter.landing.*` - 13 keys for landing page (Plan 02)

**Infrastructure:**
- `web/Dockerfile`: Added ARG+ENV for BREVO_DOI_TEMPLATE_EN/IT/ES
- `web/src/lib/i18n.ts`: Added `newsletter` route to localizedRoutes
- `web/src/pages/api/brevo-webhook.ts`: Added SURFACE attribute sync fallback on contact_updated

### Task 2: Add inline NewsletterSignup to all 12 article detail pages
**Commit:** 22e2a48

Added `NewsletterSignup` import and component block to all 12 article detail pages:
- EN: blog, reviews, recipes, tutorials
- IT: blog, recensioni, ricette, guide
- ES: blog, resenas, recetas, tutoriales

Placement: after content section, before AuthorCard. All use `source="inline"`.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

No new threat surfaces beyond what the plan's threat model covers.

## Self-Check: PASSED
