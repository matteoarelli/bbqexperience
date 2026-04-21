// Test per la libreria di utilita filtri — BBQ Experience
import { describe, it, expect } from 'vitest';
import {
  PRICE_BUCKETS,
  SCORE_THRESHOLDS,
  VALID_SCORES,
  buildFilterUrl,
  buildStrapiFilters,
  computeFacetCounts,
  parseFilterParams,
  hasActiveFilters,
  type FilterParams,
} from '../src/lib/filters';

describe('PRICE_BUCKETS', () => {
  it('under-300 ha min null e max 299.99', () => {
    expect(PRICE_BUCKETS['under-300']).toEqual({ min: null, max: 299.99 });
  });

  it('300-800 ha min 300 e max 800', () => {
    expect(PRICE_BUCKETS['300-800']).toEqual({ min: 300, max: 800 });
  });

  it('800-1500 ha min 800 e max 1500', () => {
    expect(PRICE_BUCKETS['800-1500']).toEqual({ min: 800, max: 1500 });
  });

  it('over-1500 ha min 1500.01 e max null', () => {
    expect(PRICE_BUCKETS['over-1500']).toEqual({ min: 1500.01, max: null });
  });
});

describe('parseFilterParams', () => {
  it('estrae brand e score da URLSearchParams', () => {
    const params = new URLSearchParams('brand=weber&score=7');
    const result = parseFilterParams(params);
    expect(result).toEqual({
      brand: 'weber',
      category: null,
      score: '7',
      price: null,
    });
  });

  it('ritorna null per score non valido (es. 99)', () => {
    const params = new URLSearchParams('score=99');
    const result = parseFilterParams(params);
    expect(result.score).toBeNull();
  });

  it('ritorna null per price non valido', () => {
    const params = new URLSearchParams('price=invalid');
    const result = parseFilterParams(params);
    expect(result.price).toBeNull();
  });

  it('ritorna tutti null per URLSearchParams vuoti', () => {
    const params = new URLSearchParams('');
    const result = parseFilterParams(params);
    expect(result).toEqual({
      brand: null,
      category: null,
      score: null,
      price: null,
    });
  });
});

describe('hasActiveFilters', () => {
  it('ritorna false quando tutti i parametri sono null', () => {
    const params: FilterParams = { brand: null, category: null, score: null, price: null };
    expect(hasActiveFilters(params)).toBe(false);
  });

  it('ritorna true quando almeno un parametro e valorizzato', () => {
    const params: FilterParams = { brand: 'weber', category: null, score: null, price: null };
    expect(hasActiveFilters(params)).toBe(true);
  });
});

describe('buildFilterUrl', () => {
  it('costruisce URL con parametri non-null', () => {
    const result = buildFilterUrl('/en/reviews/', { brand: 'weber', category: null, score: '7', price: null });
    expect(result).toBe('/en/reviews/?brand=weber&score=7');
  });

  it('ritorna il basePath senza query se tutti i parametri sono null/undefined', () => {
    const result = buildFilterUrl('/en/reviews/', {});
    expect(result).toBe('/en/reviews/');
  });
});

