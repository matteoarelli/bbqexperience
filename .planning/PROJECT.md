# BBQ Experience

## What This Is

A top-class editorial portal for the BBQ Experience brand (74k Instagram followers), serving as the authoritative online hub for BBQ product reviews, recipes, tutorials, and news. The site extends and amplifies the existing Instagram presence with deep, structured content that Instagram can't deliver — while maintaining a bold, street-culture BBQ aesthetic. Primary language is English, with Italian and Spanish support.

## Core Value

When someone searches for a BBQ product review, BBQ Experience must be the most complete, visually striking, and trustworthy result they find — the undisputed reference point for the BBQ community.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Product reviews with full scoring system (overall + per-category), editorial deep-dive, and technical spec sheet
- [ ] Recipe section with step-by-step guides, photos, difficulty levels, and cook times
- [ ] Tutorial/guide section covering techniques, equipment selection, and BBQ knowledge
- [ ] Blog/news section for BBQ world updates, events, and trends
- [ ] Bidirectional Instagram integration (site embeds IG content, IG drives traffic to site)
- [ ] Multilingual support: English (primary), Italian, Spanish
- [ ] Bold/street BBQ design with micro-interactions, animations, and WOW factor
- [ ] Blazing fast performance (instant page loads, optimized media)
- [ ] Headless CMS with custom frontend for single-author content management
- [ ] SEO optimization for product review and recipe search intent
- [ ] Responsive design — flawless on mobile (where most IG traffic lands)
- [ ] Product comparison capabilities across reviewed items
- [ ] Media-rich pages with optimized images and video embeds

### Out of Scope

- E-commerce / direct product sales — site is brand building, not a store
- User-generated content / community features on site — community stays on Instagram
- Monetization features (ads, affiliates) — not a priority for v1, can be added later
- User accounts / login — no need, single author, readers don't contribute
- Forum / comments system — interaction happens on Instagram
- Mobile app — web-first, responsive design covers mobile

## Context

- **Existing brand**: BBQ Experience Instagram account with 74k followers and active community
- **Content model**: Single author (Matteo) creates all content — CMS must be efficient for solo workflow
- **Instagram is primary**: The site supports and extends IG, not replaces it. Traffic flows both ways
- **Budget**: €30,000 — premium quality expected, no compromises on design or performance
- **Target audience**: International BBQ enthusiasts (EN first, IT and ES for regional reach)
- **Review format**: The most complete review format in BBQ space — combines numerical scoring per category, long-form editorial opinion, and structured technical specifications with pros/cons and final verdict
- **Timeline**: Target launch within 3 months (by July 2026)
- **Design direction**: Bold, street, BBQ culture — fire, smoke, warm colors, energy. Not corporate, not minimal. Think BBQ magazine meets street food culture

## Constraints

- **Tech stack**: Custom/headless architecture — no WordPress or traditional CMS
- **Timeline**: 3 months to launch (by July 2026)
- **Budget**: €30,000 total
- **Content author**: Single person (Matteo) — admin UX must be streamlined for one-person operation
- **Performance**: Must score 90+ on Lighthouse across all metrics
- **Multilingual**: Must support EN, IT, ES from day one with clean URL structure
- **Instagram API**: Subject to Meta's API limitations and rate limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom/headless over WordPress | Top class quality demands full control over frontend performance and design | — Pending |
| English as primary language | International reach, BBQ community is global | — Pending |
| No user accounts in v1 | Community interaction stays on Instagram, reduces complexity | — Pending |
| No monetization in v1 | Focus on brand authority first, monetize later | — Pending |
| Bold/street design direction | Matches BBQ culture and differentiates from generic food blogs | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after initialization*
