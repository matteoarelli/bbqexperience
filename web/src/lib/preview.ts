// Utilita per il sistema di anteprima contenuti draft — BBQ Experience
// Gestisce cookie di preview e status dei contenuti
import type { AstroCookies } from 'astro';

/** Nome del cookie usato per la modalita anteprima */
export const PREVIEW_COOKIE_NAME = 'bbq_preview';

/** Segreto per validare l'accesso alla preview (da variabile d'ambiente) */
export const PREVIEW_SECRET = import.meta.env.PREVIEW_SECRET || '';

/**
 * Controlla se la modalita anteprima e attiva verificando il cookie.
 */
export function isPreviewMode(cookies: AstroCookies): boolean {
  const cookieValue = cookies.get(PREVIEW_COOKIE_NAME)?.value;
  return cookieValue === PREVIEW_SECRET && PREVIEW_SECRET !== '';
}

/**
 * Ritorna lo status del contenuto da richiedere a Strapi.
 * In modalita preview ritorna 'draft' per mostrare contenuti non pubblicati.
 */
export function getContentStatus(cookies: AstroCookies): 'published' | 'draft' {
  return isPreviewMode(cookies) ? 'draft' : 'published';
}
