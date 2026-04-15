// Script di build per selected-slugs.json
// Fetcha slug rappresentativi da Strapi, valida HTTP 200 contro la produzione,
// produce il manifest canonico per gli audit Lighthouse.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CMS_BASE = 'https://cms.bbq-experience.com';
const SITE_BASE = 'https://bbq-experience.com';

// localizedRoutes da web/src/lib/i18n.ts
const localizedRoutes = {
  reviews: { en: 'reviews', it: 'recensioni', es: 'resenas' },
  recipes: { en: 'recipes', it: 'ricette', es: 'recetas' },
  tutorials: { en: 'tutorials', it: 'guide', es: 'tutoriales' },
  blog: { en: 'blog', it: 'blog', es: 'blog' },
};

// Map Strapi content type -> route key
const typeRouteMap = {
  reviews: 'reviews',
  recipes: 'recipes',
  tutorials: 'tutorials',
  'blog-posts': 'blog',
};

// Map Strapi content type -> id prefix
const typeIdMap = {
  reviews: 'review',
  recipes: 'recipe',
  tutorials: 'tutorial',
  'blog-posts': 'blog',
};

const locales = ['en', 'it', 'es'];

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function headStatus(url) {
  // usa GET con Range: 0-0 perche alcuni proxy/CDN cachano solo GET
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'bbq-lighthouse-baseline/1.0' },
    });
    return res.status;
  } catch (err) {
    return 0;
  }
}

async function fetchSlugs(type, locale, size = 10) {
  const url = `${CMS_BASE}/api/${type}?locale=${locale}&pagination%5BpageSize%5D=${size}&fields%5B0%5D=slug&sort%5B0%5D=publishedAt:desc`;
  const json = await fetchJson(url);
  return (json.data || []).map((e) => e.slug || e.attributes?.slug).filter(Boolean);
}

async function pickValidatedSlug(type, locale) {
  const routeKey = typeRouteMap[type];
  const routeSlug = localizedRoutes[routeKey][locale];
  const slugs = await fetchSlugs(type, locale, 10);
  for (const slug of slugs) {
    const url = `${SITE_BASE}/${locale}/${routeSlug}/${slug}/`;
    const status = await headStatus(url);
    if (status >= 200 && status < 300) {
      return { slug, url };
    }
    console.warn(`[skip] ${url} -> ${status}`);
  }
  throw new Error(`Nessuno slug valido per ${type}/${locale}`);
}

async function main() {
  const targets = [];

  // Home: 3 locali
  for (const locale of locales) {
    const url = `${SITE_BASE}/${locale}/`;
    const status = await headStatus(url);
    if (status < 200 || status >= 300) {
      throw new Error(`Home ${url} non raggiungibile (status ${status})`);
    }
    targets.push({
      id: `home-${locale}`,
      url,
      page_type: 'home',
      locale,
      slug: null,
    });
  }

  // Content pages
  for (const type of ['reviews', 'recipes', 'tutorials', 'blog-posts']) {
    for (const locale of locales) {
      const { slug, url } = await pickValidatedSlug(type, locale);
      targets.push({
        id: `${typeIdMap[type]}-${locale}`,
        url,
        page_type: typeIdMap[type],
        locale,
        slug,
      });
      console.log(`[ok] ${typeIdMap[type]}/${locale} -> ${url}`);
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    targets,
  };

  const outPath = resolve(__dirname, 'selected-slugs.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n[done] ${targets.length} targets -> ${outPath}`);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
