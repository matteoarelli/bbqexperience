# BBQ Experience Growth Engine — Design Spec

**Data:** 2026-04-07
**Obiettivo:** Portare BBQ Experience da portale editoriale statico a macchina di crescita autonoma tramite AI agents, SEO cluster strategy, e monetizzazione via partnership + affiliate.
**Timeline:** 3 mesi (Aprile-Giugno 2026)
**Priorità:** SEO/Traffico organico > Monetizzazione (partnership poi affiliate) > Automazione AI

---

## 1. Architettura AI Agents

### Principi
- Agenti Python autonomi, orchestrati da cron (no framework, no UI)
- Ollama su 192.168.1.119 per generazione contenuti (llama3.1 70B o mistral-large)
- Niente API Anthropic/OpenAI — tutto locale
- Strapi REST API come hub centrale: ogni agente legge/scrive via API
- Report e comandi via Telegram bot bidirezionale
- Fully autonomous: gli agenti pubblicano senza approvazione, report giornaliero di cosa hanno fatto

### 6 Nuovi Agenti

#### 1.1 content-generator (`agents/content_generator.py`)
- **Frequenza:** 1x/giorno (06:00)
- **Dove gira:** 192.168.1.119 (Ollama)
- **Cosa fa:**
  1. Legge il prossimo topic dal `ContentQueue` in Strapi (status: ready, ordinato per priority)
  2. Genera articolo completo in EN (~1500-2000 parole) con Ollama
  3. Auto-traduce in IT e ES con Ollama
  4. Pubblica le 3 versioni su Strapi (blog-post, tutorial, o recipe a seconda del content_type)
  5. Aggiorna ContentQueue status → published
  6. Logga su Telegram: titolo, tipo, URL, parole generate
- **Input:** ContentQueue entries (generate da keyword-scout)
- **Output:** Contenuti pubblicati su Strapi in 3 lingue
- **Voce editoriale:** Prompt engineering per mantenere il tono "The Pitmaster" — diretto, tecnico, zero marketing BS. Score conservativi (6-7.5 base).
- **Qualità:** Ogni articolo include: intro, sezioni con H2/H3, conclusione, FAQ (3-5 domande), meta title/description ottimizzati

#### 1.2 seo-optimizer (`agents/seo_optimizer.py`)
- **Frequenza:** 2x/giorno (09:00, 15:00)
- **Dove gira:** Hetzner
- **Cosa fa:**
  1. Scansiona contenuti pubblicati nelle ultime 24h
  2. Per ogni contenuto:
     - Riscrive meta title (max 60 char) e description (max 155 char) per CTR
     - Scansiona tutti gli altri contenuti per keyword match
     - Inserisce 3-5 internal link nel nuovo articolo
     - Aggiorna 2-3 articoli vecchi per linkare al nuovo
     - Aggiunge FAQ schema JSON se il contenuto ha una sezione FAQ
     - Aggiunge HowTo schema se il contenuto è un tutorial step-by-step
  3. Per contenuti con dati GSC (posizione 5-20, alto impression):
     - Ottimizza H1, primo paragrafo, e meta per la keyword target
  4. Logga modifiche su Telegram
- **Input:** Contenuti Strapi + dati Google Search Console API
- **Output:** Contenuti aggiornati con SEO ottimizzato, internal link aggiunti

#### 1.3 translation-agent (`agents/translation_agent.py`)
- **Frequenza:** Ogni 6h
- **Dove gira:** 192.168.1.119 (Ollama)
- **Cosa fa:**
  1. Query Strapi per contenuti EN senza corrispettivo IT o ES
  2. Per ogni contenuto mancante, genera traduzione con Ollama
  3. Pubblica la traduzione su Strapi via PUT con ?locale=xx
  4. Verifica che slug non sia null (bug noto Strapi v5)
  5. Copia campi JSON strutturati (ingredienti, istruzioni, specs) convertendo unità (EN imperiale, IT/ES metrico)
- **Input:** Contenuti EN senza traduzioni
- **Output:** Traduzioni IT/ES pubblicate

