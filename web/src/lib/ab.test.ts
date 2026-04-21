// Test per la libreria A/B testing — assegnazione variante e rilevamento bot
import { describe, it, expect } from 'vitest';
import { assignVariant, isBot, generateAbId, VARIANT_NAMES } from './ab';

describe('assignVariant', () => {
  it('restituisce lo stesso valore per gli stessi input (deterministico)', () => {
    const result1 = assignVariant('abc123', 'post-doc-1', 2);
    const result2 = assignVariant('abc123', 'post-doc-1', 2);
    const result3 = assignVariant('abc123', 'post-doc-1', 2);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it('restituisce valori potenzialmente diversi per postDocId diversi', () => {
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      results.add(assignVariant('abc123', `post-doc-${i}`, 2));
    }
    // Con 50 post diversi e 2 varianti, dovremmo avere entrambi i valori
    expect(results.size).toBe(2);
  });

  it('distribuisce equamente su 10000 input casuali (2 varianti, 40-60%)', () => {
    const counts = [0, 0];
    for (let i = 0; i < 10000; i++) {
      const abId = `user-${i}-${Math.random().toString(36).slice(2)}`;
      const variant = assignVariant(abId, 'post-fixed', 2);
      counts[variant]++;
    }
    // Ogni bucket dovrebbe avere tra 40% e 60%
    expect(counts[0]).toBeGreaterThan(3500);
    expect(counts[0]).toBeLessThan(6500);
    expect(counts[1]).toBeGreaterThan(3500);
    expect(counts[1]).toBeLessThan(6500);
  });

  it('restituisce valori nel range [0, variantCount) per 2 varianti', () => {
    for (let i = 0; i < 100; i++) {
      const result = assignVariant(`user-${i}`, 'post-1', 2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(2);
    }
  });

  it('restituisce valori nel range [0, variantCount) per 3 varianti', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const result = assignVariant(`user-${i}`, 'post-1', 3);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(3);
      seen.add(result);
    }
    // Con 200 input e 3 varianti, dovremmo vedere tutti e 3 i valori
    expect(seen.size).toBe(3);
  });
});

describe('isBot', () => {
  it('rileva Googlebot', () => {
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
  });

  it('rileva Bingbot', () => {
    expect(isBot('Bingbot/2.0')).toBe(true);
  });

  it('rileva GPTBot', () => {
    expect(isBot('GPTBot/1.0')).toBe(true);
  });

  it('restituisce false per browser normali', () => {
    expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
  });

  it('restituisce false per stringa vuota', () => {
    expect(isBot('')).toBe(false);
  });
});

describe('generateAbId', () => {
  it('genera stringhe di 21 caratteri', () => {
    const id = generateAbId();
    expect(id).toHaveLength(21);
  });

  it('genera ID unici', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateAbId()));
    expect(ids.size).toBe(100);
  });
});

describe('VARIANT_NAMES', () => {
  it('contiene i nomi corretti in ordine', () => {
    expect(VARIANT_NAMES).toEqual(['control', 'a', 'b', 'c']);
  });
});
