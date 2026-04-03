/**
 * GET /api/search — Proxy ricerca multi-content verso Strapi
 *
 * @param {string} q - Query di ricerca (required)
 * @param {string} locale - Lingua (en|it|es, default: en)
 * @param {string} filter - Filtro tipo contenuto (all|reviews|recipes|tutorials|blog, default: all)
 *
 * Rate limit: 30 req/min per IP (SQLite-based)
 * Cache: public, max-age=60
 *
 * @returns {{ results: Array<{ url: string, title: string, excerpt: string, contentType: string }> }}
 * Massimo 15 risultati. Excerpt troncato a 150 caratteri.
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

/** Mappa URL per determinare il tipo di contenuto in base al locale */
const contentTypeRoutes: Record<string, Record<string, string>> = {
  reviews: { en: 'reviews', it: 'recensioni', es: 'resenas' },
  recipes: { en: 'recipes', it: 'ricette', es: 'recetas' },
  tutorials: { en: 'tutorials', it: 'guide', es: 'tutoriales' },
  'blog-posts': { en: 'blog', it: 'blog', es: 'blog' },
};

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  contentType: string;
}

export const GET: APIRoute = async ({ url, request }) => {
  // Controllo rate limit
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'search', 30)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const query = url.searchParams.get('q');
  const locale = url.searchParams.get('locale') || 'en';
  const filter = url.searchParams.get('filter') || 'all';

  if (!query || !query.trim()) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  const encodedQuery = encodeURIComponent(query.trim());

  // Definizione content type da cercare
  const contentTypes = [
    { type: 'reviews', endpoint: 'reviews', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'recipes', endpoint: 'recipes', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'tutorials', endpoint: 'tutorials', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
    { type: 'blog-posts', endpoint: 'blog-posts', titleField: 'title', slugField: 'slug', excerptField: 'excerpt' },
  ];

  // Filtra per tipo se specificato
  const typesToSearch = filter === 'all'
    ? contentTypes
    : contentTypes.filter(ct => ct.type === filter || ct.type === `${filter}-posts`);

  try {
    const promises = typesToSearch.map(async (ct) => {
      const strapiUrl = `${STRAPI_URL}/api/${ct.endpoint}?filters[${ct.titleField}][$containsi]=${encodedQuery}&locale=${locale}&pagination[pageSize]=5&status=published`;
      const response = await fetch(strapiUrl, { headers: strapiHeaders() });
      if (!response.ok) return [];

      const json = await response.json();
      const data = json.data || [];

      // Costruisci URL localizzato
      const routeSegment = contentTypeRoutes[ct.type]?.[locale] || ct.type;

      return data.map((item: any): SearchResult => ({
        url: `/${locale}/${routeSegment}/${item.slug || item.documentId}/`,
        title: item[ct.titleField] || '',
        excerpt: (item[ct.excerptField] || '').slice(0, 150),
        contentType: ct.type === 'blog-posts' ? 'blog' : ct.type,
      }));
    });

    const allResults = await Promise.all(promises);
    const results = allResults.flat().slice(0, 15);

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    console.error('Errore proxy search:', err);
    return new Response(JSON.stringify({ error: 'Errore interno', results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }
};
