/**
 * Script per convertire le unità imperiali in formato duale (imperial + metrico)
 * su tutti i contenuti EN di Strapi BBQ Experience.
 *
 * Regola: imperial resta per primo, metrico tra parentesi.
 * Es. "225°F" → "225°F (107°C)"
 * Non doppia-converte valori già convertiti.
 */

const API_URL = 'https://cms.bbq-experience.com/api';
const TOKEN = '60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9';

const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// --- Tabelle di conversione ---

// Temperature Fahrenheit → Celsius (mappa esatta fornita)
const TEMP_MAP = {
  165: 74, 195: 91, 200: 93, 203: 95,
  225: 107, 250: 121, 275: 135, 325: 163, 350: 177,
  375: 191, 400: 204, 450: 232, 500: 260, 600: 316, 650: 343,
  700: 371, 900: 482,
};

// Conversione generica per temperature non in mappa
function fToC(f) {
  if (TEMP_MAP[f] !== undefined) return TEMP_MAP[f];
  return Math.round((f - 32) * 5 / 9);
}

// Formattazione numeri americani (virgola per migliaia)
function fmtNum(n) {
  // Arrotonda a intero se non necessario
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString('en-US');
  }
  return rounded.toLocaleString('en-US');
}

// --- Pattern di conversione ---

/**
 * Converte tutte le unità imperiali nel testo, evitando doppie conversioni.
 * Gestisce: °F, lbs/lb, inches/inch/in, sq in, oz, feet/ft
 */
