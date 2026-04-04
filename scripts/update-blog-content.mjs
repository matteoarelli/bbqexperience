#!/usr/bin/env node
// update-blog-content.mjs — Aggiorna il contenuto degli articoli esistenti con testo ricco
// Trova gli articoli per slug e aggiorna il campo content via PUT

const STRAPI_URL = process.env.STRAPI_URL || 'http://bbqexperience-strapi:1337';
const TOKEN = process.env.STRAPI_API_TOKEN || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

// Importa i dati dai vari script batch
// I batch creano articoli con slug come chiave — noi li usiamo per trovare e aggiornare

async function findBySlug(slug, locale = 'en') {
  const url = `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${slug}&locale=${locale}&status=draft`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (data?.data?.[0]) return data.data[0];

  // Prova anche published
  const url2 = `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${slug}&locale=${locale}&status=published`;
  const res2 = await fetch(url2, { headers });
  const data2 = await res2.json();
  return data2?.data?.[0] || null;
}

async function updateArticle(slug, locale, content, title, excerpt, seoTitle, seoDesc) {
  const existing = await findBySlug(slug, locale);
  if (!existing) {
    console.log(`  [${locale}] ${slug}: non trovato, skip`);
    return false;
  }

  const payload = {
    data: {
      content,
      ...(title && { title }),
      ...(excerpt && { excerpt }),
      ...(seoTitle && { seo_title: seoTitle }),
      ...(seoDesc && { seo_description: seoDesc }),
      locale,
    },
  };

  const res = await fetch(`${STRAPI_URL}/api/blog-posts/${existing.documentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.log(`  [${locale}] ERRORE ${slug}: ${res.status}`);
    return false;
  }
  return true;
}

async function processArticle(article, index, total) {
  let updated = 0;
  for (const locale of ['en', 'it', 'es']) {
    const data = article[locale];
    if (!data) continue;
    const ok = await updateArticle(
      article.slug, locale, data.content,
      data.title, data.excerpt, data.seo_title || data.seoTitle, data.seo_description || data.seoDescription
    );
    if (ok) updated++;
  }
  console.log(`[${index + 1}/${total}] ${article.slug} — ${updated}/3 lingue aggiornate`);
}

// Carica tutti gli articoli dai file batch
async function main() {
  const batches = [];

  // Importa dinamicamente ogni batch script e estrai gli articoli
  const batchFiles = process.argv.slice(2);

  if (batchFiles.length === 0) {
    console.log('Uso: node update-blog-content.mjs <batch-file.mjs> [batch-file2.mjs] ...');
    console.log('Esempio: node update-blog-content.mjs /app/trends.mjs /app/news.mjs');
    process.exit(1);
  }

  for (const file of batchFiles) {
    try {
      const mod = await import(file);
      const articles = mod.articles || mod.default?.articles || mod.default || [];
      if (Array.isArray(articles)) {
        batches.push(...articles);
      }
    } catch (err) {
      console.error(`Errore importando ${file}:`, err.message);
    }
  }

  console.log(`Aggiornamento ${batches.length} articoli in 3 lingue...\n`);

  for (let i = 0; i < batches.length; i++) {
    await processArticle(batches[i], i, batches.length);
  }

  console.log(`\nCompletato!`);
}

main().catch(err => {
  console.error('ERRORE:', err);
  process.exit(1);
});
