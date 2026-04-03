/**
 * Conversione unità imperiali → metriche (metric-first) per contenuti IT e ES.
 *
 * Regole:
 * - IT/ES: metrico prima, imperiale tra parentesi
 *   "225°F" → "107°C (225°F)"
 *   "619 sq in" → "3.994 cm² (619 sq in)"
 *   "10 lbs" → "4,5 kg (10 lbs)"
 * - EN: invariato
 * - Già convertiti (es. "0°C (32°F)") vengono saltati
 * - Range: "225-235°F" → "107-113°C (225-235°F)"
 * - Delta/tolleranze: "±5°F" → "±3°C (±5°F)"
 * - Italiano: separatore migliaia = punto, decimali = virgola
 * - Spagnolo: separatore migliaia = punto, decimali = coma
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";

const LOCALES = ["it", "es"];
const ENDPOINTS = ["reviews", "recipes", "tutorials", "blog-posts"];
// Campi testo da scannerizzare
const TEXT_FIELDS = [
  "editorial_content",
  "content",
  "editorial_intro",
  "excerpt",
  "verdict",
];
// Campi array di stringhe
const ARRAY_FIELDS = ["pros", "cons"];

// --- Utility API ---

async function apiGet(endpoint) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${endpoint}: ${JSON.stringify(json.error || json)}`);
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
  if (!res.ok) throw new Error(`PUT ${endpoint}: ${JSON.stringify(json.error || json)}`);
  return json;
}

// --- Fetch paginato ---

async function fetchAll(endpoint, locale) {
  let page = 1;
  const allItems = [];
  while (true) {
    const d = await apiGet(
      `${endpoint}?locale=${locale}&pagination[pageSize]=25&pagination[page]=${page}`
    );
    allItems.push(...d.data);
    if (page >= d.meta.pagination.pageCount) break;
    page++;
  }
  return allItems;
}

// --- Conversioni ---

/** Fahrenheit → Celsius (arrotondato all'intero) */
function fToC(f) {
  return Math.round(((f - 32) * 5) / 9);
}

/** Fahrenheit delta → Celsius delta (arrotondato all'intero, minimo 1) */
function fDeltaToC(fDelta) {
  const c = Math.round((fDelta * 5) / 9);
  return Math.max(1, c);
}

/** Libbre → kg (arrotondato a 1 decimale) */
function lbsToKg(lbs) {
  return Math.round(lbs * 0.45359 * 10) / 10;
}

/** Pollici quadrati → cm² (arrotondato all'intero) */
function sqInToCm2(sqIn) {
  return Math.round(sqIn * 6.4516);
}

/** Pollici → cm (arrotondato a 1 decimale) */
function inchesToCm(inches) {
  return Math.round(inches * 2.54 * 10) / 10;
}

/** Piedi → metri (arrotondato a 1 decimale) */
function feetToM(feet) {
  return Math.round(feet * 0.3048 * 10) / 10;
}

/**
 * Formatta un numero per la localizzazione.
 * IT/ES: virgola per decimali, punto per migliaia.
 */
function formatNum(n, locale) {
  if (Number.isInteger(n)) {
    // Separatore migliaia: punto
    if (n >= 1000) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    return n.toString();
  }
  // Decimale: virgola
  const parts = n.toString().split(".");
  let intPart = parts[0];
  if (Math.abs(parseInt(intPart)) >= 1000) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return intPart + "," + parts[1];
}

// --- Pattern di conversione ---

/**
 * Converte tutte le unità imperiali in un testo usando un approccio a singolo passaggio.
 * Raccoglie tutti i match con i loro indici, poi li sostituisce dal fondo per non
 * invalidare gli offset. Salta le occorrenze già convertite.
 */
