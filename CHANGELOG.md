## 2026-05-06 (sera) — Cover image auto-gen SDXL + multi-step content gen

### Cover image automatica (SDXL Base 1.0)

Sblocco `blog_to_ig_promo`: ora ogni articolo generato dal pipeline ha una cover. Prima erano skipped per assenza cover.

**Architettura swap VRAM (3090 24GB)**:
- 5:30 AM: content_generator (Qwen 27B :8080 attivo)
- 6:00 AM: scheduled task Windows `switch-to-sd` -> taskkill llama-server :8080, start SDXL :8085 (~7 GB VRAM)
- 6:10 AM: cron `cover_generator.py` su Ubuntu -> SDXL endpoint -> Strapi upload + attach
- 6:50 AM: scheduled task `switch-to-qwen` -> kill SDXL, restart Qwen task
- email-idle.service pause 6:00, restart 6:55 (bge-m3 :8082 e Phi-4 :8081 restano up — su altra GPU o non condividono VRAM con SDXL)

**SDXL setup Windows .124**:
- venv Python 3.12 a `C:\AI\sd-server\venv` (torch 2.11+cu126, diffusers 0.38, transformers 5.8, fastapi 0.136)
- Modello SDXL Base 1.0 fp16 in `C:\AI\models\sdxl-base-1.0` (~6.5 GB)
- `sd_server.py` FastAPI con lifespan: carica pipeline una sola volta allavvio, espone POST /generate -> PNG bytes (1216x832, 28 steps, ~9s/cover sulla 3090)
- `start-sdxl-8085.cmd`, `switch-to-sd.cmd`, `switch-to-qwen.cmd`

**Nuovo agente Ubuntu `cover_generator.py`**:
- Cron 6:10 AM
- Lista Strapi blog-posts/tutorials/recipes published last 26h con cover_image=null
- Build prompt fotografico BBQ-themed da title/keyword/cluster (no LLM call: Qwen e down)
- POST .124:8085/generate -> PNG -> Strapi /api/upload -> PUT cover_image=media_id
- Telegram report con link media

**strapi_client.py**: aggiunta `upload_file(bytes, filename, mime)` per multipart upload.

**health-monitor patch**: `check_llm_endpoint` skipta Qwen :8080 se hour=6 e minute<55 (silenzia false alert durante swap).

**Test live 6 mag 12:03**: 2 articoli "Best Bbq Grill 2025" + "Best Bbq Grills Propane" -> 2 cover generate (media#300, #301) -> live su bbq-experience.com. Quality eccellente: BBQ shot fotografici, dramatic lighting, no text artifacts.

### Multi-step content generation (opt-in via MULTI_STEP=1)

`generate_article_multistep()` aggiunta a `lib/claude_client.py`. Pipeline:

1. **Outline (Qwen, ~15s)**: prompt JSON-only -> {intro_angle, sections[], faq_topics[]}
2. **Sezioni (Qwen, ~30s ciascuna)**: 6-8 chiamate sequenziali, ognuna con focus su 1 H2 + key_points specifici
3. **Assembly (Qwen, ~30s)**: combina sezioni + scrive intro/conclusione/FAQ + verifica keyword in intro

`content_generator.py` ora controlla env `MULTI_STEP=1` per scegliere tra:
- Default (off): single-shot 1 prompt -> 1500-2000 parole, ~30-60s
- MULTI_STEP=1: pipeline -> 2500-3500 parole, ~5 min, struttura piu profonda (7+ H2, 20+ H3)

**Test 6 mag 12:14**: "Best Pellet Smokers Under \$1000 in 2026" -> 4.8 min totali, 3246 parole, 7 H2, 20 H3, keyword in intro+H2s, FAQ con domande specifiche. Tono Pitmaster mantenuto, no generic openings.

### Cron Ubuntu modificati

- `0 6` -> `30 5` content_generator.py (parte mentre Qwen e ancora up, finisce prima dello swap a SDXL)
- `+10 6` cover_generator.py (NEW)
- `+0 6` systemctl --user stop email-idle.service (NEW)
- `+55 6` systemctl --user start email-idle.service (NEW)

### Note operative

- Multi-step e OPT-IN: cron default resta single-shot. Per attivare per un singolo run: `MULTI_STEP=1 ./run-agent.sh content_generator.py`. Per attivare in cron: aggiungere `MULTI_STEP=1` davanti al comando o esportare in `.env`.
- Pellet smoker test article saved a `/tmp/test_multistep_output.html` su Ubuntu (per ispezione qualita).

## 2026-05-05/06 — Pipeline content unblock + SSH tunnel Cloudflare bypass

### Problema diagnosticato
Pipeline content_generator BBQ ferma da 17 giorni (ultimo articolo published 2026-04-19). Cron mancante + bug ai_generated flag + Cloudflare WAF blocca POST con body grandi.

### Fix applicati

**content_generator.py**:
- Quality gate prima di publish: min 1000 parole, almeno 1 H2, excerpt >= 50 chars, SEO title/description popolati. Fail → queue item failed.
- `ai_generated=True` flag spostato nell'update content-queue post-publish (era erroneamente in base_data dell'article, non presente nello schema tutorial/blog-post — Strapi 400 validation).
- Timeout SEO prompt 60s → 120s (evita fail su warm-up Qwen).
- Cron daily `0 6 * * *` aggiunto su .119 (era assente da 11 apr).

