---
phase: 12
slug: newsletter-on-site-signup-brevo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) + manual browser verification |
| **Config file** | web/vitest.config.ts |
| **Quick run command** | `cd web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd web && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd web && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | NEWS-07 | T-12-01 | Honeypot rejects non-empty POST with 403, no Brevo call | unit | `curl -X POST ... -d '{"email":"a@b.com","website":"spam"}'` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | NEWS-07 | T-12-02 | Rate limit 5/IP/hour returns 429 on 6th attempt | unit | `for i in {1..6}; do curl ...; done` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | NEWS-06 | — | Brevo DOI endpoint called with correct templateId per locale | integration | manual — verify Brevo contact shows as unconfirmed | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | NEWS-01 | — | Inline form renders at end of every article in each locale | e2e | `curl -s localhost:4321/en/blog/* \| grep newsletter-inline` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | NEWS-02 | — | /en/newsletter/, /it/newsletter/, /es/newsletter/ return 200 | e2e | `curl -o /dev/null -s -w "%{http_code}" localhost:4321/en/newsletter/` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | NEWS-04 | — | Exit-intent modal appears on mouseleave clientY<0, desktop only | manual | Browser DevTools — simulate mouseleave | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | NEWS-04 | — | Focus trap cycles through modal elements | manual | Tab through modal in browser | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | NEWS-03 | — | Sticky bar visible on first visit, hidden after dismiss for 30d | manual | Clear cookies, visit, dismiss, check cookie expiry | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing vitest infrastructure covers unit tests
- Manual browser verification covers exit-intent and sticky bar behavior
- No new test framework needed

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exit-intent modal triggers on mouseleave toward browser chrome | NEWS-04 | Requires real mouse interaction | Open site in Chrome, move mouse upward past viewport edge |
| Focus trap cycles within modal | NEWS-04 | Requires keyboard interaction | Tab through all modal elements, verify focus stays inside |
| Sticky bar hides near footer via IntersectionObserver | NEWS-03 | Requires scroll interaction | Scroll to footer, verify bar disappears |
| Brevo DOI confirmation email received | NEWS-06 | Requires email delivery | Submit form, check inbox for DOI email |
| Welcome email in correct locale | NEWS-08 | Requires Brevo automation | Confirm DOI, check welcome email locale |
| SURFACE attribute in Brevo | NEWS-05 | Requires Brevo admin panel | Check contact attributes in Brevo dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
