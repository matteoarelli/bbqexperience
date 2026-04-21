// Libreria utilita filtri per le recensioni — BBQ Experience
// Gestisce parsing URL, costruzione query Strapi, conteggio facet e definizioni bucket prezzo

// ─── Tipi ─────────────────────────────────────────────────────────────────────

/** Parametri filtro estratti dalla query string */
export interface FilterParams {
  brand: string | null;
  category: string | null;
  score: string | null;
  price: string | null;
}

/** Conteggi per ogni facet (usati nella sidebar filtri) */
export interface FacetCounts {
  brands: Record<string, number>;
  categories: Record<string, number>;
  priceBuckets: Record<string, number>;
  scoreThresholds: Record<string, number>;
}

/** Definizione di un bucket di prezzo con estremi min/max */
interface PriceBucket {
  min: number | null;
  max: number | null;
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

/** Bucket di prezzo con range in EUR */
export const PRICE_BUCKETS: Record<string, PriceBucket> = {
  'under-300': { min: null, max: 299.99 },
  '300-800': { min: 300, max: 800 },
  '800-1500': { min: 800, max: 1500 },
  'over-1500': { min: 1500.01, max: null },
} as const;

/** Etichette localizzate per i bucket di prezzo */
export const PRICE_BUCKET_LABELS: Record<string, Record<string, string>> = {
  'under-300': { en: 'Under EUR300', it: 'Sotto EUR300', es: 'Menos de EUR300' },
  '300-800': { en: 'EUR300 - EUR800', it: 'EUR300 - EUR800', es: 'EUR300 - EUR800' },
  '800-1500': { en: 'EUR800 - EUR1500', it: 'EUR800 - EUR1500', es: 'EUR800 - EUR1500' },
  'over-1500': { en: 'Over EUR1500', it: 'Oltre EUR1500', es: 'Mas de EUR1500' },
} as const;

/** Soglie di punteggio Pitmaster per il filtro score */
export const SCORE_THRESHOLDS = [
  { value: '8', label: '8+' },
  { value: '7', label: '7+' },
  { value: '6', label: '6+' },
] as const;

/** Valori di score validi per la validazione input */
export const VALID_SCORES = ['6', '7', '8'] as const;

// ─── Funzioni ─────────────────────────────────────────────────────────────────

/**
 * Estrae e valida i parametri filtro dalla query string.
 * Ritorna null per valori non validi (score fuori range, price bucket inesistente).
 */
export function parseFilterParams(searchParams: URLSearchParams): FilterParams {
  const brand = searchParams.get('brand') || null;
  const category = searchParams.get('category') || null;

  // Validazione score: deve essere un valore in VALID_SCORES
  const rawScore = searchParams.get('score');
  const score = rawScore && (VALID_SCORES as readonly string[]).includes(rawScore) ? rawScore : null;

  // Validazione price: deve essere una chiave di PRICE_BUCKETS
  const rawPrice = searchParams.get('price');
  const price = rawPrice && rawPrice in PRICE_BUCKETS ? rawPrice : null;

  return { brand, category, score, price };
}

/**
 * Verifica se almeno un filtro e attivo (non null).
 */
export function hasActiveFilters(params: FilterParams): boolean {
  return Object.values(params).some((v) => v !== null);
}

/**
 * Costruisce un URL con query string dai parametri filtro non-null.
 * I parametri null/undefined vengono omessi.
 */
export function buildFilterUrl(basePath: string, params: Partial<FilterParams>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      searchParams.set(key, value);
    }
  }

  const qs = searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Costruisce l'oggetto filtri nested per l'API REST di Strapi v5.
 * Merge correttamente filtri multipli sotto il namespace `product`.
 */
export function buildStrapiFilters(params: FilterParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const productFilters: Record<string, unknown> = {};

  // Filtro brand -> product.brand_relation.slug
  if (params.brand) {
    productFilters['brand_relation'] = { slug: { $eq: params.brand } };
  }

  // Filtro categoria -> product.product_category.slug
  if (params.category) {
    productFilters['product_category'] = { slug: { $eq: params.category } };
  }

  // Filtro prezzo -> product.price con range dal bucket
  if (params.price && params.price in PRICE_BUCKETS) {
    const bucket = PRICE_BUCKETS[params.price];
    const priceFilter: Record<string, number> = {};
    if (bucket.min !== null) priceFilter['$gte'] = bucket.min;
    if (bucket.max !== null) priceFilter['$lte'] = bucket.max;
    productFilters['price'] = priceFilter;
  }

  // Merge filtri product se presenti
  if (Object.keys(productFilters).length > 0) {
    filters['product'] = productFilters;
  }

  // Filtro score -> score_overall.$gte (livello root, non sotto product)
  if (params.score) {
    filters['score_overall'] = { $gte: parseFloat(params.score) };
  }

  return filters;
}

/**
 * Calcola i conteggi per ogni facet a partire dalla lista di recensioni.
 * Usato per mostrare i numeri accanto a ogni opzione filtro nella sidebar.
 */
export function computeFacetCounts(
  reviews: Array<{
    score_overall: number;
    product: {
      brand_relation?: { slug: string } | null;
      product_category?: { slug: string } | null;
      price?: number | null;
    } | null;
  }>,
): FacetCounts {
  const brands: Record<string, number> = {};
  const categories: Record<string, number> = {};

  // Inizializza i bucket prezzo a zero
  const priceBuckets: Record<string, number> = {};
  for (const key of Object.keys(PRICE_BUCKETS)) {
    priceBuckets[key] = 0;
  }

  // Inizializza le soglie score a zero
  const scoreThresholds: Record<string, number> = {};
  for (const threshold of SCORE_THRESHOLDS) {
    scoreThresholds[threshold.value] = 0;
  }

  for (const review of reviews) {
    // Conteggio brand
    const brandSlug = review.product?.brand_relation?.slug;
    if (brandSlug) {
      brands[brandSlug] = (brands[brandSlug] || 0) + 1;
    }

    // Conteggio categorie
    const categorySlug = review.product?.product_category?.slug;
    if (categorySlug) {
      categories[categorySlug] = (categories[categorySlug] || 0) + 1;
    }

    // Conteggio price bucket
    const price = review.product?.price;
    if (price != null) {
      for (const [key, bucket] of Object.entries(PRICE_BUCKETS)) {
        const aboveMin = bucket.min === null || price >= bucket.min;
        const belowMax = bucket.max === null || price <= bucket.max;
        if (aboveMin && belowMax) {
          priceBuckets[key]++;
        }
      }
    }

    // Conteggio soglie score (cumulativo: 7+ include anche 8+)
    for (const threshold of SCORE_THRESHOLDS) {
      if (review.score_overall >= parseFloat(threshold.value)) {
        scoreThresholds[threshold.value]++;
      }
    }
  }

  return { brands, categories, priceBuckets, scoreThresholds };
}
