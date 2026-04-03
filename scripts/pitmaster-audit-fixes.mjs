/**
 * Pitmaster Audit Fixes — applica 6 correzioni ai contenuti di BBQ Experience Strapi.
 * Fix 1: Weber Summit title (3 locale)
 * Fix 2: Traeger Ironwood title (3 locale)
 * Fix 3: Traeger Ironwood score_overall 6.8 → 6.5 (3 locale)
 * Fix 4: Weber Summit score_overall 7.0 → 6.8 (3 locale)
 * Fix 5: Reverse-Seared Tomahawk prep_time 1470 → 15
 * Fix 6: Smoked Baby Back Ribs cook_time 360 → 300
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";

const LOCALES = ["en", "it", "es"];

// --- Utility ---

async function apiGet(endpoint) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json.error || json, null, 2));
  return json;
}

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
  if (!res.ok) throw new Error(JSON.stringify(json.error || json, null, 2));
  return json;
}

function log(ok, label) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
}

// --- Cerca documentId tramite slug per una collezione ---
async function findDocumentId(collection, slug) {
  const res = await apiGet(
    `${collection}?filters[slug][$eq]=${encodeURIComponent(slug)}&locale=en&fields[0]=id&fields[1]=documentId&fields[2]=slug`
  );
  const item = res.data?.[0];
  if (!item) throw new Error(`Non trovato: ${collection} slug="${slug}"`);
  return item.documentId;
}

// --- Aggiorna un documento in una specifica locale ---
async function updateLocale(collection, documentId, locale, data) {
  await apiPut(`${collection}/${documentId}?locale=${locale}`, data);
}

// ============================================================
// FIX 1 & 4: Weber Summit Charcoal Grill S-670 — title + score
// ============================================================

async function fixWeberSummit() {
  console.log("\n--- Fix 1 & 4: Weber Summit ---");

  const slug = "weber-summit-s-470-review";
  let documentId;
  try {
    documentId = await findDocumentId("reviews", slug);
    console.log(`  documentId: ${documentId}`);
  } catch (e) {
    console.error("  Impossibile trovare Weber Summit. Cerco tra tutte le review...");
    await listReviews();
    return;
  }

  const titles = {
    en: "$2,800 Worth of Gas Grill — Is It $2,800 Worth of Cooking?",
    it: "2.800$ di Grill a Gas — Valgono 2.800$ di Cottura?",
    es: "2.800$ de Parrilla a Gas — ¿Valen 2.800$ de Cocina?",
  };

  for (const locale of LOCALES) {
    try {
      await updateLocale("reviews", documentId, locale, {
        title: titles[locale],
        score_overall: 6.8,
      });
      log(true, `Weber Summit [${locale}] title + score_overall → 6.8`);
    } catch (e) {
      log(false, `Weber Summit [${locale}]: ${e.message}`);
    }
  }
}

// ============================================================
// FIX 2 & 3: Traeger Ironwood 885 — title + score
// ============================================================

async function fixTraegerIronwood() {
  console.log("\n--- Fix 2 & 3: Traeger Ironwood 885 ---");

  const slug = "traeger-ironwood-885-review";
  let documentId;
  try {
    documentId = await findDocumentId("reviews", slug);
    console.log(`  documentId: ${documentId}`);
  } catch (e) {
    console.error("  Impossibile trovare Traeger Ironwood. Cerco tra tutte le review...");
    await listReviews();
    return;
  }

  const titles = {
    en: "The Easiest Smoker You'll Ever Use — And That's the Problem",
    it: "L'Affumicatore Più Facile Che Userai Mai — E Questo È il Problema",
    es: "El Ahumador Más Fácil Que Usarás — Y Ese Es el Problema",
  };

  for (const locale of LOCALES) {
    try {
      await updateLocale("reviews", documentId, locale, {
        title: titles[locale],
        score_overall: 6.5,
      });
      log(true, `Traeger Ironwood [${locale}] title + score_overall → 6.5`);
    } catch (e) {
      log(false, `Traeger Ironwood [${locale}]: ${e.message}`);
    }
  }
}

// ============================================================
// FIX 5: Reverse-Seared Tomahawk — prep_time
// ============================================================

async function fixTomahawkPrepTime() {
  console.log("\n--- Fix 5: Reverse-Seared Tomahawk prep_time ---");

  const slug = "reverse-seared-tomahawk-ribeye-two-zone";
  let documentId;
  try {
    documentId = await findDocumentId("recipes", slug);
    console.log(`  documentId: ${documentId}`);
  } catch (e) {
    console.error("  Impossibile trovare Tomahawk recipe. Cerco tra tutte le ricette...");
    await listRecipes();
    return;
  }

  // prep_time è un campo senza localizzazione, aggiorniamo solo en
  try {
    await apiPut(`recipes/${documentId}?locale=en`, { prep_time: 15 });
    log(true, `Reverse-Seared Tomahawk prep_time → 15`);
  } catch (e) {
    log(false, `Reverse-Seared Tomahawk prep_time: ${e.message}`);
  }
}

// ============================================================
// FIX 6: Smoked Baby Back Ribs — cook_time
// ============================================================

async function fixRibsCookTime() {
  console.log("\n--- Fix 6: Smoked Baby Back Ribs cook_time ---");

  const slug = "smoked-baby-back-ribs-honey-glaze";
  let documentId;
  try {
    documentId = await findDocumentId("recipes", slug);
    console.log(`  documentId: ${documentId}`);
  } catch (e) {
    console.error("  Impossibile trovare Baby Back Ribs recipe. Cerco tra tutte le ricette...");
    await listRecipes();
    return;
  }

  try {
    await apiPut(`recipes/${documentId}?locale=en`, { cook_time: 300 });
    log(true, `Smoked Baby Back Ribs cook_time → 300`);
  } catch (e) {
    log(false, `Smoked Baby Back Ribs cook_time: ${e.message}`);
  }
}

// --- Debug helpers ---

async function listReviews() {
  const res = await apiGet("reviews?fields[0]=slug&fields[1]=title&locale=en&pagination[limit]=50");
  console.log("  Review disponibili:");
  for (const r of res.data || []) {
    console.log(`    documentId=${r.documentId} slug="${r.slug}" title="${r.title}"`);
  }
}

async function listRecipes() {
  const res = await apiGet("recipes?fields[0]=slug&fields[1]=title&locale=en&pagination[limit]=50");
  console.log("  Ricette disponibili:");
  for (const r of res.data || []) {
    console.log(`    documentId=${r.documentId} slug="${r.slug}" title="${r.title}"`);
  }
}

// ============================================================
// MAIN
// ============================================================

console.log("=== Pitmaster Audit Fixes ===");

await fixWeberSummit();
await fixTraegerIronwood();
await fixTomahawkPrepTime();
await fixRibsCookTime();

console.log("\n=== Fine ===");
