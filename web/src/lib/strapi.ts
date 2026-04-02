// Client API per Strapi REST — BBQ Experience
// Usato da Astro a build time per recuperare contenuti dal CMS
import type { Locale } from './i18n';
import { defaultLocale } from './i18n';
import type {
  ContentType,
  StrapiCollectionResponse,
  StrapiEntity,
  StrapiResponse,
} from './types';

// Variabili d'ambiente Astro (disponibili a build time)
export const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';

/**
 * Wrapper base per le chiamate all'API Strapi.
 * Aggiunge autenticazione Bearer e gestione errori.
 */
export async function fetchAPI<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`/api/${endpoint}`, STRAPI_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Errore API Strapi: ${response.status} ${response.statusText} — endpoint: ${endpoint}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── Opzioni per le query ────────────────────────────────────────────────────

interface FetchCollectionOptions {
  locale?: Locale;
  page?: number;
  pageSize?: number;
  populate?: string | string[];
  filters?: Record<string, unknown>;
  sort?: string | string[];
  status?: 'published' | 'draft';
}

interface FetchOneOptions {
  locale?: Locale;
  populate?: string | string[];
  status?: 'published' | 'draft';
}

/**
 * Serializza i filtri Strapi v5 in query params flat.
 * Esempio: { slug: { $eq: 'test' } } => 'filters[slug][$eq]=test'
 */
function serializeFilters(
  filters: Record<string, unknown>,
  prefix = 'filters',
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    const paramKey = `${prefix}[${key}]`;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Ricorsione per oggetti annidati (es. { $eq: 'valore' })
      const nested = serializeFilters(
        value as Record<string, unknown>,
        paramKey,
      );
      Object.assign(result, nested);
    } else {
      result[paramKey] = String(value);
    }
  }

  return result;
}

/**
 * Recupera una collezione di contenuti con locale, paginazione, filtri e ordinamento.
 */
export async function fetchCollection<T>(
  contentType: ContentType,
  options: FetchCollectionOptions = {},
): Promise<StrapiCollectionResponse<T>> {
  const {
    locale = defaultLocale,
    page = 1,
    pageSize = 25,
    populate,
    filters,
    sort,
    status = 'published',
  } = options;

  const params: Record<string, string> = {
    locale,
    'pagination[page]': String(page),
    'pagination[pageSize]': String(pageSize),
    status,
  };

  // Populate: stringa singola (es. '*') o array con sintassi indicizzata Strapi v5
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((field, index) => {
        params[`populate[${index}]`] = field;
      });
    } else {
      params['populate'] = populate;
    }
  }

  // Filtri Strapi v5
  if (filters) {
    Object.assign(params, serializeFilters(filters));
  }

  // Ordinamento: stringa singola o array unito con virgola
  if (sort) {
    params['sort'] = Array.isArray(sort) ? sort.join(',') : sort;
  }

  return fetchAPI<StrapiCollectionResponse<T>>(contentType, params);
}

/**
 * Recupera una singola entita per documentId (UUID Strapi v5).
 */
export async function fetchOne<T>(
  contentType: ContentType,
  documentId: string,
  options: FetchOneOptions = {},
): Promise<StrapiResponse<T>> {
  const {
    locale = defaultLocale,
    populate,
    status = 'published',
  } = options;

  const params: Record<string, string> = {
    locale,
    status,
  };

  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((field, index) => {
        params[`populate[${index}]`] = field;
      });
    } else {
      params['populate'] = populate;
    }
  }

  return fetchAPI<StrapiResponse<T>>(`${contentType}/${documentId}`, params);
}

/**
 * Recupera un contenuto per slug. Ritorna il primo risultato o null.
 * Utile per le pagine che usano slug come parametro di route.
 */
export async function fetchBySlug<T>(
  contentType: ContentType,
  slug: string,
  options: FetchOneOptions = {},
): Promise<(T & StrapiEntity) | null> {
  const {
    locale = defaultLocale,
    populate,
    status = 'published',
  } = options;

  const response = await fetchCollection<T>(contentType, {
    locale,
    populate,
    status,
    filters: { slug: { $eq: slug } },
    pageSize: 1,
  });

  return response.data.length > 0 ? response.data[0] : null;
}
