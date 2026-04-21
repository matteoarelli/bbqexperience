// Test per le utilita SEO (robots noindex e canonical URL) — BBQ Experience
import { describe, it, expect } from 'vitest';
import { getRobotsContent, getCanonicalUrl } from '../src/lib/seo-utils';

describe('getRobotsContent', () => {
  it('ritorna "index, follow" quando noindex e false', () => {
    expect(getRobotsContent(false)).toBe('index, follow');
  });

  it('ritorna "noindex, follow" quando noindex e true', () => {
    expect(getRobotsContent(true)).toBe('noindex, follow');
  });

  it('ritorna "index, follow" per default (false)', () => {
    // Simula il comportamento default del componente Astro
    const defaultValue = false;
    expect(getRobotsContent(defaultValue)).toBe('index, follow');
  });
});

describe('getCanonicalUrl', () => {
  const siteUrl = 'https://bbq-experience.com';

  it('genera URL canonico senza query params (pagina non filtrata)', () => {
    expect(getCanonicalUrl(siteUrl, '/en/reviews/')).toBe(
      'https://bbq-experience.com/en/reviews/',
    );
  });

  it('genera URL canonico con query params (es. paginazione)', () => {
    expect(getCanonicalUrl(siteUrl, '/en/reviews/', 'page=2')).toBe(
      'https://bbq-experience.com/en/reviews/?page=2',
    );
  });

  it('ignora canonicalQuery se undefined', () => {
    expect(getCanonicalUrl(siteUrl, '/it/recensioni/', undefined)).toBe(
      'https://bbq-experience.com/it/recensioni/',
    );
  });

  it('ignora canonicalQuery se stringa vuota', () => {
    expect(getCanonicalUrl(siteUrl, '/es/resenas/', '')).toBe(
      'https://bbq-experience.com/es/resenas/',
    );
  });
});
