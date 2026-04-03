# BBQ Experience v2.0 — Upgrade to 10/10 Tech & Business

**Data:** 2026-04-03
**Autore:** Matteo + Claude
**Stato:** Draft — in attesa di approvazione

## Obiettivo

Portare BBQ Experience da 8/10 tech e 4/10 business a 10/10 su entrambi i fronti, in un'unica milestone v2.0 con approccio infrastructure-first.

## Vincoli

- Autore singolo (Matteo)
- Server Hetzner esistente (CX21: 2vCPU, 4GB RAM)
- Nessuna monetizzazione in questa milestone
- Budget infrastruttura: minimale (solo servizi gratuiti o self-hosted)
- Deploy via webhook esistente (no GitHub Actions)

## Ordine di esecuzione

```
Fase 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19
```

Le fasi 10-12 (hardening) devono completarsi prima di 13 (testing).
Le fasi 14-16 (business) sono indipendenti tra loro ma dipendono da 10-12.
La fase 17 (content pipeline) dipende da 15 (newsletter/Brevo per il content type Subscriber).
La fase 18 (polish) dipende da 15 (migrazione newsletter).
La fase 19 (docs) viene per ultima perche documenta lo stato finale.

## Fasi

---

### Fase 10: Backup & Disaster Recovery

**Goal:** Database PostgreSQL protetto da perdita dati con backup automatici giornalieri e procedura di ripristino testata.

**Deliverable:**
- Script `backup-db.sh` in `/opt/webhooks/scripts/` sul server Hetzner
- Script `restore-db.sh` nella stessa directory
- Cron job giornaliero alle 03:00
- Retention: ultimi 30 giorni, eliminazione automatica dei piu vecchi
- Backup salvati in `/opt/backups/bbqexperience/` con formato `bbqexperience_YYYY-MM-DD.sql.gz`

**Dettagli tecnici:**
- `pg_dump` dal container PostgreSQL via `docker exec`
- Compressione gzip
- Verifica integrita: il cron logga successo/fallimento in `/opt/webhooks/logs/backup.log`
- `restore-db.sh` accetta un file .sql.gz come argomento, stoppa Strapi, ripristina, riavvia

**Cosa NON fa:**
- Niente backup offsite (S3, Storage Box) — i backup restano sul VPS
- Niente backup incrementale — full dump ogni notte

**Success criteria:**
1. `backup-db.sh` produce un file .sql.gz valido
2. `restore-db.sh` ripristina il database da un backup e Strapi si avvia correttamente
3. Cron esegue ogni notte e logga il risultato

---

### Fase 11: Monitoring & Error Tracking

**Goal:** Visibilita completa su stato del sito, errori runtime, e metriche di uptime.

**Deliverable:**

#### Sentry Free (error tracking)
- SDK `@sentry/node` installato nel progetto `web/`
- Inizializzato nel middleware Astro SSR
- Cattura: errori non gestiti, API failures verso Strapi, errori negli endpoint (`search.ts`, `newsletter.ts`, `reviews.ts`, `preview.ts`)
- Env var: `SENTRY_DSN` nel `.env` del web
- Source maps uploadate a Sentry in build

#### Smoke test post-deploy
- Aggiunto alla fine di `rebuild-web.sh`
- Verifica HTTP 200 su 9 URL: homepage + 1 review + 1 recipe per ciascuna delle 3 lingue
- Se una qualsiasi fallisce: logga errore in `/opt/webhooks/logs/bbqexperience.log`, NON esegue rollback automatico (troppo rischioso), ma logga chiaramente il problema
- Timeout per singola richiesta: 10 secondi

#### UptimeRobot (configurazione manuale)
- Monitor HTTP su `https://bbq-experience.com` (5 min interval)
- Monitor HTTP su `https://cms.bbq-experience.com/_health` (5 min interval)
- Alert via email a admin@bbq-experience.com
- Non e codice — e configurazione da dashboard UptimeRobot

**Cosa NON fa:**
- Niente APM (performance monitoring dettagliato)
- Niente log aggregation (Loki, ELK)
- Niente alerting Slack/Telegram

**Success criteria:**
1. Un errore nel codice SSR appare nella dashboard Sentry entro 1 minuto
2. Smoke test verifica 9 URL dopo ogni deploy e logga il risultato
3. UptimeRobot invia email se il sito va giu per >5 minuti

---

### Fase 12: Security Hardening

**Goal:** Chiudere le vulnerabilita di configurazione e pulire il bundle.

**Deliverable:**

