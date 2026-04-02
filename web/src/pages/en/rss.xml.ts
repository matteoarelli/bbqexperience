// Feed RSS (EN) — genera feed RSS 2.0 con gli ultimi 20 contenuti
import type { APIRoute } from 'astro';
import { fetchCollection } from '@lib/strapi';
import type { StrapiReview, StrapiRecipe, StrapiTutorial, StrapiBlogPost } from '@lib/types';
import type { StrapiEntity } from '@lib/types';
import { localizedRoutes } from '@lib/i18n';

export const prerender = false;

const SITE_URL = 'https://bbq-experience.com';
const LOCALE = 'en';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

/** Escapa caratteri speciali per XML */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const feedItems: FeedItem[] = [];

  try {
    // Recupera contenuti da tutte le sezioni in parallelo
    const [reviews, recipes, tutorials, blogPosts] = await Promise.all([
      fetchCollection<StrapiReview>('reviews', {
        locale: LOCALE,
        pageSize: 20,
        sort: 'published_date:desc',
      }),
      fetchCollection<StrapiRecipe>('recipes', {
        locale: LOCALE,
        pageSize: 20,
        sort: 'published_date:desc',
      }),
      fetchCollection<StrapiTutorial>('tutorials', {
        locale: LOCALE,
        pageSize: 20,
        sort: 'published_date:desc',
      }),
      fetchCollection<StrapiBlogPost>('blog-posts', {
        locale: LOCALE,
        pageSize: 20,
        sort: 'published_date:desc',
      }),
    ]);

    // Mappa recensioni
    for (const item of reviews.data) {
      const route = localizedRoutes.reviews[LOCALE];
      feedItems.push({
        title: item.title,
        link: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
        description: item.excerpt || item.title,
        pubDate: item.published_date || item.publishedAt || item.createdAt,
        guid: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
      });
    }

    // Mappa ricette
    for (const item of recipes.data) {
      const route = localizedRoutes.recipes[LOCALE];
      feedItems.push({
        title: item.title,
        link: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
        description: item.excerpt || item.title,
        pubDate: item.published_date || item.publishedAt || item.createdAt,
        guid: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
      });
    }

    // Mappa tutorial
    for (const item of tutorials.data) {
      const route = localizedRoutes.tutorials[LOCALE];
      feedItems.push({
        title: item.title,
        link: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
        description: item.excerpt || item.title,
        pubDate: item.published_date || item.publishedAt || item.createdAt,
        guid: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
      });
    }

    // Mappa blog post
    for (const item of blogPosts.data) {
      const route = localizedRoutes.blog[LOCALE];
      feedItems.push({
        title: item.title,
        link: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
        description: item.excerpt || item.title,
        pubDate: item.published_date || item.publishedAt || item.createdAt,
        guid: `${SITE_URL}/${LOCALE}/${route}/${item.slug}/`,
      });
    }
  } catch (err) {
    console.error('Errore generazione feed RSS:', err);
  }

  // Ordina per data decrescente e prendi i primi 20
  feedItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  const latestItems = feedItems.slice(0, 20);

  // Genera XML RSS 2.0
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BBQ Experience</title>
    <link>${SITE_URL}/${LOCALE}/</link>
    <description>In-depth BBQ product reviews, recipes, tutorials and news from the BBQ Experience community</description>
    <language>${LOCALE}</language>
    <atom:link href="${SITE_URL}/${LOCALE}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${latestItems
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
