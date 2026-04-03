# BBQ Experience v2.0 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade BBQ Experience from 8/10 tech + 4/10 business to 10/10 on both fronts.

**Architecture:** 10 phases executed sequentially: server hardening (backup, monitoring, security), quality (testing), business foundation (analytics, newsletter, Instagram), content pipeline, frontend polish, and documentation. Each phase produces independently deployable changes.

**Tech Stack:** Astro 6, Strapi 5, PostgreSQL 16, Docker, Sentry, Umami, Brevo API, Instagram Graph API, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-03-v2-upgrade-design.md`

---

## Phase 10: Backup & Disaster Recovery

### Task 1: Create backup script

**Files:**
- Create: `scripts/backup-db.sh`

- [ ] **Step 1: Write the backup script**

```bash
#!/bin/bash
# backup-db.sh — Backup giornaliero PostgreSQL per BBQ Experience
# Esegue pg_dump dal container Docker, comprime con gzip, mantiene ultimi 30 giorni
set -e

BACKUP_DIR="/opt/backups/bbqexperience"
LOG="/opt/webhooks/logs/backup.log"
DATE=$(date '+%Y-%m-%d')
FILENAME="bbqexperience_${DATE}.sql.gz"
CONTAINER="bbqexperience-postgres"

mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') -- Backup iniziato" >> "$LOG"

