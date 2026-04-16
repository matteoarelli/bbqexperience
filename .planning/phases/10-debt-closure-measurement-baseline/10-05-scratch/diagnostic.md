# Plan 10-05 — Diagnostic Scratch (Task 1)

Generated: 2026-04-16
Source: `.planning/artifacts/lighthouse-v1.1-baseline/*.json` (Plan 04 output)

## Sub-90 pages (8 di 15 — tutte solo Performance, mai a11y/bp/seo)

| Page ID     | URL                                                                     | Perf | LCP   | FCP   | LCP element                                                  |
|-------------|-------------------------------------------------------------------------|------|-------|-------|---------------------------------------------------------------|
| home-en     | /en/                                                                    | 86   | 3.8 s | 2.2 s | `img.featured-main__image` (FeaturedHero hero blog)          |
| home-it     | /it/                                                                    | 87   | 3.7 s | 2.1 s | `img.featured-main__image`                                    |
| home-es     | /es/                                                                    | 87   | 3.7 s | 2.3 s | `img.featured-main__image`                                    |
| review-en   | /en/reviews/lodge-cast-iron-sportsman-grill-review/                     | 86   | 3.8 s | 2.3 s | `article > img.w-full` (cover review hero)                   |
| review-it   | /it/recensioni/jealous-devil-lump-charcoal-review/                      | 87   | 3.4 s | 2.5 s | (review cover image)                                          |
| review-es   | /es/resenas/kamado-joe-classic-iii-review/                              | 87   | 3.5 s | 2.4 s | (review cover image)                                          |
| tutorial-it | /it/guide/how-to-smoke-meat/                                            | 89   | 3.5 s | 2.1 s | `img.content-cover-image` (ContentLayout hero)                |
| blog-en     | /en/blog/oklahoma-joes-new-offset-smoker-lineup/                        | 89   | 3.4 s | 2.2 s | `img.content-cover-image` (ContentLayout hero)                |

Recipes / tutorial-en / tutorial-es / blog-it / blog-es già passano (LCP ~3.0 s, perf 90-93). Stesso template — varia solo l'URL della cover, quindi è un effetto di latenza CDN sul singolo asset, non un bug strutturale.

## Failing Lighthouse audits (root-cause grouping)

### A) `lcp-discovery-insight` (score 0) — TUTTE le 8 pagine sub-90

`priorityHinted=false` → l'immagine LCP NON ha `fetchpriority="high"`.

- home-* → `web/src/components/content/FeaturedHero.astro` (`featured-main__image`) — attualmente solo `loading="eager" decoding="async"`, nessun fetchpriority.
- tutorial-* / blog-* → `web/src/components/content/ContentLayout.astro` (`content-cover-image`) — stesso pattern.
- review-* → `web/src/pages/{en,it,es}/{reviews,recensioni,resenas}/[slug].astro` riga ~129-136: `<img src={coverImage} ...>` raw, nemmeno eager+decoding, e nessun fetchpriority.

**Fix:** aggiungere `fetchpriority="high"` agli `<img>` LCP. Per le review aggiungere anche `loading="eager" decoding="async"`. Costo: 3 file, 1 riga ciascuno.

### B) `render-blocking-insight` (score 0) — TUTTE le 8 pagine sub-90

Risorsa peggiore (~450-720 ms wasted, 56-62 KB):
- `https://bbq-experience.com/_astro/Footer.<hash>.css` (56 KB)

Verifica locale (`web/dist/client/_astro/Footer.D8Y2yV51.css` = 56 323 B): NON è solo lo stile del footer, è il chunk CSS condiviso che Astro raggruppa col nome del componente più grande. Contiene gli stili scoped di Footer + BackToTop + CookieBanner + MobileMenuPanel + Hamburger + Header NavLink + NewsletterSignup + ThemeToggle. 444 selettori `[data-astro-cid-*]`.

