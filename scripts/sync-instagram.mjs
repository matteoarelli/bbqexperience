#!/usr/bin/env node
// sync-instagram.mjs — Sincronizza post Instagram in Strapi via Graph API
// Cron: 0 */6 * * *
import { readFileSync } from 'fs';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID || '';
const TOKEN_FILE = process.env.TOKEN_FILE || '/opt/services/bbqexperience/.instagram-token';

function getAccessToken() {
  try {
    return readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch {
    return process.env.INSTAGRAM_ACCESS_TOKEN || '';
  }
}

function strapiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
}

async function fetchInstagramPosts(accessToken) {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
  const url = `https://graph.instagram.com/${INSTAGRAM_USER_ID}/media?fields=${fields}&limit=25&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

function calculateEngagementScore(posts) {
  const scores = posts.map(p => (p.like_count || 0) + (p.comments_count || 0) * 2);
  const maxScore = Math.max(...scores, 1);
  return posts.map((p, i) => ({ ...p, engagement_score: Math.round((scores[i] / maxScore) * 100) / 100 }));
}

async function findExistingPost(instagramId) {
  // Strapi v5: cercare anche tra i draft, altrimenti i post appena creati non vengono trovati
  const url = `${STRAPI_URL}/api/instagram-posts?filters[instagram_id][$eq]=${instagramId}&status=draft`;
  const res = await fetch(url, { headers: strapiHeaders() });
  const data = await res.json();
  return data?.data?.[0] || null;
}

async function findRelatedContent(caption) {
  if (!caption) return { related_review: null, related_recipe: null };
  const result = { related_review: null, related_recipe: null };

  try {
    const reviewsRes = await fetch(`${STRAPI_URL}/api/reviews?populate=product&locale=en`, {
      headers: strapiHeaders(),
    });
    const reviews = await reviewsRes.json();
    for (const review of reviews?.data || []) {
      const productName = review.product?.name || review.title || '';
      if (productName && caption.toLowerCase().includes(productName.toLowerCase())) {
        result.related_review = review.documentId;
        break;
      }
    }
  } catch { /* ignora */ }

  try {
    const recipesRes = await fetch(`${STRAPI_URL}/api/recipes?locale=en`, {
      headers: strapiHeaders(),
    });
    const recipes = await recipesRes.json();
    for (const recipe of recipes?.data || []) {
      if (recipe.title && caption.toLowerCase().includes(recipe.title.toLowerCase())) {
        result.related_recipe = recipe.documentId;
        break;
      }
    }
  } catch { /* ignora */ }

  return result;
}

async function upsertPost(post, isCurated, relations) {
  const existing = await findExistingPost(post.id);
  const payload = {
    data: {
      instagram_id: post.id,
      media_type: post.media_type,
      media_url: post.media_url || '',
      thumbnail_url: post.thumbnail_url || '',
      permalink: post.permalink || '',
      caption: post.caption || '',
      timestamp: post.timestamp,
      like_count: post.like_count || 0,
      comments_count: post.comments_count || 0,
      engagement_score: post.engagement_score || 0,
      curated: isCurated,
      ...(relations.related_review && { related_review: relations.related_review }),
      ...(relations.related_recipe && { related_recipe: relations.related_recipe }),
    },
  };

  if (existing) {
    // Aggiorna e pubblica via PUT
    const res = await fetch(`${STRAPI_URL}/api/instagram-posts/${existing.documentId}`, {
      method: 'PUT',
      headers: strapiHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`  ERRORE aggiornamento ${post.id}: ${res.status} ${await res.text()}`);
    } else {
      console.log(`  Aggiornato: ${post.id}`);
    }
  } else {
    // Crea nuovo post — Strapi v5 pubblica automaticamente con draftAndPublish: true se il token ha i permessi
    const createRes = await fetch(`${STRAPI_URL}/api/instagram-posts`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      console.error(`  ERRORE creazione ${post.id}: ${createRes.status} ${await createRes.text()}`);
    } else {
      console.log(`  Creato: ${post.id}`);
    }
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] Sync Instagram iniziato`);

  const token = getAccessToken();
  if (!token || !INSTAGRAM_USER_ID) {
    console.error('ERRORE: INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID richiesti');
    process.exit(1);
  }

  const rawPosts = await fetchInstagramPosts(token);
  console.log(`  ${rawPosts.length} post recuperati da Instagram`);

  const posts = calculateEngagementScore(rawPosts);
  const avgScore = posts.reduce((s, p) => s + p.engagement_score, 0) / posts.length;

  for (const post of posts) {
    const isCurated = post.engagement_score > avgScore;
    const relations = await findRelatedContent(post.caption);
    await upsertPost(post, isCurated, relations);
  }

  console.log(`[${new Date().toISOString()}] Sync completato: ${posts.length} post processati`);
}

main().catch((err) => {
  console.error('ERRORE sync Instagram:', err);
  process.exit(1);
});
