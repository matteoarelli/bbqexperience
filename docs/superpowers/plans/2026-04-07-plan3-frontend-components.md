# Plan 3: Frontend Components — Affiliate, Pillar Nav, FAQ, Comparison Price

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new Astro components for monetization (WhereToBuy, ComparisonPrice) and SEO cluster navigation (PillarNav, FaqSection), integrate them into existing review and comparison pages, and add Umami affiliate click tracking.

**Architecture:** Static Astro components that read data from Strapi via existing `fetchBySlug`/`fetchCollection` utilities. No new Svelte islands needed — these are all server-rendered. Affiliate click tracking via Umami custom events (inline JS, no framework needed).

**Tech Stack:** Astro 6.1.2, Tailwind 4, TypeScript, Umami analytics

**Dependencies:** Plan 1 (Strapi Schema) for `affiliate_links` field on Product.

---

### Task 1: Create `WhereToBuy.astro` Component

**Files:**
- Create: `web/src/components/review/WhereToBuy.astro`

- [ ] **Step 1: Write the component**

Write `web/src/components/review/WhereToBuy.astro`:
```astro
---
/**
 * WhereToBuy — Bottoni affiliate per acquistare il prodotto recensito.
 * Ogni click tracciato come evento Umami 'affiliate_click'.
 */
import type { AffiliateLink } from '@lib/types';

interface Props {
  productName: string;
  affiliateUrl: string | null;
  affiliateLinks: AffiliateLink[] | null;
  translations: Record<string, any>;
}

const { productName, affiliateUrl, affiliateLinks, translations } = Astro.props;

// Combina link singolo legacy + array nuovo
const links: AffiliateLink[] = [];
if (affiliateLinks && affiliateLinks.length > 0) {
  links.push(...affiliateLinks);
} else if (affiliateUrl) {
  links.push({ retailer: "Buy Now", url: affiliateUrl, commission_rate: 0 });
}

const hasLinks = links.length > 0;
---

{hasLinks && (
  <section class="where-to-buy">
    <h3 class="where-to-buy__title">
      {translations?.review?.whereToBuy || "Where to Buy"}
    </h3>
    <div class="where-to-buy__links">
      {links.map((link) => (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          class="where-to-buy__btn"
          data-umami-event="affiliate_click"
          data-umami-event-product={productName}
          data-umami-event-retailer={link.retailer}
        >
          <span class="where-to-buy__retailer">{link.retailer}</span>
          <svg class="where-to-buy__arrow" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
          </svg>
        </a>
      ))}
    </div>
    <p class="where-to-buy__disclaimer">
      {translations?.review?.affiliateDisclaimer || "Links may earn us a commission at no extra cost to you."}
    </p>
  </section>
)}

<style>
  .where-to-buy {
    margin-bottom: var(--space-12);
    padding: var(--space-6) var(--space-8);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-subtle);
  }
  .where-to-buy__title {
    font-family: var(--font-heading);
    font-size: var(--text-lg);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-primary);
    margin-bottom: var(--space-4);
  }
  .where-to-buy__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .where-to-buy__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-accent-fire);
    color: white;
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background-color var(--transition-base), transform var(--transition-base), box-shadow var(--transition-base);
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  }
  .where-to-buy__btn:hover {
    background: var(--color-accent-amber);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
  }
  .where-to-buy__arrow {
    flex-shrink: 0;
  }
  .where-to-buy__disclaimer {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/review/WhereToBuy.astro
git commit -m "feat(web): add WhereToBuy component with affiliate tracking"
```

---

### Task 2: Integrate `WhereToBuy` into Review Pages

**Files:**
- Modify: `web/src/pages/en/reviews/[slug].astro`
- Modify: `web/src/pages/it/recensioni/[slug].astro`
- Modify: `web/src/pages/es/resenas/[slug].astro`

- [ ] **Step 1: Update EN review page**

In `web/src/pages/en/reviews/[slug].astro`:

Add import after the existing imports (line ~27):
```astro
import WhereToBuy from '@components/review/WhereToBuy.astro';
```