#### 1.4 keyword-scout (`agents/keyword_scout.py`)
- **Frequenza:** Lunedì 05:00
- **Dove gira:** Hetzner
- **Cosa fa:**
  1. Scrape Google Suggest per seed keyword BBQ (50+ seed)
  2. Scrape "People Also Ask" per le top keyword
  3. Opzionale: Google Trends API per trend stagionali
  4. Query Google Search Console API: impressioni, CTR, posizione media per keyword esistenti
  5. Identifica "low hanging fruit": posizione 5-20, alto impression, basso CTR
  6. Genera piano editoriale settimanale:
     - 7 topic con: keyword target, search volume stimato, difficulty, cluster di appartenenza, content_type suggerito
     - Prioritizzati per: low hanging fruit > gap vs competitor > trend in crescita
  7. Crea entry in `ContentQueue` su Strapi (status: ready)
  8. Crea entry in `EditorialCalendar` su Strapi
  9. Report su Telegram con il piano della settimana
- **Input:** Seed keywords, dati GSC, dati competitor
- **Output:** 7 entry ContentQueue + report Telegram

#### 1.5 competitor-monitor (`agents/competitor_monitor.py`)
- **Frequenza:** Ogni 12h
- **Dove gira:** Hetzner
- **Cosa fa:**
  1. Monitora RSS/sitemap di 10 blog BBQ competitor:
     - seriouseats.com/bbq
     - amazingribs.com
     - bbqhost.com
     - virtualweberbullet.com
     - smokingmeatforums.com (forum)
     - heygrillhey.com
     - vindulge.com
     - girlscangrill.com
     - thermoworks.com/blog
     - atbbq.com/thesauce
  2. Rileva nuovi articoli pubblicati
  3. Estrae keyword target e topic
  4. Identifica content gap: topic che i competitor coprono e noi no
  5. Report su Telegram quando rileva articoli rilevanti
  6. Suggerisce topic per keyword-scout (aggiunge a una coda suggerimenti)
- **Input:** RSS feed / sitemap competitor
- **Output:** Alert Telegram + suggerimenti topic

#### 1.6 partnership-outreach (`agents/partnership_outreach.py`)
- **Frequenza:** Lunedì 08:00
- **Dove gira:** Hetzner
- **Cosa fa:**
  1. Legge brand con status "to_contact" dal content type `Brand` in Strapi
  2. Per ogni brand:
     - Genera email personalizzata con metriche sito (traffico Umami, subscriber, IG followers)
     - Include link a review/articoli già pubblicati sui loro prodotti (se esistono)
     - Proposta: prodotto in prestito/omaggio → review onesta + post IG
  3. Per brand con status "contacted" da 7+ giorni senza risposta: genera follow-up (max 2)
  4. Aggiorna status in Strapi
  5. Report settimanale su Telegram: pipeline status
- **Input:** Brand entries in Strapi
- **Output:** Email generate (salvate su Strapi per invio manuale o automatico), status aggiornato
- **Nota:** Fase 1 le email vengono salvate per review/invio manuale. Fase 2 invio automatico via SMTP.

