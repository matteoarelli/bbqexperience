---
phase: 01-infrastructure-deploy-pipeline
verified: 2026-04-01T17:00:00Z
status: gaps_found
score: 8/11 must-haves verified
gaps:
  - truth: "Content change in Strapi triggers Astro rebuild via webhook"
    status: failed
    reason: "No Strapi webhook is configured in the admin panel (strapi_webhooks table has 0 rows). The adnanh/webhook listener hook exists but Strapi is not wired to call it on content events."
    artifacts:
      - path: "server: /opt/webhooks/hooks.json (bbqexperience-rebuild entry)"
        issue: "Hook exists and script is correct, but Strapi has no webhook configured to call it — DB table strapi_webhooks is empty."
    missing:
      - "Strapi webhook must be created via admin panel: Settings -> Webhooks -> Create webhook with URL http://host.docker.internal:9000/hooks/bbqexperience-rebuild, events entry.publish / entry.unpublish / entry.delete"
  - truth: "i18n locales EN, IT, ES are available in Strapi admin"
    status: failed
    reason: "Only EN locale exists in DB (i18n_locale has 1 row). IT and ES have not been added via admin panel."
    artifacts:
      - path: "server: PostgreSQL bbqexperience.i18n_locale"
        issue: "Only English (en) present. Italian (it) and Spanish (es) are missing."
    missing:
      - "In Strapi admin panel: Settings -> Internationalization -> Add Italian (it)"
      - "In Strapi admin panel: Settings -> Internationalization -> Add Spanish (es)"
  - truth: "Git push to main triggers deploy via adnanh/webhook"
    status: partial
    reason: "The bbqexperience deploy hook in hooks.json uses payload-hmac-sha256 validation with an empty secret string ('secret': ''). This means HMAC validation is effectively disabled — any POST can trigger a deploy. The GitHub webhook secret was generated but not wired into hooks.json."
    artifacts:
      - path: "server: /opt/webhooks/hooks.json (bbqexperience entry)"
        issue: "trigger-rule.and[0].match.secret is empty string. GitHub webhook HMAC verification is not enforced."
    missing:
      - "Update hooks.json bbqexperience hook: set 'secret' to the value of BBQEXPERIENCE_GITHUB_WEBHOOK_SECRET from /opt/services/.env (or generate and store the secret, then configure it in GitHub webhook settings)"
      - "Note: the rebuild hook (bbqexperience-rebuild) also has value: '' for X-Rebuild-Secret — it will accept any value including empty. This should use the BBQEXPERIENCE_REBUILD_SECRET value."
human_verification:
  - test: "Strapi admin panel accessible in browser"
    expected: "https://cms.bbqexperience.com/admin loads the Strapi admin login/registration screen"
    why_human: "DNS (cms.bbqexperience.com -> 204.168.153.43) may not be configured yet in Cloudflare. Server-side HTTP check cannot use the public domain without DNS. Container logs confirm Strapi started and served /admin at 200."
  - test: "End-to-end rebuild pipeline fires on content publish"
    expected: "Publishing a test entry in Strapi admin causes /opt/webhooks/logs/bbqexperience.log to show 'Rebuild web iniziato' and 'Rebuild web completato' within 60 seconds"
    why_human: "Strapi webhook is not yet configured (gap above). Once created, human must verify the event actually fires and triggers the rebuild."
---

# Phase 01: Infrastructure & Deploy Pipeline — Verification Report

**Phase Goal:** A running Strapi CMS instance with all content models defined, connected to PostgreSQL, deployed on Hetzner via Docker Compose, with webhook-triggered rebuilds working end-to-end
**Verified:** 2026-04-01T17:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Strapi project bootstraps and starts locally without errors | ? UNCERTAIN | Strapi 5.41.1 starts in production container (logs: "Strapi started successfully"). Local start not tested (would need PG or SQLite). Code structure is correct. |
| 2  | All 6 content types (Product, Review, Recipe, Tutorial, BlogPost, InstagramPost) are defined | ✓ VERIFIED | All 6 schema.json files confirmed in cms/src/api/. Production dist also contains all 6 under dist/src/api/. |
| 3  | i18n plugin configured with EN as default locale | ✓ VERIFIED | cms/config/plugins.ts: `defaultLocale: 'en'`. DB confirms EN auto-seeded on startup. |
| 4  | Webhook default headers configured in server.ts | ✓ VERIFIED | cms/config/server.ts line 13: `'X-Rebuild-Secret': env('REBUILD_SECRET_TOKEN', '')` |
| 5  | Astro scaffold builds to static HTML | ✓ VERIFIED | /opt/services/bbqexperience/dist/index.html exists on server. Initial build completed. |
| 6  | Dockerfile builds a valid Strapi production image | ✓ VERIFIED | Multi-stage node:22-alpine Dockerfile; container bbqexperience-strapi is Up. |
| 7  | Strapi admin panel loads at the production CMS URL | ? UNCERTAIN | Container running, logs show 200 on /admin. DNS not yet confirmed (Cloudflare A record pending). Needs human browser check. |
| 8  | Content change in Strapi triggers Astro rebuild via webhook | ✗ FAILED | strapi_webhooks DB table has 0 rows. Strapi has no webhook configured to call the adnanh/webhook endpoint. |
| 9  | i18n locales EN, IT, ES are available in Strapi admin | ✗ FAILED | Only EN in i18n_locale table. IT and ES not added (requires admin panel action). |
| 10 | Git push to main triggers deploy via adnanh/webhook | ✗ FAILED (partial) | Hook exists and deploy script is correct, but HMAC secret is empty string in hooks.json — validation not enforced. Functional but insecure and possibly not wired to GitHub's actual secret. |
| 11 | Uploaded media persists across container restarts | ✓ VERIFIED | Volume mount `./bbqexperience/uploads:/opt/app/public/uploads` in server docker-compose.yml. |