Replace the existing affiliate button section (lines 202-215) with:
```astro
    <!-- Dove comprare -->
    <WhereToBuy
      productName={review.product?.name || review.title}
      affiliateUrl={review.product?.affiliate_url || null}
      affiliateLinks={review.product?.affiliate_links || null}
      translations={t}
    />
```

- [ ] **Step 2: Update IT and ES review pages with same changes**

Apply the exact same import + replacement in:
- `web/src/pages/it/recensioni/[slug].astro`
- `web/src/pages/es/resenas/[slug].astro`

(Change only the import line and replace the affiliate button section.)

- [ ] **Step 3: Add translation keys**

In `web/src/i18n/en.json`, add:
```json
"review.whereToBuy": "Where to Buy",
"review.affiliateDisclaimer": "Links may earn us a commission at no extra cost to you."
```

In `web/src/i18n/it.json`, add:
```json
"review.whereToBuy": "Dove Comprare",
"review.affiliateDisclaimer": "I link potrebbero farci guadagnare una commissione senza costi aggiuntivi per te."
```

In `web/src/i18n/es.json`, add:
```json
"review.whereToBuy": "Dónde Comprar",
"review.affiliateDisclaimer": "Los enlaces pueden generarnos una comisión sin costo adicional para ti."
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/en/reviews/[slug].astro web/src/pages/it/recensioni/[slug].astro web/src/pages/es/resenas/[slug].astro web/src/i18n/
git commit -m "feat(web): integrate WhereToBuy into review pages (EN/IT/ES)"
```

---

### Task 3: Create `FaqSection.astro` Component

**Files:**
- Create: `web/src/components/content/FaqSection.astro`

- [ ] **Step 1: Write the component**

Write `web/src/components/content/FaqSection.astro`:
```astro
---
/**
 * FaqSection — Accordion FAQ con JSON-LD FAQPage schema integrato.
 * Usato in tutorial, guide e articoli generati da AI.
 */
interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  faqs: FaqItem[];
  title?: string;
}

const { faqs, title = "Frequently Asked Questions" } = Astro.props;
const hasFaqs = faqs && faqs.length > 0;

// JSON-LD FAQPage schema
const faqSchema = hasFaqs ? {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer,
    },
  })),
} : null;
---

{hasFaqs && (
  <section class="faq-section">
    <h2 class="faq-section__title">{title}</h2>
    <div class="faq-section__list">
      {faqs.map((faq, i) => (
        <details class="faq-section__item" id={`faq-${i}`}>
          <summary class="faq-section__question">
            <span>{faq.question}</span>
            <svg class="faq-section__icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </summary>
          <div class="faq-section__answer" set:html={faq.answer} />
        </details>
      ))}
    </div>
  </section>
)}

{faqSchema && (
  <script type="application/ld+json" set:html={JSON.stringify(faqSchema)} />
)}

<style>
  .faq-section {
    margin-bottom: var(--space-12);
  }
  .faq-section__title {
    font-family: var(--font-heading);
    font-size: var(--text-2xl);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--color-text-primary);
    margin-bottom: var(--space-6);
  }
  .faq-section__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .faq-section__item {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
    overflow: hidden;
  }
  .faq-section__item[open] .faq-section__icon {
    transform: rotate(180deg);
  }
  .faq-section__question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    cursor: pointer;
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--color-text-primary);
    list-style: none;
  }
  .faq-section__question::-webkit-details-marker {
    display: none;
  }
  .faq-section__icon {
    flex-shrink: 0;
    color: var(--color-text-muted);
    transition: transform var(--transition-base);
  }
  .faq-section__answer {
    padding: 0 var(--space-5) var(--space-5);
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    line-height: 1.7;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/content/FaqSection.astro
git commit -m "feat(web): add FaqSection component with FAQ schema JSON-LD"
```

---

### Task 4: Create `PillarNav.astro` Component

**Files:**
- Create: `web/src/components/content/PillarNav.astro`

