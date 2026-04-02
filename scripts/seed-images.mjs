/**
 * Script di seeding immagini per BBQ Experience Strapi CMS.
 * Scarica foto da Pexels e le carica su Strapi, poi le collega ai contenuti esistenti.
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";
const PEXELS_API_KEY =
  "i13ZCVKhoDG9CblR3FWzJfSjLaKFLIB7YWbxeHnWjT8kzM6WwI3NUe96";

// --- Utility ---

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(ok, type, name) {
  const icon = ok ? "OK" : "FAIL";
  console.log(`[${icon}] [${type}] ${name}`);
}

/** Cerca foto su Pexels */
async function searchPexels(query, perPage = 3) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Pexels search failed for "${query}": ${res.status}`);
  }
  const json = await res.json();
  return json.photos || [];
}

/** Scarica immagine da URL e restituisce un Buffer */
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Carica immagine su Strapi e restituisce l'oggetto media */
async function uploadToStrapi(imageBuffer, filename) {
  const file = new File([imageBuffer], filename, { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("files", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: formData,
  });

  // Retry su 502 (Strapi potrebbe essere in fase di riavvio)
  if (res.status === 502) {
    console.log("    502 received, waiting 5s and retrying...");
    await sleep(5000);
    return uploadToStrapi(imageBuffer, filename);
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Strapi upload failed: ${JSON.stringify(json.error || json)}`);
  }
  return json[0]; // Restituisce il primo file caricato
}

/** Scarica da Pexels e carica su Strapi, restituisce gli ID media */
async function pexelsToStrapi(query, count = 3) {
  const photos = await searchPexels(query, count);
  const mediaIds = [];

  for (const photo of photos) {
    try {
      const imageUrl = photo.src.large;
      const filename = `pexels-${photo.id}.jpg`;
      console.log(`  Downloading: ${filename} (${query})`);
      const buffer = await downloadImage(imageUrl);
      console.log(`  Uploading: ${filename} to Strapi...`);
      const media = await uploadToStrapi(buffer, filename);
      mediaIds.push(media.id);
      console.log(`  Uploaded: id=${media.id}`);
      await sleep(500); // Pausa tra upload per non sovraccaricare il server
    } catch (err) {
      console.error(`  Error processing photo ${photo.id}: ${err.message}`);
    }
  }

  return mediaIds;
}

/** GET generico da Strapi con populate */
async function apiGet(endpoint) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GET ${endpoint} failed: ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

/** PUT per aggiornare un contenuto Strapi */
async function apiPut(endpoint, data) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PUT ${endpoint} failed: ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

// ============================================================
// CONFIGURAZIONE RICERCHE
// ============================================================

// Prodotti: slug -> query Pexels
const productSearches = {
  "weber-summit-s-470-gas-grill": "gas grill stainless steel",
  "traeger-ironwood-885-pellet-smoker": "pellet smoker bbq",
  "thermoworks-thermapen-one": "meat thermometer",
  "jealous-devil-lump-charcoal": "charcoal bbq lump",
  "grillgrate-sear-station": "grill grate close up",
  "kamado-joe-classic-iii": "kamado grill ceramic",
};

// Ricette: slug -> query Pexels
const recipeSearches = {
  "texas-style-smoked-brisket": "smoked brisket sliced",
  "smoked-baby-back-ribs-honey-glaze": "bbq ribs glazed",
  "grilled-argentinian-chimichurri-steak": "grilled steak chimichurri",
  "smoked-mac-and-cheese": "smoked mac and cheese",
};

// Tutorial: slug -> query Pexels
const tutorialSearches = {
  "complete-guide-temperature-control-charcoal-grills": "charcoal grill temperature",
  "how-to-choose-your-first-smoker-buyers-guide": "bbq smoker outdoor",
  "understanding-wood-types-smoking-hickory-cherry": "smoking wood chips",
};

