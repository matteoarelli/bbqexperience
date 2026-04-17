# Phase 12: Newsletter On-Site Signup (Brevo) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 12-Newsletter On-Site Signup (Brevo)
**Areas discussed:** Inline form, Exit-intent modal, Sticky footer bar, Landing page

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Inline end-of-article form | Placement, copy, visual treatment, reuse vs new component | |
| Exit-intent modal design | Visual style, content, GSAP animation, overlay | |
| Sticky footer bar | Design, position, animation, relationship with footer | |
| Landing page (/newsletter) | Layout, value prop, social proof, past issues | |

**User's choice:** "Procedi pure a fare tutto" — user deferred all decisions to Claude
**Notes:** User trusts Claude to make all implementation decisions within the established BBQ Experience brand aesthetic and the constraints defined by the success criteria in ROADMAP.md.

---

## Claude's Discretion

All 4 gray areas were delegated to Claude. Key decisions made:

- **Inline form:** Reuse existing NewsletterSignup in full mode, add source prop
- **Exit-intent:** New component with GSAP animation, dark overlay, fire-gradient card, mouseleave clientY<0 trigger, cookie+sessionStorage suppression
- **Sticky footer bar:** Slim fixed bar with slide-up animation, IntersectionObserver to hide near footer, 30-day cookie
- **Landing page:** 3 locale pages with hero, benefits grid, social proof, full form, consent text
- **API:** Honeypot field, rate-limit 5/hour, source attribution to Strapi+Brevo

## Deferred Ideas

None mentioned during discussion.