- [ ] **Step 1: Write the component**

Write `web/src/components/content/PillarNav.astro`:
```astro
---
/**
 * PillarNav — Indice navigabile dei satellite articles in un cluster SEO.
 * Usato nelle pillar pages per mostrare tutti gli articoli correlati.
 */
interface NavItem {
  title: string;
  slug: string;
  href: string;
  isCurrent?: boolean;
}

interface Props {
  title: string;
  items: NavItem[];
  locale: string;
}

const { title, items, locale } = Astro.props;
const hasItems = items && items.length > 0;
---

{hasItems && (
  <nav class="pillar-nav" aria-label={title}>
    <h3 class="pillar-nav__title">{title}</h3>
    <ol class="pillar-nav__list">
      {items.map((item, i) => (
        <li class:list={["pillar-nav__item", { "pillar-nav__item--current": item.isCurrent }]}>
          <a href={item.href} class="pillar-nav__link" aria-current={item.isCurrent ? "page" : undefined}>
            <span class="pillar-nav__number">{String(i + 1).padStart(2, "0")}</span>
            <span class="pillar-nav__text">{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  </nav>
)}

<style>
  .pillar-nav {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-5) var(--space-6);
    margin-bottom: var(--space-8);
  }
  .pillar-nav__title {
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-accent-fire);
    margin-bottom: var(--space-4);
  }
  .pillar-nav__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .pillar-nav__link {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    transition: background-color var(--transition-fast), color var(--transition-fast);
  }
  .pillar-nav__link:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }
  .pillar-nav__item--current .pillar-nav__link {
    background: var(--color-accent-fire);
    color: white;
  }
  .pillar-nav__number {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: var(--text-xs);
    opacity: 0.5;
    min-width: 1.5em;
  }
  .pillar-nav__item--current .pillar-nav__number {
    opacity: 1;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/content/PillarNav.astro
git commit -m "feat(web): add PillarNav component for SEO cluster navigation"
```

---

### Task 5: Create `ComparisonPrice.astro` Component

**Files:**
- Create: `web/src/components/comparison/ComparisonPrice.astro`

- [ ] **Step 1: Write the component**

Write `web/src/components/comparison/ComparisonPrice.astro`:
```astro
---
/**
 * ComparisonPrice — Tabella prezzi con link affiliati per pagine "vs".
 * Click tracciati come evento Umami 'affiliate_click'.
 */
import type { AffiliateLink } from '@lib/types';

interface ProductPrice {
  productName: string;
  affiliateLinks: AffiliateLink[];
}

interface Props {
  products: ProductPrice[];
  translations: Record<string, any>;
}

const { products, translations } = Astro.props;
const hasProducts = products && products.length > 0 && products.some(p => p.affiliateLinks.length > 0);
---

{hasProducts && (
  <section class="comparison-price">
    <h3 class="comparison-price__title">
      {translations?.comparison?.priceComparison || "Price Comparison"}
    </h3>

    {/* Desktop: tabella */}
    <div class="comparison-price__table-wrap hidden md:block">
      <table class="comparison-price__table">
        <thead>
          <tr>
            <th>{translations?.comparison?.product || "Product"}</th>
            <th>{translations?.comparison?.retailer || "Retailer"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map(product =>
            product.affiliateLinks.map((link, i) => (
              <tr>
                {i === 0 && (
                  <td rowspan={product.affiliateLinks.length} class="comparison-price__product-name">
                    {product.productName}
                  </td>
                )}
                <td>{link.retailer}</td>
                <td>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    class="comparison-price__buy-btn"
                    data-umami-event="affiliate_click"
                    data-umami-event-product={product.productName}
                    data-umami-event-retailer={link.retailer}
                  >
                    {translations?.comparison?.checkPrice || "Check Price"} →
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Mobile: cards */}
    <div class="comparison-price__cards md:hidden">
      {products.map(product => (
        <div class="comparison-price__card">
          <h4 class="comparison-price__card-name">{product.productName}</h4>
          <div class="comparison-price__card-links">
            {product.affiliateLinks.map(link => (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                class="comparison-price__buy-btn"
                data-umami-event="affiliate_click"
                data-umami-event-product={product.productName}
                data-umami-event-retailer={link.retailer}
              >
                {link.retailer} →
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>

    <p class="comparison-price__disclaimer">
      {translations?.review?.affiliateDisclaimer || "Links may earn us a commission at no extra cost to you."}
    </p>
  </section>
)}

<style>
  .comparison-price {
    margin-bottom: var(--space-12);
    padding: var(--space-6) var(--space-8);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-subtle);
  }
  .comparison-price__title {
    font-family: var(--font-heading);
    font-size: var(--text-lg);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-primary);
    margin-bottom: var(--space-5);
  }
  .comparison-price__table {
    width: 100%;
    border-collapse: collapse;
  }
  .comparison-price__table th {
    text-align: left;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .comparison-price__table td {
    padding: var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
  }
  .comparison-price__product-name {
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .comparison-price__buy-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--color-accent-fire);
    color: white;
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: background-color var(--transition-fast);
    white-space: nowrap;
  }
  .comparison-price__buy-btn:hover {
    background: var(--color-accent-amber);
  }
  .comparison-price__cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .comparison-price__card {
    padding: var(--space-4);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
  }
  .comparison-price__card-name {
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
  }
  .comparison-price__card-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .comparison-price__disclaimer {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    margin-top: var(--space-4);
  }
</style>
```

