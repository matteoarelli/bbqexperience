/**
 * Script di seeding immagini v2 — BBQ Experience Strapi CMS.
 * Carica immagini Pexels per i 4 nuovi prodotti, le relative review,
 * 4 nuove ricette, 4 nuovi tutorial e 4 nuovi blog post.
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";
const PEXELS_API_KEY =
  "i13ZCVKhoDG9CblR3FWzJfSjLaKFLIB7YWbxeHnWjT8kzM6WwI3NUe96";

// --- Utility ---

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(ok, type, name, detail = "") {
  const icon = ok ? "OK  " : "FAIL";
  console.log(`[${icon}] [${type}] ${name}${detail ? " — " + detail : ""}`);
}

/** Cerca foto su Pexels, restituisce array di photo objects */
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
    throw new Error(
      `Strapi upload failed: ${JSON.stringify(json.error || json)}`
    );
  }
  return json[0]; // Primo file caricato
}

/**
 * Scarica N foto da Pexels per la query e le carica su Strapi.
 * Restituisce array di ID media Strapi.
 */
async function pexelsToStrapi(query, count = 3) {
  const photos = await searchPexels(query, count);
  const mediaIds = [];

  for (const photo of photos) {
    try {
      const imageUrl = photo.src.large;
      const filename = `pexels-${photo.id}.jpg`;
      console.log(`    Downloading: ${filename} (${query})`);
      const buffer = await downloadImage(imageUrl);
      console.log(`    Uploading: ${filename}...`);
      const media = await uploadToStrapi(buffer, filename);
      mediaIds.push(media.id);
      console.log(`    Uploaded: id=${media.id}`);
      await sleep(500);
    } catch (err) {
      console.error(`    Error processing photo ${photo.id}: ${err.message}`);
    }
  }

  return mediaIds;
}

/** GET da Strapi */
async function apiGet(endpoint) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `GET ${endpoint} failed: ${JSON.stringify(json.error || json)}`
    );
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
    throw new Error(
      `PUT ${endpoint} failed: ${JSON.stringify(json.error || json)}`
    );
  }
  return json;
}

// ============================================================
// CONFIGURAZIONE — 4 NUOVI PRODOTTI
// ============================================================

const NEW_PRODUCTS = [
  {
    slug: "napoleon-prestige-pro-500",
    pexelsQuery: "gas grill stainless outdoor",
  },
  {
    slug: "oklahoma-joes-highland-offset-smoker",
    pexelsQuery: "offset smoker charcoal",
  },
  {
    slug: "meater-plus-wireless-thermometer",
    pexelsQuery: "wireless meat thermometer",
  },
  {
    slug: "fogo-super-premium-charcoal",
    pexelsQuery: "lump charcoal fire",
  },
];

// Review slugs corrispondenti ai 4 nuovi prodotti
const NEW_REVIEWS = [
  { slug: "napoleon-prestige-pro-500-review" },
  { slug: "oklahoma-joes-highland-offset-smoker-review" },
  { slug: "meater-plus-wireless-thermometer-review" },
  { slug: "fogo-super-premium-charcoal-review" },
];

// ============================================================
// CONFIGURAZIONE — 4 NUOVE RICETTE
// ============================================================

const NEW_RECIPES = [
  {
    slug: "competition-style-pork-shoulder-14-hour-smoke",
    pexelsQuery: "smoked pulled pork",
  },
  {
    slug: "reverse-seared-tomahawk-ribeye-two-zone",
    pexelsQuery: "tomahawk steak grilled",
  },
  {
    slug: "smoked-chicken-wings-crispy-without-frying",
    pexelsQuery: "smoked chicken wings crispy",
  },
  {
    slug: "burnt-ends-kansas-city-style-brisket-point",
    pexelsQuery: "burnt ends bbq",
  },
];

// ============================================================
// CONFIGURAZIONE — 4 NUOVI TUTORIAL
// ============================================================

const NEW_TUTORIALS = [
  {
    slug: "thermometer-calibration-guide-ice-bath-boiling-test",
    pexelsQuery: "thermometer calibration ice",
  },
  {
    slug: "fire-management-101-offset-smoker-temperature-control",
    pexelsQuery: "offset smoker fire management",
  },
  {
    slug: "bbq-rub-bible-building-flavor-from-scratch",
    pexelsQuery: "bbq dry rub spices",
  },
  {
    slug: "charcoal-vs-pellet-vs-gas-honest-comparison",
    pexelsQuery: "different grills comparison",
  },
];

// ============================================================
// CONFIGURAZIONE — 4 NUOVI BLOG POST
// ============================================================