function convertText(text, locale) {
  if (!text || typeof text !== "string") return text;

  // Raccoglie tutte le sostituzioni { start, end, replacement }
  const replacements = [];

  // Regex master che matcha tutti i pattern imperiali in un colpo solo.
  // L'ordine delle alternative è importante: i pattern più lunghi/specifici vanno prima.
  const masterRegex = new RegExp(
    [
      // A) Range °F con °C già presente: "225-235°F (107-113°C)" → riordina
      String.raw`(\d+)([-–])(\d+)°F\s*\((\d+)([-–])(\d+)°C\)`,
      // B) °F/°C slash: "165°F/74°C" → riordina
      String.raw`(\d+)°F\s*/\s*(\d+)°C`,
      // C) Già in formato metrico (°F) — SKIP
      // Copre: "95°C (203°F)", "±0,3°C (±0,5°F)", "107-113°C (225-235°F)", "3.994 cm² (619 sq in)"
      String.raw`[±\d,.\-]+°C\s*\([^)]*°F\)`,
      String.raw`[\d.]+\s*cm²\s*\([^)]*sq\s*in\)`,
      String.raw`[\d.,]+\s*kg\s*\([^)]*(?:lbs?|pounds?)\)`,
      String.raw`[\d.,]+\s*cm\s*\([^)]*inch(?:es)?\)`,
      String.raw`[\d.,]+\s*m\s*\([^)]*(?:feet|foot)\)`,
      // D) Delta range ±: "±10-15°F"
      String.raw`(±)(\d+)([-–])(\d+)°F`,
      // E) Delta semplice ±: "±2°F", "±0,5°F"
      String.raw`(±)(\d+[,.]?\d*)°F`,
      // F) Range °F senza conversione: "225-235°F", "150-165°F", "20-30°F"
      String.raw`(\d+)([-–])(\d+)°F`,
      // G) Temperatura assoluta singola: "225°F"
      //    NON dentro parentesi (cioè non "(225°F)")
      String.raw`(\d+)°F`,
      // H) Superficie: "619 sq in"
      String.raw`(\d+[\d.]*)\s*sq\s*in`,
      // I) Libbre: "10 lbs", "10 lb", "10 pounds"
      String.raw`(\d+[\d.,]*)\s*(lbs?|pounds?)(?=\b|\s|[,;.\-)]|$)`,
      // J) Pollici: "6 inches", "6 inch"
      String.raw`(\d+[\d.,]*)\s*(inch(?:es)?)(?=\b|\s|[,;.\-)]|$)`,
      // K) Piedi: "6 feet", "6 foot"
      String.raw`(\d+[\d.,]*)\s*(feet|foot)(?=\b|\s|[,;.\-)]|$)`,
    ].join("|"),
    "gi"
  );

  let m;
  while ((m = masterRegex.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    // Determina quale alternativa ha matchato controllando i gruppi di cattura
    let replacement = null;

    // A) Range °F con °C: gruppi 1-6
    if (m[1] !== undefined && fullMatch.includes("°C)")) {
      const [, f1, sep1, f2, c1, , c2] = m;
      replacement = `${c1}-${c2}°C (${f1}${sep1}${f2}°F)`;
    }
    // B) °F/°C slash: gruppi 7-8
    else if (m[7] !== undefined && fullMatch.includes("/")) {
      replacement = `${m[8]}°C (${m[7]}°F)`;
    }
    // C) Già convertito °C (X°F) — skip
    else if (fullMatch.match(/^\d+°C\s*\(\d+°F\)$/)) {
      continue;
    }
    // D) Delta range ±: gruppi 9-12
    else if (m[9] !== undefined && m[11] !== undefined) {
      const pm = m[9];
      const c1 = fDeltaToC(parseInt(m[10]));
      const c2 = fDeltaToC(parseInt(m[12]));
      replacement = `${pm}${c1}-${c2}°C (${pm}${m[10]}${m[11]}${m[12]}°F)`;
    }
    // E) Delta semplice ±: gruppi 13-14
    else if (m[13] !== undefined) {
      const pm = m[13];
      const numStr = m[14];
      const fVal = parseFloat(numStr.replace(",", "."));
      const cVal = (fVal * 5) / 9;
      const cRounded =
        fVal < 1
          ? Math.round(cVal * 10) / 10
          : Math.max(1, Math.round(cVal));
      replacement = `${pm}${formatNum(cRounded, locale)}°C (${pm}${numStr}°F)`;
    }
    // F) Range °F: gruppi 15-17
    else if (m[15] !== undefined && m[17] !== undefined && fullMatch.includes("°F")) {
      // Determina se è un delta (contesto: "di X-Y°F", "entro X-Y°F", "meno di X-Y°F")
      const before = text.substring(Math.max(0, idx - 30), idx).toLowerCase();
      const after = text.substring(idx + fullMatch.length, idx + fullMatch.length + 25).toLowerCase();
      const isDelta = /(?:entro|meno di|menos de|within|variazion[ei] di|variación de)\s*$/.test(before) ||
        /^\s*(?:in più|troppo|de más|más alto|alto|di variazione|de variación|di differenza|de diferencia)/.test(after) ||
        (/(?:segna |marca |lee |di |de )\s*$/.test(before) && /^\s*(?:in più|troppo|de más|más)/.test(after));
      if (isDelta) {
        const c1 = fDeltaToC(parseInt(m[15]));
        const c2 = fDeltaToC(parseInt(m[17]));
        replacement = `${c1}-${c2}°C (${m[15]}${m[16]}${m[17]}°F)`;
      } else {
        const c1 = fToC(parseInt(m[15]));
        const c2 = fToC(parseInt(m[17]));
        replacement = `${c1}-${c2}°C (${m[15]}${m[16]}${m[17]}°F)`;
      }
    }
    // G) Temperatura assoluta: gruppo 18
    else if (m[18] !== undefined && fullMatch.includes("°F")) {
      // Controlla se °F è dentro parentesi "(X°F)" — skip
      if (idx > 0 && text[idx - 1] === "(") {
        continue;
      }
      // Controlla se è un delta dal contesto.
      // "leggeva 8°F troppo alto" → delta (8°F is the deviation)
      // "leggeva 203°F" → absolute (203°F is the reading)
      // "fuori di 5°F" → delta
      // "meno di 15°F di variazione" → delta
      // "menos de 15°F de variación" → delta
      const before = text.substring(Math.max(0, idx - 50), idx).toLowerCase();
      const after = text.substring(idx + fullMatch.length, idx + fullMatch.length + 30).toLowerCase();
      // Pattern "after" che indicano un delta
      const afterIsDelta = /^\s*(?:troppo|in più|de más|más alto|alto|basso|di variazion|de variación|di differenza|de diferencia)/.test(after);
      // Pattern "before" che indicano un delta SOLO se combinati con after-context
      const beforeSuggests = /(?:di oltre |di |segna |leggeva |leggere sempre |lee |leer |marca )\s*$/.test(before);
      // Pattern "before" forti che indicano delta da soli
      const beforeIsDelta = /(?:entro |meno di |menos de |within |variazion[ei] di |fuori di (?:oltre )?|fuera de (?:más de )?)\s*$/.test(before);
      const isDelta = beforeIsDelta || afterIsDelta || (beforeSuggests && afterIsDelta);
      const f = parseInt(m[18]);
      if (isDelta) {
        const c = fDeltaToC(f);
        replacement = `${c}°C (${m[18]}°F)`;
      } else {
        const c = fToC(f);
        replacement = `${c}°C (${m[18]}°F)`;
      }
    }
    // H) sq in: gruppo 19
    else if (m[19] !== undefined && fullMatch.toLowerCase().includes("sq")) {
      const sqIn = parseFloat(m[19]);
      const cm2 = sqInToCm2(sqIn);
      replacement = `${formatNum(cm2, locale)} cm² (${m[19]} sq in)`;
    }
    // I) Libbre: gruppi 20-21
    else if (m[20] !== undefined && m[21] !== undefined && /lbs?|pounds?/i.test(m[21])) {
      const lbs = parseFloat(m[20].replace(",", "."));
      const kg = lbsToKg(lbs);
      replacement = `${formatNum(kg, locale)} kg (${m[20]} ${m[21]})`;
    }
    // J) Pollici: gruppi 22-23
    else if (m[22] !== undefined && m[23] !== undefined && /inch/i.test(m[23])) {
      const inches = parseFloat(m[22].replace(",", "."));
      const cm = inchesToCm(inches);
      replacement = `${formatNum(cm, locale)} cm (${m[22]} ${m[23]})`;
    }
    // K) Piedi: gruppi 24-25
    else if (m[24] !== undefined && m[25] !== undefined && /feet|foot/i.test(m[25])) {
      const feet = parseFloat(m[24].replace(",", "."));
      const mt = feetToM(feet);
      replacement = `${formatNum(mt, locale)} m (${m[24]} ${m[25]})`;
    }

    if (replacement !== null && replacement !== fullMatch) {
      replacements.push({ start: idx, end: idx + fullMatch.length, replacement });
    }
  }

  // Applica le sostituzioni dal fondo verso l'inizio per non invalidare gli indici
  let result = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.substring(0, r.start) + r.replacement + result.substring(r.end);
  }

  return result;
}

