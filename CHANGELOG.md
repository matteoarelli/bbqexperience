# Changelog — BBQ Experience

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