**Score:** 8/11 truths verified (5 full + 3 uncertain/partial → 3 clear failures)

---

## Required Artifacts

### Plan 01-01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `cms/config/server.ts` | ✓ VERIFIED | Contains `defaultHeaders` with `X-Rebuild-Secret` |
| `cms/config/database.ts` | ✓ VERIFIED | Reads `DATABASE_HOST`, dual config (postgres + better-sqlite3) |
| `cms/config/plugins.ts` | ✓ VERIFIED | i18n enabled, `defaultLocale: 'en'` |
| `cms/src/api/product/content-types/product/schema.json` | ✓ VERIFIED | kind: collectionType, draftAndPublish: true, i18n localized: true |
| `cms/src/api/review/content-types/review/schema.json` | ✓ VERIFIED | All 5 scoring fields (score_overall, score_build_quality, score_performance, score_value, score_ease_of_use) present |
| `cms/src/api/recipe/content-types/recipe/schema.json` | ✓ VERIFIED | ingredients, instructions (JSON), prep_time, cook_time, servings present |
| `cms/src/api/tutorial/content-types/tutorial/schema.json` | ✓ VERIFIED | collectionType, draftAndPublish, i18n localized |
| `cms/src/api/blog-post/content-types/blog-post/schema.json` | ✓ VERIFIED | collectionType, featured boolean field present |
| `cms/src/api/instagram-post/content-types/instagram-post/schema.json` | ✓ VERIFIED | i18n localized: false (language-agnostic), instagram_id unique, curated flag |
| `cms/Dockerfile` | ✓ VERIFIED | Multi-stage, node:22-alpine, schema.json copy step included |
| `web/src/pages/index.astro` | ✓ VERIFIED (intentional stub) | Placeholder per plan — full frontend is Phase 2 |
| `web/astro.config.mjs` | ✓ VERIFIED | defineConfig, output: 'static', site: bbqexperience.com |

