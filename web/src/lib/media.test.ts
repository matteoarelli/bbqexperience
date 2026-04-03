import { describe, it, expect, vi } from 'vitest';

// Mock il modulo strapi che usa import.meta.env
vi.mock('./strapi', () => ({
  STRAPI_URL: 'http://localhost:1337',
}));

import { getStrapiMediaURL, getStrapiImageFormats, getStrapiMediaAlt } from './media';

describe('getStrapiMediaURL', () => {
  it('ritorna null per media null', () => {
    expect(getStrapiMediaURL(null)).toBeNull();
  });

  it('ritorna null per media senza url', () => {
    expect(getStrapiMediaURL({} as any)).toBeNull();
  });

  it('ritorna URL assoluto se gia completo', () => {
    const media = { url: 'https://example.com/image.jpg' } as any;
    expect(getStrapiMediaURL(media)).toBe('https://example.com/image.jpg');
  });

  it('antepone PUBLIC_CMS_URL per URL relativi', () => {
    const media = { url: '/uploads/image.jpg' } as any;
    const result = getStrapiMediaURL(media);
    expect(result).toContain('/uploads/image.jpg');
    expect(result?.startsWith('http')).toBe(true);
  });
});

describe('getStrapiImageFormats', () => {
  it('ritorna oggetto vuoto per media null', () => {
    expect(getStrapiImageFormats(null)).toEqual({});
  });

  it('ritorna oggetto vuoto per media senza formats', () => {
    expect(getStrapiImageFormats({ url: '/img.jpg' } as any)).toEqual({});
  });

  it('ritorna formati disponibili con URL assoluti', () => {
    const media = {
      url: '/uploads/img.jpg',
      formats: {
        thumbnail: { url: '/uploads/thumbnail_img.jpg' },
        small: { url: '/uploads/small_img.jpg' },
      },
    } as any;
    const result = getStrapiImageFormats(media);
    expect(result.thumbnail).toContain('thumbnail_img.jpg');
    expect(result.small).toContain('small_img.jpg');
    expect(result.medium).toBeUndefined();
  });
});

describe('getStrapiMediaAlt', () => {
  it('ritorna stringa vuota per media null', () => {
    expect(getStrapiMediaAlt(null)).toBe('');
  });

  it('ritorna alternativeText se presente', () => {
    const media = { alternativeText: 'BBQ grill' } as any;
    expect(getStrapiMediaAlt(media)).toBe('BBQ grill');
  });
});
