// Helper per la risoluzione degli URL media di Strapi — BBQ Experience
// Gestisce sia URL relativi (dev locale) che assoluti (produzione)
import type { StrapiMedia } from './types';
import { STRAPI_URL } from './strapi';

// URL pubblico del CMS per le immagini (accessibile dal browser)
const PUBLIC_CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'https://cms.bbq-experience.com';

/**
 * Risolve l'URL di un media Strapi in URL assoluto pubblico.
 * Se il media e null/undefined ritorna null.
 * Se l'URL inizia con 'http' lo ritorna cosi com'e.
 * Altrimenti antepone l'URL pubblico del CMS (non quello interno Docker).
 */
export function getStrapiMediaURL(media: StrapiMedia | null | undefined): string | null {
  if (!media?.url) {
    return null;
  }

  if (media.url.startsWith('http')) {
    return media.url;
  }

  return `${PUBLIC_CMS_URL}${media.url}`;
}

/**
 * Ritorna gli URL assoluti per ogni formato immagine disponibile.
 * I formati possibili sono: thumbnail, small, medium, large.
 */
export function getStrapiImageFormats(
  media: StrapiMedia | null | undefined,
): { thumbnail?: string; small?: string; medium?: string; large?: string } {
  if (!media?.formats) {
    return {};
  }

  const result: { thumbnail?: string; small?: string; medium?: string; large?: string } = {};

  for (const key of ['thumbnail', 'small', 'medium', 'large'] as const) {
    const format = media.formats[key];
    if (format) {
      result[key] = format.url.startsWith('http')
        ? format.url
        : `${PUBLIC_CMS_URL}${format.url}`;
    }
  }

  return result;
}

/**
 * Ritorna il testo alternativo del media, o stringa vuota come fallback.
 */
export function getStrapiMediaAlt(media: StrapiMedia | null | undefined): string {
  return media?.alternativeText ?? '';
}