describe('buildStrapiFilters', () => {
  it('costruisce filtro per brand (product.brand_relation.slug)', () => {
    const result = buildStrapiFilters({ brand: 'weber', category: null, score: null, price: null });
    expect(result).toEqual({
      product: {
        brand_relation: { slug: { $eq: 'weber' } },
      },
    });
  });

  it('costruisce filtro per category (product.product_category.slug)', () => {
    const result = buildStrapiFilters({ brand: null, category: 'grill', score: null, price: null });
    expect(result).toEqual({
      product: {
        product_category: { slug: { $eq: 'grill' } },
      },
    });
  });

  it('costruisce filtro per score (score_overall.$gte)', () => {
    const result = buildStrapiFilters({ brand: null, category: null, score: '7', price: null });
    expect(result).toEqual({
      score_overall: { $gte: 7 },
    });
  });

  it('costruisce filtro per price bucket 300-800', () => {
    const result = buildStrapiFilters({ brand: null, category: null, score: null, price: '300-800' });
    expect(result).toEqual({
      product: {
        price: { $gte: 300, $lte: 800 },
      },
    });
  });

  it('costruisce filtro per price bucket under-300 (solo $lte)', () => {
    const result = buildStrapiFilters({ brand: null, category: null, score: null, price: 'under-300' });
    expect(result).toEqual({
      product: {
        price: { $lte: 299.99 },
      },
    });
  });

  it('costruisce filtro per price bucket over-1500 (solo $gte)', () => {
    const result = buildStrapiFilters({ brand: null, category: null, score: null, price: 'over-1500' });
    expect(result).toEqual({
      product: {
        price: { $gte: 1500.01 },
      },
    });
  });

  it('merge correttamente brand + category + price sotto product', () => {
    const result = buildStrapiFilters({ brand: 'weber', category: 'grill', score: '7', price: '300-800' });
    expect(result).toEqual({
      product: {
        brand_relation: { slug: { $eq: 'weber' } },
        product_category: { slug: { $eq: 'grill' } },
        price: { $gte: 300, $lte: 800 },
      },
      score_overall: { $gte: 7 },
    });
  });

  it('ritorna oggetto vuoto se nessun filtro attivo', () => {
    const result = buildStrapiFilters({ brand: null, category: null, score: null, price: null });
    expect(result).toEqual({});
  });
});

describe('computeFacetCounts', () => {
  const mockReviews = [
    {
      score_overall: 8.2,
      product: {
        brand_relation: { slug: 'weber' },
        product_category: { slug: 'grill' },
        price: 500,
      },
    },
    {
      score_overall: 7.1,
      product: {
        brand_relation: { slug: 'weber' },
        product_category: { slug: 'smoker' },
        price: 1200,
      },
    },
    {
      score_overall: 6.5,
      product: {
        brand_relation: { slug: 'traeger' },
        product_category: { slug: 'grill' },
        price: 200,
      },
    },
    {
      score_overall: 5.9,
      product: {
        brand_relation: null,
        product_category: null,
        price: null,
      },
    },
    {
      score_overall: 7.8,
      product: null,
    },
  ];

  it('conta correttamente i brand', () => {
    const counts = computeFacetCounts(mockReviews);
    expect(counts.brands['weber']).toBe(2);
    expect(counts.brands['traeger']).toBe(1);
  });

  it('conta correttamente le categorie', () => {
    const counts = computeFacetCounts(mockReviews);
    expect(counts.categories['grill']).toBe(2);
    expect(counts.categories['smoker']).toBe(1);
  });

  it('conta correttamente i price bucket', () => {
    const counts = computeFacetCounts(mockReviews);
    expect(counts.priceBuckets['under-300']).toBe(1); // 200
    expect(counts.priceBuckets['300-800']).toBe(1);   // 500
    expect(counts.priceBuckets['800-1500']).toBe(1);   // 1200
    expect(counts.priceBuckets['over-1500']).toBe(0);
  });

  it('conta correttamente le soglie di score', () => {
    const counts = computeFacetCounts(mockReviews);
    // 8+ : score 8.2 => 1
    expect(counts.scoreThresholds['8']).toBe(1);
    // 7+ : score 8.2, 7.1, 7.8 => 3
    expect(counts.scoreThresholds['7']).toBe(3);
    // 6+ : score 8.2, 7.1, 6.5, 7.8 => 4
    expect(counts.scoreThresholds['6']).toBe(4);
  });

  it('ritorna conteggi a zero per array vuoto', () => {
    const counts = computeFacetCounts([]);
    expect(counts.brands).toEqual({});
    expect(counts.categories).toEqual({});
    expect(counts.priceBuckets).toEqual({
      'under-300': 0,
      '300-800': 0,
      '800-1500': 0,
      'over-1500': 0,
    });
    expect(counts.scoreThresholds).toEqual({
      '6': 0,
      '7': 0,
      '8': 0,
    });
  });
});