#### CORS esplicito in Strapi
- `cms/config/middlewares.ts` — configurazione `strapi::cors` con `origin` whitelist:
  - `https://bbq-experience.com`
  - `https://cms.bbq-experience.com`
  - `http://localhost:4321` (dev)
  - `http://localhost:1337` (dev)
- `methods`: GET, POST, PUT, DELETE
- `headers`: Content-Type, Authorization, X-Rebuild-Secret

#### CSP headers nel frontend
- Middleware Astro (`src/middleware.ts`) aggiunge Content-Security-Policy header
- Policy: default-src 'self'; script-src 'self' 'unsafe-inline' (necessario per Umami e Sentry); img-src 'self' cms.bbq-experience.com data:; style-src 'self' 'unsafe-inline'; connect-src 'self' cms.bbq-experience.com *.sentry.io; frame-src youtube-nocookie.com instagram.com
- Report-only mode iniziale per verificare che nulla si rompa

#### Rate limiter persistente
- Migra da Map in-memory a file SQLite in `/tmp/rate-limits.db`
- Stessa logica (IP + window), ma sopravvive ai restart del processo Node
- Usa `better-sqlite3` gia presente come dipendenza (usato da Strapi dev)
- Pulizia automatica: entries piu vecchie di 1 ora eliminate ad ogni check

#### Pulizia dipendenze
- Verifica che non ci siano dipendenze orfane oltre `lenis` (rimosso in Fase 18)

**Cosa NON fa:**
- Niente WAF
- Niente rate limiting distribuito (Redis)
- Niente HSTS preload (Caddy gestisce gia HTTPS)

**Success criteria:**
1. Richieste da origin non in whitelist ricevono CORS error
2. CSP header presente su tutte le risposte (report-only)
3. Rate limiter sopravvive a restart del processo
4. `lenis` non e piu nel bundle

---

### Fase 13: Test Suite

**Goal:** Rete di sicurezza automatica per prevenire regressioni su funzionalita critiche.

**Deliverable:**

#### Vitest (unit tests, ~15-20 test)
- Configurazione in `web/vitest.config.ts`
- Test per `src/lib/strapi.ts`:
  - `fetchAPI()` gestisce errori di rete
  - `fetchCollection()` serializza filtri e paginazione correttamente
  - `fetchBySlug()` costruisce query corretta
- Test per `src/lib/i18n.ts`:
  - `getLocaleFromPath()` estrae locale da URL
  - `getLocalizedPath()` traduce route tra lingue
  - `loadTranslations()` carica JSON corretti
  - `getTranslation()` risolve dot-notation
- Test per `src/lib/media.ts`:
  - `getStrapiMediaURL()` risolve URL relativi e assoluti
  - `getStrapiImageFormats()` ritorna formati disponibili

#### Playwright (E2E, ~10-15 test)
- Configurazione in `web/playwright.config.ts`
- Test:
  - Homepage carica per /en/, /it/, /es/
  - Language switcher naviga tra lingue mantenendo la pagina
  - Review detail: score card, specs table, pros/cons visibili
  - Recipe detail: serving adjuster cambia quantita ingredienti
  - Recipe detail: unit toggle cambia sistema di misura
  - Search dialog: apre, cerca, mostra risultati filtrati
  - Dark/light toggle: cambia tema e persiste dopo reload
  - 404 page: mostra contenuto e search
  - Navigation: header links funzionano, breadcrumbs corretti

#### Script npm
- `npm run test` — Vitest
- `npm run test:e2e` — Playwright
- `npm run test:all` — entrambi in sequenza

**Cosa NON fa:**
- Niente visual regression
- Niente component testing isolato
- Niente CI/CD pipeline (test eseguiti manualmente prima del push)

**Success criteria:**
1. `npm run test` passa tutti i test unitari
2. `npm run test:e2e` passa tutti i test E2E contro dev server locale
3. Un cambiamento che rompe i18n routing viene catturato dai test

---

### Fase 14: Umami Analytics

**Goal:** Visibilita completa sul traffico e comportamento utenti, self-hosted e GDPR-compliant.

**Deliverable:**

#### Container Docker
- Immagine: `ghcr.io/umami-software/umami:postgresql-latest`
- Database: PostgreSQL dedicato (container separato `umami-db`, porta 5434) — isolato dal DB Strapi per evitare interferenze
- Accessibile su `https://analytics.bbq-experience.com` via Caddy
- Credenziali admin configurate al primo avvio

#### Integrazione frontend
- Script tracking in `BaseLayout.astro`:
  ```html
  <script defer src="https://analytics.bbq-experience.com/script.js" data-website-id="..." />
  ```
- Nessun cookie, nessun banner GDPR necessario
- Script async/defer, non blocca rendering
- ~2KB di payload aggiuntivo