// --- Controlla se c'è qualcosa da convertire ---

function hasImperialUnits(text) {
  if (!text || typeof text !== "string") return false;
  // Rimuovi tutti i pattern già convertiti, poi controlla se rimangono unità imperiali
  const stripped = text
    .replace(/[±\d,.\-]+°C\s*\([^)]*°F\)/g, "")       // °C (...°F)
    .replace(/[\d.]+\s*cm²\s*\([^)]*sq\s*in\)/g, "")   // cm² (...sq in)
    .replace(/[\d.,]+\s*kg\s*\([^)]*(?:lbs?|pounds?)\)/g, "") // kg (...lbs)
    .replace(/[\d.,]+\s*cm\s*\([^)]*inch(?:es)?\)/g, "")  // cm (...inches)
    .replace(/[\d.,]+\s*m\s*\([^)]*(?:feet|foot)\)/g, ""); // m (...feet)
  return /\d+°F|\bsq\s*in\b|\b\d+\s*lbs?\b|\b\d+\s*pounds?\b|\b\d+\s*inch|\b\d+\s*(feet|foot)\b/i.test(
    stripped
  );
}

// --- Main ---

async function main() {
  let totalUpdated = 0;
  let totalChanges = 0;

  for (const endpoint of ENDPOINTS) {
    for (const locale of LOCALES) {
      const items = await fetchAll(endpoint, locale);
      console.log(
        `\n📋 ${endpoint}/${locale}: ${items.length} elementi trovati`
      );

      for (const item of items) {
        const updates = {};
        let changes = [];

        // Campi testo
        for (const field of TEXT_FIELDS) {
          if (!item[field]) continue;
          if (!hasImperialUnits(item[field])) continue;

          const converted = convertText(item[field], locale);
          if (converted !== item[field]) {
            updates[field] = converted;
            changes.push(field);
          }
        }

        // Campi array (pros, cons)
        for (const field of ARRAY_FIELDS) {
          if (!Array.isArray(item[field])) continue;
          let arrayChanged = false;
          const newArray = item[field].map((str, i) => {
            if (!hasImperialUnits(str)) return str;
            const converted = convertText(str, locale);
            if (converted !== str) {
              arrayChanged = true;
              changes.push(`${field}[${i}]`);
            }
            return converted;
          });
          if (arrayChanged) {
            updates[field] = newArray;
          }
        }

        // Applica aggiornamento se ci sono cambiamenti
        if (Object.keys(updates).length > 0) {
          console.log(
            `  🔄 ${item.documentId} (${item.title?.substring(0, 50)}...)`
          );
          for (const ch of changes) {
            // Mostra preview della modifica
            const field = ch.replace(/\[\d+\]$/, "");
            const idx = ch.match(/\[(\d+)\]$/)?.[1];
            const oldVal =
              idx !== undefined ? item[field][parseInt(idx)] : item[field];
            const newVal =
              idx !== undefined
                ? updates[field][parseInt(idx)]
                : updates[field];
            // Trova la prima differenza per mostrare un excerpt
            const oldSnippet = findFirstDiff(oldVal, newVal);
            console.log(`    ✏️  ${ch}: ${oldSnippet}`);
          }

          try {
            await apiPut(
              `${endpoint}/${item.documentId}?locale=${locale}`,
              updates
            );
            console.log(`    ✅ Aggiornato`);
            totalUpdated++;
            totalChanges += changes.length;
          } catch (err) {
            console.error(`    ❌ Errore: ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `🏁 Completato: ${totalUpdated} documenti aggiornati, ${totalChanges} campi modificati`
  );
}

/** Trova e mostra la prima differenza tra due stringhe */
function findFirstDiff(oldStr, newStr) {
  if (typeof oldStr !== "string" || typeof newStr !== "string") return "";
  for (let i = 0; i < oldStr.length; i++) {
    if (oldStr[i] !== newStr[i]) {
      const start = Math.max(0, i - 15);
      const oldEnd = Math.min(oldStr.length, i + 40);
      const newEnd = Math.min(newStr.length, i + 40);
      return `"...${oldStr.substring(start, oldEnd)}..." → "...${newStr.substring(start, newEnd)}..."`;
    }
  }
  return "(nessuna differenza visibile)";
}

main().catch((err) => {
  console.error("❌ Errore fatale:", err);
  process.exit(1);
});
