# BBQ Experience — Architecture Overview

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Astro 6 (SSR) + Svelte 5 islands | 6.1.2 |
| Styling | Tailwind CSS 4 | 4.2.2 |
| Animation | GSAP 3 + ScrollTrigger | 3.14.2 |
| CMS | Strapi 5 (headless) | 5.41.1 |
| Database | PostgreSQL 16 | 16-alpine |
| Reverse Proxy | Caddy | latest |
| CDN | Cloudflare (free tier) | - |
| Analytics | Umami (self-hosted) | latest |
| Error Tracking | Sentry (free tier) | - |
| Newsletter | Brevo (free tier) | - |
| Hosting | Hetzner VPS CX21 | 2vCPU, 4GB RAM |

## Request Flow

```
User Browser
    |
    v
Cloudflare CDN (cache + HTTPS)
    |
    v
Caddy Reverse Proxy (auto-HTTPS, routing)
    |
    +---> bbq-experience.com ---------> Astro SSR (:4321)
    |                                       |
    |                                       +---> Strapi REST API (:1337)
    |                                                   |
    |                                                   +---> PostgreSQL (:5432)
    |
    +---> cms.bbq-experience.com -----> Strapi Admin (:1337)
    |
    +---> analytics.bbq-experience.com -> Umami (:3000)
                                             |
                                             +---> Umami PostgreSQL (:5434)
```

## Deploy Flow

```
Developer (git push)
    |
    v
GitHub Repository
    |
    v
GitHub Webhook (POST to Hetzner)
    |
    v
adnanh/webhook listener (Hetzner)
    |
    v
rebuild-web.sh
    |
    +---> git pull (update source)
    |
    +---> Docker build (npm ci + astro build + pagefind)
    |
    +---> Atomic swap (dist/ -> dist.old/ -> new dist/)
    |
    +---> Smoke test (9 URLs x HTTP 200)
    |
    v
Live site updated
```

## Content Sync Flow

```
Cron (ogni 6 ore)
    |
    v
sync-instagram.mjs
    |
    +---> Instagram Graph API (GET /media)
    |        |
    |        +---> 25 ultimi post + engagement metrics
    |
    +---> Calcolo engagement_score
    |
    +---> Keyword matching (caption vs product/recipe names)
    |
    +---> Upsert in Strapi (POST/PUT /api/instagram-posts)
    |
    v
Dati IG aggiornati in Strapi


Cron (ogni lunedi)
    |
    v
refresh-instagram-token.mjs
    |
    +---> Instagram API (refresh long-lived token)
    |
    +---> Salva in /opt/services/bbqexperience/.instagram-token
```

## Newsletter Flow

```
User compila form
    |
    v
POST /api/newsletter
    |
    +---> Crea Subscriber in Strapi (status: pending)
    |
    +---> Crea contatto in Brevo API
    |        |
    |        +---> Brevo invia email double opt-in
    |
    v
User conferma email
    |
    v
Brevo webhook -> POST /api/brevo-webhook
    |
    +---> Aggiorna Subscriber status: active
```

## Docker Services Map

| Container | Image | Port (internal) | Port (external) | Network |
|-----------|-------|-----------------|-----------------|---------|
| bbqexperience-strapi | Custom (Node 22) | 1337 | 1337 | docker bridge |
| bbqexperience-postgres | postgres:16-alpine | 5432 | 5433 (dev only) | docker bridge |
| umami | umami:postgresql-latest | 3000 | 3000 | umami-net |
| umami-db | postgres:16-alpine | 5432 | - | umami-net |
| caddy | caddy:latest | 80, 443 | 80, 443 | host |

## Directory Structure (Server)

```
/opt/services/bbqexperience/
    app/
        cms/            # Strapi source + uploads
        web/            # Astro source
    dist/               # Built Astro output (served by Caddy)

/opt/services/umami/
    docker-compose.yml  # Umami + PostgreSQL

/opt/services/caddy/
    Caddyfile           # Reverse proxy config

/opt/webhooks/
    scripts/
        rebuild-web.sh          # Deploy script
        backup-db.sh            # Daily backup
        restore-db.sh           # Restore from backup
        sync-instagram.mjs      # IG sync
        refresh-instagram-token.mjs  # Token refresh
    logs/
        bbqexperience.log       # Deploy + smoke test logs
        backup.log              # Backup logs
        instagram-sync.log      # IG sync logs
        instagram-token.log     # Token refresh logs
        webhook.log             # Webhook listener logs

/opt/backups/bbqexperience/
    bbqexperience_YYYY-MM-DD.sql.gz  # 30 giorni di backup
```

## i18n Architecture

```
URL: /{locale}/{route-segment}/{slug}/

Locales: en (default), it, es
Route translation: /en/reviews/ -> /it/recensioni/ -> /es/resenas/

Frontend (Astro):
    src/i18n/{locale}.json      # UI strings per lingua
    src/lib/i18n.ts             # Route translation + getTranslation()
    src/i18n/types.ts           # Type-safe TranslationKey union

CMS (Strapi):
    i18n plugin                 # Contenuti localizzati per entity
    API: ?locale=en             # Parametro locale su ogni query
```

## Security

| Layer | Protection |
|-------|-----------|
| CDN | Cloudflare DDoS protection + HTTPS |
| Reverse Proxy | Caddy auto-HTTPS (Let's Encrypt) |
| CORS | Whitelist esplicita in Strapi (bbq-experience.com only) |
| CSP | Content-Security-Policy-Report-Only su tutte le risposte |
| Rate Limiting | SQLite-based, per IP + endpoint (sopravvive ai restart) |
| API Auth | Bearer token per Strapi API |
| Preview | Cookie httpOnly con secret validation (1h expiry) |
| Webhooks | HMAC signature validation (GitHub + Brevo) |
