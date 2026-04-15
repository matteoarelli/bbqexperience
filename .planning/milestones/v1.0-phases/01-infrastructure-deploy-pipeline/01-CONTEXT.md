# Phase 1: Infrastructure & Deploy Pipeline - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A running Strapi CMS instance with all content models defined, connected to PostgreSQL, deployed on Hetzner via Docker Compose, with webhook-triggered rebuilds working end-to-end. The i18n plugin is configured with EN (default), IT, and ES locales.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from project context:
- Deploy on existing Hetzner server (204.168.153.43) with Docker + Caddy reverse proxy
- Use adnanh/webhook for auto-deploy (no GitHub Actions)
- Strapi 5 as headless CMS with PostgreSQL
- Astro 6 as frontend SSG
- Content types needed: Product/Review, Recipe, Tutorial, BlogPost, InstagramPost
- i18n: EN (default), IT, ES

</decisions>

<code_context>
## Existing Code Insights

Greenfield project — no existing code. Infrastructure will be built from scratch.

### Integration Points
- Hetzner server at 204.168.153.43 (SSH access available)
- Caddy reverse proxy at /opt/services/caddy/Caddyfile
- Docker Compose at /opt/services/docker-compose.yml
- Webhook config at /opt/webhooks/hooks.json
- Deploy scripts at /opt/webhooks/scripts/

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