**lib/strapi_client.py**:
- User-Agent Mozilla/5.0 (era Python-urllib/3.12, blocked da Cloudflare).
- POST timeout 30s → 60s. No retry su POST/PUT/PATCH (no idempotency, evita duplicati).

**ig_to_content.py**:
- MIN_ENGAGEMENT_SCORE 70 → 0.5 (la scala era normalizzata 0.0-1.0, non 0-100. Soglia 70 mai raggiungibile per costruzione). Pipeline IG-popular → blog article ora attiva.
- Format strings `:.0f` → `:.2f` (mostrava sempre 0 o 1).

**Strapi container Hetzner**:
- mem_limit 384MB → 1024MB nel docker-compose.yml. Era cause secondary di slow validation su body grandi.

**SSH tunnel Cloudflare bypass** (la fix decisiva):
- Cloudflare WAF su cms.bbq-experience.com blocca POST con body > ~5KB anche con UA Mozilla. Diagnosi: GET piccoli OK, POST canary 514 byte OK, POST 7KB → silently dropped al CDN (non arriva a Caddy/Strapi).
- Architettura tunnel: Windows .124 → SSH `-L 192.168.1.124:8001:172.19.0.8:1337` → Strapi container interno (network docker `internal`). Bypassa CF + Caddy.
- `STRAPI_URL` in `.env` cambiato a `http://192.168.1.124:8001`. Tutti gli agenti (content_generator, translation_agent, ig_to_content, content_promoter, claude_reviewer, partnership_outreach, claude_strategist, ab_tester, weekly_newsletter) ereditano via env.
- Persistenza: scheduled task user-level Windows `hetzner-tunnel` AtLogon, script `C:\Hetzner-tunnel\hetzner-tunnel.cmd` con auto-reconnect loop.
- Test live 5 mag 18:48: end-to-end Qwen 27B → content_generator → Strapi POST via tunnel → live article `bbq-experience.com/en/blog/best-bbq-grills-propane` (4 min totali).

**Stack AI persistenza** (correlato):
- 3 LLM (Qwen :8080, Phi-4 :8081, bge-m3 :8082) erano lanciati da console manuale, non sopravvivevano reboot.
- Aggiunti 3 scheduled task user-level Windows AtLogon: `llama-qwen-8080`, `llama-phi-8081`, `llama-bge-8082`. Auto-restart al login utente.

### Side effects
- `weekly_newsletter.py` BBQ ora funziona (Brevo API key + LIST_ID 3 settati, cron Dom 10:00 esistente, preview HTML pulita 3 articles + 2 reviews + 1 recipe).
- `content_promoter` ora trova post con `ai_generated=true` filter (era vuoto da 25 giorni → ora sblocca recycle queue).

### Verification
- ContentQueue dopo fix: 24 ready / 15 published (era 13) / 7 failed (test diagnostici).
- Webhook deploy Hetzner triggered, container `bbqexperience-web` rebuildato healthy.
- Test pubblico HTTP 200 su articolo nuovo.
- 3 stories BBQ pubblicate Mar 6/05 mattina (S9 alle 10:12, prima volta dopo blocco shadowban-style su account ScattoPro IG).

### Commit
`e7b25c2` su main, push GitHub OK, webhook deploy Hetzner OK.


# Changelog — BBQ Experience

## 2026-04-13/14 — v3.2 Content Quality, Mobile UI & SEO Coverage

