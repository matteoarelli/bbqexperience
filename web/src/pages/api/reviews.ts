/**
 * GET /api/reviews — Proxy API per recensioni verso Strapi
 *
 * @param {string} search - Ricerca per titolo ($containsi), max 10 risultati
 * @param {string} id - Singola review per documentId
 * @param {string} ids - Batch fetch per documentId multipli (separati da virgola, max 10)
 * @param {string} locale - Lingua (en|it|es, default: en)
 *
 * Rate limit: 30 req/min per IP (in-memory)
 * Cache: public, max-age=60
 * Le URL immagini relative vengono convertite in URL assolute (PUBLIC_CMS_URL).
 *
 * @returns {{ data: Array<Review> }} o {{ error: string }}
 */
import type { APIRoute } from 'astro';
import { STRAPI_URL } from '@lib/strapi';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';

export const prerender = false;

const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';

/** Header di autenticazione per Strapi */
function strapiHeaders(): HeadersInit {
  return STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};
}

/** URL pubblico del CMS per le immagini (non usare STRAPI_URL che punta al Docker interno) */
const PUBLIC_CMS = import.meta.env.PUBLIC_CMS_URL || 'https://cms.bbq-experience.com';

/** Converte URL immagini relative in URL assolute con il dominio pubblico del CMS */
function absoluteImageUrls(data: any): any {
  if (!data) return data;

  // Gestione singola review
  const fixImages = (review: any) => {
    if (review?.product?.images) {
      review.product.images = review.product.images.map((img: any) => ({
        ...img,
        url: img.url?.startsWith('/') ? `${PUBLIC_CMS}${img.url}` : img.url,
      }));
    }
    return review;
  };

  if (Array.isArray(data)) return data.map(fixImages);
  return fixImages(data);
}

export const GET: APIRoute = async ({ url, request }) => {
  // Controllo rate limit (SQLite-based, condiviso con gli altri endpoint)
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'reviews', 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const search = url.searchParams.get('search');
  const id = url.searchParams.get('id');
  const ids = url.searchParams.get('ids');
  const locale = url.searchParams.get('locale') || 'en';

  try {
    // Ricerca per titolo
    if (search) {
      const encodedQuery = encodeURIComponent(search);
      const strapiEndpoint = `${STRAPI_URL}/api/reviews?filters[title][$containsi]=${encodedQuery}&populate=product&locale=${locale}&pagination[pageSize]=10&status=published`;
      const response = await fetch(strapiEndpoint, { headers: strapiHeaders(), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Strapi error: ${response.status}`);
      const json = await response.json();
      json.data = absoluteImageUrls(json.data);
      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Singola review per documentId
    if (id) {
      const strapiEndpoint = `${STRAPI_URL}/api/reviews/${id}?populate=product&locale=${locale}&status=published`;
      const response = await fetch(strapiEndpoint, { headers: strapiHeaders(), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Strapi error: ${response.status}`);
      const json = await response.json();
      json.data = absoluteImageUrls(json.data);
      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Batch fetch per IDs multipli — query singola con filtro $in
    if (ids) {
      const idList = ids.split(',').filter(Boolean).slice(0, 10);
      const filterParams = idList.map((docId, i) => `filters[documentId][$in][${i}]=${encodeURIComponent(docId)}`).join('&');
      const strapiEndpoint = `${STRAPI_URL}/api/reviews?${filterParams}&populate=product&locale=${locale}&status=published&pagination[pageSize]=10`;
      const response = await fetch(strapiEndpoint, { headers: strapiHeaders(), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Strapi error: ${response.status}`);
      const json = await response.json();
      json.data = absoluteImageUrls(json.data);
      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    return new Response(JSON.stringify({ error: 'Parametro search, id o ids richiesto' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Errore proxy reviews:', err);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
