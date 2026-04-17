---
phase: 12-newsletter-on-site-signup-brevo
plan: 02
title: "Exit-Intent Modal & Sticky Newsletter Bar"
subsystem: web-frontend
tags: [newsletter, a11y, gsap, exit-intent, sticky-bar, i18n]
dependency_graph:
  requires: [12-01]
  provides: [exit-intent-modal, sticky-newsletter-bar]
  affects: [BaseLayout, NewsletterSignup]
tech_stack:
  added: []
  patterns: [gsap-dynamic-import, cookie-suppression, intersection-observer, focus-trap]
key_files:
  created:
    - web/src/components/common/ExitIntentModal.astro
    - web/src/components/common/StickyNewsletterBar.astro
  modified:
    - web/src/layouts/BaseLayout.astro
    - web/src/components/common/NewsletterSignup.astro
    - web/src/i18n/en.json
    - web/src/i18n/it.json
    - web/src/i18n/es.json
decisions:
  - "Duplicated cookie helpers in each component script scope for self-containment (no shared module)"
  - "StickyBar form uses own inline form (not NewsletterSignup) for compact layout control"
metrics:
  duration: "~4 min"
  completed: "2026-04-17"
  tasks: 2
  files_changed: 7
requirements:
  - NEWS-03
  - NEWS-04
---

# Phase 12 Plan 02: Exit-Intent Modal & Sticky Newsletter Bar Summary

Exit-intent modal for desktop visitors exiting viewport + sticky footer newsletter bar with GSAP animations, cookie/session suppression, full a11y, and IntersectionObserver footer hide.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ExitIntentModal with a11y, GSAP, suppression | 0ef8f68 | ExitIntentModal.astro, NewsletterSignup.astro, en/it/es.json |
| 2 | StickyNewsletterBar + BaseLayout wiring | 6b09b61 | StickyNewsletterBar.astro, BaseLayout.astro |

## What Was Built

### ExitIntentModal.astro
- Desktop-only trigger: `matchMedia('(hover: hover) and (pointer: fine)')` gate
- `mouseleave` on `<html>` with `clientY < 0` guard (exit toward browser chrome)
- GSAP dynamic import: overlay fadeIn + card scaleUp with `back.out(1.4)` ease
- Focus trap: Tab cycles through focusable elements, Shift+Tab reverses
- Escape key closes modal, overlay click closes modal
- `aria-live="polite"` region announces modal opening to screen readers
- `role="dialog"` + `aria-modal="true"` for proper ARIA semantics
- Suppression: `bbq-exit-modal-dismissed` cookie (14 days) + `bbq-exit-modal-shown` sessionStorage (1/session)
- Checks `bbq-newsletter-subscribed` localStorage to skip if already subscribed
- Fire gradient top border (brand element)
- Embeds `NewsletterSignup` with `source="exit-intent"`

### StickyNewsletterBar.astro
- Trigger: `setTimeout(5000)` OR scroll past 30% of page height (whichever first)
- GSAP slide-up/slide-down animations via dynamic import
- IntersectionObserver on `<footer>`: hides bar when footer is visible, re-shows when not
- Dismiss button sets `bbq-sticky-bar-dismissed` cookie (30 days)
- Inline form POSTs to `/api/newsletter` with `source: 'footer'`
- Honeypot field (`name="website"`) for bot protection
- `AbortSignal.timeout(10_000)` on fetch per project convention
- Error states: generic error + rate-limit (429) with localized messages
- Confirm state replaces form on success, auto-hides bar after 3s
- Umami tracking on successful signup

### BaseLayout.astro
- Both components wired at body root after `MobileMenuPanel`, before `BackToTop`
- z-index stack: sticky-bar (90) < exit-modal (100) < mobile-menu (110)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing i18n translation keys**
- **Found during:** Task 1
- **Issue:** Plan references keys `newsletter.stickyBarCta`, `newsletter.exitModalAriaLabel`, `newsletter.close`, `newsletter.confirmMessage`, `newsletter.errorGeneric`, `newsletter.errorRateLimit` that don't exist in EN/IT/ES locale files (expected from Plan 01 but running in parallel worktree)
- **Fix:** Added all missing keys to en.json, it.json, es.json
- **Files modified:** web/src/i18n/en.json, web/src/i18n/it.json, web/src/i18n/es.json
- **Commit:** 0ef8f68

**2. [Rule 3 - Blocking] Added `source` prop to NewsletterSignup**
- **Found during:** Task 1
- **Issue:** `NewsletterSignup` component missing `source` prop needed by ExitIntentModal's `source="exit-intent"` (expected from Plan 01 parallel worktree)
- **Fix:** Added `source` to Props interface with union type, `data-newsletter-source` attribute, and source in POST body
- **Files modified:** web/src/components/common/NewsletterSignup.astro
- **Commit:** 0ef8f68

## Known Stubs

None -- both components are fully functional with real API calls, suppression logic, and animations.

## Threat Flags

None -- components use existing `/api/newsletter` endpoint (trust boundary already established in Plan 01). Honeypot and rate-limit mitigations (T-12-08) implemented in StickyBar form.

## Self-Check: PASSED

- ExitIntentModal.astro: FOUND
- StickyNewsletterBar.astro: FOUND
- 12-02-SUMMARY.md: FOUND
- Commit 0ef8f68: FOUND
- Commit 6b09b61: FOUND
