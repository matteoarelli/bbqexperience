/**
 * Sitemap XML dinamica — genera URL per tutti i contenuti pubblicati su Strapi
 * e per tutte le pagine statiche, in tutte e 3 le lingue (en, it, es).
 */
import type { APIRoute } from 'astro';
import { fetchCollection } from '@lib/strapi';
import { locales, localizedRoutes } from '@lib/i18n';
import type { Locale } from '@lib/i18n';

const SITE_URL = 'https://bbq-experience.com';

// Tipi di contenuto Strapi da indicizzare
const contentTypes = ['reviews', 'recipes', 'tutorials', 'blog-posts'] as const;

// Mappa content-type Strapi -> chiave localizedRoutes
const routeKeyMap: Record<string, string> = {
  reviews: 'reviews',
  recipes: 'recipes',
  tutorials: 'tutorials',
  'blog-posts': 'blog',
};

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

/**
 * Recupera tutti gli slug e updatedAt per un content type in una locale
 */
async function fetchAllSlugs(
  contentType: string,
  locale: Locale,
): Promise<{ slug: string; updatedAt: string }[]> {
  const items: { slug: string; updatedAt: string }[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const response = await fetchCollection<{ slug: string }>(
        contentType as any,
        {
          locale,
          pageSize: 100,
          page,
          sort: 'updatedAt:desc',
        },
      );
      for (const item of response.data) {
        items.push({
          slug: (item as any).slug,
          updatedAt: (item as any).updatedAt || new Date().toISOString(),
        });
      }
      totalPages = response.meta.pagination.pageCount;
      page++;
    } catch {
      // Se il fetch fallisce, interrompiamo per questo content type
      break;
    }
  }

  return items;
}

export const GET: APIRoute = async () => {
  const entries: SitemapEntry[] = [];
  const now = new Date().toISOString();

  // 1. Homepage per ogni locale (priorita 1.0)
  for (const locale of locales) {
    entries.push({
      loc: `${SITE_URL}/${locale}/`,
      lastmod: now,
      changefreq: 'daily',
      priority: '1.0',
    });
  }

  // 2. Pagine listing per ogni locale (priorita 0.8)
  const listingRouteKeys = ['reviews', 'recipes', 'tutorials', 'blog'];
  for (const locale of locales) {
    for (const key of listingRouteKeys) {
      const route = localizedRoutes[key]?.[locale];
      if (route) {
        entries.push({
          loc: `${SITE_URL}/${locale}/${route}/`,
          lastmod: now,
          changefreq: 'daily',
          priority: '0.8',
        });
      }
    }
  }

  // 3. Pagine statiche per ogni locale (priorita 0.5)
  const staticRouteKeys = ['about', 'contact', 'privacy', 'terms', 'compare', 'bookmarks'];
  for (const locale of locales) {
    for (const key of staticRouteKeys) {
      const route = localizedRoutes[key]?.[locale];
      if (route) {
        entries.push({
          loc: `${SITE_URL}/${locale}/${route}/`,
          lastmod: now,
          changefreq: 'monthly',
          priority: '0.5',
        });
      }
    }
  }

  // 4. Pagine dettaglio da Strapi per ogni content type e locale (priorita 0.7)
  for (const contentType of contentTypes) {
    const routeKey = routeKeyMap[contentType];

    for (const locale of locales) {
      const route = localizedRoutes[routeKey]?.[locale];
      if (!route) continue;

      const items = await fetchAllSlugs(contentType, locale);
      for (const item of items) {
        entries.push({
          loc: `${SITE_URL}/${locale}/${route}/${item.slug}/`,
          lastmod: item.updatedAt,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    }
  }

  // Genera XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
