// Proxy API per recensioni — evita di esporre STRAPI_URL al client
// Gestisce ricerca (search), singola review (id), e batch (ids)
import type { APIRoute } from 'astro';
import { STRAPI_URL } from '@lib/strapi';

export const prerender = false;

const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';

/** Header di autenticazione per Strapi */
function strapiHeaders(): HeadersInit {
  return STRAPI_API_TOKEN
    ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
    : {};
}

/** Rate limiter in-memory — max 30 richieste per minuto per IP */
const rateLimit = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimit.get(ip)?.filter(t => now - t < WINDOW_MS) || [];
  if (requests.length >= MAX_REQUESTS) return false;
  requests.push(now);
  rateLimit.set(ip, requests);
  return true;
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
  // Controllo rate limit
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(clientIp)) {
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
      const response = await fetch(strapiEndpoint, { headers: strapiHeaders() });
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
      const response = await fetch(strapiEndpoint, { headers: strapiHeaders() });
      if (!response.ok) throw new Error(`Strapi error: ${response.status}`);
      const json = await response.json();
      json.data = absoluteImageUrls(json.data);
      return new Response(JSON.stringify(json), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // Batch fetch per IDs multipli (separati da virgola)
    if (ids) {
      const idList = ids.split(',').filter(Boolean).slice(0, 10);
      const promises = idList.map(async (docId) => {
        const strapiEndpoint = `${STRAPI_URL}/api/reviews/${docId}?populate=product&locale=${locale}&status=published`;
        const response = await fetch(strapiEndpoint, { headers: strapiHeaders() });
        if (!response.ok) return null;
        const json = await response.json();
        return json.data;
      });
      const results = await Promise.all(promises);
      const data = absoluteImageUrls(results.filter(Boolean));
      return new Response(JSON.stringify({ data }), {
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
