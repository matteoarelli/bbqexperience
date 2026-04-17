# Phase 12: Newsletter On-Site Signup (Brevo) - Research

**Researched:** 2026-04-17
**Domain:** Newsletter signup surfaces (Astro components + Brevo DOI API + GDPR compliance)
**Confidence:** HIGH

## Summary

Phase 12 extends the existing newsletter infrastructure (endpoint, component, Strapi subscriber schema, Brevo webhook) with 4 signup surfaces: inline end-of-article, exit-intent modal, sticky footer bar, and dedicated landing page. The existing `newsletter.ts` API needs 3 additions (honeypot check, source field, rate-limit window change from 60s to 3600s), and the Brevo API call must switch from `POST /v3/contacts` to `POST /v3/contacts/doubleOptinConfirmation` for proper DOI flow. The `NewsletterSignup.astro` component needs a `source` prop, honeypot hidden field, and a "please confirm your email" state. Two new components (ExitIntentModal, StickyNewsletterBar) and 3 new landing pages complete the feature surface.

The codebase already has all patterns needed: GSAP dynamic import via `animations.ts`, body-level overlays via BaseLayout (MobileMenuPanel pattern), cookie/localStorage for client state, SQLite rate-limiter with configurable window, and 12 article detail pages (4 content types x 3 locales) as integration points. No new dependencies are needed.

**Primary recommendation:** Wire up surfaces incrementally -- first harden the API (honeypot + source + DOI + rate-limit), then extend the existing component, then add inline placements across 12 article pages, then build new components (exit-intent, sticky bar), and finally create the 3 landing pages. The Brevo admin setup (DOI templates, SURFACE attribute, welcome automation) is a manual prerequisite that Matteo must complete before testing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reuse existing `NewsletterSignup.astro` component in "full" mode at end of every article layout
- **D-02:** Add `source` prop to `NewsletterSignup.astro`, default "inline" for articles, "footer" for Footer
- **D-03:** Keep existing fire-gradient border design
- **D-04:** New `ExitIntentModal.astro` with dark overlay, centered card, fire-gradient top border, GSAP fadeIn + scaleUp
- **D-05:** Trigger: `mouseleave` on `document.documentElement` only when `clientY < 0`
- **D-06:** Accessibility: focus trap, `role="dialog"`, `aria-modal="true"`, `aria-label`, close on Escape, `aria-live="polite"`
- **D-07:** Suppression: `bbq-exit-modal-dismissed` cookie (14-day), `bbq-exit-modal-shown` sessionStorage (1/session)
- **D-08:** Reuse i18n `newsletter.*` keys, plus dismissible "X" close button
- **D-09:** Mobile exclusion via `window.matchMedia('(hover: hover) and (pointer: fine)')`
- **D-10:** New `StickyNewsletterBar.astro` -- slim fixed bar at viewport bottom
- **D-11:** GSAP slide-up animation (after ~5s delay or 30% scroll)
- **D-12:** Suppression: `bbq-sticky-bar-dismissed` cookie (30-day), hidden if `bbq-newsletter-subscribed` localStorage
- **D-13:** Hide sticky bar when footer visible (IntersectionObserver)
- **D-14:** Source attribution: "footer" for sticky bar (shares bucket with footer compact)
- **D-15:** Landing pages at `web/src/pages/{locale}/newsletter/index.astro`
- **D-16:** Layout: hero + 3-column benefits + social proof + signup form + consent text
- **D-17:** Reuse `NewsletterSignup.astro` in "full" mode with `source="landing"`
- **D-18:** New i18n keys under `newsletter.landing.*`
- **D-19:** SEO: title, meta description, hreflang. No JSON-LD
- **D-20:** Honeypot: hidden `<input name="website" tabindex="-1" autocomplete="off">`, API 403 if non-empty
- **D-21:** Rate limit: 5 attempts, 3600000ms window (change from current 60000ms)
- **D-22:** Add `source` to Strapi payload and `SURFACE` to Brevo contact attributes
- **D-23:** Locale-specific "please confirm" success state after submission
- **D-24:** Configure Brevo DOI on contact list (manual Brevo admin task)
- **D-25:** Configure Brevo welcome email automation (manual Brevo admin task)
- **D-26:** Add `SURFACE` as Brevo contact attribute (manual Brevo admin task)