// Blog post: slug -> query Pexels
const blogPostSearches = {
  "bbq-season-2026-top-trends": "summer bbq party",
  "tested-10-charcoal-brands-results": "charcoal briquettes",
  "behind-the-scenes-how-we-review-products": "bbq product testing",
};

// Review: query aggiuntive per le gallery
const reviewSearchQueries = {
  "gas grill stainless steel": ["gas grill cooking", "stainless steel grill burner", "outdoor gas grill night"],
  "pellet smoker bbq": ["pellet smoker smoke", "smoked meat close up", "pellet grill outdoor"],
  "meat thermometer": ["checking meat temperature", "digital thermometer food", "grilling thermometer"],
  "charcoal bbq lump": ["lump charcoal fire", "charcoal grill flames", "bbq charcoal close up"],
  "grill grate close up": ["grill marks steak", "clean grill grate", "bbq grill surface"],
  "kamado grill ceramic": ["kamado grill cooking", "ceramic grill outdoor", "kamado bbq food"],
};

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== SEED IMAGES: BBQ Experience ===\n");

  // 1. Recupera tutti i contenuti esistenti
  console.log("Fetching existing content from Strapi...\n");

  const [productsRes, reviewsRes, recipesRes, tutorialsRes, blogPostsRes, instagramRes] =
    await Promise.all([
      apiGet("products?populate=*"),
      apiGet("reviews?populate=*"),
      apiGet("recipes?populate=*"),
      apiGet("tutorials?populate=*"),
      apiGet("blog-posts?populate=*"),
      apiGet("instagram-posts?populate=*").catch(() => ({ data: [] })),
    ]);

  const products = productsRes.data || [];
  const reviews = reviewsRes.data || [];
  const recipes = recipesRes.data || [];
  const tutorials = tutorialsRes.data || [];
  const blogPosts = blogPostsRes.data || [];
  const instagramPosts = instagramRes.data || [];

  console.log(`Found: ${products.length} products, ${reviews.length} reviews, ${recipes.length} recipes, ${tutorials.length} tutorials, ${blogPosts.length} blog posts, ${instagramPosts.length} instagram posts\n`);

  // Mappa slug -> documentId per ogni tipo
  const findBySlug = (items, slug) =>
    items.find((i) => i.slug === slug || i.attributes?.slug === slug);

  // 2. PRODOTTI - immagini (media multiplo)
  console.log("--- PRODUCTS ---");
  const productMediaMap = {}; // slug -> [mediaIds] per riutilizzo nelle review
  for (const [slug, query] of Object.entries(productSearches)) {
    const product = findBySlug(products, slug);
    if (!product) {
      log(false, "Product", `${slug} - not found in Strapi`);
      continue;
    }
    const docId = product.documentId || product.id;
    try {
      console.log(`\nProduct: ${slug}`);
      const mediaIds = await pexelsToStrapi(query, 3);
      productMediaMap[slug] = mediaIds;
      if (mediaIds.length > 0) {
        await apiPut(`products/${docId}`, { images: mediaIds });
        log(true, "Product", `${slug} -> ${mediaIds.length} images linked`);
      }
    } catch (err) {
      log(false, "Product", `${slug}: ${err.message}`);
    }
  }

  // 3. REVIEWS - gallery (media multiplo)
  console.log("\n--- REVIEWS ---");
  for (const review of reviews) {
    const reviewDocId = review.documentId || review.id;
    // Trova il prodotto collegato per determinare la query
    const productSlug = review.product?.slug || review.attributes?.product?.data?.attributes?.slug;
    const baseQuery = productSlug ? productSearches[productSlug] : null;
    const relatedQueries = baseQuery ? reviewSearchQueries[baseQuery] : null;

    try {
      const reviewName = review.title || review.attributes?.title || `Review ${reviewDocId}`;
      console.log(`\nReview: ${reviewName}`);

      let mediaIds = [];
      if (relatedQueries) {
        // Cerca 1-2 immagini per ogni query correlata (3-4 totali)
        for (const q of relatedQueries.slice(0, 4)) {
          const ids = await pexelsToStrapi(q, 1);
          mediaIds.push(...ids);
        }
      } else {
        // Fallback: cerca genericamente
        mediaIds = await pexelsToStrapi("bbq grilling outdoor", 3);
      }

      if (mediaIds.length > 0) {
        await apiPut(`reviews/${reviewDocId}`, { gallery: mediaIds });
        log(true, "Review", `${reviewName} -> ${mediaIds.length} images linked`);
      }
    } catch (err) {
      log(false, "Review", `Review ${reviewDocId}: ${err.message}`);
    }
  }

  // 4. RICETTE - cover_image (media singolo)
  console.log("\n--- RECIPES ---");
  for (const [slug, query] of Object.entries(recipeSearches)) {
    const recipe = findBySlug(recipes, slug);
    if (!recipe) {
      log(false, "Recipe", `${slug} - not found in Strapi`);
      continue;
    }
    const docId = recipe.documentId || recipe.id;
    try {
      console.log(`\nRecipe: ${slug}`);
      const mediaIds = await pexelsToStrapi(query, 1);
      if (mediaIds.length > 0) {
        await apiPut(`recipes/${docId}`, { cover_image: mediaIds[0] });
        log(true, "Recipe", `${slug} -> cover_image set`);
      }
    } catch (err) {
      log(false, "Recipe", `${slug}: ${err.message}`);
    }
  }

  // 5. TUTORIAL - cover_image (media singolo)
  console.log("\n--- TUTORIALS ---");
  for (const [slug, query] of Object.entries(tutorialSearches)) {
    const tutorial = findBySlug(tutorials, slug);
    if (!tutorial) {
      log(false, "Tutorial", `${slug} - not found in Strapi`);
      continue;
    }
    const docId = tutorial.documentId || tutorial.id;
    try {
      console.log(`\nTutorial: ${slug}`);
      const mediaIds = await pexelsToStrapi(query, 1);
      if (mediaIds.length > 0) {
        await apiPut(`tutorials/${docId}`, { cover_image: mediaIds[0] });
        log(true, "Tutorial", `${slug} -> cover_image set`);
      }
    } catch (err) {
      log(false, "Tutorial", `${slug}: ${err.message}`);
    }
  }

  // 6. BLOG POSTS - cover_image (media singolo)
  console.log("\n--- BLOG POSTS ---");
  for (const [slug, query] of Object.entries(blogPostSearches)) {
    const post = findBySlug(blogPosts, slug);
    if (!post) {
      log(false, "BlogPost", `${slug} - not found in Strapi`);
      continue;
    }
    const docId = post.documentId || post.id;
    try {
      console.log(`\nBlog Post: ${slug}`);
      const mediaIds = await pexelsToStrapi(query, 1);
      if (mediaIds.length > 0) {
        await apiPut(`blog-posts/${docId}`, { cover_image: mediaIds[0] });
        log(true, "BlogPost", `${slug} -> cover_image set`);
      }
    } catch (err) {
      log(false, "BlogPost", `${slug}: ${err.message}`);
    }
  }

  // 7. INSTAGRAM POSTS - media_url (campo testo, nessun upload)
  console.log("\n--- INSTAGRAM POSTS ---");
  if (instagramPosts.length > 0) {
    try {
      const photos = await searchPexels("bbq food photography", 6);
      for (let i = 0; i < Math.min(instagramPosts.length, photos.length); i++) {
        const post = instagramPosts[i];
        const docId = post.documentId || post.id;
        const mediaUrl = photos[i].src.medium;
        try {
          await apiPut(`instagram-posts/${docId}`, { media_url: mediaUrl });
          log(true, "Instagram", `Post ${docId} -> media_url updated`);
        } catch (err) {
          log(false, "Instagram", `Post ${docId}: ${err.message}`);
        }
      }
    } catch (err) {
      log(false, "Instagram", `Search failed: ${err.message}`);
    }
  } else {
    console.log("  No instagram posts found, skipping.");
  }

  console.log("\n=== SEED IMAGES COMPLETE ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