const NEW_BLOG_POSTS = [
  {
    slug: "stop-buying-cheap-thermometers-lesson-that-ruins-briskets",
    pexelsQuery: "cheap thermometer cooking",
  },
  {
    slug: "tested-5-beginner-smokers-under-500-only-2-worth-it",
    pexelsQuery: "small smoker backyard",
  },
  {
    slug: "myth-of-soaking-wood-chips-and-4-other-bbq-lies",
    pexelsQuery: "wood chips smoking bbq",
  },
  {
    slug: "what-competition-bbq-taught-me-about-backyard-cooking",
    pexelsQuery: "bbq competition trophies",
  },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== SEED IMAGES V2: BBQ Experience (nuovi contenuti) ===\n");

  // 1. Recupera tutti i contenuti esistenti
  console.log("Fetching content from Strapi...\n");

  const [productsRes, reviewsRes, recipesRes, tutorialsRes, blogPostsRes] =
    await Promise.all([
      apiGet("products?pagination[pageSize]=50"),
      apiGet("reviews?pagination[pageSize]=50"),
      apiGet("recipes?pagination[pageSize]=50"),
      apiGet("tutorials?pagination[pageSize]=50"),
      apiGet("blog-posts?pagination[pageSize]=50"),
    ]);

  const products = productsRes.data || [];
  const reviews = reviewsRes.data || [];
  const recipes = recipesRes.data || [];
  const tutorials = tutorialsRes.data || [];
  const blogPosts = blogPostsRes.data || [];

  console.log(
    `Trovati: ${products.length} products, ${reviews.length} reviews, ` +
      `${recipes.length} recipes, ${tutorials.length} tutorials, ${blogPosts.length} blog posts\n`
  );

  // Helper: trova un item per slug
  const findBySlug = (items, slug) => items.find((i) => i.slug === slug);

  // ============================================================
  // 2. PRODOTTI — 3 immagini ciascuno, riutilizzate anche nelle review
  // ============================================================
  console.log("--- PRODUCTS + REVIEWS ---\n");

  // Mappa slug prodotto -> array mediaIds (per riutilizzo nelle review)
  const productMediaMap = {};

  for (const { slug, pexelsQuery } of NEW_PRODUCTS) {
    const product = findBySlug(products, slug);
    if (!product) {
      log(false, "Product", slug, "not found in Strapi");
      continue;
    }
    const docId = product.documentId;

    console.log(`\nProduct: ${slug}`);
    try {
      const mediaIds = await pexelsToStrapi(pexelsQuery, 3);
      productMediaMap[slug] = mediaIds;
      if (mediaIds.length > 0) {
        await apiPut(`products/${docId}`, { images: mediaIds });
        log(true, "Product", slug, `${mediaIds.length} images linked`);
      } else {
        log(false, "Product", slug, "no images uploaded");
      }
    } catch (err) {
      log(false, "Product", slug, err.message);
    }
  }

  // ============================================================
  // 3. REVIEWS — stesse immagini del prodotto (field: gallery)
  // ============================================================
  for (const { slug } of NEW_REVIEWS) {
    const review = findBySlug(reviews, slug);
    if (!review) {
      log(false, "Review", slug, "not found in Strapi");
      continue;
    }
    const docId = review.documentId;

    // Determina il prodotto corrispondente dalla review slug
    // Convenzione: review slug = product slug + "-review"
    const productSlug = slug.replace(/-review$/, "");
    const mediaIds = productMediaMap[productSlug] || [];

    if (mediaIds.length === 0) {
      log(false, "Review", slug, `no media found for product: ${productSlug}`);
      continue;
    }

    try {
      await apiPut(`reviews/${docId}`, { gallery: mediaIds });
      log(true, "Review", slug, `${mediaIds.length} images linked (reused from product)`);
    } catch (err) {
      log(false, "Review", slug, err.message);
    }
  }

  // ============================================================
  // 4. RICETTE — 1 cover_image ciascuna
  // ============================================================
  console.log("\n--- RECIPES ---\n");

  for (const { slug, pexelsQuery } of NEW_RECIPES) {
    const recipe = findBySlug(recipes, slug);
    if (!recipe) {
      log(false, "Recipe", slug, "not found in Strapi");
      continue;
    }
    const docId = recipe.documentId;

    console.log(`\nRecipe: ${slug}`);
    try {
      const mediaIds = await pexelsToStrapi(pexelsQuery, 1);
      if (mediaIds.length > 0) {
        await apiPut(`recipes/${docId}`, { cover_image: mediaIds[0] });
        log(true, "Recipe", slug, "cover_image set");
      } else {
        log(false, "Recipe", slug, "no image uploaded");
      }
    } catch (err) {
      log(false, "Recipe", slug, err.message);
    }
  }

  // ============================================================
  // 5. TUTORIAL — 1 cover_image ciascuno
  // ============================================================
  console.log("\n--- TUTORIALS ---\n");

  for (const { slug, pexelsQuery } of NEW_TUTORIALS) {
    const tutorial = findBySlug(tutorials, slug);
    if (!tutorial) {
      log(false, "Tutorial", slug, "not found in Strapi");
      continue;
    }
    const docId = tutorial.documentId;

    console.log(`\nTutorial: ${slug}`);
    try {
      const mediaIds = await pexelsToStrapi(pexelsQuery, 1);
      if (mediaIds.length > 0) {
        await apiPut(`tutorials/${docId}`, { cover_image: mediaIds[0] });
        log(true, "Tutorial", slug, "cover_image set");
      } else {
        log(false, "Tutorial", slug, "no image uploaded");
      }
    } catch (err) {
      log(false, "Tutorial", slug, err.message);
    }
  }

  // ============================================================
  // 6. BLOG POSTS — 1 cover_image ciascuno
  // ============================================================
  console.log("\n--- BLOG POSTS ---\n");

  for (const { slug, pexelsQuery } of NEW_BLOG_POSTS) {
    const post = findBySlug(blogPosts, slug);
    if (!post) {
      log(false, "BlogPost", slug, "not found in Strapi");
      continue;
    }
    const docId = post.documentId;

    console.log(`\nBlog Post: ${slug}`);
    try {
      const mediaIds = await pexelsToStrapi(pexelsQuery, 1);
      if (mediaIds.length > 0) {
        await apiPut(`blog-posts/${docId}`, { cover_image: mediaIds[0] });
        log(true, "BlogPost", slug, "cover_image set");
      } else {
        log(false, "BlogPost", slug, "no image uploaded");
      }
    } catch (err) {
      log(false, "BlogPost", slug, err.message);
    }
  }

  console.log("\n=== SEED IMAGES V2 COMPLETE ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
