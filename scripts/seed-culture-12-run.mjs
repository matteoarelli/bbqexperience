#!/usr/bin/env node
// seed-culture-12-run.mjs — Aggiorna i 12 articoli culture/trends con contenuto ricco
// Sovrascrive i placeholder generici creati da seed-blog-60.mjs
// Uso: STRAPI_API_TOKEN=xxx node scripts/seed-culture-12-run.mjs

import { articles } from './seed-culture-12.mjs';
import { articlesPart2 } from './seed-culture-12-part2.mjs';
import { articlesPart3 } from './seed-culture-12-part3.mjs';

const allArticles = [...articles, ...articlesPart2, ...articlesPart3];

const STRAPI_URL = process.env.STRAPI_URL || 'http://bbqexperience-strapi:1337';
const TOKEN = process.env.STRAPI_API_TOKEN || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

async function updateArticle(article, index) {
  for (const locale of ['en', 'it', 'es']) {
    const data = article[locale];

    // Trova l'articolo esistente per slug
    const findRes = await fetch(
      `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${article.slug}&locale=${locale === 'en' ? 'en' : locale}`,
      { headers }
    );
    const findData = await findRes.json();
    const existing = findData?.data?.[0];

    if (!existing) {
      // Se non esiste in questa locale, prova a trovare il documentId EN e crea la localizzazione
      if (locale === 'en') {
        // Crea nuovo articolo EN
        const payload = {
          data: {
            title: data.title,
            slug: article.slug,
            excerpt: data.excerpt,
            content: data.content,
            category: article.category,
            reading_time: article.reading_time,
            seo_title: data.seo_title,
            seo_description: data.seo_description,
            locale: 'en',
          },
        };
        const res = await fetch(`${STRAPI_URL}/api/blog-posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error(`  ERRORE CREAZIONE [${locale}] ${article.slug}: ${res.status} ${err.substring(0, 150)}`);
        } else {
          console.log(`  CREATO [${locale}] ${article.slug}`);
        }
      } else {
        // Trova documentId EN per creare localizzazione
        const enRes = await fetch(
          `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${article.slug}&locale=en`,
          { headers }
        );
        const enData = await enRes.json();
        const docId = enData?.data?.[0]?.documentId;
        if (docId) {
          const payload = {
            data: {
              title: data.title,
              slug: article.slug,
              excerpt: data.excerpt,
              content: data.content,
              category: article.category,
              reading_time: article.reading_time,
              seo_title: data.seo_title,
              seo_description: data.seo_description,
              locale,
            },
          };
          const locRes = await fetch(`${STRAPI_URL}/api/blog-posts/${docId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          });
          if (!locRes.ok) {
            const err = await locRes.text();
            console.error(`  ERRORE LOCALIZZAZIONE [${locale}] ${article.slug}: ${locRes.status} ${err.substring(0, 150)}`);
          } else {
            console.log(`  CREATO [${locale}] ${article.slug}`);
          }
        } else {
          console.error(`  SKIP [${locale}] ${article.slug} — documentId EN non trovato`);
        }
      }
      continue;
    }

    // Aggiorna articolo esistente
    const docId = existing.documentId;
    const payload = {
      data: {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: article.category,
        reading_time: article.reading_time,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        locale,
      },
    };

    const res = await fetch(`${STRAPI_URL}/api/blog-posts/${docId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ERRORE [${locale}] ${article.slug}: ${res.status} ${err.substring(0, 150)}`);
    } else {
      console.log(`  AGGIORNATO [${locale}] ${article.slug}`);
    }
  }

  console.log(`[${index + 1}/${allArticles.length}] ${article.slug} completato`);
}

async function main() {
  console.log(`\nAggiornamento ${allArticles.length} articoli culture/trends con contenuto ricco...`);
  console.log(`Target: Strapi @ ${STRAPI_URL}\n`);

  if (!TOKEN) {
    console.error('ERRORE: STRAPI_API_TOKEN non impostato. Esporta la variabile d\'ambiente.');
    process.exit(1);
  }

  for (let i = 0; i < allArticles.length; i++) {
    await updateArticle(allArticles[i], i);
  }

  console.log(`\nCompletato! ${allArticles.length} articoli aggiornati in EN/IT/ES.`);
}

main().catch(err => {
  console.error('ERRORE FATALE:', err);
  process.exit(1);
});
