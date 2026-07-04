---
phase: quick-260704-qwr
plan: 01
subsystem: web/review
requirements: [QWR-260704]
key-files:
  modified:
    - web/src/components/review/WhereToBuy.astro
    - web/src/components/review/ReviewJsonLd.astro
    - web/src/pages/en/reviews/[slug].astro
    - web/src/pages/it/recensioni/[slug].astro
    - web/src/pages/es/resenas/[slug].astro
commits:
  - 131dbf7: feat(260704-qwr) prezzo nel box Where to Buy
  - ecb2835: feat(260704-qwr) passa price da 3 review page
  - d91defe: feat(260704-qwr) Offer JSON-LD price + priceCurrency EUR
completed: 2026-07-04
---

# Quick 260704-qwr: Affiliate Price Surfacing su Review Summary

Il prezzo del prodotto (EUR) ora emerge sulle review: etichetta "From EUR {n}" nel box Where to Buy e Offer JSON-LD completi con `price`+`priceCurrency='EUR'` per sbloccare il rich result Product (stelle in SERP) su Google.

## What Was Done

**Task 1 — WhereToBuy.astro (131dbf7)**
- Aggiunta prop opzionale `price?: number | null` all'interface Props, default `null` nel destructuring.
- Calcolo `showPrice` (typeof number && > 0), `fromLabel` (i18n `review.fromPrice` con fallback "From"), `priceLabel` = `From EUR {n}`.
- Render condizionale `<p class="where-to-buy__price">` tra `<h3>` e `.where-to-buy__links`.
- CSS `.where-to-buy__price` con sole var esistenti (`--font-heading`, `--text-xl`, `--color-accent-fire`, `--space-4`).
- Zero regressione: con `price` null/0 il markup e' identico all'originale.

**Task 2 — 3 review page (ecb2835)**
- `en/reviews/[slug].astro`, `it/recensioni/[slug].astro`, `es/resenas/[slug].astro` passano `price={review.product?.price ?? null}` a `<WhereToBuy>`. Nessun'altra modifica.

**Task 3 — ReviewJsonLd.astro (d91defe)**
- Calcolo `productPrice`/`hasPrice` una volta.
- Spread condizionale `...(hasPrice ? { price: String(productPrice), priceCurrency: 'EUR' } : {})` su ogni Offer, sia nel branch `affiliate_links.map(...)` che nel branch singolo `affiliate_url`.
- aggregateRating/review/brand/image/category non toccati. Offer invariati quando price assente.

## Verification

- `npx tsc --noEmit`: nessun errore su WhereToBuy ne' su ReviewJsonLd.
- grep prop price: 3/3 review page.
- **Build gate `cd web && npm run build`: PASSED** (Server built 4.72s, Pagefind 15 pagine indicizzate). I warning `Astro.request.headers` su pagine prerenderizzate sono pre-esistenti e non correlati a queste modifiche.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- web/src/components/review/WhereToBuy.astro — FOUND (contiene `.where-to-buy__price`)
- web/src/components/review/ReviewJsonLd.astro — FOUND (contiene `priceCurrency`)
- 3 review page — FOUND (3/3 `price={review.product?.price ?? null}`)
- Commit 131dbf7, ecb2835, d91defe — FOUND