### Claude's Discretion
- Exact GSAP animation timings and easing curves for exit-intent modal and sticky bar
- Specific benefit icons/illustrations on landing page (or text-only)
- Sticky bar scroll threshold tuning (5s vs 30% -- whichever feels right)
- Error state copy and retry UX for failed submissions
- Exact consent text wording (as long as it references privacy policy)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NEWS-01 | Inline signup block at end of every article with locale translation | Extend `NewsletterSignup.astro` with `source` prop, add to 12 article detail pages (4 types x 3 locales) |
| NEWS-02 | Dedicated `/newsletter` landing page (EN/IT/ES) with value proposition and consent | 3 new Astro pages following existing locale routing pattern, new `newsletter.landing.*` i18n keys |
| NEWS-03 | Sticky footer bar with 30-day dismiss suppression cookie | New `StickyNewsletterBar.astro` in BaseLayout, GSAP slide-up, IntersectionObserver to hide near footer |
| NEWS-04 | Exit-intent modal on desktop with a11y (focus trap, ESC, screen reader) and frequency caps | New `ExitIntentModal.astro` in BaseLayout, `mouseleave` + `clientY < 0`, cookie + sessionStorage suppression |
| NEWS-06 | Brevo DOI: confirmation email, unconfirmed state, locale "please confirm" success | Switch API from `POST /v3/contacts` to `POST /v3/contacts/doubleOptinConfirmation` with `templateId` per locale |
| NEWS-07 | Rate-limit 5/IP/hour + honeypot rejection (403) | Modify `checkRateLimit` call to `windowMs: 3_600_000`, add honeypot check before any processing |
| NEWS-08 | Welcome email via Brevo automation after DOI confirmation | Brevo admin panel task -- trigger automation on DOI confirm event, locale-matched template |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rate limiting:** SQLite-based in `src/lib/rate-limit.ts`. ALL endpoints must use this, not in-memory Map [VERIFIED: codebase]
- **Env vars:** ALL runtime env vars must be both ARG in Dockerfile and -e in docker run [VERIFIED: CLAUDE.md]
- **Fetch timeouts:** ALL external fetch() must have `signal: AbortSignal.timeout(10_000)` [VERIFIED: codebase -- already in newsletter.ts]
- **Mobile menu panel pattern:** backdrop and panel live in BaseLayout (body root), not inside Header -- same principle for exit-intent modal [VERIFIED: CLAUDE.md + BaseLayout.astro]
- **Hero/text on dark overlay:** Force `color: #fff` + text-shadow, not `var(--color-text-primary)` [VERIFIED: CLAUDE.md]
- **i18n custom JSON:** NOT Paraglide. JSON files in `src/i18n/`, type-safe via `src/i18n/types.ts` [VERIFIED: codebase]
- **Container names:** PostgreSQL = "postgres" [VERIFIED: CLAUDE.md]
- **Secrets:** NEVER commit tokens. Use `.env.windows` (gitignored) for Windows, `.env` for server [VERIFIED: CLAUDE.md]
- **Lenis removed:** Smooth scroll handled by browser, do not use Lenis [VERIFIED: CLAUDE.md]

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.x | SSR pages + API routes | Already in use [VERIFIED: codebase] |
| GSAP | 3.x | Exit-intent + sticky bar animations | Already installed, lazy-loaded via `animations.ts` [VERIFIED: codebase] |
| better-sqlite3 | installed | Rate limiting persistence | Already used by `rate-limit.ts` [VERIFIED: codebase] |
| Brevo REST API | v3 | Contact creation + DOI | Already integrated in `newsletter.ts` [VERIFIED: codebase] |

### No New Dependencies Needed
This phase requires zero `npm install` commands. All functionality is built using existing Astro components, vanilla JS for client-side behavior (cookie/localStorage, IntersectionObserver, matchMedia, mouseleave events), GSAP for animations, and the Brevo REST API.

## Architecture Patterns

### New Files to Create
```
web/src/
  components/
    common/
      ExitIntentModal.astro      # Desktop exit-intent modal with GSAP
      StickyNewsletterBar.astro  # Slim sticky bar at viewport bottom
  pages/
    en/newsletter/index.astro    # Landing page EN
    it/newsletter/index.astro    # Landing page IT
    es/newsletter/index.astro    # Landing page ES
```