### SEO — Hreflang e JSON-LD
- Fix hreflang cross-locale: SEOHead ora calcola ogni link alternate via `getLocalizedPath()` traducendo il route slug per il locale target. Risolve 135 404 URL segnalati da Google Search Console (es. `/it/recipes/...` ora `/it/ricette/...`)
- `getLocalizedPath()` esteso per tradurre anche sotto-segmenti tassonomici (`category`/`categoria`, `difficulty`/`difficolta`)
- Nuovo componente `OrganizationJsonLd` su about/contact (3 locale) con Organization + AboutPage/ContactPage schema
- `CollectionPageSchema` esteso a blog e tutorials listing (oltre a reviews/recipes gia coperti)
- Copertura finale JSON-LD: 100% su detail (144), listing (12), entity (6), home (3). Solo privacy/terms/compare/bookmarks senza (intenzionale)

### Content Quality — DB bonifica
- `scripts/fix_content_quality.py` (nuovo, idempotente): bonifica 480 record su blog-posts/reviews/recipes/tutorials × EN/IT/ES
  - Rimuove `<a>` annidati prodotti da run multipli del SEO optimizer
  - Riscrive link cross-locale corrotti: `/en/recipes/...` in pagina IT → `/it/ricette/...`
  - Corregge wrong slug per locale: `/es/reviews/` → `/es/resenas/`, `/es/tutorials/` → `/es/tutoriales/`
  - Trasforma pattern markdown corrotto `[<a href="X">testo</a>](url)` in `[testo](url)` pulito
  - Rimuove soft hyphen residui da traduzioni automatiche
  - Processa anche title/excerpt/seo_title/seo_description, non solo il content principale
- Ricette AI-generated senza ingredients/instructions backfillate (bbq-sauce-recipe, how-to-cook-brisket, texas-style-smoked-brisket)

### Rendering — Markdown renderer e sanitizzazione
- Nuovo helper `web/src/lib/markdown.ts` basato su `marked` (v18)
- Applicato a 7 template: ContentLayout + 6 detail pages (reviews/recipes × 3 locale)
- Pre-processing: strip nested anchors, riduzione `[HTML dentro markdown link]` a singolo anchor, rimozione soft hyphen
- ~85% dei blog e ~60% delle reviews avevano markdown grezzo non convertito (`## headings`, `**bold**`, tabelle) — ora renderizzato

### SEO Optimizer — riscrittura
- `scripts/agents/seo_optimizer.py` riscritto per lavorare per locale
- Usa slug di route localizzati da `LOCALIZED_ROUTES` (sincronizzato con web/src/lib/i18n.ts)
- Anti-nesting: skippa match dentro blocchi `<a>...</a>` esistenti (evita la regressione che generava nested anchor)
- PUT Strapi ora con `locale=xx` esplicito, update coerente col record processato

### Mobile UI — ricostruzione menu e light mode
- ThemeToggle spostato fuori dalla posizione `fixed top-right` e integrato nell'header accanto all'hamburger
- Nuovo `MobileMenuPanel` renderizzato a body-level da BaseLayout (fuori dal `<header>` che con `backdrop-filter` creava containing block e intrappolava `position:fixed`)
- MobileMenu split: bottone hamburger nel Header, pannello+backdrop in BaseLayout
- Pannello full-width <640px, side-panel 380px da 640px+, sfondo via CSS vars (light/dark safe), close button X esplicito, backdrop dimming con click-to-close, touch targets 44x44, iOS safe-area
- Stagger reveal delle voci + fallback defensive reveal osservatore (dopo 1.5s forza visibile se IntersectionObserver non triggera)
- Hero e FeaturedHero: testo forzato `#fff` + text-shadow per leggibilita sopra gradient/immagini scure anche in light mode
- CTA banner Instagram: ghost button sostituito con filled white button + fire text (contrasto alto)

### Tooling — audit e screenshot
- Nuovi script: `web/scripts/mobile_screenshots.mjs`, `web/scripts/full_audit.mjs`, `web/scripts/section_audit.mjs`, `web/scripts/inspect_menu.mjs`
- `web/src/lib/i18n.test.ts` + `web/src/lib/markdown.test.ts`: coverage di edge case (sotto-segmenti tassonomici, markdown link wrap, soft hyphen)
- `scripts/audit_content.sql`, `scripts/audit_residual.sql`, `scripts/random_check.py`, `scripts/sweep_pages.py` per audit ripetibili