#### Tracking eventi custom
- Click su "Follow su Instagram" CTA → evento `instagram-follow-click`
- Click su post Instagram nel feed → evento `instagram-post-click`
- Newsletter signup → evento `newsletter-signup`
- Search query → evento `search` con query param
- Dark/light mode toggle → evento `theme-toggle`

#### Configurazione Caddy
- Nuovo site block in Caddyfile per `analytics.bbq-experience.com`
- Reverse proxy a container Umami (porta interna 3000)

**Cosa NON fa:**
- Niente funnel analysis
- Niente heatmap/session recording
- Niente A/B testing

**Success criteria:**
1. Dashboard Umami mostra pageviews in tempo reale
2. Eventi custom tracciano le 5 azioni definite
3. Script non impatta Lighthouse score (async, <3KB)

---

### Fase 15: Newsletter con Brevo

**Goal:** Sistema newsletter funzionante che raccoglie subscriber in modo affidabile e permette invio email.

**Deliverable:**

#### Content type Subscriber in Strapi
- Campi: email (unique), locale (en/it/es), status (pending/active/unsubscribed), brevo_contact_id, subscribed_at, unsubscribed_at
- Non localizzato (un subscriber e un'entita globale con preferenza lingua)

#### Endpoint newsletter riscritto
- `web/src/pages/api/newsletter.ts`:
  - POST: riceve email + locale
  - Valida formato email
  - Crea subscriber in Strapi (status: pending)
  - Chiama Brevo API `POST /contacts` per aggiungere alla lista
  - Brevo gestisce double opt-in (invia email di conferma)
  - Al confirm di Brevo, webhook aggiorna status in Strapi a `active`
- Rate limit: 5 req/min per IP (gia esistente)

#### Brevo webhook
- Endpoint `web/src/pages/api/brevo-webhook.ts`
- Riceve eventi da Brevo: contact_confirmed, unsubscribed
- Aggiorna status subscriber in Strapi di conseguenza
- Validazione HMAC del webhook

#### Env vars
- `BREVO_API_KEY` — API key v3
- `BREVO_LIST_ID` — ID lista contatti
- `BREVO_WEBHOOK_SECRET` — per validare webhook

**Cosa NON fa:**
- Niente template email custom (usa Brevo default per double opt-in)
- Niente automazioni email
- Niente campagne programmatiche (si fanno dalla dashboard Brevo)

**Success criteria:**
1. Utente compila form newsletter → riceve email di conferma da Brevo
2. Utente conferma → status diventa `active` in Strapi
3. Subscriber visibili sia in Strapi admin che in dashboard Brevo

---

### Fase 16: Instagram Graph API Smart Sync

**Goal:** Feed Instagram sempre aggiornato con curation automatica basata su engagement e cross-linking ai contenuti del sito.

**Deliverable:**

#### Schema updates in Strapi
- Content type `instagram-post` esteso con:
  - `engagement_score` (decimal) — calcolato come (likes + comments * 2) normalizzato
  - `related_review` (relazione a Review, opzionale)
  - `related_recipe` (relazione a Recipe, opzionale)
  - `media_local_path` (string) — path del file media cachato localmente

#### Script sync `/scripts/sync-instagram.mjs`
- Chiama `GET /{user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25`
- Per ogni post:
  - Scarica media in `/cms/public/uploads/instagram/`
  - Calcola `engagement_score`
  - Se `engagement_score` > media degli ultimi 25 post → `curated: true`
  - Cerca keyword nel caption contro nomi prodotto e nomi ricetta in Strapi → suggerisce `related_review` / `related_recipe` (imposta automaticamente se match confidence alta, altrimenti lascia null per review manuale)
  - Crea o aggiorna entry in Strapi via API

#### Token management
- Script `/scripts/refresh-instagram-token.mjs`
- Chiama `GET /refresh_access_token?grant_type=ig_refresh_token&access_token={token}`
- Cron job settimanale (ogni lunedi alle 04:00) — il token dura 60 giorni, refresharlo ogni settimana e sicuro
- Nuovo token salvato in file `.instagram-token` sul server (non in env var per evitare restart)
- Il sync script legge il token dal file

#### Cron jobs
- Sync: `0 */6 * * *` (ogni 6 ore)
- Token refresh: `0 4 * * 1` (ogni lunedi alle 04:00)

#### Frontend migliorato
- Feed homepage: mix intelligente — 2 curated (alto engagement) + 2 recenti + 1 reel
- Sidebar review/recipe: se il post IG ha `related_review`/`related_recipe`, mostra "Vedi su Instagram" con card dedicata
- Rotazione feed ad ogni build (shuffle dei post che matchano i criteri)

#### Env vars
- `INSTAGRAM_ACCESS_TOKEN` (iniziale, poi gestito via file)
- `INSTAGRAM_USER_ID`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

**Cosa NON fa:**
- Niente posting da sito a Instagram
- Niente stories sync (API limitata)
- Niente analytics Instagram (solo engagement score per curation)

**Success criteria:**
1. Cron sync importa post con media cachato localmente
2. Post con engagement sopra la media vengono marcati curated automaticamente
3. Post con keyword matching vengono collegati a review/recipe
4. Homepage mostra feed misto (curated + recenti + reel)
5. Token si refresha automaticamente senza intervento manuale

---

### Fase 17: Content Pipeline in Strapi

**Goal:** Sistema strutturato per pianificare, tracciare e produrre contenuti editoriali.

**Deliverable:**

#### Content type `Editorial Calendar` in Strapi
- Campi:
  - `title` (string, required) — titolo del contenuto pianificato
  - `content_type` (enum: review/recipe/tutorial/blog, required)
  - `status` (enum: idea/research/draft/review/published, default: idea)
  - `target_date` (date)
  - `target_keyword` (string) — keyword SEO principale
  - `secondary_keywords` (text) — keyword secondarie, una per riga
  - `locale` (enum: en/it/es)
  - `priority` (enum: low/medium/high, default: medium)
  - `notes` (richtext) — appunti, brief, fonti
  - `linked_content` (dynamic zone o relation polimorfica) — collega al contenuto Strapi quando viene creato
- Non localizzato (il calendar e una vista operativa, non contenuto pubblico)
- Draft & Publish: disabilitato (sempre visibile)

#### Documento strategico `docs/content-strategy.md`
- Frequenza consigliata: 2-3 contenuti/settimana
  - Lunedi: review o tutorial
  - Mercoledi: ricetta
  - Venerdi: blog post o tutorial
- Template keyword research:
  - Strumenti: Google Search Console (gratuito), Google Trends, Ahrefs Webmaster Tools (gratuito)
  - Processo: cerca "[prodotto] review", "[tecnica] BBQ", "[ricetta] recipe" → filtra per volume e difficulty
- Content gap analysis per categoria:
  - Grill: [da popolare — analisi su competitor]
  - Smoker: [da popolare]
  - Accessori: [da popolare]
  - Tecniche: [da popolare]
  - Carni: [da popolare]
- Linee guida voce "The Pitmaster":
  - Brutalmente onesto, mai diplomatico
  - Score conservativi (6-7.5 base, 8+ solo con giustificazione)
  - No marketing speak, no "best ever", no superlatives vuoti
  - Linguaggio diretto, frasi corte, opinioni forti
- Calendario tipo primi 3 mesi con 36 contenuti target

**Cosa NON fa:**
- Niente automazione editoriale (AI writing, auto-scheduling)
- Niente workflow multi-autore (e un sistema per Matteo solo)
- Niente analytics integrata nel calendar (per quello c'e Umami)

**Success criteria:**
1. Matteo puo creare entry nel calendar e tracciarle da idea a published
2. Vista lista filtrabile per status, mese, tipo, priorita
3. Documento strategico fornisce framework operativo per produzione contenuti

---

### Fase 18: Frontend Polish & Cleanup

**Goal:** Eliminare debito tecnico, migliorare resilienza, e tightening del codice.

**Deliverable:**

#### Rimozione Lenis
- Rimuovi `lenis` da `web/package.json`
- Rimuovi `scroll-behavior: smooth` da `global.css` (lascia browser default)
- Verifica che nessun import di Lenis esista nel codebase

#### Pagefind come fallback search
- Build step: `npx pagefind --site dist/` dopo Astro build
- `SearchDialog.svelte` modificato: se la chiamata API a `/api/search` fallisce (timeout, 500, Strapi giu), fallback alla search Pagefind locale
- Pagefind caricato lazy al primo fallback, non al page load

#### Error boundary UI
- Nuovo componente `ErrorFallback.astro`
- Mostra messaggio user-friendly ("Contenuto temporaneamente non disponibile") con link alla homepage
- Usato nei punti dove si fetcha da Strapi: homepage cards, collection pages, detail pages
- Non interrompe il rendering dell'intera pagina — solo la sezione fallita mostra il fallback

#### Type-safe translation keys
- Tipo `TranslationKey` generato da `en.json` come `const` assertion
- `getTranslation()` accetta solo chiavi valide — errori di typo catturati a compile time
- Aggiornare i call site esistenti se necessario

**Cosa NON fa:**
- Niente refactoring architetturale
- Niente nuovi componenti UI
- Niente Storybook

**Success criteria:**
1. `lenis` non appare in `package-lock.json`
2. Search funziona anche se Strapi e offline (Pagefind fallback)
3. Pagina non mostra contenuto vuoto se una sezione Strapi fallisce
4. Typo in translation key causa errore TypeScript

---

### Fase 19: Documentation & Runbook

**Goal:** Documentazione operativa per gestire il sito in produzione senza dover ricordare tutto a memoria.

**Deliverable:**

#### `docs/runbook.md`
- **Deploy manuale:** come triggerare rebuild senza push
- **Ripristino backup:** step-by-step con `restore-db.sh`
- **Token Instagram:** come generare nuovo token se scade
- **Strapi admin:** URL, credenziali (riferimento, non in chiaro), reset password
- **Container Docker:** come verificare stato, riavviare, leggere log
- **Troubleshooting comune:** sito giu, build fallita, webhook non ricevuto, immagini rotte
- **Contatti servizi:** Hetzner, Cloudflare, Brevo, Sentry, UptimeRobot — link dashboard

#### `docs/architecture.md`
- Diagramma flusso request (testo ASCII):
  - User → Cloudflare CDN → Caddy → Astro SSR (porta 4321)
  - Astro → Strapi API (porta 1337, rete Docker interna)
  - Strapi → PostgreSQL (porta 5432, rete Docker interna)
- Diagramma flusso deploy:
  - git push → GitHub webhook → Hetzner webhook listener → rebuild-web.sh → Docker build → swap dist → smoke test
- Diagramma content sync:
  - Cron → sync-instagram.mjs → Graph API → Strapi API → instagram-posts
  - Cron → refresh-instagram-token.mjs → Graph API → .instagram-token file
- Mappa porte e servizi Docker

#### API docs inline
- Commenti JSDoc sugli endpoint in `src/pages/api/`:
  - `search.ts` — parametri, rate limits, formato risposta
  - `newsletter.ts` — payload, validazione, flusso Brevo
  - `brevo-webhook.ts` — eventi gestiti, validazione HMAC
  - `preview.ts` — come attivare/disattivare preview mode
  - `reviews.ts` — proxy Strapi con cache headers

**Cosa NON fa:**
- Niente Swagger/OpenAPI generato
- Niente diagrammi grafici (solo ASCII/testo)
- Niente wiki esterna

**Success criteria:**
1. Un nuovo sviluppatore puo capire l'architettura leggendo `architecture.md`
2. Matteo puo ripristinare un backup seguendo solo `runbook.md`
3. Ogni endpoint API ha documentazione inline dei parametri e comportamento

---

## Riepilogo fasi

| Fase | Nome | Dominio | Dipende da |
|------|------|---------|------------|
| 10 | Backup & Disaster Recovery | Tech | — |
| 11 | Monitoring & Error Tracking | Tech | — |
| 12 | Security Hardening | Tech | — |
| 13 | Test Suite | Tech | 10, 11, 12 |
| 14 | Umami Analytics | Business | 10, 11, 12 |
| 15 | Newsletter con Brevo | Business | 10, 11, 12 |
| 16 | Instagram Graph API Smart Sync | Business | 10, 11, 12 |
| 17 | Content Pipeline | Business | 15 |
| 18 | Frontend Polish & Cleanup | Tech | 15 |
| 19 | Documentation & Runbook | Tech | tutte |

## Budget impatto

| Servizio | Costo | Note |
|----------|-------|------|
| Sentry Free | 0 | 5K eventi/mese |
| UptimeRobot Free | 0 | 50 monitor, 5 min interval |
| Brevo Free | 0 | 300 email/giorno, 100K contatti |
| Umami self-hosted | 0 | Container Docker su Hetzner |
| Hetzner VPS aggiuntivo | 0 | Usa risorse esistenti (da monitorare RAM) |
| **Totale** | **0/mese** | Solo self-hosted e free tier |

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| Hetzner VPS non ha abbastanza RAM per Umami + Strapi + PostgreSQL + Astro | Monitorare uso RAM dopo deploy Umami. Se >85%, upgrade a CX31 (4vCPU, 8GB, ~14/mese) |
| Instagram Graph API rate limits | Sync ogni 6 ore con 25 post max = 4 chiamate/giorno, ampiamente sotto i limiti |
| Brevo free tier insufficiente | 300 email/giorno = ~9000/mese. Sufficiente fino a migliaia di subscriber |
| Test E2E fragili (flaky) | Retry automatico in Playwright config, timeout generosi, test su dev server locale |