### Files to Modify
```
web/src/
  components/common/
    NewsletterSignup.astro       # Add source prop, honeypot field, confirm state
    Footer.astro                 # Add source="footer" prop to NewsletterSignup
  layouts/
    BaseLayout.astro             # Add ExitIntentModal + StickyNewsletterBar
  pages/api/
    newsletter.ts                # Honeypot check, source field, DOI endpoint, rate-limit window
  pages/
    en/blog/[slug].astro         # Add inline NewsletterSignup
    en/reviews/[slug].astro      # Add inline NewsletterSignup
    en/recipes/[slug].astro      # Add inline NewsletterSignup
    en/tutorials/[slug].astro    # Add inline NewsletterSignup
    it/blog/[slug].astro         # Add inline NewsletterSignup
    it/recensioni/[slug].astro   # Add inline NewsletterSignup
    it/ricette/[slug].astro      # Add inline NewsletterSignup
    it/guide/[slug].astro        # Add inline NewsletterSignup
    es/blog/[slug].astro         # Add inline NewsletterSignup
    es/resenas/[slug].astro      # Add inline NewsletterSignup
    es/recetas/[slug].astro      # Add inline NewsletterSignup
    es/tutoriales/[slug].astro   # Add inline NewsletterSignup
  i18n/
    en.json                      # Add newsletter.landing.*, newsletter.confirmMessage, etc.
    it.json                      # Same structure
    es.json                      # Same structure
  lib/
    i18n.ts                      # Add newsletter to localizedRoutes
```

### Pattern 1: Body-Level Overlay (ExitIntentModal)
**What:** Modal component lives in BaseLayout at body root level, same as MobileMenuPanel [VERIFIED: codebase pattern]
**When to use:** Any full-screen overlay that needs `position:fixed` without being trapped by parent `backdrop-filter`
**Example:**
```typescript
// In BaseLayout.astro, after MobileMenuPanel:
<ExitIntentModal locale={locale as Locale} translations={translations} />
<StickyNewsletterBar locale={locale as Locale} translations={translations} />
```

### Pattern 2: Brevo DOI Contact Creation
**What:** Switch from simple contact creation to DOI flow [VERIFIED: Brevo API docs]
**When to use:** Always for newsletter signups -- GDPR requirement
**Example:**
```typescript
// Source: https://developers.brevo.com/reference/create-doi-contact
// BEFORE (current -- creates contact immediately):
await fetch('https://api.brevo.com/v3/contacts', {
  method: 'POST',
  body: JSON.stringify({ email, listIds: [BREVO_LIST_ID], attributes: { LOCALE: locale }, updateEnabled: true }),
});

// AFTER (DOI -- sends confirmation email):
await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
  body: JSON.stringify({
    email,
    includeListIds: [BREVO_LIST_ID],
    templateId: DOI_TEMPLATE_IDS[locale], // EN/IT/ES template IDs from env
    redirectionUrl: `https://bbq-experience.com/${locale}/newsletter/?confirmed=true`,
    attributes: { LOCALE: locale, SURFACE: source },
  }),
  signal: AbortSignal.timeout(10_000),
});
```

### Pattern 3: Cookie Suppression
**What:** Set/read cookies for modal and sticky bar dismiss suppression [ASSUMED -- standard browser API, no library]
**When to use:** Any UI element with timed suppression
**Example:**
```typescript
// Imposta cookie con scadenza
function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

