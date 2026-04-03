# Changelog — BBQ Experience

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