### Verification
- 93/93 pagine random check pulite (0 HTTP error, 0 markdown raw, 0 nested anchor, 0 cross-locale link, 0 soft hyphen)
- 468/468 sweep completo pulito (tutti published × 4 content type × 3 locale)
- 16/16 test i18n passano + 9/9 markdown passano

## 2026-04-08 — v3.1 Security Hardening & Brand Migration

### Security Fixes (P0 Critical)
- Rimosso token API Strapi hardcoded da health_check.py (era in git history)
- Fix open redirect in preview.ts — solo path locali accettati
- Fix bypass HMAC webhook Brevo — fail-closed se secret non configurato
- Backup script: pipefail + dump separato da gzip + verifica integrita gunzip -t
- Restore script: rollback automatico se restore fallisce, snapshot pre-restore

### Bug Fixes (P1 Urgent)
- Newsletter ritorna 503 se Strapi e down (non piu falso successo)
- Brevo webhook valida tutte le risposte fetch prima di procedere
- Rate limiter in-memory sostituito con SQLite condiviso (eliminato memory leak)
- Database SSL abilitato di default in produzione
- pipefail aggiunto a tutti gli shell script

### Quality Improvements (P2)
- Fix N+1 query nel batch review fetch (1 query $in invece di 10 singole)
- Scritture atomiche per file stato agenti (temp + os.replace)
- Resource limits Docker su rebuild (--memory 2g --cpus 2)
- Timeout 10s su tutti i fetch() verso servizi esterni
- README riscritto da zero (da "# test" a documentazione completa)

### Maintenance (P3)
- Retry con backoff esponenziale in strapi_client, ollama, claude_client (3 tentativi)
- Fix bare except in content_recycler.py e competitor_monitor.py
- Fix bug slice in content_promoter.py ([-200] → [-200:])

### Brand Migration
- Migrato campo brand prodotto da stringa a relazione (brand_relation → tabella Brand)
- 12 brand mancanti creati in DB, 134 relazioni product→brand popolate
- Rimosso campo stringa brand dallo schema product
- Aggiornati 16 file frontend (template, tipi, JSON-LD, populate queries)
- Dati brand verificati live: 7/7 review con brand_relation corretto

### Verification
- 11/11 pagine HTTP 200 (EN/IT/ES homepage + listings)
- API search e reviews funzionanti con brand_relation
- Newsletter rifiuta email invalide (400)
- Webhook rifiuta richieste senza HMAC (401)
- Open redirect bloccato → redirect a /en/

## 2026-04-07 → 2026-04-08 — v3.0 Growth Engine (AI Agents + SEO + Monetizzazione)

### AI Content Generation
- 9 agenti Python autonomi per generazione contenuti, SEO, traduzioni, competitor monitoring, partnership outreach
- Content generator usa Claude Max CLI (2000+ parole per articolo vs 670 con Ollama 7b)
- Translation agent usa Ollama qwen2.5:7b per traduzioni EN → IT/ES campo per campo
- Claude Reviewer quality gate (score ≥ 6/10 per pubblicazione)
- Claude Strategist settimanale per analisi performance e pillar content
- Primo articolo AI pubblicato: "Best BBQ Grills Under $500 in 2026" (2655 parole, 6 grill recensite)

### SEO & Content Clusters
- 5 cluster tematici: smoking, grills, thermometers, brisket, sauces
- Keyword Scout settimanale (Google Suggest + deduplicazione)
- SEO Optimizer 2x/giorno: internal linking automatico (26 link aggiunti in primo run)
- Competitor Monitor: RSS tracking di 7 blog BBQ (Hey Grill Hey, Vindulge, Girls Can Grill, etc.)
- Fix Recipe JSON-LD: 9 errori GSC risolti (image, recipeCuisine, keywords, nutrition, recipeInstructions)