// Leggi cookie
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}
```

### Pattern 4: Focus Trap (Vanilla JS)
**What:** Manual focus trap for exit-intent modal without external library [ASSUMED -- standard a11y pattern]
**When to use:** Any modal dialog that requires keyboard accessibility
**Example:**
```typescript
// Focus trap: cicla tra elementi focusabili dentro il modale
function trapFocus(modal: HTMLElement): void {
  const focusable = modal.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') {
      // Chiudi modale
    }
  });

  first?.focus();
}
```

### Anti-Patterns to Avoid
- **Do NOT use `focus-trap` npm package:** Vanilla JS focus trap is sufficient for a single modal. No new dependency needed.
- **Do NOT import GSAP statically:** Use dynamic `import('gsap')` pattern from `animations.ts` to keep bundle zero on pages without animations.
- **Do NOT use `document.addEventListener('mouseleave')` globally:** Attach to `document.documentElement` with `clientY < 0` guard per D-05.
- **Do NOT show exit-intent on tab switch:** `mouseleave` fires on alt-tab in some browsers; the `clientY < 0` check prevents false triggers.
- **Do NOT use `visibilitychange` for exit-intent:** Decision D-05 explicitly excludes tab-switch detection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom in-memory counter | `checkRateLimit()` from `rate-limit.ts` | CLAUDE.md mandate -- all endpoints use SQLite rate-limiter [VERIFIED] |
| Email validation | Complex regex | Existing `isValidEmail()` in `newsletter.ts` | Already handles edge cases [VERIFIED] |
| DOI flow | Custom confirmation email system | Brevo DOI API endpoint | Brevo handles the email sending, link tracking, and confirmation [VERIFIED: Brevo docs] |
| Cookie management | Cookie library (js-cookie, etc.) | Vanilla `document.cookie` | Only 2 cookies needed; no library justified |
| Focus trap | focus-trap npm package | Vanilla JS (see Pattern 4) | Single modal, ~15 lines of code |

## Common Pitfalls

### Pitfall 1: Brevo DOI Template IDs Not Configured
**What goes wrong:** API calls to `/v3/contacts/doubleOptinConfirmation` fail with 400 if `templateId` doesn't match a valid DOI template in Brevo account.
**Why it happens:** DOI templates must be created manually in Brevo admin panel first, then their IDs passed as env vars.
**How to avoid:** Matteo must create 3 DOI templates (EN/IT/ES) in Brevo dashboard BEFORE testing. Add `BREVO_DOI_TEMPLATE_EN`, `BREVO_DOI_TEMPLATE_IT`, `BREVO_DOI_TEMPLATE_ES` env vars. Also add `SURFACE` as a contact attribute in Brevo settings.
**Warning signs:** 400 responses from Brevo API with "template not found" or "attribute not found" errors.

### Pitfall 2: Exit-Intent Fires on Mobile (False Positive)
**What goes wrong:** `mouseleave` event fires on some mobile browsers or tablets with hover emulation.
**Why it happens:** Some devices emulate hover; `mouseleave` can fire unexpectedly.
**How to avoid:** Decision D-09 mandates `window.matchMedia('(hover: hover) and (pointer: fine)')` -- check this BEFORE attaching the mouseleave listener, not just hiding the modal.
**Warning signs:** Modal appearing on tablets or phones during testing.

### Pitfall 3: Cookie Not Set on Correct Path
**What goes wrong:** Suppression cookies are not read on different pages because they were set with a specific path.
**How to avoid:** Always set cookies with `path=/` to ensure site-wide visibility.
**Warning signs:** Modal/sticky bar reappearing on page navigation.

### Pitfall 4: Sticky Bar Overlaps Footer Newsletter
**What goes wrong:** User sees both the sticky bar and the footer newsletter section simultaneously, creating redundancy.
**Why it happens:** IntersectionObserver threshold or target element is wrong.
**How to avoid:** Use IntersectionObserver on the footer `<footer>` element (or the `.footer-newsletter` div) with threshold 0. When intersecting, hide sticky bar with GSAP slideDown or `display: none`.
**Warning signs:** Visual overlap during scroll testing.

### Pitfall 5: Honeypot Caught by Autofill
**What goes wrong:** Legitimate browsers autofill the hidden honeypot field, causing 403 rejections for real users.
**Why it happens:** Some password managers or browser autofill target fields named "website" or "url".
**How to avoid:** Use `autocomplete="off"` AND `tabindex="-1"` AND position the field off-screen with CSS (not `display:none` which some bots detect). Decision D-20 already specifies these attributes.
**Warning signs:** Real user complaints about "forbidden" errors after submission.

### Pitfall 6: GSAP Not Available in Client Script
**What goes wrong:** Calling `gsap.to()` in a `<script>` tag without dynamic import causes runtime error.
**Why it happens:** GSAP is not globally available; it must be imported.
**How to avoid:** Use `const { gsap } = await import('gsap')` inside the component's `<script>` block, matching the pattern in `animations.ts`.
**Warning signs:** Console error "gsap is not defined".

### Pitfall 7: Multiple Newsletter Forms on Same Page
**What goes wrong:** `document.querySelectorAll('[data-newsletter]')` already handles multiple instances, but the `source` field won't differentiate them.
**Why it happens:** All forms POST to the same endpoint; without per-form source attribution, analytics are wrong.
**How to avoid:** Each form instance must include its `source` value in the POST body. Use `data-newsletter-source` attribute on the container, read it in the script.
**Warning signs:** All signups show the same source in Brevo/Strapi.

### Pitfall 8: DOI Redirect URL Must Be Absolute
**What goes wrong:** Brevo DOI API rejects relative `redirectionUrl`.
**Why it happens:** Brevo validates the URL format server-side.
**How to avoid:** Always use `https://bbq-experience.com/{locale}/newsletter/?confirmed=true` as the redirect URL.
**Warning signs:** 400 error from Brevo with "invalid URL" message.