Il problema: Astro emette `<link rel="stylesheet" href="Footer.<hash>.css">` come render-blocking nell'`<head>`, anche se solo una piccola parte di questi stili è above-the-fold.

**Fix opzioni in ordine di sicurezza:**
1. **(SCELTO)** Inline il CSS critico above-the-fold via integrazione Astro `inlineStylesheets: 'auto'` o `'always'` → astro.config; Astro inline-erà i fogli sotto la threshold e renderà gli altri non-blocking. È un cambio configurazione di una riga, già supportato in Astro 6.
2. Marcare manualmente le `<link>` come non-blocking via JS swap (`media="print" onload="this.media='all'"`). Più rischioso, FOUC.
3. Spezzare i componenti below-the-fold in islands separati. Refactor architettonico (escluso da Rule 4 dello scope).

Verifica config attuale: vedere `web/astro.config.*` (se `inlineStylesheets` non è set, default è `'auto'` ma potrebbe non triggerare per un chunk da 56KB perché supera la threshold di 4096 byte). Fix proposto: settare `vite.build.cssCodeSplit: true` + `experimental.inlineStylesheets: 'always'` per i chunk piccoli, e/o aggiungere `<link rel="preload" as="style">` per la critical CSS.

Approccio pragmatico raccomandato: usare `inlineStylesheets: 'auto'` (default ma esplicito) e spostare i componenti below-the-fold pesanti (CookieBanner, MobileMenuPanel, Footer stesso) dentro `<slot name="footer" />` con `client:idle` o caricati via component island so the CSS scope non finisce nel chunk principale. Più pulito: mantenere lo split CSS per-componente e aggiungere preload della Footer.css come `as="style"` con `onload` swap (pattern noto a basso rischio).