### Monetizzazione
- 10 brand BBQ seedati per pipeline partnership (Weber, Traeger, Camp Chef, Pit Boss, ThermoWorks, Meater, Oklahoma Joe's, Napoleon, Kamado Joe, Big Green Egg)
- Partnership Outreach agent: email automatiche + follow-up a 7/14 giorni
- Product schema esteso: affiliate_links (JSON), partnership_status, brand_relation
- Componente WhereToBuy.astro con tracking Umami per click affiliate
- ComparisonPrice.astro con tabella responsive desktop/mobile
- Offer schema aggiunto a ReviewJsonLd per rich results

### Frontend Components
- WhereToBuy.astro — bottoni affiliate integrati in review pages EN/IT/ES
- FaqSection.astro — accordion FAQ con JSON-LD FAQPage schema
- PillarNav.astro — navigazione cluster per pillar pages
- ComparisonPrice.astro — tabella prezzi con affiliate tracking
- i18n keys aggiunte per tutti i nuovi componenti (EN/IT/ES)

### Strapi CMS (4 nuovi content types)
- Brand — pipeline partnership con status tracking
- Partnership — outreach, follow-up, agreement tracking
- KeywordTracker — monitoraggio posizione keyword SEO
- ContentQueue — coda articoli AI con status workflow (idea → ready → generating → draft_review → published)
- EditorialCalendar esteso: cluster, search_volume, keyword_difficulty, ai_generated, source_agent

### Integrazione Sito ↔ Instagram (ponte bidirezionale)
- content_promoter.py: sincronizza articoli AI → site_promo_queue + first_comments + link_map
- ig_to_content.py: converte post IG ad alto engagement → ContentQueue per espansione in articoli
- Telegram Bot daemon con 8 comandi interattivi (/stats, /queue, /keywords, /pipeline, /competitors, /pause, /resume, /publish)

### Infrastruttura
- Claude Code CLI su Windows Task Scheduler (content_generator 06:00, claude_reviewer 08:00, strategist dom 07:00)
- Agenti Ollama su 192.168.1.119 (translation, content_promoter, ig_to_content)
- Agenti Hetzner (keyword_scout, seo_optimizer, competitor_monitor, partnership_outreach, telegram_bot daemon)
- Fix sshd 192.168.1.119: UseDNS no + MaxStartups 20:30:60
- Segreti spostati in .env.windows (gitignored) — GitGuardian alert risolto, token Telegram revocato e rigenerato

### Design & Planning
- Design spec completo: docs/superpowers/specs/2026-04-07-growth-engine-design.md
- 4 piani di implementazione dettagliati con codice completo
- Google Search Console API setup documentato (docs/gsc-setup.md)
- health_check.py per monitoraggio rapido sistema

## 2026-04-03 → 2026-04-06 — v2.0 Upgrade (da 96 a 452 contenuti)

### Production Hardening
- Backup PostgreSQL automatico giornaliero (cron 03:00, retention 30gg, script backup-db.sh + restore-db.sh)
- Sentry Free error tracking integrato nel middleware Astro SSR
- UptimeRobot monitoring su sito + CMS (alert email)
- Smoke test post-deploy (9 URL verificati dopo ogni rebuild)
- CORS whitelist esplicita in Strapi (solo bbq-experience.com + localhost dev)
- CSP headers report-only + X-Content-Type-Options + X-Frame-Options + Referrer-Policy
- Rate limiter migrato da in-memory Map a SQLite persistente (sopravvive ai restart)
- Lenis rimossa (dipendenza installata mai usata)

### Testing
- Vitest configurato con path aliases (15+ unit test per i18n, media, rate-limit)
- Playwright E2E configurato (homepage, language switcher, dark/light, search, 404)

### Analytics & Monitoring
- Umami self-hosted su analytics.bbq-experience.com (Docker + PostgreSQL dedicato + Caddy)
- Tracking script su tutte le pagine + eventi custom (newsletter signup, IG follow click)
- Dashboard Telegram giornaliera ore 21:00 con traffico sito (Umami) + engagement IG + metriche piano editoriale

### Newsletter & Email
- Content type Subscriber in Strapi (email, locale, status, brevo_contact_id)
- Endpoint newsletter riscritto con Brevo API + double opt-in
- Webhook Brevo per conferma/unsubscribe con HMAC validation
- 5 template email welcome series creati in Brevo (Day 0/2/4/7/10)
- Newsletter automatica settimanale (dom 10:00) con top articoli + review + ricetta

### Instagram Integration
- Instagram Graph API sync ogni 6h (25 post reali importati con engagement score)
- Token refresh automatico settimanale (lun 04:00)
- Schema instagram-post esteso: engagement_score, like/comments count, relazioni a review/recipe
- URL fields cambiati da string a text (>255 chars)
- Feed homepage intelligente: 2 curated (alto engagement) + 2 recenti + 1 reel
- Primo commento automatico con link al sito dopo ogni post IG pubblicato (integrato in editorial_plan.py)
- Facebook App BBQExperience-IG configurata (ID: 925070327001389)

### Site ↔ Instagram Data Bridge (macchina locale 192.168.1.119)
- site_bridge.py: sync contenuti sito → agente IG ogni 6h (site_content.json, link_map.json, first_comments.json)
- content_recycler.py: suggerimenti cross-promotion sito ↔ IG (lun 06:30)
- weekly_newsletter.py: digest settimanale automatico via Brevo (dom 10:00)
- telegram_dashboard.py: report giornaliero con traffico Umami + engagement IG + stato piano editoriale (ore 21:00)

### Content Expansion (da 96 a 452)
- 15 nuove review (25 totali) con score Pitmaster in 3 lingue — Weber Kettle, Pit Boss, Yoder, Lodge, ThermoWorks Signals, Chimney Starter, Flame Boss, Camp Chef, Royal Oak, Kingsford, Inkbird, Ironwood, Big Green Egg, Thermacell, Char-Broil
- 15 nuove ricette (23 totali) in 3 lingue — pork belly burnt ends, beer can chicken, cedar plank salmon, texas hot links, lamb chops, smoked turkey, galbi, beef cheeks, shrimp skewers, spatchcock chicken, pulled lamb, grilled vegetables, smoked meatloaf, competition chicken, swordfish
- 60 blog post nuovi (87 totali) in 3 lingue — tips, trends, culture, news, events con contenuto ricco (800-1200 parole) e linking interno
- 20 pagine SEO programmatiche "vs" (comparazioni prodotto) in 3 lingue
- 12 entry calendario editoriale in Strapi
- Tutti i 10 articoli Tips arricchiti con contenuto completo

### Social Proofing
- Trust bar "Trusted by 74,000+ BBQ enthusiasts" sotto l'header su tutte le pagine
- Newsletter copy: "Join 74,000+ Pitmasters"
- FollowCTA copy: "74K+ Can't Be Wrong"
- Badge follower 74K nel footer accanto al link Instagram

### SEO
- WebSite + Organization JSON-LD sulla homepage (tutte le lingue)
- og:image sulla homepage
- ErrorFallback component per graceful Strapi failure
- Pagefind build step come fallback search (con @vite-ignore per import dinamico)
- Type-safe translation keys (TranslationKey generato da en.json)
- Fix 40 slug null nelle localizzazioni IT/ES dei blog post

### Documentation
- docs/runbook.md — procedure operative (deploy, backup, token IG, troubleshooting)
- docs/architecture.md — diagrammi flusso (request, deploy, content sync, newsletter)
- docs/content-strategy.md — frequenza, keyword research, voice guidelines, calendario 3 mesi
- JSDoc su tutti gli API endpoints (search, newsletter, brevo-webhook, preview, reviews)
- Spec v2.0: docs/superpowers/specs/2026-04-03-v2-upgrade-design.md
- Piano v2.0: docs/superpowers/plans/2026-04-03-v2-upgrade-plan.md

---

## 2026-04-03

### Content
- Riscritti TUTTI i 96 contenuti (32 x 3 lingue) con voce "The Pitmaster" — tono diretto, onesto, esperto
- Score abbassati a livelli realistici: Weber 6.8, Traeger 6.5, Thermapen 8.8, Kamado Joe 7.5, Jealous Devil 6.5, GrillGrate 6.8, Meater Plus 5.8
- Aggiunti 16 nuovi contenuti: 4 review (Napoleon, Oklahoma Joe's, Meater Plus, Fogo), 4 ricette (Pork Shoulder, Tomahawk, Wings, Burnt Ends), 4 tutorial, 4 blog post
- Ingredienti IT/ES convertiti in sistema metrico (g, ml, kg, °C)
- EN con doppie unità: imperiale + metrico tra parentesi
- Titoli review resi onesti (Weber: "$2,800 Worth — Is It Worth It?", Traeger: "The Easiest Smoker — And That's the Problem")
- Fix formato ingredienti (da char-by-char a {name, quantity, unit})
- Fix istruzioni (campo `detail` supportato oltre a `text`)
- Cover images riassociate dopo sovrascrittura da script traduzioni

### Infrastructure
- Webhook GitHub configurato con secret HMAC funzionante
- Health check Docker fixato (127.0.0.1 invece di localhost per IPv6)
- Deploy automatico verificato end-to-end: push → webhook → git pull → Docker rebuild → live

### Visual & UX
- Hero homepage 100vh con particelle ember animate e tipografia "HONEST BBQ REVIEWS NO BS"
- Drop cap con gradiente fuoco su primi paragrafi
- Card hover lift + glow effect
- Footer con gradiente fuoco in cima
- Blockquote con bordo gradiente fuoco
- Recipe instructions con step numbers fire gradient e linea connettiva

### Bug Fix
- Rimosso `data-animate` da TUTTI i componenti — contenuto sempre visibile
- Fix prose styles fuori da @layer per priorità su Tailwind reset
- Fix contrasto testo VerdictCard e ProsConsCard (text-primary instead of text-secondary)
- Fix RecipeInstruction type: supporta `text`, `detail`, `title`, `description`
- Fix cover_image NULL su ricette IT/ES dopo traduzioni

### Pages & Features
- Pagine statiche riscritte con voce Pitmaster (About, Contact, Footer)
- Category landing pages per review (per tipo prodotto) e ricette (per difficoltà)
- Bookmarks/reading list con spiegazione UX
- Newsletter con endpoint API backend
- RSS feed multilingua
- Sitemap dinamico da Strapi
- Dynamic OG images per review
- Search via API Strapi (sostituisce Pagefind)
- Keyboard shortcuts (/, H, ?)
- Cookie consent GDPR
- Rate limiting su API endpoints (30 req/min)

### Security & Performance
- XSS fix in SearchDialog (rimosso @html)
- Preview cookie con secure flag
- API proxy per comparison tool (no STRAPI_URL esposto)
- Docker container non-root (USER node)
- PopularReviews populate ottimizzato
- Caching headers su API responses

### QA Audit
- 31 bug trovati e fixati (0 critical, 2 high, 12 medium, 13 low, 4 info)
- Content audit Pitmaster: score 8.2/10

## 2026-04-02

### Initial Build (9 fasi GSD)
- Phase 1: Infrastruttura Strapi + PostgreSQL + Docker su Hetzner
- Phase 2: Design system Tailwind 4 dark theme + GSAP + i18n routing
- Phase 3: CMS authoring workflow + preview system
- Phase 4: Review pages con scoring, gallery, verdict, Schema.org
- Phase 5: Recipe pages con cook mode, serving adjuster, unit toggle, print
- Phase 6: Content pages, search, breadcrumbs, related content
- Phase 7: Instagram feed + social sharing
- Phase 8: Product comparison tool + animated scoring + dark/light toggle
- Phase 9: SEO audit, sitemap, 404 page, Lighthouse optimization

## 2026-04-01

### Project Initialization
- Progetto creato con /gsd:new-project
- Research ecosistema BBQ (stack, features, architettura, pitfalls)
- 48 requisiti v1 definiti
- Roadmap 9 fasi creata
- Dominio bbq-experience.com configurato con DNS Cloudflare
- Email configurata su A2 Hosting con SPF/DKIM/DMARC

## 2026-04-29 — Bootstrap stack AI locale (sessione 28-29 aprile)

Refactor major + nuove integrazioni come parte del bootstrap dello stack AI locale di Matteo. **Vedi `~/scripts/STACK-AI-CHANGELOG-2026-04-28-29.md` (e `C:\Progetti\STACK-AI-CHANGELOG-2026-04-28-29.md` lato Windows) per panoramica completa cross-project.**

Modifiche specifiche a questo project sono indicate sotto.

**Modifiche specifiche a bbqexperience:**
- `scripts/agents/lib/claude_client.py`: `ask()` ora chiama Qwen3.6-27B locale (`http://192.168.1.124:8080/v1/chat/completions`) invece di subprocess `claude --print` (Claude Code CLI subscription Pro/Max). Toglie dipendenza da abbonamento + aumenta velocita.
  - Env override `BBQ_LLM_BACKEND=claude` per fallback emergency
  - `enable_thinking=True` per generate_strategy/generate_pillar_content (qualita)
  - `enable_thinking=False` per review_article (parsing strutturato `===KEY===`)
- `scripts/agents/lib/ollama.py`: file riscritto, chiama OpenAI-compat /v1/chat/completions
- `.env`: `OLLAMA_URL`/`OLLAMA_MODEL` aggiornati a Phi-4 locale
- Test live 29 apr: prompt BBQ tip Phi-4 -> on-brand 1.5s
- Backup: `claude_client.py.bak-qwen-20260428-*`, `ollama.py.bak-20260428-*`