## Code Examples

### Honeypot Check in API (first guard, before rate-limit)
```typescript
// Source: Decision D-20 + existing newsletter.ts pattern
const body = await request.json();
// Honeypot: campo nascosto, se compilato e un bot
if (body.website) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Rate-Limit Window Change
```typescript
// Source: existing rate-limit.ts API [VERIFIED: codebase]
// BEFORE: checkRateLimit(clientIp, 'newsletter', 5)          // default 60_000ms
// AFTER:  checkRateLimit(clientIp, 'newsletter', 5, 3_600_000) // 1 hour
```

### Source Field in Strapi + Brevo
```typescript
// Source: Decision D-22 + subscriber schema [VERIFIED: codebase]
const source = body.source || 'inline'; // inline | landing | footer | exit-intent

// Strapi: aggiunge source al payload
data: { email, locale_preference: locale, status: 'pending', subscribed_at: new Date().toISOString(), source }

// Brevo: aggiunge SURFACE attribute
attributes: { LOCALE: locale, SURFACE: source }
```

### Exit-Intent Mouseleave Guard
```typescript
// Source: Decision D-05
document.documentElement.addEventListener('mouseleave', (e) => {
  if (e.clientY < 0) {
    // Mouse uscito verso il bordo superiore (browser chrome)
    showExitModal();
  }
});
```

### Sticky Bar IntersectionObserver (hide near footer)
```typescript
// Source: Decision D-13
const footer = document.querySelector('footer');
const stickyBar = document.querySelector('[data-sticky-bar]');
if (footer && stickyBar) {
  const observer = new IntersectionObserver(([entry]) => {
    (stickyBar as HTMLElement).style.display = entry.isIntersecting ? 'none' : '';
  }, { threshold: 0 });
  observer.observe(footer);
}
```

### Newsletter Route in localizedRoutes
```typescript
// Source: existing i18n.ts pattern [VERIFIED: codebase]
// Add to localizedRoutes in web/src/lib/i18n.ts:
newsletter: { en: 'newsletter', it: 'newsletter', es: 'newsletter' },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `POST /v3/contacts` (immediate add) | `POST /v3/contacts/doubleOptinConfirmation` (DOI) | Phase 12 | GDPR compliance, prevents unverified signups |
| Rate limit 5/min | Rate limit 5/hour | Phase 12 | Stricter bot protection per success criteria |
| No source attribution | `source` enum on subscriber + `SURFACE` Brevo attribute | Phase 11 schema + Phase 12 wiring | Conversion reporting by surface |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Brevo DOI template IDs can be passed as env vars (BREVO_DOI_TEMPLATE_EN/IT/ES) | Architecture Patterns | Low -- env var naming is our choice |
| A2 | Brevo DOI API at `/v3/contacts/doubleOptinConfirmation` accepts `attributes` field for custom contact attributes | Architecture Patterns | Medium -- if attributes not supported on DOI endpoint, need separate update call after confirmation |
| A3 | `redirectionUrl` in Brevo DOI can include query params (`?confirmed=true`) | Architecture Patterns | Low -- standard URL, confirmed by Brevo docs example |
| A4 | Vanilla JS focus trap is sufficient for WCAG 2.1 AA compliance | Don't Hand-Roll | Low -- standard pattern used by major a11y implementations |

## Open Questions

1. **Brevo DOI Template IDs**
   - What we know: Matteo must create 3 DOI email templates in Brevo admin (EN/IT/ES) and note their numeric IDs
   - What's unclear: Whether Matteo has already created these templates or knows how
   - Recommendation: Document as a manual prerequisite in the plan. Provide template ID env var names so Matteo can fill them in.