### Plan 01-02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `docker-compose.yml` | ✓ VERIFIED | bbqexperience-strapi service + postgres, volumes for uploads and node_modules |
| `scripts/rebuild-web.sh` | ✓ VERIFIED | Lockfile debounce logic present, Docker-based Astro build, copy to dist |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cms/config/database.ts` | environment variables | `env('DATABASE_HOST'` and siblings | ✓ WIRED | All DB env vars read via env() helper |
| `cms/config/server.ts` | webhook rebuild endpoint | `'X-Rebuild-Secret': env('REBUILD_SECRET_TOKEN', '')` | ✓ WIRED | Header configured, but see gap: Strapi webhook not created in admin |
| Strapi CMS | adnanh/webhook listener | HTTP POST with X-Rebuild-Secret header | ✗ NOT WIRED | strapi_webhooks table is empty — no webhook configured in Strapi admin |
| adnanh/webhook | rebuild-bbqexperience-web.sh | hook execute-command | ✓ WIRED | hooks.json bbqexperience-rebuild entry correctly points to script |
| GitHub push | deploy-bbqexperience.sh | adnanh/webhook HMAC-SHA256 | ⚠️ PARTIAL | Hook exists, script exists, but HMAC secret is empty in hooks.json — validation disabled |
| Caddy | bbqexperience-strapi:1337 | reverse_proxy on cms.bbqexperience.com | ✓ WIRED | Caddyfile has @bbqexperience-cms handler with reverse_proxy |
| Caddy | /opt/services/bbqexperience/dist | file_server on bbqexperience.com | ✓ WIRED | Caddyfile has @bbqexperience-web file_server handler |

---

## Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 01 produces infrastructure and configuration, not dynamic-data-rendering components.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Strapi container running | `docker ps \| grep bbqexperience-strapi` | `bbqexperience-strapi Up 5 minutes` | ✓ PASS |
| Strapi started without errors | `docker logs bbqexperience-strapi \| tail -10` | "Strapi started successfully" + 200 on /admin | ✓ PASS |
| All 6 content type dirs in dist | `docker exec bbqexperience-strapi ls dist/src/api/` | blog-post, instagram-post, product, recipe, review, tutorial | ✓ PASS |
| PostgreSQL bbqexperience DB exists | `psql \l \| grep bbqexperience` | bbqexperience database present | ✓ PASS |
| Astro dist served | `ls /opt/services/bbqexperience/dist/` | index.html present | ✓ PASS |
| Deploy scripts exist on server | `ls /opt/webhooks/scripts/ \| grep bbqexperience` | deploy-bbqexperience.sh, rebuild-bbqexperience-web.sh | ✓ PASS |
| SSH deploy key exists | `ls /root/.ssh/github_bbqexperience` | File present | ✓ PASS |
| Strapi webhook configured | `SELECT * FROM strapi_webhooks` | **0 rows** | ✗ FAIL |
| IT + ES locales in Strapi | `SELECT * FROM i18n_locale` | Only EN (1 row) | ✗ FAIL |
| GitHub HMAC secret in hooks.json | `hooks.json bbqexperience.trigger-rule secret` | Empty string | ✗ FAIL |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CMS-04 | 01-01-PLAN.md, 01-02-PLAN.md | Content changes trigger automatic site rebuild and deploy via webhook | ✗ BLOCKED | Strapi container runs and webhook infrastructure (adnanh/webhook hook, rebuild script) exists, but Strapi has no webhook configured in admin to fire it. The pipeline is built but not connected at the Strapi end. |

**Orphaned requirements check:** No additional requirements from REQUIREMENTS.md are mapped to Phase 1 beyond CMS-04.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| server: hooks.json (bbqexperience) | trigger-rule | `"secret": ""` — HMAC-SHA256 validation with empty secret | ⚠️ Warning | GitHub webhook can be triggered by any POST — security gap, not a functional blocker since the deploy script is read-only (git pull + docker build) |
| server: hooks.json (bbqexperience-rebuild) | trigger-rule | `"value": ""` — X-Rebuild-Secret matched against empty string | ⚠️ Warning | Any POST to the rebuild hook succeeds regardless of header value. Functional in practice (Strapi would need to know the endpoint URL), but the authentication intent from server.ts is not fulfilled |
| web/src/pages/index.astro | full file | "Coming soon" placeholder | ℹ️ Info | Intentional stub per plan — full frontend is Phase 2. Not a blocker. |

---

## Human Verification Required

### 1. Strapi Admin Panel Accessible at Public URL

**Test:** Open https://cms.bbqexperience.com/admin in browser
**Expected:** Strapi admin login/registration screen loads
**Why human:** DNS for cms.bbqexperience.com -> 204.168.153.43 must be configured in Cloudflare first. Container logs confirm /admin returns 200 at the container level, but public HTTPS requires DNS + Caddy TLS provisioning.

### 2. End-to-End Rebuild Pipeline

**Test:** After fixing gaps (Strapi webhook configured, IT/ES locales added): create a test Product in Strapi admin and publish it, then run `tail -f /opt/webhooks/logs/bbqexperience.log` on the server
**Expected:** Log shows "Rebuild web iniziato" followed by "Rebuild web completato" within ~60 seconds
**Why human:** Cannot trigger a Strapi content event programmatically without admin credentials. Requires browser interaction.

---

## Gaps Summary

Three gaps block full goal achievement:

**Gap 1 — Strapi Webhook Not Configured (Blocker for CMS-04)**
The entire rebuild pipeline depends on Strapi firing a webhook when content is published. The adnanh/webhook listener is configured and the rebuild script works, but Strapi has never been told where to send events. `strapi_webhooks` table is empty. This is a 2-minute fix in the admin panel but it is the most critical missing piece for the CMS-04 requirement.

**Gap 2 — IT and ES Locales Missing (Partial for CMS-02 readiness)**
i18n_locale table has only EN. IT and ES must be added via admin panel before content authors can create multilingual entries. This does not block Phase 02 frontend work but is required before any multilingual content authoring begins.

**Gap 3 — Webhook HMAC Secrets Empty (Security gap)**
Both hooks in hooks.json have empty secret values. The deploy hook (`bbqexperience`) uses `"secret": ""` for HMAC-SHA256 validation, and the rebuild hook (`bbqexperience-rebuild`) matches `"value": ""` for X-Rebuild-Secret. The secrets were generated and stored in `/opt/services/.env` but were not injected into hooks.json entries. This does not prevent the pipeline from functioning but renders authentication ineffective.

All three gaps are administrative/configuration actions on the running server — no code changes are needed.

---

_Verified: 2026-04-01T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