function convertUnits(text) {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Ripara conversioni corrotte da run precedenti (cascade bug)
  result = result.replace(/(\d+)\s*lbs\s*\([\d.,]+\s*kg\)(?:s\s*\([\d.,]+\s*kg\))+/g, (match, num) => {
    // Estrai il primo valore metrico
    const m = match.match(/\(([\d.,]+)\s*kg\)/);
    return `${num} lbs (${m[1]} kg)`;
  });
  result = result.replace(/(\d+(?:\.\d+)?)-inch\s*\([\d.,]+\s*cm\)(?:-inch\s*\([\d.,]+\s*cm\))+/g, (match, num) => {
    const m = match.match(/\(([\d.,]+)\s*cm\)/);
    return `${num}-inch (${m[1]} cm)`;
  });

  // Normalizza mojibake comuni (UTF-8 double-encoding)
  result = result.replace(/\u00c2\u00b0/g, '°');           // Â° → °
  result = result.replace(/\u00e2\u20ac\u201d/g, '—');     // â€" → —
  result = result.replace(/\u00e2\u20ac\u201c/g, '"');      // â€œ → "
  result = result.replace(/\u00e2\u20ac\u009d/g, '"');      // â€ → "
  result = result.replace(/\u00e2\u20ac\u2122/g, "'");      // â€™ → '

  // 1) Temperature: ±N°F  → ±N°F (±M°C)

  // ±N°F  → delta, non temperatura assoluta (moltiplica per 5/9)
  result = result.replace(/(±\s*)(\d+)\s*°\s*F(?!\s*\()/g, (match, plusMinus, num) => {
    const deltaF = parseInt(num);
    const deltaC = Math.round(deltaF * 5 / 9);
    return `${plusMinus}${num}°F (${plusMinus}${deltaC}°C)`;
  });

  // N°F  (skip se già ha parentesi con °C dopo)
  result = result.replace(/(\d+)\s*°\s*F(?!\s*\()/g, (match, num) => {
    const f = parseInt(num);
    const c = fToC(f);
    return `${num}°F (${c}°C)`;
  });

  // 2) Peso: N lbs / N lb  (skip se già ha parentesi con kg dopo)
  result = result.replace(/(\d+(?:\.\d+)?)\s*lbs?\b\.?(?!s?\s*\()/gi, (match, num) => {
    const lbs = parseFloat(num);
    const kg = lbs * 0.4536;
    return `${num} lbs (${fmtNum(kg)} kg)`;
  });

  // 3) Area: N sq in / N square inches  (skip se già ha parentesi dopo)
  result = result.replace(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:sq\.?\s*in\.?|square\s+inch(?:es)?)(?!\s*\()/gi, (match, num) => {
    const cleanNum = num.replace(/,/g, '');
    const sqin = parseFloat(cleanNum);
    const sqcm = sqin * 6.45;
    return `${num} sq in (${fmtNum(sqcm)} cm²)`;
  });

  // 4) Lunghezza: N inches / N inch / N-inch  (skip se già ha parentesi dopo)
  //    Attenzione a non catturare "sq in" (già gestito sopra, sq in → cm²)
  result = result.replace(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*[-–]?\s*inch(?:es)?(?!\s*\()/gi, (match, num) => {
    const inches = evalFraction(num);
    const cm = inches * 2.54;
    return `${num}-inch (${fmtNum(cm)} cm)`;
  });

  // 5) Piedi: N feet / N ft  (skip se già ha parentesi dopo)
  result = result.replace(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:feet|ft\.?)(?!\s*\()/gi, (match, num) => {
    const cleanNum = num.replace(/,/g, '');
    const feet = parseFloat(cleanNum);
    const meters = feet * 0.3048;
    return `${num} feet (${fmtNum(meters)} m)`;
  });

  // 6) Once: N oz  (skip se già ha parentesi dopo)
  result = result.replace(/(\d+(?:\.\d+)?)\s*oz\.?(?!\s*\()/gi, (match, num) => {
    const oz = parseFloat(num);
    const ml = oz * 29.57;
    // Per quantità piccole (< 16oz) usiamo ml, altrimenti litri
    if (ml < 1000) {
      return `${num} oz (${fmtNum(ml)} ml)`;
    }
    return `${num} oz (${fmtNum(ml / 1000)} l)`;
  });

  return result;
}

function evalFraction(s) {
  if (s.includes('/')) {
    const parts = s.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(s);
}

// Normalizza solo mojibake (per confronto, senza convertire unità)
function normalizeMojibake(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\u00c2\u00b0/g, '°')
    .replace(/\u00e2\u20ac\u201d/g, '—')
    .replace(/\u00e2\u20ac\u201c/g, '"')
    .replace(/\u00e2\u20ac\u009d/g, '"')
    .replace(/\u00e2\u20ac\u2122/g, "'");
}

// --- Logica API Strapi v5 ---

async function fetchAll(endpoint) {
  const url = `${API_URL}/${endpoint}?locale=en&populate=*&pagination[pageSize]=100`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data || [];
}

async function updateEntry(endpoint, documentId, data) {
  const url = `${API_URL}/${endpoint}/${documentId}?locale=en`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PUT ${endpoint}/${documentId} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// --- Processamento per tipo di contenuto ---

function processStringArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    if (typeof item === 'string') return convertUnits(item);
    return item;
  });
}

function processInstructions(instructions) {
  if (!Array.isArray(instructions)) return instructions;
  return instructions.map(instr => ({
    ...instr,
    description: convertUnits(instr.description),
  }));
}

function processIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return ingredients;
  // Non convertiamo gli ingredienti: le quantità sono strutturate (quantity + unit)
  // e la conversione è gestita dal frontend. Ma convertiamo il campo "name" se contiene misure nel testo.
  return ingredients.map(ing => ({
    ...ing,
    name: convertUnits(ing.name),
  }));
}

async function processReviews() {
  console.log('\n=== REVIEWS ===');
  const items = await fetchAll('reviews');
  let updated = 0;

  for (const item of items) {
    const changes = {};
    let hasChanges = false;

    // Campi testo semplice
    for (const field of ['editorial_content', 'excerpt', 'verdict']) {
      if (item[field]) {
        const converted = convertUnits(item[field]);
        const normalized = normalizeMojibake(item[field]);
        if (converted !== normalized) {
          changes[field] = converted;
          hasChanges = true;
        }
      }
    }

    // Pros e cons (array di stringhe)
    for (const field of ['pros', 'cons']) {
      if (item[field]) {
        const converted = processStringArray(item[field]);
        const normalized = item[field].map(s => typeof s === 'string' ? normalizeMojibake(s) : s);
        if (JSON.stringify(converted) !== JSON.stringify(normalized)) {
          changes[field] = converted;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      console.log(`  Updating review: ${item.title.substring(0, 60)}...`);
      console.log(`    Changed fields: ${Object.keys(changes).join(', ')}`);
      await updateEntry('reviews', item.documentId, changes);
      updated++;
    } else {
      console.log(`  No changes: ${item.title.substring(0, 60)}`);
    }
  }
  console.log(`  Total updated: ${updated}/${items.length}`);
}

async function processRecipes() {
  console.log('\n=== RECIPES ===');
  const items = await fetchAll('recipes');
  let updated = 0;

  for (const item of items) {
    const changes = {};
    let hasChanges = false;

    // Campi testo
    for (const field of ['editorial_intro', 'excerpt']) {
      if (item[field]) {
        const converted = convertUnits(item[field]);
        const normalized = normalizeMojibake(item[field]);
        if (converted !== normalized) {
          changes[field] = converted;
          hasChanges = true;
        }
      }
    }

    // Instructions (array di oggetti con description)
    if (item.instructions) {
      const converted = processInstructions(item.instructions);
      const normalized = item.instructions.map(i => ({ ...i, description: normalizeMojibake(i.description) }));
      if (JSON.stringify(converted) !== JSON.stringify(normalized)) {
        changes.instructions = converted;
        hasChanges = true;
      }
    }

    // Ingredients
    if (item.ingredients) {
      const converted = processIngredients(item.ingredients);
      const normalized = item.ingredients.map(i => ({ ...i, name: normalizeMojibake(i.name) }));
      if (JSON.stringify(converted) !== JSON.stringify(normalized)) {
        changes.ingredients = converted;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      console.log(`  Updating recipe: ${item.title.substring(0, 60)}...`);
      console.log(`    Changed fields: ${Object.keys(changes).join(', ')}`);
      await updateEntry('recipes', item.documentId, changes);
      updated++;
    } else {
      console.log(`  No changes: ${item.title.substring(0, 60)}`);
    }
  }
  console.log(`  Total updated: ${updated}/${items.length}`);
}

async function processTutorials() {
  console.log('\n=== TUTORIALS ===');
  const items = await fetchAll('tutorials');
  let updated = 0;

  for (const item of items) {
    const changes = {};
    let hasChanges = false;

    for (const field of ['content', 'excerpt']) {
      if (item[field]) {
        const converted = convertUnits(item[field]);
        const normalized = normalizeMojibake(item[field]);
        if (converted !== normalized) {
          changes[field] = converted;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      console.log(`  Updating tutorial: ${item.title.substring(0, 60)}...`);
      console.log(`    Changed fields: ${Object.keys(changes).join(', ')}`);
      await updateEntry('tutorials', item.documentId, changes);
      updated++;
    } else {
      console.log(`  No changes: ${item.title.substring(0, 60)}`);
    }
  }
  console.log(`  Total updated: ${updated}/${items.length}`);
}

async function processBlogPosts() {
  console.log('\n=== BLOG POSTS ===');
  const items = await fetchAll('blog-posts');
  let updated = 0;

  for (const item of items) {
    const changes = {};
    let hasChanges = false;

    for (const field of ['content', 'excerpt']) {
      if (item[field]) {
        const converted = convertUnits(item[field]);
        const normalized = normalizeMojibake(item[field]);
        if (converted !== normalized) {
          changes[field] = converted;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      console.log(`  Updating blog post: ${item.title.substring(0, 60)}...`);
      console.log(`    Changed fields: ${Object.keys(changes).join(', ')}`);
      await updateEntry('blog-posts', item.documentId, changes);
      updated++;
    } else {
      console.log(`  No changes: ${item.title.substring(0, 60)}`);
    }
  }
  console.log(`  Total updated: ${updated}/${items.length}`);
}

// --- Main ---
async function main() {
  console.log('BBQ Experience — Conversione unità EN (imperial → imperial + metrico)');
  console.log('=====================================================================\n');

  try {
    await processReviews();
    await processRecipes();
    await processTutorials();
    await processBlogPosts();
    console.log('\n✓ Completato!');
  } catch (err) {
    console.error('\n✗ Errore:', err.message);
    process.exit(1);
  }
}

main();