2. **Brevo `SURFACE` Attribute on DOI Endpoint**
   - What we know: The regular `/v3/contacts` endpoint accepts `attributes`. The DOI endpoint docs show `attributes` as an optional field.
   - What's unclear: Whether attributes are applied immediately or only after DOI confirmation
   - Recommendation: Test with a real call. If attributes are dropped on DOI, add a fallback: set SURFACE via Brevo webhook handler when contact_updated fires.

3. **Welcome Email Trigger**
   - What we know: NEWS-08 requires a welcome email on DOI confirmation
   - What's unclear: Whether Brevo automation trigger should be "contact added to list" or "DOI confirmed"
   - Recommendation: Use "contact added to list" trigger in Brevo automation -- this fires ONLY after DOI confirmation, not on initial doubleOptinConfirmation API call.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). This phase is purely code/config changes using existing installed stack (Astro, GSAP, better-sqlite3) and the Brevo REST API already integrated.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `web/vitest.config.ts` (unit), `web/e2e/*.spec.ts` (E2E) |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEWS-01 | Inline form at end of article posts to /api/newsletter with source="inline" | E2E | `npx playwright test e2e/newsletter.spec.ts` | No -- Wave 0 |
| NEWS-02 | /en/newsletter/ returns 200 with form | E2E | `npx playwright test e2e/newsletter.spec.ts` | No -- Wave 0 |
| NEWS-03 | Sticky bar appears, dismiss sets 30-day cookie | E2E | `npx playwright test e2e/newsletter.spec.ts` | No -- Wave 0 |
| NEWS-04 | Exit-intent modal on mouseleave clientY<0, focus trap, ESC close | E2E | `npx playwright test e2e/newsletter.spec.ts` | No -- Wave 0 |
| NEWS-06 | API calls Brevo DOI endpoint (not /v3/contacts) | Unit | `npx vitest run src/pages/api/newsletter.test.ts` | No -- Wave 0 |
| NEWS-07 | Honeypot 403 + rate-limit 5/hour | Unit | `npx vitest run src/pages/api/newsletter.test.ts` | No -- Wave 0 |
| NEWS-08 | Welcome email on DOI confirm | Manual-only | Verify in Brevo dashboard after test subscription | N/A |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd web && npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `web/src/pages/api/newsletter.test.ts` -- unit tests for honeypot, source, rate-limit, DOI call
- [ ] `web/e2e/newsletter.spec.ts` -- E2E tests for all 4 surfaces, suppression, a11y

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Yes | Email regex validation + honeypot field + server-side source enum check |
| V6 Cryptography | No | N/A (Brevo webhook HMAC already implemented) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bot spam signup | Tampering | Honeypot field (D-20) + SQLite rate-limit 5/hr (D-21) |
| Rate-limit bypass via IP spoofing | Elevation | `x-forwarded-for` from Caddy is trusted; Cloudflare adds real IP header |
| XSS via email field | Tampering | Email validated server-side; no user input rendered back unescaped |
| CSRF on newsletter endpoint | Spoofing | Low risk (public signup form, no auth state); rate-limit mitigates abuse |
| Source enum injection | Tampering | Validate `source` against allowed values server-side before Strapi/Brevo calls |

## Sources

### Primary (HIGH confidence)
- Brevo DOI API docs: https://developers.brevo.com/reference/create-doi-contact -- endpoint, required fields, templateId, redirectionUrl [VERIFIED: WebFetch]
- Existing codebase: `web/src/pages/api/newsletter.ts`, `web/src/components/common/NewsletterSignup.astro`, `web/src/lib/rate-limit.ts`, `web/src/layouts/BaseLayout.astro` [VERIFIED: Read tool]
- Strapi subscriber schema: `cms/src/api/subscriber/content-types/subscriber/schema.json` -- source enum already has 5 values [VERIFIED: Read tool]
- GSAP lazy import pattern: `web/src/lib/animations.ts` [VERIFIED: Read tool]

### Secondary (MEDIUM confidence)
- Brevo DOI template setup guide: https://help.brevo.com/hc/en-us/articles/27353832123026 (403 on fetch, but referenced in search results) [CITED: Brevo help center]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies
- Architecture: HIGH -- patterns directly observed in codebase (BaseLayout overlays, GSAP lazy import, i18n JSON, rate-limit)
- Pitfalls: HIGH -- based on real code review (current API, cookie patterns, GSAP usage)
- Brevo DOI attributes field: MEDIUM -- docs show it but untested with DOI-specific endpoint

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable -- all core APIs and patterns are established)
