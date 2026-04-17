# Phase 12: Newsletter On-Site Signup (Brevo) - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver newsletter signup across 4 on-site surfaces (inline end-of-article, exit-intent modal, sticky footer bar, dedicated `/newsletter` landing page) with GDPR-compliant double opt-in via Brevo, honeypot spam protection, SQLite rate-limiting (5/IP/hour), and surface attribution on every signup. Frontend components + API hardening + i18n copy for EN/IT/ES. Welcome email automation configured in Brevo.

</domain>

<decisions>
## Implementation Decisions

### Inline End-of-Article Form
- **D-01:** Reuse existing `NewsletterSignup.astro` component in "full" mode (with title + subtitle) at the end of every article layout (blog post, review, recipe, tutorial).
- **D-02:** Add a `source` prop to `NewsletterSignup.astro` that gets passed to `/api/newsletter` as `source` field. Default: `"inline"` for article placements, `"footer"` for Footer usage.
- **D-03:** Keep existing fire-gradient border design — it already matches the BBQ brand. No redesign needed.

### Exit-Intent Modal
- **D-04:** New `ExitIntentModal.astro` component with dark overlay (rgba black ~0.6), centered card with fire-gradient top border, GSAP fadeIn + scaleUp animation.
- **D-05:** Trigger: `mouseleave` on `document.documentElement` only when `clientY < 0` (mouse exits toward top of viewport — browser chrome). Not on tab switch, not on mobile.
- **D-06:** Accessibility: focus trap cycling through form inputs + close button, `role="dialog"`, `aria-modal="true"`, `aria-label` with locale string, close on Escape key press, `aria-live="polite"` announcement on open.
- **D-07:** Suppression: `bbq-exit-modal-dismissed` cookie with 14-day expiry on dismiss. `bbq-exit-modal-shown` sessionStorage flag for 1/session cap. Check both before showing.
- **D-08:** Content: same value proposition copy as inline form (reuse i18n `newsletter.*` keys), plus a dismissible "X" close button top-right.
- **D-09:** Mobile exclusion: detect via `window.matchMedia('(hover: hover) and (pointer: fine)')` — only show on devices with a real mouse pointer.

### Sticky Footer Bar
- **D-10:** New `StickyNewsletterBar.astro` component — slim fixed bar at viewport bottom (above footer), with email input + CTA button + dismiss "X" in a single row.
- **D-11:** GSAP slide-up animation on first appearance (after ~5s delay or 30% scroll, whichever comes first).
- **D-12:** Suppression: `bbq-sticky-bar-dismissed` cookie with 30-day expiry on dismiss. Also hidden once user subscribes (check `bbq-newsletter-subscribed` localStorage).
- **D-13:** Must not overlap with the existing footer newsletter section — hide the sticky bar when the user scrolls to the footer (IntersectionObserver on footer element).
- **D-14:** Source attribution: `"footer"` for sticky bar submissions (shares the same attribution bucket as the footer compact form per Phase 11 schema).

### Landing Page (/newsletter)
- **D-15:** New Astro pages: `web/src/pages/en/newsletter/index.astro`, `web/src/pages/it/newsletter/index.astro`, `web/src/pages/es/newsletter/index.astro`.
- **D-16:** Layout sections: hero with heading + subtitle, 3-column benefits grid (exclusive reviews, recipes, BBQ secrets), social proof line ("Join 74,000+ pitmasters"), full signup form, privacy/consent text with link to privacy policy.
- **D-17:** Reuse `NewsletterSignup.astro` in "full" mode with `source="landing"`.
- **D-18:** Add new i18n keys under `newsletter.landing.*` for page-specific copy (hero, benefits, consent text). Keep existing `newsletter.*` keys for the shared form component.
- **D-19:** SEO: each locale page gets proper `<title>`, `<meta description>`, hreflang links to sibling locales. No JSON-LD needed (not a schema.org type).

### API Hardening
- **D-20:** Add honeypot field: hidden `<input name="website" tabindex="-1" autocomplete="off">` in all newsletter forms. API returns 403 if `body.website` is non-empty, no Brevo/Strapi call.
- **D-21:** Change rate limit window from current 5/minute to 5/hour (5 attempts, 3600000ms window) per success criteria.
- **D-22:** Add `source` field to Strapi subscriber creation payload and `SURFACE` attribute to Brevo contact creation. Source value comes from the form's `source` prop.
- **D-23:** Add `"please confirm"` locale-specific success state: after form submission, show a message telling the user to check their email for the DOI confirmation link. New i18n keys: `newsletter.confirmMessage`.

