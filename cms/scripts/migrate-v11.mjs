/**
 * Migrazione dati v11 — seed categorie prodotto, backfill prodotti, tag subscriber.
 *
 * Eseguire DOPO il rebuild del CMS con i nuovi schemi (Plan 11-01).
 * Uso: STRAPI_URL=https://cms.bbq-experience.com STRAPI_API_TOKEN=xxx node cms/scripts/migrate-v11.mjs
 *
 * Idempotente: controlla se i dati esistono prima di creare/aggiornare.
 */

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";

if (!STRAPI_API_TOKEN) {
  console.error("[ERRORE] STRAPI_API_TOKEN non impostato.");
  process.exit(1);
}

// --- Costanti ---

/** Categorie da creare con traduzioni EN/IT/ES */
const CATEGORIES = [
  { slug: "grill",       en: "Grill",        it: "Griglia",           es: "Parrilla" },
  { slug: "smoker",      en: "Smoker",       it: "Affumicatore",      es: "Ahumador" },
  { slug: "pellet",      en: "Pellet Grill", it: "Griglia a Pellet",  es: "Parrilla de Pellet" },
  { slug: "thermometer", en: "Thermometer",  it: "Termometro",        es: "Termometro" },
  { slug: "accessory",   en: "Accessory",    it: "Accessorio",        es: "Accesorio" },
];

/**
 * Mappa hard-coded documentId -> categoria (da produzione 2026-04-17).
 * fuel e other vengono rimappati ad accessory (D-03).
 * Nessun prodotto matcha il criterio pellet (nome contiene "pellet" AND era grill).
 */
const PRODUCT_CATEGORY_MAP = {
  "n0hmbrcaz64fln5fjkt190wg": "grill",        // Weber Summit S-470 Gas Grill
  "urpu2fqnzb2hhdtbyp8t9w15": "smoker",       // Traeger Ironwood 885 Pellet Smoker
  "ilaf9a9s9okfi123v8v6qn74": "thermometer",   // ThermoWorks Thermapen ONE
  "ocyr2kbbjkntjl3a991tljod": "accessory",     // Jealous Devil Lump Charcoal (era fuel)
  "qwjvr7jhpwfwacw348e6cyyf": "accessory",     // GrillGrate Sear Station
  "z9zt6kznnrtmkujirs3i1eid": "grill",        // Kamado Joe Classic III
  "ed20fjcw8h88pmj6seawxemo": "grill",        // Napoleon Prestige Pro 500
  "p26wi9c1ctrxwappoiqbr72k": "smoker",       // Oklahoma Joe's Highland Offset Smoker
  "mq6sz11sfjs3ggrstt38jhoe": "thermometer",   // Meater Plus Wireless Thermometer
  "yg9esdl3cd5jor0o463zozkl": "accessory",     // Fogo Super Premium Charcoal (era fuel)
  "u4hh0feir1fnxvl8t65sj68d": "grill",        // Weber Kettle Premium 22"
  "hmvrk56q32tjb5ajole9rgpz": "smoker",       // Pit Boss Navigator 850
  "jzjb440mq8dbav79dddtdono": "smoker",       // Yoder YS640s
  "m9u4z5ol5p5pp5pmxxuc871p": "grill",        // Lodge Cast Iron Sportsman Grill
  "bw2ln3wk83i0y25g5p2jlunu": "thermometer",   // ThermoWorks Signals
  "mfw1i73tqywjh1vwysjocb6e": "accessory",     // Weber Rapidfire Chimney Starter
  "qgmpbjoboju8333u4hgjmdoo": "accessory",     // Flame Boss 500
  "fqz9suyz7udv50im9hjjcdoe": "smoker",       // Camp Chef Woodwind WiFi 24
  "y3du8h101x8q2m6wnwqhmkkg": "accessory",     // Royal Oak Lump Charcoal (era fuel)
  "rd0yneaaxc9r3hw1dwd8heq7": "accessory",     // Kingsford Professional Briquettes (era fuel)
  "dkg88l2p5vxpxuckvnf7hjq8": "thermometer",   // Inkbird IBBQ-4T WiFi Thermometer
  "sosc2fd5reubedtsqz2e6mtm": "accessory",     // Ironwood Cutting Board
  "pock4iqglilf0106jlh1l7lk": "grill",        // Big Green Egg Large
  "x4hwvm05jx86m4vi5z9r7xm1": "accessory",     // Thermacell Patio Shield
  "rpptzzyup5mqbvbovqq68xp7": "grill",        // Char-Broil Kettleman TRU-Infrared
};

// --- Utility ---

