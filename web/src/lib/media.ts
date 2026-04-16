// Helper per la risoluzione degli URL media di Strapi — BBQ Experience
// Gestisce URL relativi/assoluti e, opzionalmente, la trasformazione via Cloudflare
// Image Transformations (Phase 10.1 — chiude DEBT-03).
import type { StrapiMedia } from './types';

// URL pubblico del CMS per le immagini (accessibile dal browser)
const PUBLIC_CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'https://cms.bbq-experience.com';

// Zone Cloudflare proxied dove il /cdn-cgi/image/ e disponibile.
// Verificato live in Phase 10.1 Plan 01 (orange-cloud + Transformations + Sources allowlist).
// Hardcoded per semplicita: env-izzazione rimandata a futura iterazione se serve staging
// (vedi 10.1-RESEARCH.md Open Question 4).
const TRANSFORM_ZONE = 'https://bbq-experience.com';

/**
 * Opzioni di trasformazione Cloudflare per `getStrapiMediaURL`.
 *  - width   : larghezza target (px). Obbligatoria per attivare la trasformazione.
 *  - quality : qualita JPEG/WebP/AVIF (1-100). Default 75 (sweet-spot per fotografia BBQ).
 *  - format  : 'auto' (CF negozia AVIF/WebP/JPEG via Accept header), 'avif', 'webp', 'jpeg'. Default 'auto'.
 *  - fit     : strategia di crop/scale (cover/contain/scale-down/crop).
 *  - raw     : se true bypassa completamente la trasformazione (per og:image, favicon, SVG).
 */
export interface TransformOptions {
  width?: number;
  quality?: number;
  format?: 'auto' | 'avif' | 'webp' | 'jpeg';
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop';
  raw?: boolean;
}

/**
 * Risolve l'URL di un media Strapi in URL assoluto pubblico, opzionalmente
 * trasformato via Cloudflare Image Transformations.
 *
 * Backward compatible: chiamanti senza `opts` (o senza `opts.width`) ricevono
 * l'URL raw esattamente come prima.
 *
 * Con `{width:W}`: emette `<zone>/cdn-cgi/image/width=W,quality=75,format=auto/<origin>`.
 * Con `{raw:true}`: forza URL raw Strapi anche se width e settata (og:image, scrapers).
 *
 * Esempio:
 *   getStrapiMediaURL({url:'/uploads/hero.jpg'}, {width:1280})
 *   -> 'https://bbq-experience.com/cdn-cgi/image/width=1280,quality=75,format=auto/https://cms.bbq-experience.com/uploads/hero.jpg'
 */
export function getStrapiMediaURL(
  media: StrapiMedia | null | undefined,
  opts: TransformOptions = {},
): string | null {
  if (!media?.url) {
    return null;
  }

  // Source URL assoluto (sempre punta all'origine Strapi)
  const sourceUrl = media.url.startsWith('http')
    ? media.url
    : `${PUBLIC_CMS_URL}${media.url}`;

  // Bypass esplicito (og:image, favicon, SVG) o assenza di width -> URL raw.
  // Nota: senza width la trasformazione non ha valore (nessun resize) e aggiunge solo
  // overhead di routing edge. Preserva backward compat per tutti i ~29 call-site esistenti.
  if (opts.raw || !opts.width) {
    return sourceUrl;
  }

  // Costruzione deterministica degli option param. Ordine fisso -> stessa cache key su CF edge.
  // Pattern CF: /cdn-cgi/image/<key1=v1,key2=v2,...>/<absolute-source-url>
  const parts: string[] = [`width=${opts.width}`];
  parts.push(`quality=${opts.quality ?? 75}`);
  parts.push(`format=${opts.format ?? 'auto'}`);
  if (opts.fit) {
    parts.push(`fit=${opts.fit}`);
  }

  // Mitigazione threat T-10.1-05 (path-parameter injection via StrapiMedia.url hostile):
  // encodeURI lascia '/' e ':' intatti (richiesti da CF docs) ma encoda spazi e caratteri
  // non-ASCII che altrimenti romperebbero l'URL o permetterebbero injection nei param.
  const encodedSource = encodeURI(sourceUrl);

  return `${TRANSFORM_ZONE}/cdn-cgi/image/${parts.join(',')}/${encodedSource}`;
}

/**
 * Costruisce una srcset responsive per `<img srcset>` sfruttando la stessa trasformazione CF.
 * Emette N entry del tipo `<transformed-url-Nw> Nw` separate da ", ".
 *
 * Default widths `[320, 640, 960, 1280]` coprono la gamma di viewport raccomandata
 * da Cloudflare docs (mobile -> desktop). Passa widths custom per card/thumbnail.
 *
 * Esempio:
 *   buildStrapiSrcset(media, [320,640,960])
 *   -> '<url-320w> 320w, <url-640w> 640w, <url-960w> 960w'
 */
export function buildStrapiSrcset(
  media: StrapiMedia | null | undefined,
  widths: number[] = [320, 640, 960, 1280],
): string | null {
  if (!media?.url) {
    return null;
  }
  // Ogni entry e una URL trasformata CF con la width specifica.
  // getStrapiMediaURL gestisce encoding + ordinamento option -> nessuna duplicazione logica.
  return widths
    .map((w) => `${getStrapiMediaURL(media, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Ritorna gli URL assoluti per ogni formato immagine disponibile.
 * I formati possibili sono: thumbnail, small, medium, large.
 *
 * Nota: questo helper NON applica la trasformazione CF perche i formati Strapi
 * sono pre-generati dal CMS (dimensioni fisse). Se servisse trasformare anche
 * questi in futuro, usare getStrapiMediaURL(format, {width}) direttamente.
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
