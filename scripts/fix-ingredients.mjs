/**
 * Fix ingredienti per le 4 nuove ricette su BBQ Experience Strapi.
 * Gli ingredienti sono stati salvati carattere per carattere invece che
 * nel formato corretto {name, quantity, unit}.
 *
 * Questo script:
 * 1. Recupera ogni ricetta (EN) e ricostruisce le stringhe dai char-objects
 * 2. Parsa ogni stringa nel formato {name, quantity, unit}
 * 3. Aggiorna tutti i locale (EN, IT, ES) con il formato corretto
 */

const API_URL = 'https://cms.bbq-experience.com/api';
const TOKEN = '60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9';

const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Slug EN delle 4 ricette da correggere
const SLUGS = [
  'competition-style-pork-shoulder-14-hour-smoke',
  'reverse-seared-tomahawk-ribeye-two-zone',
  'smoked-chicken-wings-crispy-without-frying',
  'burnt-ends-kansas-city-style-brisket-point',
];

/**
 * Ricostruisce la stringa da un oggetto {0: 'a', 1: 'b', ...}
 */
function charObjectToString(obj) {
  const len = Object.keys(obj).length;
  let s = '';
  for (let i = 0; i < len; i++) {
    s += obj[String(i)];
  }
  return s;
}

/**
 * Controlla se un oggetto ingrediente è nel formato char-by-char
 */
function isCharByChar(obj) {
  return obj !== null && typeof obj === 'object' && '0' in obj;
}

/**
 * Parsa una stringa ingrediente nel formato {name, quantity, unit}.
 *
 * Pattern gestiti:
 * - "--- SEZIONE ---"                       → {name, quantity: '', unit: ''}
 * - "Mix in a spray bottle"                 → {name, quantity: '', unit: ''}
 * - "Testo puro senza quantità"             → {name, quantity: '', unit: ''}
 * - "1 whole packer brisket, ..."           → {name, quantity: '1', unit: 'whole'}
 * - "1/2 cup coarse kosher salt"            → {name, quantity: '1/2', unit: 'cup'}
 * - "2 tbsp butter"                         → {name, quantity: '2', unit: 'tbsp'}
 * - "3 lbs chicken wings..."               → {name, quantity: '3', unit: 'lbs'}
 * - "Optional: 1 wood chunk..."             → {name, quantity: '1', unit: 'wood chunk'}
 */
function parseIngredientString(str) {
  str = str.trim();

  // Sezioni (--- NOME SEZIONE ---) o stringhe note senza quantità
  if (str.startsWith('---') || str.startsWith('Mix in') || str.startsWith('Or:')) {
    return { name: str, quantity: '', unit: '' };
  }

  // Unità di misura riconosciute (ordinate per lunghezza per evitare match parziali)
  const UNITS = [
    'whole packer',
    'bone-in',
    'aluminum-free',
    'wood chunks',
    'wood chunk',
    'sprigs',
    'cloves',
    'whole',
    'tbsp',
    'tsp',
    'cup',
    'cups',
    'lbs',
    'lb',
    'oz',
  ];

  // Pattern: numero (intero, decimale, frazione) opzionalmente seguito da unità
  // Es: "1 cup ...", "1/2 cup ...", "2 tbsp ...", "3 lbs ..."
  const numPattern = /^((?:\d+\/\d+|\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)\s*)/;
  const numMatch = str.match(numPattern);

  if (!numMatch) {
    // Nessun numero → solo nome
    return { name: str, quantity: '', unit: '' };
  }

  const quantity = numMatch[1].trim();
  let rest = str.slice(numMatch[0].length);

  // Cerca unità di misura all'inizio di `rest`
  let unit = '';
  let name = '';

  for (const u of UNITS) {
    const regex = new RegExp(`^${u}\\s+`, 'i');
    if (regex.test(rest)) {
      unit = u;
      name = rest.slice(u.length).trim();
      // Capitalizza il nome
      name = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  if (!unit) {
    // Nessuna unità riconosciuta → il resto è tutto nome
    name = rest.trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return { name, quantity, unit };
}

/**
 * Recupera una ricetta per slug e locale
 */
async function fetchRecipe(slug, locale = 'en') {
  const url = `${API_URL}/recipes?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*&locale=${locale}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const data = await res.json();
  if (!data.data?.length) throw new Error(`Ricetta non trovata: ${slug} (${locale})`);
  return data.data[0];
}

/**
 * Aggiorna gli ingredienti di una ricetta tramite documentId e locale
 */
async function updateIngredients(documentId, locale, ingredients) {
  const url = `${API_URL}/recipes/${documentId}?locale=${locale}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ data: { ingredients } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Elabora una singola ricetta: ricostruisce, parsa, aggiorna tutti i locale
 */
async function processRecipe(slug) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Ricetta: ${slug}`);
  console.log('='.repeat(60));

  // Recupera EN
  const recipe = await fetchRecipe(slug, 'en');
  const documentId = recipe.documentId;
  const rawIngredients = recipe.ingredients;

  console.log(`documentId: ${documentId}`);
  console.log(`Ingredienti grezzi: ${rawIngredients.length}`);

  // Verifica che siano nel formato char-by-char
  if (!rawIngredients.length || !isCharByChar(rawIngredients[0])) {
    console.log('⚠ Ingredienti già nel formato corretto o vuoti, skip.');
    return;
  }

  // Ricostruisce le stringhe
  const strings = rawIngredients.map(charObjectToString);
  console.log('\nStringhe ricostruite:');
  strings.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  // Parsa in {name, quantity, unit}
  const ingredients = strings.map(parseIngredientString);
  console.log('\nIngredienti parsati:');
  ingredients.forEach((ing, i) => {
    console.log(`  ${i + 1}. ${JSON.stringify(ing)}`);
  });

  // Recupera le localizzazioni disponibili
  const localizations = recipe.localizations || [];
  const locales = ['en', ...localizations.map(l => l.locale)];
  console.log(`\nLocale da aggiornare: ${locales.join(', ')}`);

  // Aggiorna tutti i locale con gli stessi ingredienti (EN)
  // Nota: gli ingredienti sono in inglese su tutti i locale (come da struttura esistente)
  for (const locale of locales) {
    process.stdout.write(`  PUT ${locale}... `);
    try {
      await updateIngredients(documentId, locale, ingredients);
      console.log('OK');
    } catch (err) {
      console.log(`ERRORE: ${err.message}`);
    }
  }
}

// --- Main ---
async function main() {
  console.log('Fix ingredienti BBQ Experience - 4 nuove ricette');
  console.log(`API: ${API_URL}`);
  console.log(`Ricette da correggere: ${SLUGS.length}`);

  for (const slug of SLUGS) {
    try {
      await processRecipe(slug);
    } catch (err) {
      console.error(`\nERRORE su ${slug}: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done!');
}

main().catch(console.error);