### Agente Telegram Bot (`agents/telegram_bot.py`)
- **Tipo:** Daemon (systemd service), sostituisce il cron di telegram_dashboard.py
- **Cosa fa:**
  - Report giornaliero automatico alle 21:00 (come l'attuale, ma espanso)
  - Riceve e processa comandi:
    - `/stats` — report istantaneo metriche
    - `/publish` — pubblica prossimo articolo in coda
    - `/pause` — pausa tutti gli agenti 24h (scrive flag file)
    - `/resume` — riprende agenti
    - `/queue` — mostra articoli in coda
    - `/keywords` — top 10 keyword opportunities
    - `/competitors` — ultimi articoli competitor
    - `/pipeline` — status partnership outreach
  - Implementazione: `python-telegram-bot` con polling (`getUpdates`)

### Agenti esistenti potenziati

- **content_recycler.py:** Genera automaticamente social caption + hashtag per ogni nuovo articolo pubblicato dagli agenti. Genera primo commento IG con link al sito.
- **weekly_newsletter.py:** Contenuto generato da AI — riassunto editoriale della settimana, non solo lista link. Top 3 articoli con excerpt personalizzato, "Pitmaster's pick of the week", recipe highlight.

---

## 2. SEO & Content Cluster Strategy

### 5 Cluster con Pillar + Satellite

#### Cluster 1: The Ultimate Guide to BBQ Smoking
- **Pillar:** /en/tutorials/ultimate-guide-bbq-smoking (~5000 parole, scritto da Matteo)
- **Keyword target:** "how to smoke meat", "smoking guide", "bbq smoking for beginners"
- **Satellite (AI-generated, 10-15 articoli):**
  - Best woods for smoking (hickory vs mesquite vs cherry vs apple)
  - Temperature chart for every meat
  - Cold smoking vs hot smoking guide
  - First smoke: 10 mistakes every beginner makes
  - The science behind smoke rings
  - How to maintain temperature in a smoker
  - Smoking in winter: cold weather tips
  - Electric vs charcoal vs pellet smoker comparison
  - How long to smoke every cut of meat
  - Smoke flavor profiles: mild to intense

#### Cluster 2: BBQ Grills Buyer's Guide 2026
- **Pillar:** /en/tutorials/bbq-grills-buying-guide-2026 (~5000 parole)
- **Keyword target:** "best bbq grill", "bbq grill buying guide"
- **Satellite (10-15 articoli):**
  - Best grills under $500 / $1000 / $2000
  - Charcoal vs gas vs pellet: definitive comparison
  - Grill size guide: what size do you need?
  - Best portable grills for camping
  - Best grills for apartment balconies
  - Grill maintenance: annual checklist
  - Cast iron vs stainless steel grates
  - BTU myth: why more isn't always better
  - Best grill accessories every pitmaster needs
  - How to season a new grill

#### Cluster 3: BBQ Thermometer Complete Guide
- **Pillar:** /en/tutorials/bbq-thermometer-guide (~5000 parole)
- **Keyword target:** "best meat thermometer", "bbq thermometer"
- **Satellite (10-12 articoli):**
  - Instant-read vs leave-in probe vs wireless
  - Thermometer accuracy test: we tested 15 models
  - Where to place the probe in every cut
  - How to calibrate a meat thermometer
  - Best wireless thermometers for overnight cooks
  - Thermapen ONE vs Meater Plus vs ThermoWorks Smoke
  - Internal temperature chart for every meat (printable)
  - Ambient vs meat temperature: what matters more
  - Best budget thermometers under $30

#### Cluster 4: Mastering Brisket
- **Pillar:** /en/recipes/mastering-brisket-complete-guide (~5000 parole)
- **Keyword target:** "how to cook brisket", "smoked brisket recipe"
- **Satellite (10-15 articoli):**
  - Texas-style brisket: the authentic method
  - Brisket flat vs point: differences and how to cook each
  - To wrap or not to wrap: foil vs butcher paper vs naked
  - The brisket stall explained (and how to power through)
  - How long to rest brisket (and why it matters)
  - Brisket troubleshooting: dry, tough, bark problems
  - Competition brisket: KCBS judging criteria
  - Best brisket rubs: 5 recipes
  - Brisket on a budget: making choice grade taste prime
  - Leftover brisket: 10 recipes (burnt ends, tacos, chili)

#### Cluster 5: BBQ Sauce & Rubs Encyclopedia
- **Pillar:** /en/tutorials/bbq-sauce-rubs-encyclopedia (~5000 parole)
- **Keyword target:** "bbq sauce recipe", "best bbq rub"
- **Satellite (10-12 articoli):**
  - Regional BBQ sauce styles: Carolina, Kansas City, Texas, Alabama, South Carolina mustard
  - Basic dry rub formula: the 4:2:1 ratio
  - Injection marinades: when and how to use them
  - Best store-bought BBQ sauces ranked
  - Sugar-free BBQ sauce recipes
  - Mop sauce vs finishing sauce: what's the difference
  - How to make your own signature rub
  - Vinegar-based vs tomato-based: flavor profiles
  - Best rubs for each meat type

### Content Target a 3 Mesi
- 5 pillar pages (revisionate da Matteo) — ~5000 parole ciascuna
- 60 satellite articles (generati da AI, 1/giorno) — ~1500-2000 parole
- 20 pagine "vs" aggiuntive (AI-generated)
- Tutto in 3 lingue = ~255 nuovi contenuti (85 EN x 3 lingue)

### Internal Linking Automatico
L'agente `seo-optimizer` dopo ogni pubblicazione:
1. Scansiona tutti i contenuti esistenti per keyword match
2. Inserisce 3-5 internal link nel nuovo articolo verso contenuti correlati
3. Aggiorna 2-3 articoli vecchi per linkare al nuovo
4. Aggiorna il pillar page per includere il nuovo satellite nel suo indice

### Google Search Console Integration
- API key per GSC nel `keyword-scout`
- Metriche tracciate: impressioni, CTR, posizione media per keyword
- "Low hanging fruit" identificati automaticamente: posizione 5-20, alto impression
- Report settimanale su Telegram con keyword in crescita/calo

### Schema Markup Aggiuntivo
- FAQ schema su tutorial e guide (generato da AI)
- HowTo schema su tutorial step-by-step
- L'agente `seo-optimizer` aggiunge automaticamente lo schema appropriato

---

## 3. Monetizzazione

### Fase 1 — Partnership Dirette (Mesi 1-2)

#### Nuovo content type `Brand`
```
name: string (required)
website: string
contact_email: string
category: enum (grill_manufacturer, accessory_brand, thermometer, fuel, sauce_rub, other)
partnership_status: enum (to_contact, contacted, negotiating, active, declined, expired)
notes: richtext
products: relation (oneToMany → Product)
```

#### Nuovo content type `Partnership`
```
brand: relation (manyToOne → Brand)
status: enum (outreach, follow_up_1, follow_up_2, negotiating, agreement, product_received, review_published, completed, declined)
contact_date: date
last_follow_up: date
products_received: JSON (array of product names/dates)
agreement_terms: richtext
notes: richtext
```

#### Target brand iniziali
Weber, Traeger, Camp Chef, Pit Boss, Thermapen/ThermoWorks, Meater, Oklahoma Joe's, Napoleon, Kamado Joe, Big Green Egg

#### Pipeline gestito dall'agente
1. Matteo aggiunge brand con status `to_contact` in Strapi
2. L'agente genera email personalizzata (salvata in Strapi per review iniziale, poi auto in Fase 2)
3. Follow-up automatico a 7 e 14 giorni
4. Report pipeline su Telegram ogni lunedì

### Fase 2 — Affiliate Links (Mese 3+)

#### Modifica content type `Product`
```
+ affiliate_links: JSON [{ retailer: string, url: string, commission_rate: decimal }]
+ partnership_status: enum (none, contacted, active, expired)
+ brand: relation (manyToOne → Brand)
```

#### Nuovi componenti frontend

**WhereToBuy.astro** — Review pages, sotto il verdict
- Lista bottoni con retailer name + prezzo (se disponibile)
- Ogni click tracciato come evento Umami custom: `affiliate_click` con properties `{ product, retailer }`
- Styling: bottoni accent color, icona retailer, prezzo evidenziato
- Disclaimer affiliate in piccolo sotto i bottoni

**ComparisonPrice.astro** — Pagine "vs"
- Tabella comparativa con colonne: prodotto, prezzo, retailer, bottone "Buy"
- Click tracking Umami come sopra
- Responsive: su mobile diventa card stack

**PillarNav.astro** — Pillar pages
- Sidebar/top nav con lista satellite articles nel cluster
- Progress indicator: quanti articoli del cluster hai letto
- Sticky su desktop, collapsible su mobile

**FaqSection.astro** — Tutorial e guide
- Accordion FAQ con schema JSON-LD inline
- Contenuto dal campo FAQ in Strapi (JSON array [{question, answer}])
- Animazione apertura/chiusura CSS-only

#### Modifiche frontend esistenti
- `ReviewJsonLd.astro` → aggiungere `offers` schema con affiliate link
- Template review → integrare WhereToBuy sotto pros/cons card
- Template comparazione → integrare ComparisonPrice
- `BaseLayout.astro` → registrare evento Umami per click affiliate

#### Revenue tracking
- Evento Umami custom: `affiliate_click` con product name e retailer
- Il telegram dashboard mostra: click giornalieri, top product, trend settimanale
- Report mensile con stima revenue basata su commission rate media

#### Programmi affiliate target
- Amazon Associates: 3-4% commission, catalogo enorme
- ThermoWorks direct: 8% commission
- Traeger direct: 5% commission
- Weber direct: variabile per regione
- Meater direct: 10% commission

---

## 4. Strapi Schema Changes

### Nuovi Content Types

#### ContentQueue
```
title: string (required)
content_type: enum (blog, tutorial, recipe, review, comparison)
body_en: richtext
body_it: richtext
body_es: richtext
status: enum (idea, research, ready, generating, published, failed)
scheduled_date: date
cluster: enum (smoking, grills, thermometers, brisket, sauces, uncategorized)
target_keyword: string
search_volume: integer
difficulty: enum (low, medium, high)
priority: integer (1=highest)
ai_generated: boolean (default: true)
published_content_id: string (reference all'ID Strapi del contenuto pubblicato)
```

#### KeywordTracker
```
keyword: string (required)
locale: enum (en, it, es)
cluster: enum (smoking, grills, thermometers, brisket, sauces, uncategorized)
position: decimal
impressions: integer
clicks: integer
ctr: decimal
last_checked: datetime
trend: enum (rising, stable, falling)
is_low_hanging: boolean
```

### Modifiche Content Types Esistenti

#### EditorialCalendar
```
+ cluster: enum (smoking, grills, thermometers, brisket, sauces, uncategorized)
+ search_volume: integer
+ keyword_difficulty: enum (low, medium, high)
+ ai_generated: boolean (default: false)
+ source_agent: string (quale agente ha suggerito questo topic)
```

---

## 5. Cron Schedule Completo

| Ora | Giorno | Script | Dove | Nuovo? |
|-----|--------|--------|------|--------|
| 03:00 | Daily | backup-db.sh | Hetzner | Esistente |
| 04:00 | Lunedì | refresh-instagram-token.mjs | Hetzner | Esistente |
| 05:00 | Lunedì | keyword_scout.py | Hetzner | Nuovo |
| 06:00 | Daily | content_generator.py | 192.168.1.119 | Nuovo |
| 08:00 | Lunedì | partnership_outreach.py | Hetzner | Nuovo |
| 09:00 | Daily | seo_optimizer.py | Hetzner | Nuovo |
| 15:00 | Daily | seo_optimizer.py | Hetzner | Nuovo |
| */6h | Daily | sync-instagram.mjs | Hetzner | Esistente |
| */6h | Daily | translation_agent.py | 192.168.1.119 | Nuovo |
| */12h | Daily | competitor_monitor.py | Hetzner | Nuovo |
| 10:00 | Domenica | weekly_newsletter.py | Hetzner | Esistente (upgrade) |
| — | Always | telegram_bot.py (daemon) | Hetzner | Nuovo |

## 6. Dipendenze

### Python (nuove)
- `python-telegram-bot>=21.0` — bot bidirezionale
- `google-search-results` o `serpapi` — keyword research (oppure scraping diretto)
- `beautifulsoup4>=4.12` — parsing competitor HTML/RSS
- `httpx>=0.27` — HTTP client async
- `feedparser>=6.0` — parsing RSS feed competitor
- `google-auth>=2.0` + `google-api-python-client>=2.0` — Google Search Console API

### Node.js (nessuna nuova)
- Script sync-instagram e refresh-token restano invariati

### Infrastruttura
- Google Search Console: verificare proprietà bbq-experience.com, creare service account API
- Telegram: bot attuale potenziato, stesso token
- Ollama su 192.168.1.119: verificare che llama3.1 70B o mistral-large sia installato

---

## 7. Metriche di Successo (3 mesi)

| Metrica | Oggi | Target Mese 1 | Target Mese 3 |
|---------|------|---------------|----------------|
| Contenuti totali (3 lingue) | 452 | 550 | 750+ |
| Pageviews/giorno | ~200 (stima) | 500 | 2,000 |
| Keyword in top 20 | ~10 (stima) | 30 | 100 |
| Newsletter subscriber | ~50 (stima) | 150 | 500 |
| Affiliate click/giorno | 0 | 0 (ancora partnership) | 50+ |
| Partnership attive | 0 | 2-3 | 5-8 |
| Articoli AI/settimana | 0 | 5 | 7 |

---

## 8. Rischi e Mitigazioni

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| Contenuti AI di bassa qualità penalizzati da Google | Alto | Prompt engineering rigoroso, tono Pitmaster coerente, fact-checking su temperature/tempi via knowledge base. Review manuale dei primi 10 articoli per calibrare. |
| Rate limit Google Suggest / scraping | Medio | Rotazione user-agent, delay tra richieste, fallback su dati GSC |
| Ollama 70B lento su 192.168.1.119 | Medio | Un articolo per run, timeout generoso (30 min). Se troppo lento, scendere a 8B per draft e 70B per refine. |
| Instagram token expiry non catturata | Basso | Già mitigato con refresh settimanale + fallback env var |
| Partnership rejection rate alta | Medio | Iniziare con brand più piccoli/nicchia, non solo big brand. Costruire track record. |
| Strapi performance con 750+ contenuti | Basso | PostgreSQL regge facilmente. Aggiungere indici su slug, locale, published_date se query rallentano. |