- [ ] **Step 2: Add translation keys for comparison pricing**

In `web/src/i18n/en.json`:
```json
"comparison.priceComparison": "Price Comparison",
"comparison.product": "Product",
"comparison.retailer": "Retailer",
"comparison.checkPrice": "Check Price"
```

In `web/src/i18n/it.json`:
```json
"comparison.priceComparison": "Confronto Prezzi",
"comparison.product": "Prodotto",
"comparison.retailer": "Rivenditore",
"comparison.checkPrice": "Vedi Prezzo"
```

In `web/src/i18n/es.json`:
```json
"comparison.priceComparison": "Comparación de Precios",
"comparison.product": "Producto",
"comparison.retailer": "Vendedor",
"comparison.checkPrice": "Ver Precio"
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/comparison/ComparisonPrice.astro web/src/i18n/
git commit -m "feat(web): add ComparisonPrice component with responsive table/cards"
```

---

### Task 6: Update `ReviewJsonLd.astro` with Offers Schema

**Files:**
- Modify: `web/src/components/review/ReviewJsonLd.astro`

- [ ] **Step 1: Add offers to JSON-LD**

In `web/src/components/review/ReviewJsonLd.astro`, after the category block (around line 56), add:

```astro
// Aggiungi offers con affiliate links
const affiliateLinks = review.product?.affiliate_links;
if (affiliateLinks && affiliateLinks.length > 0) {
  jsonLd.offers = affiliateLinks.map((link: any) => ({
    '@type': 'Offer',
    url: link.url,
    seller: {
      '@type': 'Organization',
      name: link.retailer,
    },
    availability: 'https://schema.org/InStock',
  }));
} else if (review.product?.affiliate_url) {
  jsonLd.offers = {
    '@type': 'Offer',
    url: review.product.affiliate_url,
    availability: 'https://schema.org/InStock',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/review/ReviewJsonLd.astro
git commit -m "feat(web): add Offer schema to ReviewJsonLd for affiliate links"
```

---

### Summary

After completing this plan:
- 4 new components: WhereToBuy, FaqSection, PillarNav, ComparisonPrice
- WhereToBuy integrated into all 3 locale review pages (EN/IT/ES)
- ReviewJsonLd updated with Offer schema for affiliate links
- Umami custom event tracking on all affiliate clicks
- Translation keys added for all 3 locales
- All components use existing design tokens (no new CSS vars)
- All components are server-rendered (no JS hydration cost)
- Responsive: tables on desktop, cards on mobile