**Decisione finale fix:** aggiungere a `BaseLayout.astro` un'integrazione minima — usare l'API `Astro.props` con `<link rel="preload" as="style" href="...">` non è triviale (non sappiamo l'hash a build time qui). MA c'è una soluzione pulita Astro-native: settare `experimental.inlineStylesheets: 'always'` in `astro.config` per i fogli sotto soglia, oppure (più sicuro) aggiungere uno script inline che converte tutti i `<link rel="stylesheet">` in non-blocking dopo che il main thread è libero. Vedere astro.config per capire qual è la config attuale e scegliere.

### C) `unused-javascript` (score 0) — review-* (3 pagine)

Top offender: `_astro/ScrollTrigger.B2uKOqL4.js` ~57 KB (113 KB on disk, ~55 KB gzipped wasted).

Causa: `web/src/pages/{en,it,es}/{reviews,recensioni,resenas}/[slug].astro` ha:
```js
<script>
  import { initScrollAnimations } from '@lib/animations';
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
</script>
```
`@lib/animations` importa `gsap` + `gsap/ScrollTrigger`. Le review hanno comunque AnimatedScoreCard svelte che gestisce le sue animazioni inline (e usa `client:visible` su Svelte 5 runes — non GSAP). I `data-animate` element scaricati via `initScrollAnimations` sulle review… verificare se ce ne sono. Se nessun `data-animate` nelle review templates, possiamo:
- Rimuovere il `<script>` dalle review pages (zero data-animate utilizzati): -113 KB JS.
- Oppure: caricare gsap/ScrollTrigger lazily solo se `document.querySelector('[data-animate]')` ne trova qualcuno.

**Fix raccomandato:** option 2 — modificare `web/src/lib/animations.ts` per lazy-load gsap solo se ci sono effettivamente elementi `[data-animate]`. Questo beneficia tutte le pagine, non solo le review. Patch chirurgica.

### D) `image-delivery-insight` (score 0) — 5 pagine (home-*, tutorial-it, blog-en)

Top esempio (home-en): 624 KiB di savings sui card images delle review/recipe/blog grids. Tutti puntano a `https://cms.bbq-experience.com/uploads/...`. Strapi serve l'originale; non c'è un layer di responsive sizing dietro Cloudflare per questi.

**Fix:** out-of-scope per questa fase (richiede modifica di `getStrapiMediaURL()` o aggiunta Cloudflare image transformation). Doc in `deferred-items.md`. Migliorare LCP via fetchpriority + render-blocking dovrebbe riportare la pagina sopra 90 senza intervenire qui.

### E) `unsized-images` (score 0.5) — review-en

L'`<img>` raw nelle review pages non ha `width`/`height` attribute. Causa CLS minimi e contributo Performance.

**Fix:** aggiungere `width` e `height` al `<img>` cover delle review. Possiamo usare valori di default (es. width=1024 height=576 16:9) — il `class="w-full"` sovrascrive con CSS aspect-ratio; gli attributi servono solo per layout reservation. Patch chirurgica: stesso file di Fix A per le review.

### F) `forced-reflow-insight`, `network-dependency-tree-insight` (score 0)

Sono insight derivati. Migliorando LCP discovery (A) e rimuovendo CSS render-blocking (B) + JS unused (C), questi insight migliorano automaticamente. Non serve toccare codice direttamente.

### G) `document-latency-insight` (score 0.5) — TUTTE le 8

TTFB ~500-700 ms, savings ~50 KB transfer. Probabilmente Strapi fetch SSR + Astro SSR cold-start. Out-of-scope per Plan 10-05 (richiede infra change: Cloudflare full-page cache o aggressive ISR). Doc in `deferred-items.md`. Lighthouse score 0.5 (≥0.5 non manda perf <90 da solo se LCP è OK).

## Proposed fix plan (ordine di esecuzione)

| # | Tipo     | File                                                         | Cosa cambia                                                                           | Impatto stimato                                       |
|---|----------|--------------------------------------------------------------|---------------------------------------------------------------------------------------|--------------------------------------------------------|
| 1 | shared   | `web/src/components/content/FeaturedHero.astro`              | `fetchpriority="high"` su `featured-main__image`                                       | home-en/it/es: LCP -300/600 ms                         |
| 2 | shared   | `web/src/components/content/ContentLayout.astro`             | `fetchpriority="high"` su `content-cover-image`                                        | tutorial-it, blog-en: LCP -300/600 ms                  |
| 3 | shared×6 | `web/src/pages/{en,it,es}/{reviews,recensioni,resenas}/[slug].astro` | Cover `<img>`: `fetchpriority="high" loading="eager" decoding="async" width="1600" height="900"` | review-en/it/es: LCP -400 ms + risolve unsized-images  |
| 4 | shared   | `web/src/lib/animations.ts`                                  | Lazy-load gsap+ScrollTrigger solo se `[data-animate]` esiste in DOM                    | review-*: -113 KB JS, FCP/TBT migliorano               |
| 5 | shared   | `web/astro.config.mjs` (verificare e impostare)              | `experimental.inlineStylesheets: 'auto'` esplicito e/o pattern preload-stylesheet      | tutte le 8: render-blocking -450 ms                    |

Step 5 è il più delicato. Decisione: dopo aver applicato 1-4, ri-misurare 1 pagina locale con preview. Se siamo già sopra 90, skip step 5 (basso rischio). Se ancora sotto, applicare il fix render-blocking come patch addizionale.

## Out-of-scope (Plan 10-05 non li tocca)

- Image delivery via Cloudflare image resizing → defer (nuovo phase plan).
- Document latency / TTFB → defer (richiede caching infra, separata).
- `color-contrast` (Accessibility 95 sull'home, già ≥90, fuori dal trigger di DEBT-03 ma annotato per a11y sweep futuro).

## Acceptance criteria check

- [x] Diagnostic table: presente sopra
- [x] Ogni fix referenzia un file specifico (1-4 hanno path concreti; 5 è marcato condizionale)
- [x] Scope locked a Performance fixes (no feature creep)
- [x] User approval pendente
