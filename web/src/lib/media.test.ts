import { describe, it, expect, vi } from 'vitest';

// Mock il modulo strapi che usa import.meta.env
vi.mock('./strapi', () => ({
  STRAPI_URL: 'http://localhost:1337',
}));

// Mock env var PUBLIC_CMS_URL cosi' i test sono deterministici anche su Windows
// dove import.meta.env.PUBLIC_CMS_URL puo' non essere settata. Il modulo media
// usa il fallback 'https://cms.bbq-experience.com' quando assente.

import {
  getStrapiMediaURL,
  getStrapiImageFormats,
  getStrapiMediaAlt,
  buildStrapiSrcset,
} from './media';

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

// ─── Phase 10.1 — Cloudflare Image Transformations ──────────────────────────

describe('getStrapiMediaURL con trasformazione Cloudflare', () => {
  it('emette URL /cdn-cgi/image/ quando viene passata width', () => {
    // Quando chiamante passa width, helper deve emettere URL Cloudflare transform
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = getStrapiMediaURL(media, { width: 640 });
    expect(result).toContain('/cdn-cgi/image/');
    expect(result).toContain('width=640');
    expect(result).toContain('quality=75');
    expect(result).toContain('format=auto');
    // Il source URL assoluto deve seguire il prefisso /cdn-cgi/image/<opts>/
    expect(result).toMatch(/\/https:\/\/[^/]*\/uploads\/hero\.jpg$/);
  });

  it('ritorna URL raw senza width (backward compat per chiamanti esistenti)', () => {
    // Tutti i chiamanti legacy senza opts continuano a ricevere URL raw Strapi
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = getStrapiMediaURL(media);
    expect(result).not.toContain('/cdn-cgi/image/');
  });

  it('rispetta il flag raw per bypassare la trasformazione (og:image, favicon, SVG)', () => {
    // Flag raw: bypass trasformazione anche se width e' passata. Mitigazione T-10.1-06.
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = getStrapiMediaURL(media, { width: 640, raw: true });
    expect(result).not.toContain('/cdn-cgi/image/');
    expect(result).toContain('/uploads/hero.jpg');
  });

  it('rispetta quality/format/fit personalizzati con ordine deterministico', () => {
    // Ordine deterministico degli option: width -> quality -> format -> fit.
    // Critico per il caching a livello edge (stessa URL = stessa cache key).
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = getStrapiMediaURL(media, {
      width: 640,
      quality: 90,
      format: 'webp',
      fit: 'cover',
    });
    expect(result).toContain('width=640');
    expect(result).toContain('quality=90');
    expect(result).toContain('format=webp');
    expect(result).toContain('fit=cover');
    // Verifica ordine deterministico: width viene prima di quality, quality prima di format, format prima di fit
    const widthIdx = result!.indexOf('width=640');
    const qualityIdx = result!.indexOf('quality=90');
    const formatIdx = result!.indexOf('format=webp');
    const fitIdx = result!.indexOf('fit=cover');
    expect(widthIdx).toBeLessThan(qualityIdx);
    expect(qualityIdx).toBeLessThan(formatIdx);
    expect(formatIdx).toBeLessThan(fitIdx);
  });

  it('ritorna null per media null anche con opts', () => {
    expect(getStrapiMediaURL(null, { width: 640 })).toBeNull();
  });

  it('applica la trasformazione anche quando url e gia assoluta', () => {
    // L'URL assoluto NON deve bypassare la trasformazione (solo raw bypassa)
    const media = { url: 'https://cms.bbq-experience.com/uploads/abc.jpg' } as any;
    const result = getStrapiMediaURL(media, { width: 640 });
    expect(result).toContain('/cdn-cgi/image/width=640');
    expect(result).toContain('https://cms.bbq-experience.com/uploads/abc.jpg');
  });

  it('URL-encodes origin con spazi o caratteri non sicuri (mitigazione T-10.1-05)', () => {
    // Un nome file con spazi deve essere encoded via encodeURI per evitare
    // tampering/path-injection in URL verso l'edge Cloudflare.
    const media = { url: '/uploads/file with spaces.jpg' } as any;
    const result = getStrapiMediaURL(media, { width: 640 });
    expect(result).toContain('/cdn-cgi/image/');
    // encodeURI trasforma ' ' -> '%20' ma lascia '/' e ':' intatti
    expect(result).toContain('%20');
    expect(result).not.toMatch(/file with spaces/);
  });
});

describe('buildStrapiSrcset', () => {
  it('costruisce srcset con widths di default [320,640,960,1280]', () => {
    // Default: 4 entry responsive standard Cloudflare.
    // Le entry sono separate da ", " (virgola+spazio) per distinguerle dalle virgole
    // interne agli option Cloudflare (width=W,quality=Q,format=F).
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = buildStrapiSrcset(media);
    expect(result).not.toBeNull();
    const entries = result!.split(', ');
    expect(entries.length).toBe(4);
    expect(result).toContain('320w');
    expect(result).toContain('640w');
    expect(result).toContain('960w');
    expect(result).toContain('1280w');
  });

  it('costruisce srcset con widths custom', () => {
    // Widths custom: utile per card/thumbnail (non servono i grandi)
    const media = { url: '/uploads/hero.jpg' } as any;
    const result = buildStrapiSrcset(media, [320, 640]);
    expect(result).not.toBeNull();
    expect(result!.split(', ').length).toBe(2);
    expect(result).toContain('320w');
    expect(result).toContain('640w');
    // Non devono esserci le widths default non richieste
    expect(result).not.toContain('960w');
    expect(result).not.toContain('1280w');
  });

  it('ritorna null per media null', () => {
    expect(buildStrapiSrcset(null)).toBeNull();
  });
});
