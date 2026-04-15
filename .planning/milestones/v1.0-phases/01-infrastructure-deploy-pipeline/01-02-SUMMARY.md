---
phase: 01-infrastructure-deploy-pipeline
plan: 02
subsystem: infra
tags: [docker, strapi, caddy, webhook, deploy, postgresql, hetzner]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Strapi 5 CMS project with content types, Dockerfile, Astro scaffold"
provides:
  - "Strapi CMS running in production on Hetzner (bbqexperience-strapi container)"
  - "PostgreSQL database (bbqexperience) on shared server instance"
  - "Caddy reverse proxy config for cms.bbqexperience.com and bbqexperience.com"
  - "Git push deploy webhook (adnanh/webhook -> deploy-bbqexperience.sh)"
  - "Content change rebuild webhook (Strapi -> rebuild-bbqexperience-web.sh)"
  - "Local docker-compose.yml for Strapi + PostgreSQL development"
  - "Astro rebuild script with lockfile debounce"
  - "SSH deploy key on server for GitHub repo access"
  - "GitHub webhook configured for auto-deploy on push to main"
affects: [02-frontend, 03-design, 04-content-fetching]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Deploy script pattern: git pull + docker compose build + up -d", "Rebuild script pattern: lockfile debounce + Docker-based Astro build + copy to dist", "Webhook dual-hook pattern: HMAC-SHA256 for GitHub, X-Rebuild-Secret for Strapi"]

key-files:
  created:
    - "docker-compose.yml"
    - "scripts/rebuild-web.sh"
  modified:
    - "cms/package.json"
    - "cms/Dockerfile"

key-decisions:
  - "Used shared PostgreSQL container (not dedicated) - saves resources, follows server pattern"
  - "Astro builds run in temporary Docker container on internal network - server has no Node.js"
  - "GitHub webhook created via gh CLI for auto-deploy"
  - "Strapi version updated from 5.40.0 to 5.41.1 (5.40.0 did not exist on npm)"

patterns-established:
  - "Server deploy pattern: /opt/webhooks/scripts/deploy-bbqexperience.sh"
  - "Content rebuild pattern: /opt/webhooks/scripts/rebuild-bbqexperience-web.sh with lockfile debounce"
  - "Env var pattern: BBQEXPERIENCE_* prefix in /opt/services/.env"

requirements-completed: [CMS-04]

# Metrics
duration: 19min
completed: 2026-04-01
---

# Phase 01 Plan 02: Deploy Pipeline & Production Setup Summary

**Strapi CMS deployed to Hetzner with dual webhook pipeline (GitHub push deploy + Strapi content change rebuild), Caddy reverse proxy, and local docker-compose for development**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-01T15:59:21Z
- **Completed:** 2026-04-01T16:18:00Z
- **Tasks:** 1 of 2 (checkpoint pending)
- **Files modified:** 4 local + 6 server-side

## Accomplishments
- Strapi 5.41.1 running in production on Hetzner with PostgreSQL database
- Dual webhook pipeline configured: GitHub push triggers deploy, Strapi content changes trigger Astro rebuild
- Caddy reverse proxy configured for CMS and web domains
- SSH deploy key created and added to GitHub repo as deploy key
- GitHub webhook created for auto-deploy on push to main
- Initial Astro build completed successfully, static placeholder served from dist
- Local docker-compose.yml for development environment

## Task Commits

Each task was committed atomically:

1. **Task 1a: Local files + Strapi version fix** - `f7bff03` (feat)
2. **Task 1b: Dockerfile schema.json copy fix** - `f8784d0` (fix)

## Files Created/Modified
- `docker-compose.yml` - Local dev compose with Strapi + PostgreSQL
- `scripts/rebuild-web.sh` - Astro rebuild script with lockfile debounce
- `cms/package.json` - Updated Strapi to 5.41.1, removed bundled plugins
- `cms/package-lock.json` - Generated for Docker build
- `cms/Dockerfile` - Added schema.json copy step for production build

### Server-side files created
- `/opt/webhooks/scripts/deploy-bbqexperience.sh` - Git push deploy script
- `/opt/webhooks/scripts/rebuild-bbqexperience-web.sh` - Astro rebuild script
- `/opt/services/.env` - BBQEXPERIENCE_* environment variables added
- `/opt/services/caddy/Caddyfile` - CMS and web site handlers added
- `/opt/webhooks/hooks.json` - bbqexperience and bbqexperience-rebuild hooks added
- `/opt/services/docker-compose.yml` - bbqexperience-strapi service added

## Decisions Made
- Used shared PostgreSQL container with dedicated database (follows server pattern, saves resources)
- Astro builds run in temporary Docker container on internal network (server has no host-level Node.js)
- Updated Strapi from 5.40.0 to 5.41.1 (5.40.0 did not exist on npm)
- Removed @strapi/plugin-i18n and @strapi/plugin-cloud from package.json (bundled in Strapi 5 core)
- Added schema.json copy step in Dockerfile (TypeScript compilation does not copy JSON files to dist)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Strapi version 5.40.0 did not exist on npm**
- **Found during:** Task 1 (npm install)
- **Issue:** package.json specified 5.40.0 for all Strapi packages, but this version does not exist
- **Fix:** Updated to 5.41.1, removed @strapi/plugin-i18n and @strapi/plugin-cloud (bundled in core)
- **Files modified:** cms/package.json
- **Committed in:** f7bff03

**2. [Rule 1 - Bug] Schema.json files not copied to dist directory**
- **Found during:** Task 1 (Strapi startup)
- **Issue:** Strapi crashed with "Cannot read properties of undefined (reading 'kind')" because TypeScript compilation does not copy JSON schema files to dist/
- **Fix:** Added `find src -name "schema.json"` copy step in Dockerfile after `npm run build`
- **Files modified:** cms/Dockerfile
- **Committed in:** f8784d0

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for Strapi to build and start. No scope creep.

## Issues Encountered
- Empty git repo on server (code not yet pushed) - resolved by pushing to GitHub first, then pulling on server
- DNS for cms.bbqexperience.com and bbqexperience.com not pointing to Hetzner server - requires Cloudflare DNS configuration by user

## User Setup Required

DNS records must be configured in Cloudflare:
- A record: `cms.bbqexperience.com` -> `204.168.153.43`
- A record: `bbqexperience.com` -> `204.168.153.43`
- A record: `www.bbqexperience.com` -> `204.168.153.43`

After DNS is configured:
- Visit https://cms.bbqexperience.com/admin to create the first admin user
- In admin panel: Settings -> Internationalization -> Add Italian (it) and Spanish (es) locales
- In admin panel: Settings -> Webhooks -> Create webhook for content rebuild

## Known Stubs

None - all infrastructure is wired and functional.

## Next Phase Readiness
- CMS is running and accessible (pending DNS)
- Deploy pipeline is fully automated (push to main triggers rebuild)
- Content rebuild pipeline is configured (pending Strapi webhook setup in admin panel)
- i18n locales need to be added via admin panel after first login
- Ready for Phase 02 frontend development

## Self-Check: PASSED

- All 5 local files: FOUND
- Commit f7bff03 (Task 1a): FOUND
- Commit f8784d0 (Task 1b): FOUND
- SUMMARY.md: FOUND
- Server verification: All 9 acceptance criteria verified via SSH

---
*Phase: 01-infrastructure-deploy-pipeline*
*Completed: 2026-04-01*