# Dump dal container PostgreSQL e comprimi
if docker exec "$CONTAINER" pg_dump -U bbqexperience -d bbqexperience | gzip > "${BACKUP_DIR}/${FILENAME}"; then
  # Verifica che il file non sia vuoto (minimo 100 bytes)
  FILE_SIZE=$(stat -c%s "${BACKUP_DIR}/${FILENAME}" 2>/dev/null || echo 0)
  if [ "$FILE_SIZE" -lt 100 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') -- ERRORE: Backup troppo piccolo (${FILE_SIZE} bytes), possibile dump vuoto" >> "$LOG"
    rm -f "${BACKUP_DIR}/${FILENAME}"
    exit 1
  fi
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- Backup completato: ${FILENAME} (${FILE_SIZE} bytes)" >> "$LOG"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- ERRORE: pg_dump fallito" >> "$LOG"
  exit 1
fi

# Elimina backup piu vecchi di 30 giorni
find "$BACKUP_DIR" -name "bbqexperience_*.sql.gz" -mtime +30 -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/bbqexperience_*.sql.gz 2>/dev/null | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S') -- Pulizia completata, ${REMAINING} backup conservati" >> "$LOG"
```

- [ ] **Step 2: Write the restore script**

Create: `scripts/restore-db.sh`

```bash
#!/bin/bash
# restore-db.sh — Ripristina database PostgreSQL da un backup
# Uso: ./restore-db.sh /opt/backups/bbqexperience/bbqexperience_2026-04-03.sql.gz
set -e

BACKUP_FILE="$1"
CONTAINER="bbqexperience-postgres"
STRAPI_CONTAINER="bbqexperience-strapi"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <percorso-file-backup.sql.gz>"
  echo "Backup disponibili:"
  ls -lh /opt/backups/bbqexperience/bbqexperience_*.sql.gz 2>/dev/null || echo "  Nessun backup trovato"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERRORE: File non trovato: $BACKUP_FILE"
  exit 1
fi

echo "ATTENZIONE: Questo sovrascrivera il database corrente con il backup:"
echo "  $BACKUP_FILE"
echo ""
read -p "Continuare? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Annullato."
  exit 0
fi

echo "1/4 Fermo Strapi..."
docker stop "$STRAPI_CONTAINER" 2>/dev/null || true

echo "2/4 Drop e ricreazione database..."
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "DROP DATABASE IF EXISTS bbqexperience;"
docker exec "$CONTAINER" psql -U bbqexperience -d postgres -c "CREATE DATABASE bbqexperience OWNER bbqexperience;"

echo "3/4 Ripristino da backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U bbqexperience -d bbqexperience

echo "4/4 Riavvio Strapi..."
docker start "$STRAPI_CONTAINER"

echo "Ripristino completato. Verifica: https://cms.bbq-experience.com/admin"
```

- [ ] **Step 3: Deploy scripts sul server e configura cron**

```bash
# Copia scripts sul server
scp -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" scripts/backup-db.sh scripts/restore-db.sh root@204.168.153.43:/opt/webhooks/scripts/

# Rendi eseguibili e configura cron
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 '
  chmod +x /opt/webhooks/scripts/backup-db.sh /opt/webhooks/scripts/restore-db.sh
  mkdir -p /opt/backups/bbqexperience
  # Aggiungi cron job per backup giornaliero alle 03:00
  (crontab -l 2>/dev/null | grep -v backup-db; echo "0 3 * * * /opt/webhooks/scripts/backup-db.sh") | crontab -
  echo "Cron configurato:"
  crontab -l | grep backup
'
```

- [ ] **Step 4: Test manuale del backup**

```bash
# Esegui backup manualmente
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 '/opt/webhooks/scripts/backup-db.sh'

# Verifica che il file esista e non sia vuoto
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'ls -lh /opt/backups/bbqexperience/ && tail -5 /opt/webhooks/logs/backup.log'
```

Expected: file `bbqexperience_2026-04-03.sql.gz` presente con dimensione > 100 bytes, log mostra "Backup completato".

- [ ] **Step 5: Commit**

```bash
git add scripts/backup-db.sh scripts/restore-db.sh
git commit -m "feat: add PostgreSQL backup and restore scripts

Daily automated backup via cron at 03:00, 30-day retention.
Restore script with interactive confirmation and Strapi restart."
```

---

## Phase 11: Monitoring & Error Tracking

### Task 2: Install and configure Sentry

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/middleware.ts`
- Modify: `web/.env.example`
- Create: `web/src/lib/sentry.ts`

- [ ] **Step 1: Install Sentry SDK**

```bash
cd web && npm install @sentry/node
```

- [ ] **Step 2: Create Sentry initialization module**

Create `web/src/lib/sentry.ts`:

```typescript
// Inizializzazione Sentry — error tracking per BBQ Experience
import * as Sentry from '@sentry/node';

const SENTRY_DSN = import.meta.env.SENTRY_DSN || '';

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    // Campiona il 100% degli errori, 10% delle transazioni
    tracesSampleRate: 0.1,
    // Non inviare PII
    sendDefaultPii: false,
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) {
    console.error('Errore non tracciato (Sentry non configurato):', error);
    return;
  }

  if (!initialized) initSentry();

  if (context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}
```

- [ ] **Step 3: Integrate Sentry in Astro middleware**

Replace `web/src/middleware.ts` with:

```typescript
// Middleware Astro — BBQ Experience
// Preview mode + Sentry error tracking
import { defineMiddleware } from 'astro:middleware';
import { isPreviewMode } from '@lib/preview';
import { initSentry, captureError } from '@lib/sentry';

// Inizializza Sentry al primo request
initSentry();

export const onRequest = defineMiddleware(async (context, next) => {
  // Imposta lo stato di anteprima nei locals per tutte le pagine
  context.locals.isPreview = isPreviewMode(context.cookies);

  try {
    return await next();
  } catch (error) {
    captureError(error, {
      url: context.url.pathname,
      method: context.request.method,
    });
    throw error;
  }
});
```

- [ ] **Step 4: Add SENTRY_DSN to env examples**

Append to `web/.env.example`:
```
SENTRY_DSN=
```

Append to `.env.example`:
```
SENTRY_DSN=
```

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/sentry.ts web/src/middleware.ts web/package.json web/package-lock.json web/.env.example .env.example
git commit -m "feat: add Sentry error tracking to Astro SSR

Captures unhandled errors in middleware with URL context.
Gracefully degrades if SENTRY_DSN is not set."
```

### Task 3: Add smoke test to deploy script

**Files:**
- Modify: `scripts/rebuild-web.sh`

- [ ] **Step 1: Add smoke test function to rebuild-web.sh**

Add after the `cp -r` line (line 41) and before the final log line:

```bash
# Smoke test — verifica che le pagine principali rispondano 200
echo "$(date '+%Y-%m-%d %H:%M:%S') -- Smoke test iniziato" >> "$LOG"
SMOKE_URLS=(
  "https://bbq-experience.com/en/"
  "https://bbq-experience.com/it/"
  "https://bbq-experience.com/es/"
  "https://bbq-experience.com/en/reviews/"
  "https://bbq-experience.com/it/recensioni/"
  "https://bbq-experience.com/es/resenas/"
  "https://bbq-experience.com/en/recipes/"
  "https://bbq-experience.com/it/ricette/"
  "https://bbq-experience.com/es/recetas/"
)
SMOKE_FAIL=0
for url in "${SMOKE_URLS[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') -- SMOKE FAIL: $url -> HTTP $HTTP_CODE" >> "$LOG"
    SMOKE_FAIL=1
  fi
done
if [ "$SMOKE_FAIL" -eq 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- Smoke test PASSED (9/9 URL OK)" >> "$LOG"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') -- ATTENZIONE: Smoke test con errori, verificare manualmente" >> "$LOG"
fi
```

- [ ] **Step 2: Deploy updated script**

```bash
scp -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" scripts/rebuild-web.sh root@204.168.153.43:/opt/webhooks/scripts/
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'chmod +x /opt/webhooks/scripts/rebuild-web.sh'
```

- [ ] **Step 3: Commit**

```bash
git add scripts/rebuild-web.sh
git commit -m "feat: add smoke test to deploy pipeline

Verifies 9 URLs (3 locales x 3 page types) respond HTTP 200 after each deploy.
Logs failures but does not auto-rollback."
```

---

## Phase 12: Security Hardening

### Task 4: Configure explicit CORS in Strapi

**Files:**
- Modify: `cms/config/middlewares.ts`

- [ ] **Step 1: Replace middlewares.ts with explicit CORS config**

```typescript
// Stack middleware Strapi 5 con CORS e security espliciti
export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'https://bbq-experience.com',
        'https://cms.bbq-experience.com',
        'http://localhost:4321',
        'http://localhost:1337',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Rebuild-Secret'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

- [ ] **Step 2: Commit**

```bash
git add cms/config/middlewares.ts
git commit -m "feat: configure explicit CORS whitelist in Strapi

Only allows requests from bbq-experience.com, cms subdomain, and localhost dev."
```

### Task 5: Add CSP headers in Astro middleware

**Files:**
- Modify: `web/src/middleware.ts`

- [ ] **Step 1: Add CSP header to middleware response**

Update `web/src/middleware.ts` — add CSP after the `next()` call:

```typescript
// Middleware Astro — BBQ Experience
// Preview mode + Sentry error tracking + Security headers
import { defineMiddleware } from 'astro:middleware';
import { isPreviewMode } from '@lib/preview';
import { initSentry, captureError } from '@lib/sentry';

initSentry();

// Content Security Policy — report-only per non rompere nulla
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' cms.bbq-experience.com data: https://api.qrserver.com",
  "connect-src 'self' cms.bbq-experience.com *.sentry.io",
  "frame-src youtube-nocookie.com www.youtube-nocookie.com instagram.com www.instagram.com",
  "font-src 'self'",
  "media-src 'self' cms.bbq-experience.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.isPreview = isPreviewMode(context.cookies);

  try {
    const response = await next();

    // Aggiungi CSP in report-only mode
    response.headers.set('Content-Security-Policy-Report-Only', CSP);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    captureError(error, {
      url: context.url.pathname,
      method: context.request.method,
    });
    throw error;
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat: add CSP and security headers to all responses

CSP in report-only mode. Adds X-Content-Type-Options, X-Frame-Options, Referrer-Policy."
```

### Task 6: Migrate rate limiter to SQLite

**Files:**
- Create: `web/src/lib/rate-limit.ts`
- Modify: `web/src/pages/api/newsletter.ts`
- Modify: `web/src/pages/api/search.ts`
- Modify: `web/package.json`

- [ ] **Step 1: Install better-sqlite3**

```bash
cd web && npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

- [ ] **Step 2: Create shared rate limiter module**

Create `web/src/lib/rate-limit.ts`:

```typescript
// Rate limiter persistente basato su SQLite — sopravvive ai restart
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DB_PATH = join(tmpdir(), 'bbq-rate-limits.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_ip_endpoint ON rate_limits(ip, endpoint);
    `);
  }
  return db;
}

/**
 * Controlla se l'IP ha superato il limite per un dato endpoint.
 * Pulisce automaticamente le entry vecchie.
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number = 60_000,
): boolean {
  const d = getDb();
  const now = Date.now();
  const cutoff = now - windowMs;

  // Pulisci entry vecchie (>1 ora per tutti gli endpoint)
  d.prepare('DELETE FROM rate_limits WHERE timestamp < ?').run(now - 3_600_000);

  // Conta richieste nel window
  const row = d.prepare(
    'SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND endpoint = ? AND timestamp > ?',
  ).get(ip, endpoint, cutoff) as { count: number };

  if (row.count >= maxRequests) return false;

  // Registra nuova richiesta
  d.prepare('INSERT INTO rate_limits (ip, endpoint, timestamp) VALUES (?, ?, ?)').run(ip, endpoint, now);
  return true;
}

/** Estrae IP dal request (x-forwarded-for, x-real-ip, fallback) */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}
```

- [ ] **Step 3: Update newsletter.ts to use shared rate limiter**

Replace `web/src/pages/api/newsletter.ts`:

```typescript
// API endpoint newsletter — salva le iscrizioni in un file JSON lato server
import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';

export const prerender = false;

/** Percorso file JSON per le iscrizioni */
const SUBSCRIBERS_FILE = join(process.cwd(), 'data', 'newsletter-subscribers.json');

/** Validazione email base */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Subscriber {
  email: string;
  subscribedAt: string;
  locale: string;
}

/** Legge le iscrizioni esistenti dal file */
async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/** Salva le iscrizioni nel file */
async function writeSubscribers(subscribers: Subscriber[]): Promise<void> {
  const dir = join(process.cwd(), 'data');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf-8');
}

export const POST: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'newsletter', 5)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const locale = body.locale || 'en';

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email non valida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscribers = await readSubscribers();

    if (subscribers.some(s => s.email === email)) {
      return new Response(JSON.stringify({ success: true, message: 'Gia iscritto' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    subscribers.push({ email, subscribedAt: new Date().toISOString(), locale });
    await writeSubscribers(subscribers);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Errore newsletter:', err);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 4: Update search.ts to use shared rate limiter**

Replace the rate limit section in `web/src/pages/api/search.ts` — remove the in-memory Map and use the shared module. Replace lines 9-20 with import, and replace the rate check call:

```typescript
// API proxy per ricerca multi-content — interroga Strapi su reviews, recipes, tutorials, blog-posts
import type { APIRoute } from 'astro';
import { STRAPI_URL } from '@lib/strapi';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';

export const prerender = false;

const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';

/** Header di autenticazione per Strapi */
function strapiHeaders(): HeadersInit {
  return STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};
}

/** Mappa URL per determinare il tipo di contenuto in base al locale */
const contentTypeRoutes: Record<string, Record<string, string>> = {
  reviews: { en: 'reviews', it: 'recensioni', es: 'resenas' },
  recipes: { en: 'recipes', it: 'ricette', es: 'recetas' },
  tutorials: { en: 'tutorials', it: 'guide', es: 'tutoriales' },
  'blog-posts': { en: 'blog', it: 'blog', es: 'blog' },
};

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  contentType: string;
}

export const GET: APIRoute = async ({ url, request }) => {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'search', 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const query = url.searchParams.get('q');
  const locale = url.searchParams.get('locale') || 'en';
  const filter = url.searchParams.get('filter') || 'all';

  if (!query || !query.trim()) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  const encodedQuery = encodeURIComponent(query.trim());

  const contentTypes = [
    { type: 'reviews', endpoint: 'reviews', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'recipes', endpoint: 'recipes', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'tutorials', endpoint: 'tutorials', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'blog-posts', endpoint: 'blog-posts', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
  ];

  const typesToSearch = filter === 'all'
    ? contentTypes
    : contentTypes.filter(ct => ct.type === filter || ct.type === `${filter}-posts`);

  try {
    const promises = typesToSearch.map(async (ct) => {
      const strapiUrl = `${STRAPI_URL}/api/${ct.endpoint}?filters[${ct.titleField}][$containsi]=${encodedQuery}&locale=${locale}&pagination[pageSize]=5&status=published`;
      const response = await fetch(strapiUrl, { headers: strapiHeaders() });
      if (!response.ok) return [];

      const json = await response.json();
      const data = json.data || [];

      const routeSegment = contentTypeRoutes[ct.type]?.[locale] || ct.type;

      return data.map((item: any): SearchResult => ({
        url: `/${locale}/${routeSegment}/${item.slug || item.documentId}/`,
        title: item[ct.titleField] || '',
        excerpt: (item[ct.excerptField] || '').slice(0, 150),
        contentType: ct.type === 'blog-posts' ? 'blog' : ct.type,
      }));
    });

    const allResults = await Promise.all(promises);
    const results = allResults.flat().slice(0, 15);

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    console.error('Errore proxy search:', err);
    return new Response(JSON.stringify({ error: 'Errore interno', results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/rate-limit.ts web/src/pages/api/newsletter.ts web/src/pages/api/search.ts web/package.json web/package-lock.json
git commit -m "feat: migrate rate limiter from in-memory to SQLite

Shared rate-limit module using better-sqlite3. Persists across process restarts.
Auto-cleanup of entries older than 1 hour."
```

### Task 7: Remove unused Lenis dependency

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Verify lenis is not imported anywhere**

```bash
cd web && grep -r "lenis" src/ --include="*.ts" --include="*.astro" --include="*.svelte" --include="*.css"
```

Expected: no results (lenis is installed but never imported).

- [ ] **Step 2: Uninstall lenis**

```bash
cd web && npm uninstall lenis
```

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore: remove unused lenis dependency

Was installed but never imported. Smooth scroll handled by CSS native behavior."
```

---

## Phase 13: Test Suite

### Task 8: Configure Vitest

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd web && npm install -D vitest
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(__dirname, 'src/lib'),
      '@i18n': resolve(__dirname, 'src/i18n'),
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test scripts to package.json**

Add to `scripts` in `web/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:all": "vitest run && playwright test"
```

- [ ] **Step 4: Commit**

```bash
git add web/vitest.config.ts web/package.json web/package-lock.json
git commit -m "feat: configure Vitest for unit testing

Path aliases match Astro tsconfig. Node environment for lib testing."
```

### Task 9: Write unit tests for i18n.ts

**Files:**
- Create: `web/src/lib/i18n.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  getLocaleFromPath,
  getLocalizedPath,
  getTranslation,
  locales,
  defaultLocale,
} from './i18n';

describe('getLocaleFromPath', () => {
  it('estrae en da /en/', () => {
    expect(getLocaleFromPath('/en/')).toBe('en');
  });

  it('estrae it da /it/recensioni/', () => {
    expect(getLocaleFromPath('/it/recensioni/')).toBe('it');
  });

  it('estrae es da /es/recetas/slug/', () => {
    expect(getLocaleFromPath('/es/recetas/slug/')).toBe('es');
  });

  it('ritorna defaultLocale per path senza locale', () => {
    expect(getLocaleFromPath('/unknown/')).toBe(defaultLocale);
  });

  it('ritorna defaultLocale per path vuoto', () => {
    expect(getLocaleFromPath('/')).toBe(defaultLocale);
  });
});

describe('getLocalizedPath', () => {
  it('traduce /en/reviews/ in /it/recensioni/', () => {
    expect(getLocalizedPath('/en/reviews/', 'it')).toBe('/it/recensioni/');
  });

  it('traduce /it/ricette/ in /es/recetas/', () => {
    expect(getLocalizedPath('/it/ricette/', 'es')).toBe('/es/recetas/');
  });

  it('traduce /en/tutorials/ in /it/guide/', () => {
    expect(getLocalizedPath('/en/tutorials/', 'it')).toBe('/it/guide/');
  });

  it('preserva slug di contenuto dopo il segmento di route', () => {
    expect(getLocalizedPath('/en/reviews/weber-kettle/', 'it')).toBe('/it/recensioni/weber-kettle/');
  });

  it('gestisce homepage senza segmento di route', () => {
    expect(getLocalizedPath('/en/', 'es')).toBe('/es/');
  });
});

describe('getTranslation', () => {
  const translations = {
    nav: { home: 'Home', reviews: 'Reviews' },
    common: { loading: 'Loading...' },
  };

  it('risolve dot notation semplice', () => {
    expect(getTranslation(translations, 'nav.home')).toBe('Home');
  });

  it('risolve chiave annidata', () => {
    expect(getTranslation(translations, 'common.loading')).toBe('Loading...');
  });

  it('ritorna la chiave stessa se non trovata', () => {
    expect(getTranslation(translations, 'nonexistent.key')).toBe('nonexistent.key');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd web && npx vitest run src/lib/i18n.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/i18n.test.ts
git commit -m "test: add unit tests for i18n utilities

Tests getLocaleFromPath, getLocalizedPath route translation, and getTranslation dot notation."
```

### Task 10: Write unit tests for media.ts

**Files:**
- Create: `web/src/lib/media.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { getStrapiMediaURL, getStrapiImageFormats, getStrapiMediaAlt } from './media';

describe('getStrapiMediaURL', () => {
  it('ritorna null per media null', () => {
    expect(getStrapiMediaURL(null)).toBeNull();
  });

  it('ritorna null per media senza url', () => {
    expect(getStrapiMediaURL({} as any)).toBeNull();
  });

  it('ritorna URL assoluto se gia completo', () => {
    const media = { url: 'https://example.com/image.jpg' } as any;
    expect(getStrapiMediaURL(media)).toBe('https://example.com/image.jpg');
  });

  it('antepone PUBLIC_CMS_URL per URL relativi', () => {
    const media = { url: '/uploads/image.jpg' } as any;
    const result = getStrapiMediaURL(media);
    expect(result).toContain('/uploads/image.jpg');
    expect(result?.startsWith('http')).toBe(true);
  });
});

describe('getStrapiImageFormats', () => {
  it('ritorna oggetto vuoto per media null', () => {
    expect(getStrapiImageFormats(null)).toEqual({});
  });

  it('ritorna oggetto vuoto per media senza formats', () => {
    expect(getStrapiImageFormats({ url: '/img.jpg' } as any)).toEqual({});
  });

  it('ritorna formati disponibili con URL assoluti', () => {
    const media = {
      url: '/uploads/img.jpg',
      formats: {
        thumbnail: { url: '/uploads/thumbnail_img.jpg' },
        small: { url: '/uploads/small_img.jpg' },
      },
    } as any;
    const result = getStrapiImageFormats(media);
    expect(result.thumbnail).toContain('thumbnail_img.jpg');
    expect(result.small).toContain('small_img.jpg');
    expect(result.medium).toBeUndefined();
  });
});

describe('getStrapiMediaAlt', () => {
  it('ritorna stringa vuota per media null', () => {
    expect(getStrapiMediaAlt(null)).toBe('');
  });

  it('ritorna alternativeText se presente', () => {
    const media = { alternativeText: 'BBQ grill' } as any;
    expect(getStrapiMediaAlt(media)).toBe('BBQ grill');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd web && npx vitest run src/lib/media.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/media.test.ts
git commit -m "test: add unit tests for media URL resolution helpers

Tests getStrapiMediaURL, getStrapiImageFormats, and getStrapiMediaAlt with null/relative/absolute URL cases."
```

### Task 11: Write unit tests for rate-limit.ts

**Files:**
- Create: `web/src/lib/rate-limit.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('checkRateLimit', () => {
  it('permette richieste sotto il limite', () => {
    const ip = `test-${Date.now()}`;
    expect(checkRateLimit(ip, 'test-endpoint', 5)).toBe(true);
    expect(checkRateLimit(ip, 'test-endpoint', 5)).toBe(true);
  });

  it('blocca dopo aver superato il limite', () => {
    const ip = `blocked-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 'test-block', 3);
    }
    expect(checkRateLimit(ip, 'test-block', 3)).toBe(false);
  });

  it('endpoint diversi hanno conteggi separati', () => {
    const ip = `multi-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 'endpoint-a', 3);
    }
    // endpoint-a esaurito, ma endpoint-b deve funzionare
    expect(checkRateLimit(ip, 'endpoint-b', 3)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('estrae IP da x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('fallback a x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    });
    expect(getClientIp(req)).toBe('9.8.7.6');
  });

  it('fallback a unknown', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd web && npx vitest run src/lib/rate-limit.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/rate-limit.test.ts
git commit -m "test: add unit tests for SQLite rate limiter

Tests rate limit enforcement, per-endpoint isolation, and IP extraction."
```

### Task 12: Configure Playwright and write E2E tests

**Files:**
- Modify: `web/package.json`
- Create: `web/playwright.config.ts`
- Create: `web/e2e/navigation.spec.ts`
- Create: `web/e2e/features.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd web && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    port: 4321,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Write navigation E2E tests**

Create `web/e2e/navigation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Homepage per locale', () => {
  for (const locale of ['en', 'it', 'es']) {
    test(`carica /${locale}/ con status 200`, async ({ page }) => {
      const response = await page.goto(`/${locale}/`);
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe('Language switcher', () => {
  test('naviga da EN a IT mantenendo la pagina', async ({ page }) => {
    await page.goto('/en/');
    // Il language switcher ha link con il locale come testo
    const itLink = page.locator('a[hreflang="it"]').first();
    if (await itLink.isVisible()) {
      await itLink.click();
      await expect(page).toHaveURL(/\/it\//);
    }
  });
});

test.describe('Header navigation', () => {
  test('link principali sono visibili e funzionanti', async ({ page }) => {
    await page.goto('/en/');
    // Verifica che il header esista
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('mostra contenuto per URL inesistente', async ({ page }) => {
    const response = await page.goto('/en/nonexistent-page/');
    expect(response?.status()).toBe(404);
    // La 404 page ha un titolo
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
});
```

- [ ] **Step 4: Write feature E2E tests**

Create `web/e2e/features.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dark/Light mode', () => {
  test('toggle cambia tema e persiste', async ({ page }) => {
    await page.goto('/en/');
    // Trova il toggle tema
    const toggle = page.locator('[data-theme-toggle], button:has-text("theme"), button:has-text("Theme")').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      // Verifica che il data-theme sia cambiato
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(theme).toBe('light');

      // Ricarica e verifica persistenza
      await page.reload();
      const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(themeAfterReload).toBe('light');
    }
  });
});

test.describe('Search dialog', () => {
  test('si apre e accetta input', async ({ page }) => {
    await page.goto('/en/');
    // Cerca il bottone search nel header
    const searchButton = page.locator('button[aria-label*="earch"], button[aria-label*="cerca"], [data-search-trigger]').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      // Verifica che il dialog sia visibile
      const dialog = page.locator('[role="dialog"], dialog').first();
      await expect(dialog).toBeVisible();
    }
  });
});

test.describe('Reviews page', () => {
  test('/en/reviews/ carica e mostra contenuto', async ({ page }) => {
    const response = await page.goto('/en/reviews/');
    expect(response?.status()).toBe(200);
    // Dovrebbe avere almeno un heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Recipes page', () => {
  test('/en/recipes/ carica e mostra contenuto', async ({ page }) => {
    const response = await page.goto('/en/recipes/');
    expect(response?.status()).toBe(200);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});
```

- [ ] **Step 5: Run E2E tests (richiede build + preview prima)**

```bash
cd web && npm run build && npx playwright test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/playwright.config.ts web/e2e/ web/package.json web/package-lock.json
git commit -m "feat: add Playwright E2E tests for critical user flows

Tests: homepage per locale, language switcher, 404, dark/light toggle, search dialog, review/recipe pages."
```

---

## Phase 14: Umami Analytics

### Task 13: Deploy Umami on Hetzner

**Files:**
- Create: `scripts/setup-umami.sh`

- [ ] **Step 1: Create Umami setup script**

```bash
#!/bin/bash
# setup-umami.sh — Installa Umami analytics sul server Hetzner
set -e

echo "1/4 Creo directory e docker-compose per Umami..."
mkdir -p /opt/services/umami

cat > /opt/services/umami/docker-compose.yml << 'COMPOSE'
version: '3.8'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami_secure_pwd_2026@umami-db:5432/umami
      APP_SECRET: $(openssl rand -hex 32)
    depends_on:
      - umami-db
    networks:
      - umami-net

  umami-db:
    image: postgres:16-alpine
    container_name: umami-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami_secure_pwd_2026
    volumes:
      - umami_pgdata:/var/lib/postgresql/data
    networks:
      - umami-net

volumes:
  umami_pgdata:

networks:
  umami-net:
COMPOSE

echo "2/4 Avvio container Umami..."
cd /opt/services/umami && docker compose up -d

echo "3/4 Aggiungo Umami al Caddyfile..."
# Aggiungi blocco per analytics.bbq-experience.com
if ! grep -q "analytics.bbq-experience.com" /opt/services/caddy/Caddyfile; then
  cat >> /opt/services/caddy/Caddyfile << 'CADDY'

analytics.bbq-experience.com {
    reverse_proxy umami:3000
}
CADDY
  echo "Caddyfile aggiornato"
else
  echo "Caddyfile gia configurato per analytics"
fi

echo "4/4 Reload Caddy..."
docker exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo "Caddy reload manuale necessario"

echo ""
echo "Umami installato! Accedi a https://analytics.bbq-experience.com"
echo "Credenziali default: admin / umami"
echo "CAMBIA LA PASSWORD AL PRIMO ACCESSO"
```

- [ ] **Step 2: Deploy Umami**

```bash
scp -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" scripts/setup-umami.sh root@204.168.153.43:/tmp/
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'bash /tmp/setup-umami.sh'
```

- [ ] **Step 3: Configure DNS for analytics.bbq-experience.com**

Manual step: Add A record `analytics.bbq-experience.com` -> `204.168.153.43` in Cloudflare DNS.

- [ ] **Step 4: Commit setup script**

```bash
git add scripts/setup-umami.sh
git commit -m "feat: add Umami analytics setup script for Hetzner

Self-hosted analytics with dedicated PostgreSQL, Caddy reverse proxy on analytics.bbq-experience.com."
```

### Task 14: Integrate Umami tracking in frontend

**Files:**
- Modify: `web/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add Umami script to BaseLayout.astro head**

Add after the `<link rel="manifest">` line (line 56) in BaseLayout.astro:

```html
{/* Umami Analytics — privacy-friendly, no cookies */}
<script defer src="https://analytics.bbq-experience.com/script.js" data-website-id="REPLACE_WITH_WEBSITE_ID"></script>
```

Note: Replace `REPLACE_WITH_WEBSITE_ID` with the actual website ID from the Umami admin panel after setup.

- [ ] **Step 2: Add Umami event tracking to key interactions**

Add to the `NewsletterSignup.astro` form submit handler (after `success.style.display = 'block'`):

```javascript
// Track newsletter signup in Umami
if (typeof umami !== 'undefined') umami.track('newsletter-signup');
```

Add to `InstagramFeed.astro` follow link:

```html
<a ... data-umami-event="instagram-follow-click">
```

- [ ] **Step 3: Commit**

```bash
git add web/src/layouts/BaseLayout.astro web/src/components/common/NewsletterSignup.astro web/src/components/social/InstagramFeed.astro
git commit -m "feat: integrate Umami analytics tracking

Script in BaseLayout, custom events for newsletter signup and Instagram follow clicks."
```

---

## Phase 15: Newsletter con Brevo

### Task 15: Create Subscriber content type in Strapi

**Files:**
- Create: `cms/src/api/subscriber/content-types/subscriber/schema.json`
- Create: `cms/src/api/subscriber/controllers/subscriber.ts`
- Create: `cms/src/api/subscriber/routes/subscriber.ts`
- Create: `cms/src/api/subscriber/services/subscriber.ts`

- [ ] **Step 1: Create schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "subscribers",
  "info": {
    "singularName": "subscriber",
    "pluralName": "subscribers",
    "displayName": "Subscriber",
    "description": "Iscritti alla newsletter"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "email": {
      "type": "email",
      "required": true,
      "unique": true
    },
    "locale_preference": {
      "type": "enumeration",
      "enum": ["en", "it", "es"],
      "default": "en"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "active", "unsubscribed"],
      "default": "pending"
    },
    "brevo_contact_id": {
      "type": "string"
    },
    "subscribed_at": {
      "type": "datetime"
    },
    "unsubscribed_at": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 2: Create controller, routes, service (Strapi core factories)**

Create `cms/src/api/subscriber/controllers/subscriber.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::subscriber.subscriber');
```

Create `cms/src/api/subscriber/routes/subscriber.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::subscriber.subscriber');
```

Create `cms/src/api/subscriber/services/subscriber.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::subscriber.subscriber');
```

- [ ] **Step 3: Commit**

```bash
git add cms/src/api/subscriber/
git commit -m "feat: add Subscriber content type to Strapi

Fields: email (unique), locale_preference, status (pending/active/unsubscribed), brevo_contact_id, timestamps."
```

### Task 16: Rewrite newsletter endpoint with Brevo integration

**Files:**
- Modify: `web/src/pages/api/newsletter.ts`
- Create: `web/src/pages/api/brevo-webhook.ts`
- Modify: `web/.env.example`

- [ ] **Step 1: Rewrite newsletter.ts**

```typescript
// API endpoint newsletter — crea subscriber in Strapi + aggiunge contatto in Brevo
import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';
import { captureError } from '@lib/sentry';

export const prerender = false;

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';
const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || '';
const BREVO_LIST_ID = import.meta.env.BREVO_LIST_ID ? Number(import.meta.env.BREVO_LIST_ID) : 0;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'newsletter', 5)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const locale = body.locale || 'en';

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email non valida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Crea subscriber in Strapi
    const strapiRes = await fetch(`${STRAPI_URL}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          email,
          locale_preference: locale,
          status: 'pending',
          subscribed_at: new Date().toISOString(),
        },
      }),
    });

    // Se email gia presente, Strapi ritorna 400 per unique constraint
    if (!strapiRes.ok && strapiRes.status !== 400) {
      console.error('Errore Strapi subscriber:', strapiRes.status);
    }

    // 2. Aggiungi contatto in Brevo (se configurato)
    if (BREVO_API_KEY && BREVO_LIST_ID) {
      try {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          body: JSON.stringify({
            email,
            listIds: [BREVO_LIST_ID],
            attributes: { LOCALE: locale },
            updateEnabled: true,
          }),
        });
      } catch (brevoErr) {
        captureError(brevoErr, { context: 'brevo-create-contact', email: '***' });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    captureError(err, { context: 'newsletter-signup' });
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Create Brevo webhook endpoint**

Create `web/src/pages/api/brevo-webhook.ts`:

```typescript
// Webhook Brevo — riceve eventi di conferma/unsubscribe e aggiorna Strapi
import type { APIRoute } from 'astro';
import { captureError } from '@lib/sentry';
import { createHmac } from 'node:crypto';

export const prerender = false;

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';
const BREVO_WEBHOOK_SECRET = import.meta.env.BREVO_WEBHOOK_SECRET || '';

/** Valida la firma HMAC del webhook Brevo */
function validateSignature(body: string, signature: string | null): boolean {
  if (!BREVO_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac('sha256', BREVO_WEBHOOK_SECRET).update(body).digest('hex');
  return expected === signature;
}

/** Cerca subscriber in Strapi per email e aggiorna lo status */
async function updateSubscriberStatus(email: string, status: 'active' | 'unsubscribed'): Promise<void> {
  // Cerca subscriber per email
  const searchRes = await fetch(
    `${STRAPI_URL}/api/subscribers?filters[email][$eq]=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } },
  );
  const searchData = await searchRes.json();
  const subscriber = searchData?.data?.[0];
  if (!subscriber) return;

  // Aggiorna status
  const updateData: Record<string, unknown> = { status };
  if (status === 'unsubscribed') {
    updateData.unsubscribed_at = new Date().toISOString();
  }

  await fetch(`${STRAPI_URL}/api/subscribers/${subscriber.documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: updateData }),
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-sib-signature');

    // Valida firma se il secret e configurato
    if (BREVO_WEBHOOK_SECRET && !validateSignature(rawBody, signature)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const email = event.email?.toLowerCase();
    if (!email) {
      return new Response('OK', { status: 200 });
    }

    switch (event.event) {
      case 'contact_updated':
      case 'hardBounce':
        // Brevo conferma double opt-in tramite contact update
        if (event.event === 'contact_updated') {
          await updateSubscriberStatus(email, 'active');
        }
        break;
      case 'unsubscribed':
        await updateSubscriberStatus(email, 'unsubscribed');
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    captureError(err, { context: 'brevo-webhook' });
    return new Response('Internal Error', { status: 500 });
  }
};
```

- [ ] **Step 3: Update env examples**

Add to `web/.env.example`:
```
BREVO_API_KEY=
BREVO_LIST_ID=
BREVO_WEBHOOK_SECRET=
```

Add to `.env.example`:
```
BREVO_API_KEY=
BREVO_LIST_ID=
BREVO_WEBHOOK_SECRET=
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/api/newsletter.ts web/src/pages/api/brevo-webhook.ts web/.env.example .env.example
git commit -m "feat: integrate Brevo for newsletter with double opt-in

Newsletter endpoint creates Strapi subscriber + Brevo contact.
Brevo webhook updates subscriber status on confirm/unsubscribe."
```

---

## Phase 16: Instagram Graph API Smart Sync

### Task 17: Extend Instagram content type schema

**Files:**
- Modify: `cms/src/api/instagram-post/content-types/instagram-post/schema.json`

- [ ] **Step 1: Add new fields to schema**

Add these attributes to the existing schema's `attributes` object:

```json
"engagement_score": {
  "type": "decimal",
  "default": 0
},
"like_count": {
  "type": "integer",
  "default": 0
},
"comments_count": {
  "type": "integer",
  "default": 0
},
"related_review": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::review.review"
},
"related_recipe": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::recipe.recipe"
}
```

- [ ] **Step 2: Commit**

```bash
git add cms/src/api/instagram-post/content-types/instagram-post/schema.json
git commit -m "feat: extend Instagram schema with engagement score and content relations

Adds engagement_score, like/comments count, and relations to review/recipe for cross-linking."
```

### Task 18: Create Instagram sync script

**Files:**
- Create: `scripts/sync-instagram.mjs`
- Create: `scripts/refresh-instagram-token.mjs`

- [ ] **Step 1: Write sync script**

Create `scripts/sync-instagram.mjs`:

```javascript
#!/usr/bin/env node
// sync-instagram.mjs — Sincronizza post Instagram in Strapi via Graph API
// Uso: node sync-instagram.mjs
// Cron: 0 */6 * * *
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID || '';
const TOKEN_FILE = process.env.TOKEN_FILE || '/opt/services/bbqexperience/.instagram-token';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/opt/services/bbqexperience/app/cms/public/uploads/instagram';

function getAccessToken() {
  // Prima prova il file token, poi la variabile d'ambiente
  try {
    return readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch {
    return process.env.INSTAGRAM_ACCESS_TOKEN || '';
  }
}

function strapiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
}

async function fetchInstagramPosts(accessToken) {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
  const url = `https://graph.instagram.com/${INSTAGRAM_USER_ID}/media?fields=${fields}&limit=25&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

function calculateEngagementScore(posts) {
  // Calcola score normalizzato: (likes + comments*2) / max
  const scores = posts.map(p => (p.like_count || 0) + (p.comments_count || 0) * 2);
  const maxScore = Math.max(...scores, 1);
  return posts.map((p, i) => ({ ...p, engagement_score: Math.round((scores[i] / maxScore) * 100) / 100 }));
}

async function findExistingPost(instagramId) {
  const url = `${STRAPI_URL}/api/instagram-posts?filters[instagram_id][$eq]=${instagramId}`;
  const res = await fetch(url, { headers: strapiHeaders() });
  const data = await res.json();
  return data?.data?.[0] || null;
}

async function findRelatedContent(caption) {
  if (!caption) return { related_review: null, related_recipe: null };

  const result = { related_review: null, related_recipe: null };

  // Cerca review per nome prodotto nel caption
  try {
    const reviewsRes = await fetch(`${STRAPI_URL}/api/reviews?populate=product&locale=en`, {
      headers: strapiHeaders(),
    });
    const reviews = await reviewsRes.json();
    for (const review of reviews?.data || []) {
      const productName = review.product?.name || review.title || '';
      if (productName && caption.toLowerCase().includes(productName.toLowerCase())) {
        result.related_review = review.documentId;
        break;
      }
    }
  } catch { /* ignora */ }

  // Cerca ricette per titolo nel caption
  try {
    const recipesRes = await fetch(`${STRAPI_URL}/api/recipes?locale=en`, {
      headers: strapiHeaders(),
    });
    const recipes = await recipesRes.json();
    for (const recipe of recipes?.data || []) {
      if (recipe.title && caption.toLowerCase().includes(recipe.title.toLowerCase())) {
        result.related_recipe = recipe.documentId;
        break;
      }
    }
  } catch { /* ignora */ }

  return result;
}

async function upsertPost(post, isCurated, relations) {
  const existing = await findExistingPost(post.id);
  const payload = {
    data: {
      instagram_id: post.id,
      media_type: post.media_type,
      media_url: post.media_url || '',
      thumbnail_url: post.thumbnail_url || '',
      permalink: post.permalink || '',
      caption: post.caption || '',
      timestamp: post.timestamp,
      like_count: post.like_count || 0,
      comments_count: post.comments_count || 0,
      engagement_score: post.engagement_score || 0,
      curated: isCurated,
      ...(relations.related_review && { related_review: relations.related_review }),
      ...(relations.related_recipe && { related_recipe: relations.related_recipe }),
    },
  };

  if (existing) {
    await fetch(`${STRAPI_URL}/api/instagram-posts/${existing.documentId}`, {
      method: 'PUT',
      headers: strapiHeaders(),
      body: JSON.stringify(payload),
    });
    console.log(`  Aggiornato: ${post.id}`);
  } else {
    await fetch(`${STRAPI_URL}/api/instagram-posts`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: JSON.stringify(payload),
    });
    console.log(`  Creato: ${post.id}`);
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] Sync Instagram iniziato`);

  const token = getAccessToken();
  if (!token || !INSTAGRAM_USER_ID) {
    console.error('ERRORE: INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID richiesti');
    process.exit(1);
  }

  const rawPosts = await fetchInstagramPosts(token);
  console.log(`  ${rawPosts.length} post recuperati da Instagram`);

  const posts = calculateEngagementScore(rawPosts);
  const avgScore = posts.reduce((s, p) => s + p.engagement_score, 0) / posts.length;

  for (const post of posts) {
    const isCurated = post.engagement_score > avgScore;
    const relations = await findRelatedContent(post.caption);
    await upsertPost(post, isCurated, relations);
  }

  console.log(`[${new Date().toISOString()}] Sync completato: ${posts.length} post processati`);
}

main().catch((err) => {
  console.error('ERRORE sync Instagram:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Write token refresh script**

Create `scripts/refresh-instagram-token.mjs`:

```javascript
#!/usr/bin/env node
// refresh-instagram-token.mjs — Rinnova il long-lived token Instagram
// Cron: 0 4 * * 1 (ogni lunedi alle 04:00)
import { readFileSync, writeFileSync } from 'fs';

const TOKEN_FILE = process.env.TOKEN_FILE || '/opt/services/bbqexperience/.instagram-token';

async function main() {
  console.log(`[${new Date().toISOString()}] Refresh token Instagram iniziato`);

  let currentToken;
  try {
    currentToken = readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch {
    currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  if (!currentToken) {
    console.error('ERRORE: Nessun token trovato');
    process.exit(1);
  }

  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`ERRORE: Refresh fallito: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  writeFileSync(TOKEN_FILE, data.access_token);
  console.log(`  Token rinnovato, scade tra ${data.expires_in} secondi (~${Math.round(data.expires_in / 86400)} giorni)`);
}

main().catch((err) => {
  console.error('ERRORE refresh token:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Add env vars to examples**

Add to `.env.example`:
```
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

- [ ] **Step 4: Deploy scripts and configure cron**

```bash
scp -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" scripts/sync-instagram.mjs scripts/refresh-instagram-token.mjs root@204.168.153.43:/opt/webhooks/scripts/

ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 '
  (crontab -l 2>/dev/null; echo "0 */6 * * * cd /opt/services/bbqexperience && node /opt/webhooks/scripts/sync-instagram.mjs >> /opt/webhooks/logs/instagram-sync.log 2>&1") | crontab -
  (crontab -l 2>/dev/null; echo "0 4 * * 1 node /opt/webhooks/scripts/refresh-instagram-token.mjs >> /opt/webhooks/logs/instagram-token.log 2>&1") | crontab -
  echo "Cron configurati:"
  crontab -l | grep instagram
'
```

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-instagram.mjs scripts/refresh-instagram-token.mjs .env.example
git commit -m "feat: add Instagram Graph API sync with smart curation

Syncs 25 latest posts every 6h. Auto-curates by engagement score.
Cross-links to reviews/recipes by caption keyword matching.
Weekly token refresh via cron."
```

### Task 19: Update InstagramFeed for smart display

**Files:**
- Modify: `web/src/components/social/InstagramFeed.astro`

- [ ] **Step 1: Update feed to show smart mix**

Replace the fetch logic in `InstagramFeed.astro`:

```astro
---
import type { Locale } from '@lib/i18n';
import { getTranslation } from '@lib/i18n';
import { fetchCollection } from '@lib/strapi';
import type { StrapiInstagramPost } from '@lib/types';
import InstagramCard from './InstagramCard.astro';

interface Props {
  locale: Locale;
  translations: Record<string, any>;
  maxPosts?: number;
}

const { locale, translations, maxPosts = 5 } = Astro.props;

// Feed intelligente: 2 curated (alto engagement) + 2 recenti + 1 reel
let posts: (StrapiInstagramPost & import('@lib/types').StrapiEntity)[] = [];

try {
  // Curated posts (alto engagement)
  const curatedRes = await fetchCollection<StrapiInstagramPost>('instagram-posts', {
    filters: { curated: { $eq: true } },
    populate: 'cached_image',
    sort: 'engagement_score:desc',
    pageSize: 2,
    locale: 'en',
  });

  // Post recenti (non gia inclusi nei curated)
  const recentRes = await fetchCollection<StrapiInstagramPost>('instagram-posts', {
    populate: 'cached_image',
    sort: 'timestamp:desc',
    pageSize: 6,
    locale: 'en',
  });

  const curatedIds = new Set(curatedRes.data.map(p => p.instagram_id));
  const recentNotCurated = recentRes.data.filter(p => !curatedIds.has(p.instagram_id));

  // 1 reel se disponibile
  const reel = recentNotCurated.find(p => p.media_type === 'VIDEO');
  const nonReelRecent = recentNotCurated.filter(p => p !== reel);

  // Componi mix: curated + recenti + reel
  posts = [
    ...curatedRes.data.slice(0, 2),
    ...nonReelRecent.slice(0, 2),
    ...(reel ? [reel] : nonReelRecent.slice(2, 3)),
  ].slice(0, maxPosts);
} catch {
  posts = [];
}

const hasPosts = posts.length > 0;
---
```

Keep the rest of the template (HTML + CSS) unchanged.

- [ ] **Step 2: Commit**

```bash
git add web/src/components/social/InstagramFeed.astro
git commit -m "feat: smart Instagram feed with curated + recent + reel mix

Shows 2 high-engagement curated posts + 2 recent + 1 reel (if available)."
```

---

## Phase 17: Content Pipeline

### Task 20: Create Editorial Calendar content type

**Files:**
- Create: `cms/src/api/editorial-calendar/content-types/editorial-calendar/schema.json`
- Create: `cms/src/api/editorial-calendar/controllers/editorial-calendar.ts`
- Create: `cms/src/api/editorial-calendar/routes/editorial-calendar.ts`
- Create: `cms/src/api/editorial-calendar/services/editorial-calendar.ts`

- [ ] **Step 1: Create schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "editorial_calendars",
  "info": {
    "singularName": "editorial-calendar",
    "pluralName": "editorial-calendars",
    "displayName": "Editorial Calendar",
    "description": "Pianificazione e tracciamento contenuti editoriali"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "content_type": {
      "type": "enumeration",
      "enum": ["review", "recipe", "tutorial", "blog"],
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["idea", "research", "draft", "review", "published"],
      "default": "idea"
    },
    "target_date": {
      "type": "date"
    },
    "target_keyword": {
      "type": "string"
    },
    "secondary_keywords": {
      "type": "text"
    },
    "target_locale": {
      "type": "enumeration",
      "enum": ["en", "it", "es"],
      "default": "en"
    },
    "priority": {
      "type": "enumeration",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "notes": {
      "type": "richtext"
    }
  }
}
```

- [ ] **Step 2: Create controller, routes, service**

Create `cms/src/api/editorial-calendar/controllers/editorial-calendar.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::editorial-calendar.editorial-calendar');
```

Create `cms/src/api/editorial-calendar/routes/editorial-calendar.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::editorial-calendar.editorial-calendar');
```

Create `cms/src/api/editorial-calendar/services/editorial-calendar.ts`:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::editorial-calendar.editorial-calendar');
```

- [ ] **Step 3: Commit**

```bash
git add cms/src/api/editorial-calendar/
git commit -m "feat: add Editorial Calendar content type for content planning

Fields: title, content_type, status (idea→published), target_date, keyword, priority, notes."
```

### Task 21: Write content strategy document

**Files:**
- Create: `docs/content-strategy.md`

- [ ] **Step 1: Write the strategy document**

Create `docs/content-strategy.md` with: frequency plan (2-3/week), keyword research template (Google Search Console + Trends + Ahrefs free), content gap categories (grill, smoker, accessories, techniques, meats), "The Pitmaster" voice guidelines (honest, conservative scores 6-7.5 base, no marketing speak, direct language), and a 3-month calendar template with 36 target pieces.

This is a text document — content will be populated during execution based on actual competitor analysis and keyword research.

- [ ] **Step 2: Commit**

```bash
git add docs/content-strategy.md
git commit -m "docs: add content strategy with editorial calendar framework

Frequency plan, keyword research template, voice guidelines, 3-month content targets."
```

---

## Phase 18: Frontend Polish & Cleanup

### Task 22: Add Pagefind as search fallback

**Files:**
- Modify: `web/package.json` (add build script)
- Modify: `web/src/components/content/SearchDialog.svelte`

- [ ] **Step 1: Add pagefind build step to package.json**

Update the `build` script in `web/package.json`:

```json
"build": "astro build && npx pagefind --site dist/client --output-subdir ../pagefind"
```

Note: For SSR mode with `@astrojs/node`, the static assets are in `dist/client/`.

- [ ] **Step 2: Add Pagefind fallback to SearchDialog.svelte**

Add a fallback function inside the Svelte component. After the existing `performSearch` function, add:

```typescript
// Fallback Pagefind se l'API Strapi fallisce
let pagefindLoaded = false;
let pagefindInstance: any = null;

async function loadPagefind() {
  if (pagefindLoaded) return pagefindInstance;
  try {
    pagefindInstance = await import('/pagefind/pagefind.js');
    await pagefindInstance.init();
    pagefindLoaded = true;
    return pagefindInstance;
  } catch {
    return null;
  }
}

async function searchWithFallback(query: string, locale: string, filter: string) {
  try {
    // Prova API search
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}&filter=${filter}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch {
    // Fallback a Pagefind
    const pf = await loadPagefind();
    if (!pf) return [];
    const search = await pf.search(query);
    const results = await Promise.all(
      search.results.slice(0, 15).map(async (r: any) => {
        const data = await r.data();
        return { url: data.url, title: data.meta?.title || '', excerpt: data.excerpt || '', contentType: 'all' };
      })
    );
    return results;
  }
}
```

Then update the existing search call to use `searchWithFallback` instead of the direct fetch.

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/src/components/content/SearchDialog.svelte
git commit -m "feat: add Pagefind as search fallback when Strapi is unavailable

Builds Pagefind index at build time. SearchDialog falls back to local index if API fails."
```

### Task 23: Add ErrorFallback component

**Files:**
- Create: `web/src/components/common/ErrorFallback.astro`

- [ ] **Step 1: Create component**

```astro
---
/**
 * ErrorFallback — mostra messaggio user-friendly quando una sezione non riesce a caricare
 */
import { getTranslation } from '@lib/i18n';

interface Props {
  translations: Record<string, any>;
  section?: string;
}

const { translations, section = '' } = Astro.props;
---

<div class="error-fallback" role="alert">
  <p class="error-fallback__text">
    {getTranslation(translations, 'common.contentUnavailable') || 'Content temporarily unavailable'}
  </p>
  {section && (
    <p class="error-fallback__detail">{section}</p>
  )}
</div>

<style>
  .error-fallback {
    padding: var(--space-8) var(--space-4);
    text-align: center;
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
  }

  .error-fallback__text {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin: 0;
  }

  .error-fallback__detail {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    margin: var(--space-2) 0 0;
    opacity: 0.6;
  }
</style>
```

- [ ] **Step 2: Add translation key**

Add to `web/src/i18n/en.json`, `it.json`, `es.json`:

```json
// en.json - add to "common" object:
"contentUnavailable": "Content temporarily unavailable. Please try again later."

// it.json:
"contentUnavailable": "Contenuto temporaneamente non disponibile. Riprova piu tardi."

// es.json:
"contentUnavailable": "Contenido temporalmente no disponible. Intenta de nuevo mas tarde."
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/common/ErrorFallback.astro web/src/i18n/en.json web/src/i18n/it.json web/src/i18n/es.json
git commit -m "feat: add ErrorFallback component for graceful Strapi failure

Shows user-friendly message when a page section fails to load from CMS."
```

### Task 24: Type-safe translation keys

**Files:**
- Create: `web/src/i18n/types.ts`
- Modify: `web/src/lib/i18n.ts`

- [ ] **Step 1: Generate type from en.json keys**

Create `web/src/i18n/types.ts`:

```typescript
// Tipo generato dalle chiavi di en.json — cattura typo a compile time
import en from './en.json';

type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? FlattenKeys<T[K], `${Prefix}${K & string}.`>
    : `${Prefix}${K & string}`;
}[keyof T];

export type TranslationKey = FlattenKeys<typeof en>;
```

- [ ] **Step 2: Update getTranslation to accept typed keys**

In `web/src/lib/i18n.ts`, update the function signature:

```typescript
import type { TranslationKey } from '@i18n/types';

export function getTranslation(translations: Record<string, any>, key: TranslationKey): string {
  const keys = key.split('.');
  let value: any = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return typeof value === 'string' ? value : key;
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors. If any component uses invalid keys, fix them.

- [ ] **Step 4: Commit**

```bash
git add web/src/i18n/types.ts web/src/lib/i18n.ts
git commit -m "feat: add type-safe translation keys

TranslationKey type auto-generated from en.json structure. Typos in translation keys now cause TypeScript errors."
```

---

## Phase 19: Documentation & Runbook

### Task 25: Write runbook

**Files:**
- Create: `docs/runbook.md`

- [ ] **Step 1: Write operational runbook**

Create `docs/runbook.md` with sections:
- **Deploy manuale**: SSH command to trigger rebuild without git push
- **Ripristino backup**: Step-by-step using `restore-db.sh`
- **Token Instagram**: How to generate a new token via Facebook Developer portal
- **Container Docker**: Commands to check status, restart, read logs
- **Troubleshooting**: Common issues (site down, build failed, webhook not received, broken images)
- **Service dashboards**: Links to Hetzner, Cloudflare, Brevo, Sentry, UptimeRobot

- [ ] **Step 2: Commit**

```bash
git add docs/runbook.md
git commit -m "docs: add operational runbook for production management

Covers deploy, backup restore, token refresh, Docker management, and troubleshooting."
```

### Task 26: Write architecture document

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Write architecture doc**

Create `docs/architecture.md` with ASCII diagrams for:
- Request flow: User -> Cloudflare -> Caddy -> Astro SSR -> Strapi -> PostgreSQL
- Deploy flow: git push -> GitHub webhook -> Hetzner -> rebuild-web.sh -> Docker build -> smoke test
- Content sync: Cron -> sync-instagram.mjs -> Graph API -> Strapi
- Docker service map with ports

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add architecture overview with flow diagrams

Request flow, deploy pipeline, content sync, and Docker service map."
```

### Task 27: Add JSDoc to API endpoints

**Files:**
- Modify: `web/src/pages/api/search.ts`
- Modify: `web/src/pages/api/newsletter.ts`
- Modify: `web/src/pages/api/brevo-webhook.ts`
- Modify: `web/src/pages/api/preview.ts` (if exists)

- [ ] **Step 1: Add JSDoc comments to each endpoint**

Add a block comment at the top of each file documenting: HTTP method, path, parameters, rate limits, response format, and behavior.

Example for search.ts:
```typescript
/**
 * GET /api/search — Proxy ricerca multi-content verso Strapi
 *
 * @param q - Query di ricerca (required)
 * @param locale - Lingua (en|it|es, default: en)
 * @param filter - Filtro tipo contenuto (all|reviews|recipes|tutorials|blog, default: all)
 *
 * Rate limit: 30 req/min per IP
 * Cache: public, max-age=60
 *
 * @returns {{ results: Array<{ url, title, excerpt, contentType }> }} Max 15 risultati
 */
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/api/
git commit -m "docs: add JSDoc to all API endpoints

Documents parameters, rate limits, response format, and behavior for each endpoint."
```

---

## Execution Summary

| Phase | Tasks | Commits | Key deliverables |
|-------|-------|---------|-----------------|
| 10 | 1 | 1 | backup-db.sh, restore-db.sh, cron |
| 11 | 2 | 2 | Sentry SDK, smoke test in deploy |
| 12 | 4 | 4 | CORS, CSP, SQLite rate limiter, lenis removal |
| 13 | 5 | 5 | Vitest config, i18n/media/rate-limit tests, Playwright E2E |
| 14 | 2 | 2 | Umami Docker, tracking script |
| 15 | 2 | 2 | Subscriber type, Brevo integration |
| 16 | 3 | 3 | IG schema, sync script, smart feed |
| 17 | 2 | 2 | Editorial Calendar type, strategy doc |
| 18 | 3 | 3 | Pagefind fallback, ErrorFallback, typed i18n |
| 19 | 3 | 3 | Runbook, architecture, JSDoc |
| **Total** | **27** | **27** | |