/** Header comuni per tutte le richieste Strapi */
function headers() {
  return {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** Fetch wrapper con timeout 10s e gestione errori */
async function apiFetch(url, options = {}) {
  const resp = await fetch(url, {
    ...options,
    headers: { ...headers(), ...options.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Strapi ${options.method || "GET"} ${url} -> ${resp.status}: ${body}`);
  }
  return resp.json();
}

// --- Step 1: Seed categorie prodotto ---

async function seedCategories() {
  console.log("\n=== STEP 1: Seed categorie prodotto ===\n");
  const categoryDocIds = {};

  for (const cat of CATEGORIES) {
    // Controlla se esiste gia (idempotenza)
    const existing = await apiFetch(
      `${STRAPI_URL}/api/product-categories?filters[slug][$eq]=${cat.slug}&locale=en`
    );
    if (existing.data && existing.data.length > 0) {
      const docId = existing.data[0].documentId;
      categoryDocIds[cat.slug] = docId;
      console.log(`[SKIP] Categoria "${cat.slug}" gia esistente (documentId: ${docId})`);
      continue;
    }

    // Crea in locale default (EN)
    const created = await apiFetch(`${STRAPI_URL}/api/product-categories`, {
      method: "POST",
      body: JSON.stringify({ data: { name: cat.en, slug: cat.slug, description: "" } }),
    });
    const docId = created.data.documentId;
    categoryDocIds[cat.slug] = docId;
    console.log(`[SEED] Creata categoria: ${cat.slug} (documentId: ${docId})`);

    // Aggiungi traduzione IT
    await apiFetch(
      `${STRAPI_URL}/api/product-categories/${docId}?locale=it`,
      {
        method: "PUT",
        body: JSON.stringify({ data: { name: cat.it, slug: cat.slug, description: "" } }),
      }
    );
    console.log(`  [i18n] IT -> ${cat.it}`);

    // Aggiungi traduzione ES
    await apiFetch(
      `${STRAPI_URL}/api/product-categories/${docId}?locale=es`,
      {
        method: "PUT",
        body: JSON.stringify({ data: { name: cat.es, slug: cat.slug, description: "" } }),
      }
    );
    console.log(`  [i18n] ES -> ${cat.es}`);
  }

  return categoryDocIds;
}

// --- Step 2: Backfill prodotti con relazione categoria ---

async function backfillProducts(categoryDocIds) {
  console.log("\n=== STEP 2: Backfill prodotti con categoria ===\n");

  // Recupera tutti i prodotti (status=draft include anche published in Strapi v5)
  const products = await apiFetch(
    `${STRAPI_URL}/api/products?locale=en&pagination[pageSize]=100&populate=product_category&status=draft`
  );

  let updated = 0;
  let skipped = 0;

  for (const product of products.data) {
    const docId = product.documentId;
    const name = product.name || "?";

    // Controlla se ha gia una categoria assegnata (idempotenza)
    if (product.product_category) {
      console.log(`[SKIP] "${name}" ha gia categoria assegnata`);
      skipped++;
      continue;
    }

    // Determina categoria dalla mappa hard-coded
    let catSlug = PRODUCT_CATEGORY_MAP[docId];
    if (!catSlug) {
      // Fallback: prodotti non in mappa -> accessory
      console.log(`[WARN] "${name}" (${docId}) non in mappa, assegno "accessory"`);
      catSlug = "accessory";
    }

    const catDocId = categoryDocIds[catSlug];
    if (!catDocId) {
      console.error(`[ERRORE] Categoria "${catSlug}" non trovata per "${name}"`);
      continue;
    }

    // Aggiorna prodotto con relazione categoria
    await apiFetch(`${STRAPI_URL}/api/products/${docId}`, {
      method: "PUT",
      body: JSON.stringify({ data: { product_category: catDocId } }),
    });
    console.log(`[UPDATE] "${name}" -> ${catSlug}`);
    updated++;
  }

  console.log(`\nProdotti aggiornati: ${updated}, saltati: ${skipped}`);
}

// --- Step 3: Tag subscriber esistenti come legacy ---

async function tagSubscribers() {
  console.log("\n=== STEP 3: Tag subscriber legacy ===\n");

  const subscribers = await apiFetch(
    `${STRAPI_URL}/api/subscribers?pagination[pageSize]=100`
  );

  let tagged = 0;
  let skipped = 0;

  for (const sub of subscribers.data) {
    const docId = sub.documentId;
    const email = sub.email || "?";

    // Se ha gia un source diverso da null, non toccare
    if (sub.source) {
      console.log(`[SKIP] "${email}" ha gia source="${sub.source}"`);
      skipped++;
      continue;
    }

    try {
      await apiFetch(`${STRAPI_URL}/api/subscribers/${docId}`, {
        method: "PUT",
        body: JSON.stringify({ data: { source: "legacy" } }),
      });
      console.log(`[TAG] "${email}" -> source=legacy`);
      tagged++;
    } catch (err) {
      // Errori subscriber non sono critici
      console.error(`[WARN] Impossibile taggare "${email}": ${err.message}`);
    }
  }

  console.log(`\nSubscriber taggati: ${tagged}, saltati: ${skipped}`);
}

// --- Main ---

async function main() {
  console.log(`Migrazione v11 — ${STRAPI_URL}`);
  console.log("=".repeat(50));

  try {
    // Step 1: Seed categorie
    const categoryDocIds = await seedCategories();

    // Verifica che tutte le categorie siano state create
    const expected = CATEGORIES.map((c) => c.slug);
    const missing = expected.filter((s) => !categoryDocIds[s]);
    if (missing.length > 0) {
      console.error(`[ERRORE CRITICO] Categorie mancanti: ${missing.join(", ")}`);
      process.exit(1);
    }

    // Step 2: Backfill prodotti
    await backfillProducts(categoryDocIds);
  } catch (err) {
    console.error(`[ERRORE CRITICO] ${err.message}`);
    process.exit(1);
  }

  // Step 3: Tag subscriber (non critico, errori non abortiscono)
  try {
    await tagSubscribers();
  } catch (err) {
    console.error(`[WARN] Errore tagging subscriber: ${err.message}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Migrazione v11 completata con successo.");
}

main();