### Brevo Configuration (Manual)
- **D-24:** Configure Brevo DOI (double opt-in) on the contact list — confirmation email template per locale (EN/IT/ES). This is a Brevo admin panel task, not code.
- **D-25:** Configure Brevo welcome email automation: trigger on DOI confirmation, send locale-matched welcome email. Also a Brevo admin task.
- **D-26:** Add `SURFACE` as a Brevo contact attribute (text type) in Brevo settings.

### Claude's Discretion
- Exact GSAP animation timings and easing curves for exit-intent modal and sticky bar
- Specific benefit icons/illustrations on the landing page (or text-only if simpler)
- Sticky bar scroll threshold tuning (5s vs 30% — whichever feels right after testing)
- Error state copy and retry UX for failed submissions
- Exact consent text wording (as long as it references the privacy policy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Newsletter Infrastructure
- `web/src/pages/api/newsletter.ts` — Current signup endpoint (needs honeypot, source, rate-limit adjustment)
- `web/src/pages/api/brevo-webhook.ts` — DOI confirmation + unsubscribe webhook handler (no changes needed)
- `web/src/components/common/NewsletterSignup.astro` — Existing form component (needs source prop, honeypot field, confirm message state)
- `web/src/components/common/Footer.astro` — Uses NewsletterSignup compact (will need source="footer" prop)

### Rate Limiting & Security
- `web/src/lib/rate-limit.ts` — SQLite rate limiter (window param already supported, just change the call)

### i18n
- `web/src/i18n/en.json` — Existing `newsletter.*` keys (lines 221-227), needs `newsletter.landing.*` and `newsletter.confirmMessage`
- `web/src/i18n/it.json` — Same structure
- `web/src/i18n/es.json` — Same structure
- `web/src/lib/i18n.ts` — Locale routing utilities

### Strapi Schema (Phase 11)
- `cms/src/api/subscriber/content-types/subscriber/schema.json` — Has `source` enum field (inline/landing/footer/exit-intent/legacy) from Phase 11

### Requirements
- `.planning/REQUIREMENTS.md` — NEWS-01 through NEWS-08 are the 8 requirements for this phase

### Project Conventions
- `CLAUDE.md` §Conventions — "Rate limiting: SQLite-based in src/lib/rate-limit.ts. TUTTI gli endpoint devono usare questo"
- `CLAUDE.md` §Conventions — "Env vars: TUTTE le env vars necessarie a runtime devono essere sia ARG nel Dockerfile che -e nel docker run"
- `CLAUDE.md` §Conventions — "Fetch timeouts: TUTTI i fetch() verso servizi esterni devono avere signal: AbortSignal.timeout(10_000)"
- `CLAUDE.md` §Conventions — "Mobile menu panel: backdrop e pannello vivono in BaseLayout (body root)" — same principle for exit-intent modal overlay

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NewsletterSignup.astro` — Full + compact variants with i18n, form submission to `/api/newsletter`, localStorage check. Core component to extend with source prop and honeypot.
- `web/src/lib/rate-limit.ts` — SQLite rate limiter with configurable window. Already used by newsletter endpoint.
- `web/src/pages/api/newsletter.ts` — Complete Strapi + Brevo integration with error handling, AbortSignal timeouts. Needs 3 additions: honeypot check, source field, rate-limit window change.
- `web/src/pages/api/brevo-webhook.ts` — HMAC-validated webhook handler. No changes needed for Phase 12.
- GSAP already available as an island pattern (see `CLAUDE.md` §Stack Patterns) — use for exit-intent and sticky bar animations.

### Established Patterns
- Astro page routing: `web/src/pages/{locale}/{route}/index.astro` per locale
- Component props with i18n: `translations` object passed from page to component
- Client-side interactivity via `<script>` blocks in Astro components (no framework island needed for simple forms)
- Cookie/localStorage for client state (dark mode toggle pattern already exists)
- `BaseLayout.astro` hosts body-level overlays (mobile menu panel pattern) — exit-intent modal should live here

### Integration Points
- `BaseLayout.astro` — Add ExitIntentModal and StickyNewsletterBar at body root level
- `Footer.astro` — Add `source="footer"` prop to existing NewsletterSignup
- Article layouts (BlogPost, Review, Recipe, Tutorial) — Add inline NewsletterSignup at end of content
- `web/src/i18n/*.json` — Add new translation keys
- Dockerfile / docker run — Add any new env vars (none expected — all Brevo vars already configured)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all design decisions to Claude's judgment within the BBQ Experience brand aesthetic (fire gradients, bold typography, street-culture feel).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-newsletter-on-site-signup-brevo*
*Context gathered: 2026-04-17*
