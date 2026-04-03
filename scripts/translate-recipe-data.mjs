/**
 * Traduzione ingredienti e istruzioni ricette → IT e ES con unità metriche.
 *
 * Regole:
 * - EN: invariato (unità imperiali)
 * - IT: grammi, ml, kg, °C — nomi ingredienti in italiano
 * - ES: gramos, ml, kg, °C — nombres ingredientes in spagnolo
 *
 * Conversioni:
 * - 1 cup liquidi = 240 ml
 * - 1 cup secchi = 128g (spezie/rub)
 * - 1 tbsp = 15g / 15ml
 * - 1 tsp = 5g / 5ml
 * - 1 lb = 454g → kg se ≥ 1000g
 * - 1 oz = 28g
 *
 * Uso: node scripts/translate-recipe-data.mjs
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// API helpers
// ============================================================

async function apiGet(path) {
  const res = await fetch(`${API_URL}/${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(`GET ${path}: ${JSON.stringify(json.error || json)}`);
  return json;
}

async function apiPut(documentId, locale, data, attempt = 1) {
  const url = `${API_URL}/recipes/${documentId}?locale=${locale}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(
        `❌ ERRORE PUT ${url}:`,
        JSON.stringify(json.error || json, null, 2)
      );
      return null;
    }
    return json;
  } catch (e) {
    if (attempt < 3) {
      console.warn(`⚠️  Timeout ${url}, retry ${attempt}/3...`);
      await delay(3000);
      return apiPut(documentId, locale, data, attempt + 1);
    }
    console.error(`❌ TIMEOUT ${url}:`, e.message);
    return null;
  }
}

// ============================================================
// Conversione unità
// ============================================================

/**
 * Converte una quantità stringa (es. "1/2", "2", "1.5") in numero.
 */
function parseQty(str) {
  if (!str || str.trim() === "") return null;
  const s = str.trim();
  if (s.includes("/")) {
    const [num, den] = s.split("/");
    return parseFloat(num) / parseFloat(den);
  }
  return parseFloat(s);
}

/**
 * Formatta un numero: rimuove trailing zeros, usa fino a 1 decimale.
 */
function fmt(n) {
  if (n === null || isNaN(n)) return "?";
  // arrotonda a 1 decimale, poi rimuovi .0
  const r = Math.round(n * 10) / 10;
  return r % 1 === 0 ? String(Math.round(r)) : r.toFixed(1);
}

/**
 * Determina se un ingrediente è liquido in base al nome.
 */
function isLiquid(name) {
  const liquidKeywords = [
    "juice", "water", "vinegar", "oil", "milk", "cream", "sauce",
    "worcestershire", "butter", "tallow", "broth", "beer", "wine",
    "molasses", "syrup", "honey", "extract",
  ];
  const lc = name.toLowerCase();
  return liquidKeywords.some((kw) => lc.includes(kw));
}

/**
 * Converti quantità e unità in metrico.
 * Ritorna { quantity: string, unit: string } oppure null se non convertibile.
 */
function toMetric(qty, unit, name) {
  const n = parseQty(qty);
  if (n === null || isNaN(n)) return null;

  const u = unit.toLowerCase().trim();

  // Già metrico
  if (["g", "kg", "ml", "l"].includes(u)) return null;

  // Cup
  if (u === "cup" || u === "cups" || u === "tazza" || u === "tazze") {
    if (isLiquid(name)) {
      // liquidi: 1 cup = 240 ml
      const ml = n * 240;
      if (ml >= 1000) return { quantity: fmt(ml / 1000), unit: "l" };
      return { quantity: fmt(ml), unit: "ml" };
    } else {
      // secchi (spezie, rub, etc.): 1 cup = 128g
      const g = n * 128;
      if (g >= 1000) return { quantity: fmt(g / 1000), unit: "kg" };
      return { quantity: fmt(g), unit: "g" };
    }
  }

  // Tablespoon
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons" ||
      u === "cucchiai" || u === "cucharadas") {
    if (isLiquid(name)) {
      return { quantity: fmt(n * 15), unit: "ml" };
    }
    return { quantity: fmt(n * 15), unit: "g" };
  }

  // Teaspoon
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons" ||
      u === "cucchiaino" || u === "cucharadita") {
    if (isLiquid(name)) {
      return { quantity: fmt(n * 5), unit: "ml" };
    }
    return { quantity: fmt(n * 5), unit: "g" };
  }

  // Pounds
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") {
    const g = n * 454;
    if (g >= 1000) return { quantity: fmt(g / 1000), unit: "kg" };
    return { quantity: fmt(g), unit: "g" };
  }

  // Ounces
  if (u === "oz" || u === "ounce" || u === "ounces") {
    const g = n * 28;
    if (g >= 1000) return { quantity: fmt(g / 1000), unit: "kg" };
    return { quantity: fmt(g), unit: "g" };
  }

  // Non convertibile (cloves, steaks, racks, roll, etc.)
  return null;
}

// ============================================================
// Traduzione nomi ingredienti
// ============================================================

/**
 * Mappa traduzioni ingredienti EN → IT / ES.
 * Chiave: stringa EN (lowercase, parziale match).
 * Valore: { it, es }
 *
 * Per ingredienti con note tra parentesi, la nota viene tradotta separatamente.
 */
const INGREDIENT_TRANSLATIONS = {
  // --- Carni ---
  "bone-in ribeye steak": { it: "Bistecca ribeye con osso", es: "Bistec ribeye con hueso" },
  "tomahawk ribeye": { it: "Ribeye tomahawk", es: "Ribeye tomahawk" },
  "whole packer brisket": { it: "Brisket intero", es: "Brisket entero" },
  "pork shoulder": { it: "Spalla di maiale", es: "Paleta de cerdo" },
  "baby back rib": { it: "Costine baby back", es: "Costillas baby back" },
  "chicken wing": { it: "Ali di pollo", es: "Alitas de pollo" },

  // --- Lattici / grassi ---
  "cream cheese": { it: "Formaggio cremoso", es: "Queso crema" },
  "sharp cheddar cheese": { it: "Cheddar stagionato", es: "Cheddar curado" },
  "gruyere cheese": { it: "Formaggio Gruyère", es: "Queso Gruyère" },
  "unsalted butter": { it: "Burro non salato", es: "Mantequilla sin sal" },
  "butter": { it: "Burro", es: "Mantequilla" },
  "whole milk": { it: "Latte intero", es: "Leche entera" },
  "heavy cream": { it: "Panna da cucina", es: "Nata para cocinar" },
  "beef tallow": { it: "Sego di manzo", es: "Sebo de vaca" },

  // --- Verdure / erbe ---
  "fresh flat-leaf parsley": { it: "Prezzemolo fresco a foglia piatta", es: "Perejil fresco de hoja plana" },
  "fresh oregano": { it: "Origano fresco", es: "Orégano fresco" },
  "garlic clove": { it: "Spicchi d'aglio", es: "Dientes de ajo" },
  "garlic": { it: "Aglio", es: "Ajo" },
  "fresh rosemary": { it: "Rosmarino fresco", es: "Romero fresco" },

  // --- Spezie / condimenti ---
  "coarse sea salt": { it: "Sale marino grosso", es: "Sal marina gruesa" },
  "kosher salt": { it: "Sale kosher", es: "Sal kosher" },
  "coarse black pepper": { it: "Pepe nero grosso", es: "Pimienta negra gruesa" },
  "black pepper": { it: "Pepe nero", es: "Pimienta negra" },
  "red pepper flakes": { it: "Peperoncino in scaglie", es: "Hojuelas de chile rojo" },
  "cayenne pepper": { it: "Pepe di Cayenna", es: "Pimienta de Cayena" },
  "smoked paprika": { it: "Paprika affumicata", es: "Pimentón ahumado" },
  "paprika": { it: "Paprika", es: "Pimentón" },
  "garlic powder": { it: "Aglio in polvere", es: "Ajo en polvo" },
  "onion powder": { it: "Cipolla in polvere", es: "Cebolla en polvo" },
  "dry mustard powder": { it: "Senape in polvere", es: "Mostaza en polvo" },
  "ground cumin": { it: "Cumino macinato", es: "Comino molido" },
  "dried thyme": { it: "Timo secco", es: "Tomillo seco" },
  "baking powder": { it: "Lievito in polvere", es: "Polvo de hornear" },

  // --- Liquidi / salse ---
  "red wine vinegar": { it: "Aceto di vino rosso", es: "Vinagre de vino tinto" },
  "apple cider vinegar": { it: "Aceto di sidro di mele", es: "Vinagre de sidra de manzana" },
  "extra-virgin olive oil": { it: "Olio extravergine di oliva", es: "Aceite de oliva virgen extra" },
  "olive oil": { it: "Olio d'oliva", es: "Aceite de oliva" },
  "high-heat oil": { it: "Olio ad alto punto di fumo", es: "Aceite para alta temperatura" },
  "avocado oil": { it: "Olio di avocado", es: "Aceite de aguacate" },
  "apple juice": { it: "Succo di mela", es: "Jugo de manzana" },
  "worcestershire sauce": { it: "Salsa worcestershire", es: "Salsa worcestershire" },
  "bbq sauce": { it: "Salsa BBQ", es: "Salsa BBQ" },
  "hot sauce": { it: "Salsa piccante", es: "Salsa picante" },
  "wing sauce": { it: "Salsa per ali", es: "Salsa para alitas" },
  "honey": { it: "Miele", es: "Miel" },
  "water": { it: "Acqua", es: "Agua" },

  // --- Zuccheri ---
  "brown sugar": { it: "Zucchero di canna", es: "Azúcar moreno" },
  "dark brown sugar": { it: "Zucchero di canna scuro", es: "Azúcar moreno oscuro" },

  // --- Pasta / altro ---
  "elbow macaroni": { it: "Maccheroni a gomito", es: "Macarrones codo" },
  "panko breadcrumbs": { it: "Pangrattato panko", es: "Pan rallado panko" },
  "egg": { it: "Uova", es: "Huevos" },

  // --- Legante ---
  "yellow mustard": { it: "Senape gialla", es: "Mostaza amarilla" },

  // --- Legna / carbone ---
  "lump charcoal": { it: "Carbonella grezza", es: "Carbón vegetal" },
  "post oak wood": { it: "Legno di quercia post oak", es: "Madera de post oak" },
  "post oak": { it: "Post oak", es: "Post oak" },
  "cherry or apple wood": { it: "Legno di ciliegio o melo", es: "Madera de cerezo o manzano" },
  "wood chunk": { it: "Ciocchi di legno", es: "Trozos de madera" },
  "apple": { it: "Melo", es: "Manzano" },

  // --- Altro ---
  "butcher paper": { it: "Carta da macellaio", es: "Papel de carnicero" },
};

/**
 * Traduce il nome di un ingrediente cercando la corrispondenza nella mappa.
 * Gestisce le note tra parentesi separatamente.
 */
function translateIngredientName(name, locale) {
  if (locale === "en") return name;

  // Estrai note tra parentesi (es. "(finely chopped)")
  const parenMatch = name.match(/^(.*?)\s*(\(.*\))\s*$/);
  const baseName = parenMatch ? parenMatch[1].trim() : name.trim();
  const note = parenMatch ? parenMatch[2] : "";

  const lc = baseName.toLowerCase();

  // Cerca corrispondenza nella mappa (partial match, più lungo vince)
  let bestKey = null;
  let bestLen = 0;
  for (const key of Object.keys(INGREDIENT_TRANSLATIONS)) {
    if (lc.includes(key) && key.length > bestLen) {
      bestKey = key;
      bestLen = key.length;
    }
  }

  let translatedBase = baseName;
  if (bestKey) {
    translatedBase = INGREDIENT_TRANSLATIONS[bestKey][locale] || baseName;
  }

  // Traduzione note comuni
  const noteTranslations = {
    it: {
      "finely chopped": "finemente tritato",
      "minced": "tritato",
      "bone-in": "con osso",
      "8-10 lbs, with fat cap intact": "3,6-4,5 kg, con strato di grasso intatto",
      "not from concentrate": "non da concentrato",
      "1.5-inch (3.8 cm) thick": "spesso 3,8 cm",
      "2-2.5 inches thick, 2.5-3.5 lbs": "spesso 5-6,4 cm, 1,1-1,6 kg",
      "ask your butcher or cut them yourself": "chiedi al macellaio o tagliale tu",
      "flats and drums separated": "flat e drum separati",
      "shredded": "grattugiato",
      "beaten": "sbattute",
      "smashed": "schiacciato",
      "for optional basting": "per spennellare (opzionale)",
      "for wrapping, optional": "per avvolgere, opzionale",
      "binder, optional": "legante, opzionale",
      "binder": "legante",
      "16-mesh": "maglia 16",
      "hungarian sweet, not smoked — the smoke comes from the cooker": "dolce ungherese, non affumicata",
      "diamond crystal": "Diamond Crystal",
      "diamond crystal, not morton's — morton's is 1.5x saltier by volume": "Diamond Crystal",
      "pink, unwaxed": "rosa, non cerosa",
      "not baking soda — this is critical": "non bicarbonato — è fondamentale",
      "aluminum-free": "senza alluminio",
      "large": "grandi",
      "kansas city style — sweet and thick": "stile Kansas City — dolce e densa",
      "crystal or frank's — not sriracha, wrong flavor profile": "Crystal o Frank's — non sriracha",
      "not olive oil — olive oil smokes at these temperatures": "non olio d'oliva — fuma a queste temperature",
      "usda choice or prime": "USDA Choice o Prime",
      "for optional basting": "per spennellare (opzionale)",
    },
    es: {
      "finely chopped": "finamente picado",
      "minced": "picado",
      "bone-in": "con hueso",
      "8-10 lbs, with fat cap intact": "3,6-4,5 kg, con capa de grasa intacta",
      "not from concentrate": "sin concentrar",
      "1.5-inch (3.8 cm) thick": "de 3,8 cm de grosor",
      "2-2.5 inches thick, 2.5-3.5 lbs": "de 5-6,4 cm de grosor, 1,1-1,6 kg",
      "ask your butcher or cut them yourself": "pide a tu carnicero o córtalas tú mismo",
      "flats and drums separated": "planos y baquetas separados",
      "shredded": "rallado",
      "beaten": "batidos",
      "smashed": "aplastado",
      "for optional basting": "para pincelar (opcional)",
      "for wrapping, optional": "para envolver, opcional",
      "binder, optional": "aglutinante, opcional",
      "binder": "aglutinante",
      "16-mesh": "malla 16",
      "hungarian sweet, not smoked — the smoke comes from the cooker": "dulce húngaro, sin ahumar",
      "diamond crystal": "Diamond Crystal",
      "diamond crystal, not morton's — morton's is 1.5x saltier by volume": "Diamond Crystal",
      "pink, unwaxed": "rosa, sin cera",
      "not baking soda — this is critical": "no bicarbonato — esto es crítico",
      "aluminum-free": "sin aluminio",
      "large": "grandes",
      "kansas city style — sweet and thick": "estilo Kansas City — dulce y espesa",
      "crystal or frank's — not sriracha, wrong flavor profile": "Crystal o Frank's — no sriracha",
      "not olive oil — olive oil smokes at these temperatures": "no aceite de oliva — humea a estas temperaturas",
      "usda choice or prime": "USDA Choice o Prime",
    },
  };

  let translatedNote = note;
  if (note && noteTranslations[locale]) {
    const noteLc = note.replace(/[()]/g, "").toLowerCase();
    for (const [en, tr] of Object.entries(noteTranslations[locale])) {
      if (noteLc.includes(en.toLowerCase())) {
        translatedNote = `(${tr})`;
        break;
      }
    }
  }

  return translatedNote ? `${translatedBase} ${translatedNote}` : translatedBase;
}

/**
 * Traduce l'unità di misura (già metrica) per la locale.
 */
function translateUnit(unit, locale) {
  if (locale === "en") return unit;
  const unitMap = {
    it: {
      steaks: "bistecche",
      steak: "bistecca",
      cloves: "spicchi",
      clove: "spicchio",
      racks: "rack",
      rack: "rack",
      roll: "rotolo",
      chunks: "ciocchi",
      chunk: "ciocco",
      sprigs: "rametti",
      sprig: "rametto",
      large: "grandi",
      "bone-in": "con osso",
      whole: "intero",
      "whole packer": "intero",
      // già metrici
      g: "g",
      kg: "kg",
      ml: "ml",
      l: "l",
    },
    es: {
      steaks: "bistecs",
      steak: "bistec",
      cloves: "dientes",
      clove: "diente",
      racks: "costillares",
      rack: "costillar",
      roll: "rollo",
      chunks: "trozos",
      chunk: "trozo",
      sprigs: "ramitas",
      sprig: "ramita",
      large: "grandes",
      "bone-in": "con hueso",
      whole: "entero",
      "whole packer": "entero",
      g: "g",
      kg: "kg",
      ml: "ml",
      l: "l",
    },
  };
  return unitMap[locale]?.[unit.toLowerCase()] ?? unit;
}

// ============================================================
// Traduzione testo istruzioni (titolo e dettaglio)
// ============================================================

/**
 * Traduzioni statiche istruzioni per ogni ricetta e locale.
 * Struttura: documentId → locale → array di { step/step_number, title?, detail?, description? }
 */
const INSTRUCTION_TRANSLATIONS = {
  // --- Grilled Argentinian Chimichurri Steak ---
  caaovn2xyr6o4r2kjd4brb3m: {
    it: [
      {
        step_number: 1,
        description:
          "Prepara il chimichurri almeno 30 minuti prima di grigliare (idealmente 2-4 ore). Unisci prezzemolo tritato, origano, aglio tritato, peperoncino in scaglie e pepe nero in una ciotola. Aggiungi l'aceto di vino rosso e mescola. Versa l'olio d'oliva e amalgama bene. Aggiusta di sale. Lascia riposare a temperatura ambiente — non mettere mai in frigorifero il chimichurri poco prima di servire, il freddo ne spegne i sapori.",
      },
      {
        step_number: 2,
        description:
          "Togli le bistecche dal frigo 45 minuti prima della cottura. Tamponale completamente con carta da cucina. Condisci abbondantemente con sale marino grosso su tutti i lati. Il sale a grana grossa creerà sacche di condimento e aiuterà a formare la crosta.",
      },
      {
        step_number: 3,
        description:
          "Accendi una ciminiera piena di carbonella grezza e lascia bruciare finché non è completamente coperta di cenere (circa 15-20 minuti). Versa le braci su un lato della griglia, creando una zona a due temperature con calore diretto intenso da un lato e calore indiretto dall'altro. La griglia deve essere rovente — non dovresti riuscire a tenere la mano a 10 cm dalla griglia per più di 2 secondi.",
      },
      {
        step_number: 4,
        description:
          "Posiziona le bistecche sulla zona a calore diretto. Non toccarle per 4 minuti. Sentirai un sfrigolio aggressivo — è la reazione di Maillard che forma la crosta. Dopo 4 minuti, gira una volta. Cuoci per altri 3-4 minuti per una cottura al sangue (54°C interno), oppure adatta ai tuoi gusti.",
      },
      {
        step_number: 5,
        description:
          "Se le bistecche hanno bisogno di più tempo per raggiungere la temperatura desiderata ma la crosta è già scura, spostale nella zona a calore indiretto e chiudi il coperchio. Lascia che raggiungano gradualmente la temperatura. Per ribeye con osso spesse, questo approccio inverso spesso dà i migliori risultati.",
      },
      {
        step_number: 6,
        description:
          "Togli le bistecche su un tagliere e falle riposare 8-10 minuti. La temperatura interna salirà di 3-4°C durante il riposo. Affetta contro la fibra se lo desideri, o servi intere. Versa il chimichurri generosamente sopra e servi il resto a parte. Abbina con un Malbec.",
      },
    ],
    es: [
      {
        step_number: 1,
        description:
          "Prepara el chimichurri al menos 30 minutos antes de asar (idealmente 2-4 horas). Mezcla el perejil picado, el orégano, el ajo picado, las hojuelas de chile y la pimienta negra en un bol. Añade el vinagre de vino tinto y remueve. Vierte el aceite de oliva y mezcla bien. Sazona con una pizca de sal. Deja reposar a temperatura ambiente — nunca refrigeres el chimichurri justo antes de servir, el frío apaga los sabores.",
      },
      {
        step_number: 2,
        description:
          "Saca los bistecs del frigorífico 45 minutos antes de cocinar. Sécalos completamente con papel de cocina. Sazona generosamente con sal marina gruesa por todos los lados. La sal de grano grueso creará bolsas de condimento y ayudará a formar la costra.",
      },
      {
        step_number: 3,
        description:
          "Enciende una chimenea llena de carbón vegetal y deja que arda hasta que esté completamente cubierto de ceniza (unos 15-20 minutos). Vierte las brasas en un lado de la parrilla, creando una zona de dos temperaturas con calor directo intenso en un lado y calor indirecto en el otro. La parrilla debe estar al rojo vivo — no deberías poder mantener la mano a 10 cm de la parrilla más de 2 segundos.",
      },
      {
        step_number: 4,
        description:
          "Coloca los bistecs sobre la zona de calor directo. No los toques durante 4 minutos. Escucharás un chisporroteo agresivo — es la reacción de Maillard formando la costra. Después de 4 minutos, da la vuelta una vez. Cocina otros 3-4 minutos para un punto medio-poco hecho (54°C interno), o ajusta a tu preferencia.",
      },
      {
        step_number: 5,
        description:
          "Si los bistecs necesitan más tiempo para alcanzar tu temperatura objetivo pero la costra ya está oscura, muévelos a la zona de calor indirecto y cierra la tapa. Deja que lleguen gradualmente a la temperatura. Para ribeyes gruesos con hueso, este enfoque inverso suele dar los mejores resultados.",
      },
      {
        step_number: 6,
        description:
          "Retira los bistecs a una tabla de cortar y déjalos reposar 8-10 minutos. La temperatura interna subirá 3-4°C durante el reposo. Corta a contraveta si lo deseas, o sirve enteros. Vierte el chimichurri generosamente por encima y sirve el resto aparte. Marida con un Malbec.",
      },
    ],
  },

  // --- Competition-Style Pork Shoulder ---
  b4s60ez07ct83tl57og8edwf: {
    it: [
      {
        step: 1,
        title: "Prepara l'iniezione (la sera prima)",
        detail:
          "Unisci tutti gli ingredienti per l'iniezione in un pentolino a fuoco medio. Mescola finché sale e zucchero si sciolgono completamente. NON far bollire — scalda solo quanto basta per sciogliere. Lascia raffreddare a temperatura ambiente, poi metti in frigo. L'iniezione fredda penetra più uniformemente di quella calda.",
      },
      {
        step: 2,
        title: "Inietta la spalla di maiale (la sera prima)",
        detail:
          "Con una siringa da iniezione con ago a più fori, inietta seguendo uno schema a griglia da 2,5 cm su tutta la spalla. Inserisci l'ago completamente, poi inietta mentre lo estrai lentamente — questo distribuisce il liquido a strati invece di creare una sacca. Inietta da più angolazioni. L'obiettivo è far entrare circa 240-360 ml di iniezione in una spalla da 3,6-4,5 kg. Ci sarà del reflusso. È normale.",
      },
      {
        step: 3,
        title: "Applica il rub (la sera prima, dopo l'iniezione)",
        detail:
          "Asciuga la superficie con carta da cucina. Stendi un velo sottile di senape gialla su tutte le superfici come legante. Mescola tutti gli ingredienti del rub e applica abbondantemente su ogni lato. Non lessinare — vuoi una crosta spessa. Avvolgi in pellicola alimentare e metti in frigo per tutta la notte.",
      },
      {
        step: 4,
        title: "Accendi lo smoker e stabilizza",
        detail:
          "Punta a una temperatura di 107°C (225°F) usando legno di melo o ciliegio come legna da fumo principale. Questi legni fruttati si abbinano perfettamente al maiale senza sopraffarne il sapore. Se usi un offset, costruisci prima un letto di braci con una ciminiera di carbonella grezza, poi aggiungi i tronchi di legno da frutto. Vuoi un fumo sottile e bluastro, NON nuvole bianche dense.",
      },
      {
        step: 5,
        title: "Affumica la spalla",
        detail:
          "Posiziona la spalla con il grasso rivolto verso l'alto. Inserisci una sonda termometrica nella parte più spessa, lontano dall'osso. Chiudi il coperchio e NON aprirlo per almeno 3 ore. Ogni volta che apri, perdi 15-20 minuti di tempo di recupero. Mantieni la temperatura tra 107-121°C per tutta la durata.",
      },
      {
        step: 6,
        title: "Spruzza ogni 45-60 minuti (dopo le prime 3 ore)",
        detail:
          "Dopo le prime 3 ore, spruzza la superficie ogni 45-60 minuti con il mix di succo di mela e aceto. Questo mantiene la superficie umida, favorisce la formazione della bark e aggiunge un leggero sapore fruttato. Non esagerare — vuoi umidità in superficie, non una spalla inzuppata.",
      },
      {
        step: 7,
        title: "Gestisci lo stallo (se necessario)",
        detail:
          "Intorno a 65-74°C (150-165°F), la temperatura si bloccherà per ore. Questo è lo stallo — l'evaporazione dell'umidità superficie raffredda la carne quanto lo smoker la riscalda. Ha due opzioni: aspettare (può richiedere 4-6 ore), oppure avvolgere nella Texas Crutch quando la temperatura raggiunge 74°C (165°F) e la bark è impostata. Per avvolgere: metti nella foil resistente con 60 ml di succo di mela e 28g di burro, chiudi ermeticamente, rimetti nello smoker.",
      },
      {
        step: 8,
        title: "Controlla la cottura",
        detail:
          "La spalla è pronta quando raggiunge 93-96°C (200-205°F) E la sonda entra con zero resistenza — come burro. La temperatura è una guida, non una sentenza definitiva. La carne deve tirarsi facilmente a mano.",
      },
      {
        step: 9,
        title: "Riposa prima di sfilacciare",
        detail:
          "Togli dal fuoco e lascia riposare nella foil in un contenitore termico asciutto foderato di asciugamani per almeno 1 ora, idealmente 2 ore. Non saltare questo passaggio — è dove i succhi si redistribuiscono e il collagene finisce di sciogliersi.",
      },
      {
        step: 10,
        title: "Sfilaccia e servi",
        detail:
          "Sfilaccia a mano o con due forchette, rimuovendo eventuali pezzi di grasso grossolano. Mescola la bark sbriciolata con la carne — quella è la parte più preziosa. Servi su panino con coleslaw e salsa BBQ a parte.",
      },
    ],
    es: [
      {
        step: 1,
        title: "Prepara la inyección (la noche anterior)",
        detail:
          "Mezcla todos los ingredientes de inyección en un cazo a fuego medio. Remueve hasta que la sal y el azúcar se disuelvan completamente. NO dejes hervir — solo calienta lo necesario para disolver. Deja enfriar a temperatura ambiente, luego refrigera. La inyección fría penetra más uniformemente que la caliente.",
      },
      {
        step: 2,
        title: "Inyecta la paleta de cerdo (la noche anterior)",
        detail:
          "Con una jeringa de inyección de aguja múltiple, inyecta siguiendo una cuadrícula de 2,5 cm por toda la paleta. Inserta la aguja completamente, luego inyecta mientras la extraes lentamente — esto distribuye el líquido en capas en lugar de crear una bolsa. Inyecta desde múltiples ángulos. El objetivo es introducir unos 240-360 ml de inyección en una paleta de 3,6-4,5 kg. Habrá reflujo. Es normal.",
      },
      {
        step: 3,
        title: "Aplica el rub (la noche anterior, después de la inyección)",
        detail:
          "Seca la superficie con papel de cocina. Extiende una capa fina de mostaza amarilla en todas las superficies como aglutinante. Mezcla todos los ingredientes del rub y aplica generosamente por cada lado. No escatimes — quieres una corteza gruesa. Envuelve en film transparente y refrigera toda la noche.",
      },
      {
        step: 4,
        title: "Enciende el ahumador y estabiliza",
        detail:
          "Apunta a una temperatura de 107°C (225°F) usando madera de manzano o cerezo como madera de ahumado principal. Estas maderas frutales se combinan perfectamente con el cerdo sin dominar el sabor. Si usas un offset, construye primero un lecho de brasas con una chimenea de carbón vegetal, luego añade los troncos de madera frutal. Quieres un humo delgado y azulado, NO nubes blancas densas.",
      },
      {
        step: 5,
        title: "Ahúma la paleta",
        detail:
          "Coloca la paleta con la grasa hacia arriba. Inserta una sonda termométrica en la parte más gruesa, lejos del hueso. Cierra la tapa y NO la abras durante al menos 3 horas. Cada vez que abres, pierdes 15-20 minutos de tiempo de recupero. Mantén la temperatura entre 107-121°C durante toda la cocción.",
      },
      {
        step: 6,
        title: "Rocía cada 45-60 minutos (después de las primeras 3 horas)",
        detail:
          "Después de las primeras 3 horas, rocía la superficie cada 45-60 minutos con la mezcla de jugo de manzana y vinagre. Esto mantiene la superficie húmeda, favorece la formación de la costra y añade un ligero sabor frutal. No te excedas — quieres humedad en la superficie, no una paleta empapada.",
      },
      {
        step: 7,
        title: "Gestiona el estancamiento (si es necesario)",
        detail:
          "Alrededor de 65-74°C (150-165°F), la temperatura se bloqueará durante horas. Esto es el estancamiento — la evaporación de la humedad superficial enfría la carne tanto como el ahumador la calienta. Tienes dos opciones: esperar (puede durar 4-6 horas), o envolver en el Texas Crutch cuando la temperatura llegue a 74°C (165°F) y la costra esté formada. Para envolver: pon en papel de aluminio resistente con 60 ml de jugo de manzana y 28g de mantequilla, cierra herméticamente, vuelve al ahumador.",
      },
      {
        step: 8,
        title: "Comprueba la cocción",
        detail:
          "La paleta está lista cuando alcanza 93-96°C (200-205°F) Y la sonda entra con cero resistencia — como mantequilla. La temperatura es una guía, no una sentencia definitiva. La carne debe deshacerse fácilmente a mano.",
      },
      {
        step: 9,
        title: "Reposa antes de deshebrar",
        detail:
          "Retira del fuego y deja reposar en el papel de aluminio en un contenedor térmico seco forrado con toallas durante al menos 1 hora, idealmente 2 horas. No omitas este paso — es donde los jugos se redistribuyen y el colágeno termina de disolverse.",
      },
      {
        step: 10,
        title: "Deshebra y sirve",
        detail:
          "Deshebra a mano o con dos tenedores, retirando los trozos de grasa gruesa. Mezcla la costra desmenuzada con la carne — esa es la parte más valiosa. Sirve en sándwich con coleslaw y salsa BBQ aparte.",
      },
    ],
  },

  // --- Burnt Ends ---
  i7potp5m3dz61gynean8ozwx: {
    it: [
      {
        step: 1,
        title: "Rifila e condisci il brisket intero (la sera prima)",
        detail:
          "Rifila il cap di grasso a 6 mm di spessore. Rimuovi eventuali pezzi duri di sego o grasso superficiale che non si scioglieranno. Rifila i depositi di grasso esterno del point ma lascia il grasso intramuscolare (la cucitura tra point e flat) intatto — è quello che rende i burnt ends straordinari. Applica un velo sottile di senape gialla come legante, poi ricopri abbondantemente con il rub di sale, pepe, aglio e cipolla. Avvolgi in carta da macellaio e metti in frigo per tutta la notte.",
      },
      {
        step: 2,
        title: "Affumica il brisket intero",
        detail:
          "Porta lo smoker a 107°C (225°F) usando post oak come legna principale. Posiziona il brisket con il grasso verso il basso se il calore viene dal basso, verso l'alto se viene dall'alto. Affumica fino a quando la temperatura interna raggiunge 74°C (165°F) e la bark è impostata — colore mogano scuro, secca al tatto. Ci vorranno 6-8 ore a seconda della dimensione.",
      },
      {
        step: 3,
        title: "Separa point e flat, avvolgi il flat",
        detail:
          "Quando il brisket raggiunge 74°C (165°F), toglilo dal fuoco. Separa il point dal flat seguendo il seam di grasso intramuscolare — ci vorrà un coltello e un po' di lavoro. Avvolgi il flat in carta da macellaio rosa con un po' di sego di manzo e rimettilo nello smoker. Il flat continua a cuocere da solo fino a 93-96°C (200-205°F) per i tranches tradizionali.",
      },
      {
        step: 4,
        title: "Continua ad affumicare il point senza avvolgerlo",
        detail:
          "Rimetti il point nello smoker senza avvolgerlo. Vuoi che sviluppi ancora più bark e si cuocia ulteriormente. Continua ad affumicare fino a quando raggiunge 93°C (200°F). Il point è molto più grasso del flat e tollera bene la cottura prolungata senza seccarsi.",
      },
      {
        step: 5,
        title: "Taglia a cubetti e condisci",
        detail:
          "Quando il point raggiunge 93°C (200°F), toglilo dal fuoco e taglialo a cubetti di circa 2,5 cm. Metti i cubetti in un tegame da forno. Versa la salsa BBQ, il miele e il burro fuso sui cubetti. Mescola per ricoprire bene ogni pezzo. Aggiungi la salsa piccante e l'aceto di sidro. Assaggia e aggiusta di condimento.",
      },
      {
        step: 6,
        title: "Caramellizza i burnt ends",
        detail:
          "Rimetti il tegame scoperto nello smoker (o nel forno a 163°C) per 45-60 minuti, mescolando una o due volte. La salsa si ridurrà, si addenserà e caramellizzerà sui cubetti. Vuoi che siano appiccicosi, laccati e leggermente bruciacchiati sugli angoli — quelli sono i burnt ends perfetti. Se la salsa si asciuga troppo presto, aggiungi un po' d'acqua o succo di mela.",
      },
      {
        step: 7,
        title: "Servi",
        detail:
          "Servi i burnt ends caldi su pane bianco morbido con cetriolini sottaceto e cipolla bianca a fette. Non hanno bisogno di altro — la salsa caramellizzata, il grasso reso e la bark affumicata parlano da soli.",
      },
    ],
    es: [
      {
        step: 1,
        title: "Recorta y sazona el brisket entero (la noche anterior)",
        detail:
          "Recorta la capa de grasa a 6 mm de grosor. Elimina los trozos duros de sebo o grasa superficial que no se derretirán. Recorta los depósitos de grasa exterior del point pero deja la grasa intramuscular (la unión entre point y flat) intacta — es lo que hace que los burnt ends funcionen. Aplica una capa fina de mostaza amarilla como aglutinante, luego cubre generosamente con el rub de sal, pimienta, ajo y cebolla. Envuelve en papel de carnicero y refrigera toda la noche.",
      },
      {
        step: 2,
        title: "Ahúma el brisket entero",
        detail:
          "Lleva el ahumador a 107°C (225°F) usando post oak como madera principal. Coloca el brisket con la grasa hacia abajo si el calor viene de abajo, hacia arriba si viene de arriba. Ahúma hasta que la temperatura interna alcance 74°C (165°F) y la costra esté formada — color caoba oscuro, seca al tacto. Llevará 6-8 horas según el tamaño.",
      },
      {
        step: 3,
        title: "Separa point y flat, envuelve el flat",
        detail:
          "Cuando el brisket alcance 74°C (165°F), retíralo del fuego. Separa el point del flat siguiendo la unión de grasa intramuscular — necesitarás un cuchillo y algo de trabajo. Envuelve el flat en papel de carnicero rosa con algo de sebo de vaca y devuélvelo al ahumador. El flat sigue cocinándose solo hasta 93-96°C (200-205°F) para las lonchas tradicionales.",
      },
      {
        step: 4,
        title: "Continúa ahumando el point sin envolverlo",
        detail:
          "Devuelve el point al ahumador sin envolverlo. Quieres que desarrolle aún más costra y se cocine más. Continúa ahumando hasta que alcance 93°C (200°F). El point es mucho más graso que el flat y tolera bien la cocción prolongada sin secarse.",
      },
      {
        step: 5,
        title: "Corta en cubos y sazona",
        detail:
          "Cuando el point alcance 93°C (200°F), retíralo del fuego y córtalo en cubos de unos 2,5 cm. Coloca los cubos en una bandeja de horno. Vierte la salsa BBQ, la miel y la mantequilla derretida sobre los cubos. Mezcla para cubrir bien cada pieza. Añade la salsa picante y el vinagre de sidra. Prueba y ajusta el condimento.",
      },
      {
        step: 6,
        title: "Carameliza los burnt ends",
        detail:
          "Devuelve la bandeja descubierta al ahumador (o al horno a 163°C) durante 45-60 minutos, removiendo una o dos veces. La salsa se reducirá, espesará y caramelizará sobre los cubos. Quieres que estén pegajosos, lacados y ligeramente quemados en las esquinas — esos son los burnt ends perfectos. Si la salsa se seca demasiado pronto, añade un poco de agua o jugo de manzana.",
      },
      {
        step: 7,
        title: "Sirve",
        detail:
          "Sirve los burnt ends calientes sobre pan blanco suave con pepinillos en vinagre y cebolla blanca en rodajas. No necesitan nada más — la salsa caramelizada, la grasa derretida y la costra ahumada hablan por sí solos.",
      },
    ],
  },

  // --- Smoked Chicken Wings ---
  q5t73cpgrjsxunj477tvtx7w: {
    it: [
      {
        step: 1,
        title: "Salamoia a secco con lievito — minimo 1 ora, idealmente una notte",
        detail:
          "Tamponaassolutamente le ali con carta da cucina — questo passaggio non è opzionale. L'umidità in superficie è il nemico della pelle croccante. In una ciotola grande, condisci le ali con lievito in polvere, sale, aglio in polvere, paprika affumicata, cipolla in polvere, pepe nero e pepe di Cayenna. Ogni ala deve essere uniformemente ricoperta. Disponi su una griglia sopra una teglia e metti in frigo scoperta per almeno 1 ora, idealmente una notte. Il lievito aumenta il pH della pelle, accelerando la reazione di Maillard e aiutando a rendere il grasso sottocutaneo. La notte in frigo disidrata la superficie. Entrambi sono essenziali per un risultato croccante.",
      },
      {
        step: 2,
        title: "Prepara lo smoker a bassa temperatura",
        detail:
          "Porta lo smoker a 107°C (225°F). Se usi un carbone o kamado, aggiungi 1-2 ciocchi di legno di melo o ciliegio — legni fruttati delicati, perfetti per il pollame. Per un pellet grill, usa pellet di melo o ciliegio e attiva il Super Smoke se disponibile. NON usare legni pesanti come hickory o mesquite per il pollo — il fumo denso sopraffà il sapore delicato.",
      },
      {
        step: 3,
        title: "Affumica a bassa temperatura",
        detail:
          "Posiziona le ali direttamente sulla griglia con spazio tra di loro — niente deve toccarsi, il flusso d'aria è fondamentale. Affumica a 107°C (225°F) per 45-60 minuti senza aprire. Questo è il tempo del fumo — si impregna nella pelle umida prima che si asciughi completamente.",
      },
      {
        step: 4,
        title: "Alza la temperatura per rendere croccante",
        detail:
          "Dopo 45-60 minuti di fumo basso, alza la temperatura a 204°C (400°F). Se il tuo smoker non raggiunge questa temperatura, finisci le ali in forno o su una griglia a calore diretto per 10-15 minuti. L'alta temperatura finale è ciò che rende la pelle croccante — non si può aggirare questa fase. Cuoci per altri 20-30 minuti ad alta temperatura, girando a metà cottura.",
      },
      {
        step: 5,
        title: "Controlla la cottura",
        detail:
          "Le ali sono pronte quando la pelle è dorata e croccante e la temperatura interna raggiunge 74°C (165°F). Ma fidati di più della pelle che del termometro — se è croccante al tatto e la carne si stacca facilmente dall'osso, è pronta.",
      },
      {
        step: 6,
        title: "Condisci e servi",
        detail:
          "Per le ali non sarai — servi così come sono, croccanti dall'affumicatura. Per ali condite: togli dal fuoco e condisci immediatamente con la salsa mentre sono ancora calde. Mescola delicatamente per ricoprire senza distruggere la pelle croccante. Servi subito — l'umidità della salsa ammorbidirà la pelle nel tempo.",
      },
    ],
    es: [
      {
        step: 1,
        title: "Salmuera seca con levadura — mínimo 1 hora, idealmente toda la noche",
        detail:
          "Seca completamente las alitas con papel de cocina — este paso no es opcional. La humedad en la superficie es el enemigo de la piel crujiente. En un bol grande, sazona las alitas con levadura en polvo, sal, ajo en polvo, pimentón ahumado, cebolla en polvo, pimienta negra y pimienta de Cayena. Cada alita debe estar uniformemente cubierta. Coloca en una rejilla sobre una bandeja y refrigera descubierta al menos 1 hora, idealmente toda la noche. La levadura aumenta el pH de la piel, acelerando la reacción de Maillard y ayudando a rendir la grasa subcutánea. La noche en el frigorífico deshidrata la superficie. Ambos son esenciales para un resultado crujiente.",
      },
      {
        step: 2,
        title: "Prepara el ahumador a baja temperatura",
        detail:
          "Lleva el ahumador a 107°C (225°F). Si usas carbón o kamado, añade 1-2 trozos de madera de manzano o cerezo — maderas frutales delicadas, perfectas para las aves. Para parrilla de pellets, usa pellets de manzano o cerezo y activa Super Smoke si está disponible. NO uses maderas pesadas como hickory o mezquite para el pollo — el humo denso domina el sabor delicado.",
      },
      {
        step: 3,
        title: "Ahúma a baja temperatura",
        detail:
          "Coloca las alitas directamente en la parrilla con espacio entre ellas — nada debe tocarse, el flujo de aire es fundamental. Ahúma a 107°C (225°F) durante 45-60 minutos sin abrir. Este es el tiempo del humo — se impregna en la piel húmeda antes de que se seque completamente.",
      },
      {
        step: 4,
        title: "Sube la temperatura para hacer crujiente",
        detail:
          "Después de 45-60 minutos de humo bajo, sube la temperatura a 204°C (400°F). Si tu ahumador no alcanza esta temperatura, termina las alitas en el horno o en una parrilla de calor directo durante 10-15 minutos. La alta temperatura final es lo que hace la piel crujiente — no hay forma de evitar esta fase. Cocina otros 20-30 minutos a alta temperatura, dando la vuelta a mitad de cocción.",
      },
      {
        step: 5,
        title: "Comprueba la cocción",
        detail:
          "Las alitas están listas cuando la piel está dorada y crujiente y la temperatura interna alcanza 74°C (165°F). Pero confía más en la piel que en el termómetro — si está crujiente al tacto y la carne se separa fácilmente del hueso, está lista.",
      },
      {
        step: 6,
        title: "Sazona y sirve",
        detail:
          "Para alitas naturales — sirve tal cual, crujientes del ahumado. Para alitas sazonadas: retira del fuego y sazona inmediatamente con la salsa mientras aún están calientes. Mezcla suavemente para cubrir sin destruir la piel crujiente. Sirve de inmediato — la humedad de la salsa ablandará la piel con el tiempo.",
      },
    ],
  },

  // --- Reverse-Seared Tomahawk Ribeye ---
  f96s527nhldcr775efseh4h0: {
    it: [
      {
        step: 1,
        title: "Salamoia a secco — 24 ore prima (o minimo 1 ora)",
        detail:
          "Sala la bistecca abbondantemente su tutte le superfici — circa 4g di sale kosher per 450g di carne. Metti su una griglia sopra una teglia, scoperta, in frigo per 24 ore. La salamoia a secco fa due cose: il sale penetra nella carne per una condimentazione uniforme, e la superficie scoperta si asciuga, fondamentale per una crosta perfetta. Più la superficie è asciutta, più la reazione di Maillard sarà rapida ed efficace. Se hai solo un'ora, sala e lascia sul bancone — ma il metodo delle 24 ore è drammaticamente migliore.",
      },
      {
        step: 2,
        title: "Cuoci lentamente in forno o a bassa temperatura (fase indiretta)",
        detail:
          "Scalda il forno a 107°C (225°F) — oppure imposta lo smoker o il grill a fuoco indiretto allo stesso modo. Posiziona la bistecca su una griglia nel forno. Inserisci una sonda termometrica nella parte più spessa evitando l'osso. Cuoci lentamente finché non raggiunge 49°C (120°F) per una cottura al sangue perfetta dopo la scottatura, o 52°C (125°F) se preferisci più cotto. Ci vorrà 45-90 minuti a seconda dello spessore. La cottura lenta garantisce un interno uniformemente rosa da bordo a bordo.",
      },
      {
        step: 3,
        title: "Riposa e prepara il calore della scottatura",
        detail:
          "Quando la bistecca raggiunge 49°C (120°F), toglila dal forno e lasciala riposare sul bancone per 10-15 minuti mentre prepari il calore per la scottatura. Per la griglia: accendi una ciminiera piena di carbonella grezza e lasciala bruciare finché è coperta di cenere. Per la padella in ghisa: mettila sul fuoco al massimo per 8-10 minuti. Vuoi un calore brutale — 260-316°C (500-600°F) sulla superficie di cottura.",
      },
      {
        step: 4,
        title: "Scotta per la crosta",
        detail:
          "Asciuga la superficie della bistecca con carta da cucina — qualsiasi umidità rallenterà la reazione di Maillard. Spennella con olio ad alto punto di fumo su tutti i lati. Scotta sulla fonte di calore più calda disponibile per 60-90 secondi per lato, fino a quando si forma una crosta scura. Per la crosta del bordo: usa le pinze per tenere la bistecca verticale e scotta il perimetro grasso per 30-45 secondi. Opzionale: negli ultimi 60 secondi aggiungi burro, aglio schiacciato e rosmarino e irriga continuamente.",
      },
      {
        step: 5,
        title: "Riposa e servi",
        detail:
          "Riposa su un tagliere per 5 minuti soltanto — si è già riposato in forno. L'eccessivo riposo dopo la scottatura raffredda la crosta. Aggiungi sale grosso in scaglie (Maldon o simile) sulle superfici tagliate. Servi l'osso sul lato per effetto scenico — ma separa la carne dall'osso prima di affettare per più facilità. Affetta contro la fibra a fette di 1,5 cm.",
      },
    ],
    es: [
      {
        step: 1,
        title: "Salmuera seca — 24 horas antes (o mínimo 1 hora)",
        detail:
          "Sala el bistec generosamente en todas las superficies — unos 4g de sal kosher por cada 450g de carne. Coloca en una rejilla sobre una bandeja, descubierto, en el frigorífico durante 24 horas. La salmuera seca hace dos cosas: la sal penetra en la carne para una sazón uniforme, y la superficie descubierta se seca, fundamental para una costra perfecta. Cuanto más seca la superficie, más rápida y efectiva será la reacción de Maillard. Si solo tienes una hora, sala y deja en el mostrador — pero el método de 24 horas es dramáticamente mejor.",
      },
      {
        step: 2,
        title: "Cocina lentamente en horno o a baja temperatura (fase indirecta)",
        detail:
          "Calienta el horno a 107°C (225°F) — o configura el ahumador o parrilla a fuego indirecto de la misma manera. Coloca el bistec en una rejilla en el horno. Inserta una sonda termométrica en la parte más gruesa evitando el hueso. Cocina lentamente hasta que alcance 49°C (120°F) para un punto poco hecho perfecto después del sellado, o 52°C (125°F) si prefieres más cocido. Llevará 45-90 minutos según el grosor. La cocción lenta garantiza un interior uniformemente rosado de borde a borde.",
      },
      {
        step: 3,
        title: "Reposa y prepara el calor del sellado",
        detail:
          "Cuando el bistec alcance 49°C (120°F), sácalo del horno y déjalo reposar en el mostrador 10-15 minutos mientras preparas el calor para el sellado. Para la parrilla: enciende una chimenea llena de carbón vegetal y deja que arda hasta que esté cubierto de ceniza. Para la sartén de hierro fundido: ponla al fuego al máximo durante 8-10 minutos. Quieres un calor brutal — 260-316°C (500-600°F) en la superficie de cocción.",
      },
      {
        step: 4,
        title: "Sella para la costra",
        detail:
          "Seca la superficie del bistec con papel de cocina — cualquier humedad ralentizará la reacción de Maillard. Pincela con aceite para alta temperatura por todos los lados. Sella sobre la fuente de calor más caliente disponible durante 60-90 segundos por lado, hasta que se forme una costra oscura. Para la costra del borde: usa pinzas para mantener el bistec vertical y sella el perímetro graso 30-45 segundos. Opcional: en los últimos 60 segundos añade mantequilla, ajo aplastado y romero y rocía continuamente.",
      },
      {
        step: 5,
        title: "Reposa y sirve",
        detail:
          "Reposa en una tabla de cortar solo 5 minutos — ya reposó en el horno. El reposo excesivo después del sellado enfría la costra. Añade sal en escamas (Maldon o similar) en las superficies cortadas. Sirve el hueso al lado para el efecto visual — pero separa la carne del hueso antes de cortar para más facilidad. Corta a contraveta en lonchas de 1,5 cm.",
      },
    ],
  },

  // --- Smoked Mac and Cheese ---
  netj0s6fs78c4rgjk3ru6xeu: {
    it: [
      {
        step_number: 1,
        description:
          "Cuoci i maccheroni in acqua salata finché sono appena al dente (circa 1-2 minuti meno di quanto indicato sulla confezione). La pasta continuerà a cuocere nello smoker, quindi cuocerla leggermente meno previene un risultato molle. Scola e metti da parte.",
      },
      {
        step_number: 2,
        description:
          "In una casseruola a fuoco medio, sciogli il burro. Aggiungi uova sbattute, latte intero, panna da cucina, paprika affumicata, senape in polvere, aglio in polvere, sale e pepe. Mescola costantemente — non far bollire. Aggiungi il formaggio cremoso a pezzi e mescola finché è completamente sciolto e omogeneo. Togli dal fuoco e aggiungi cheddar grattugiato e Gruyère, tenendone da parte 240g per la copertura. Mescola fino a scioglimento.",
      },
      {
        step_number: 3,
        description:
          "Unisci la pasta scolata alla salsa di formaggio. Mescola per ricoprire bene ogni maccherone. Versa in una teglia da forno antiaderente (o in ghisa, che funziona ancora meglio). Stendi uniformemente. Ricopri con il formaggio riservato. Cospargi con pangrattato panko. Il panko crea una crosta croccante che contrasta con il formaggio morbido sotto.",
      },
      {
        step_number: 4,
        description:
          "Porta lo smoker a 107°C (225°F) con legno di melo o ciliegio. Metti la teglia direttamente sulle griglie dello smoker. Cuoci per 1 ora senza aprire. Il fumo si impregnerà nei formaggi e nella pasta — è quello che trasforma un normale mac and cheese in qualcosa di straordinario. Dopo 1 ora, controlla che la copertura sia dorata e la salsa stia bollendo leggermente sui bordi.",
      },
      {
        step_number: 5,
        description:
          "Se vuoi una copertura più dorata, attiva il grill del forno per 2-3 minuti alla fine, oppure alza la temperatura dello smoker a 163°C (325°F) per gli ultimi 15 minuti. Servi caldo direttamente dalla teglia. Il mac and cheese affumicato non si scalda bene — è al suo meglio fresco dallo smoker.",
      },
    ],
    es: [
      {
        step_number: 1,
        description:
          "Cuece los macarrones en agua salada hasta que estén apenas al dente (unos 1-2 minutos menos de lo indicado en el paquete). La pasta seguirá cocinándose en el ahumador, así que cocinarla ligeramente menos previene un resultado blando. Escurre y reserva.",
      },
      {
        step_number: 2,
        description:
          "En una cazuela a fuego medio, derrite la mantequilla. Añade los huevos batidos, la leche entera, la nata para cocinar, el pimentón ahumado, la mostaza en polvo, el ajo en polvo, la sal y la pimienta. Remueve constantemente — no dejes hervir. Añade el queso crema a trozos y remueve hasta que esté completamente derretido y homogéneo. Retira del fuego y añade el cheddar rallado y el Gruyère, reservando 240g para la cobertura. Remueve hasta que se derrita.",
      },
      {
        step_number: 3,
        description:
          "Mezcla la pasta escurrida con la salsa de queso. Remueve para cubrir bien cada macarrón. Vierte en una bandeja de horno antiadherente (o de hierro fundido, que funciona aún mejor). Extiende uniformemente. Cubre con el queso reservado. Espolvorea con pan rallado panko. El panko crea una costra crujiente que contrasta con el queso blando debajo.",
      },
      {
        step_number: 4,
        description:
          "Lleva el ahumador a 107°C (225°F) con madera de manzano o cerezo. Coloca la bandeja directamente en las rejillas del ahumador. Cocina durante 1 hora sin abrir. El humo se impregnará en los quesos y la pasta — es lo que transforma un mac and cheese normal en algo extraordinario. Después de 1 hora, comprueba que la cobertura esté dorada y la salsa esté burbujeando ligeramente en los bordes.",
      },
      {
        step_number: 5,
        description:
          "Si quieres una cobertura más dorada, activa el grill del horno durante 2-3 minutos al final, o sube la temperatura del ahumador a 163°C (325°F) durante los últimos 15 minutos. Sirve caliente directamente de la bandeja. El mac and cheese ahumado no se recalienta bien — está en su mejor momento recién salido del ahumador.",
      },
    ],
  },

  // --- Texas-Style Smoked Brisket ---
  xs2069n8zpbvd23hsg1fgwbb: {
    it: [
      {
        step_number: 1,
        description:
          "Togli il brisket dalla confezione la sera prima e lascialo scoperto in frigo per la notte — questo asciuga la superficie e favorisce la formazione della bark. La mattina dopo, rifila il cap di grasso a 6 mm, non meno. Rimuovi la falce dura di grasso tra il point e il flat. Quadra i bordi sottili del flat — quelle parti sottili si bruceranno diventando carbone. Tieni i ritagli per macinare e fare hamburger.",
      },
      {
        step_number: 2,
        description:
          "Mescola pepe nero grosso a maglia 16 e sale kosher Diamond Crystal in rapporto 2:1 per volume. Se usi la senape come legante, applica prima un velo sottile su tutte le superfici — si brucia completamente e aiuta solo il rub ad aderire. Applica il rub ABBONDANTEMENTE. Quando pensi di averne messo abbastanza, aggiungine altro. La formazione della bark dipende da uno strato spesso di condimento. Lascia riposare il brisket a temperatura ambiente per 1 ora mentre accendi lo smoker.",
      },
      {
        step_number: 3,
        description:
          "Accendi il tuo smoker e stabilizzalo a 121°C (250°F) usando post oak come legna principale. Per un offset: costruisci un letto di braci con una ciminiera piena di carbonella grezza, poi aggiungi spaccati di post oak (grandi quanto un avambraccio) ogni 45-60 minuti. Vuoi fumo sottile e bluastro — NON nuvole bianche dense. Per un kamado: riempi il firebox con carbonella grezza e aggiungi 3-4 pezzi di quercia grandi come un pugno.",
      },
      {
        step_number: 4,
        description:
          "Posiziona il brisket con il grasso verso il basso se il calore viene dal basso (offset, kamado), verso l'alto se viene dall'alto o da dietro (alcuni affumicatori a cabinet). Il cap di grasso protegge qualsiasi lato sia rivolto verso la fonte di calore. Inserisci una sonda nella parte più spessa del flat, angolata verso il centro — evita le sacche di grasso, che danno letture più basse della carne circostante. Chiudi il coperchio e NON APRIRLO per almeno 3 ore. Ogni volta che apri, perdi 15-20 minuti di tempo di recupero.",
      },
      {
        step_number: 5,
        description:
          "Mantieni la temperatura dello smoker tra 107-135°C (225-275°F) per tutta la durata. Intorno alle ore 4-6, controlla la bark — vuoi un colore mogano scuro e una superficie che sembri cuoio asciutto quando la premi. La temperatura interna si bloccherà intorno a 65-77°C (150-170°F). Questo è lo stallo — l'evaporazione dell'umidità superficie raffredda la carne quanto lo smoker la riscalda. Può durare 2-6 ore. NON alzare la temperatura dello smoker. Aspetta, oppure procedi con l'avvolgimento opzionale al passo 6.",
      },
      {
        step_number: 6,
        description:
          "Opzionale ma consigliato per i principianti — la Texas Crutch: quando la temperatura interna raggiunge 74°C (165°F) E la bark è impostata (scura, asciutta, compatta), avvolgi in carta da macellaio rosa. NON nella foil — la foil intrappola il vapore e trasforma la bark in una poltiglia. Se usi il sego di manzo, versa 60-85 ml sulla superficie prima di avvolgere. Il sego bagna la carne e aggiunge ricchezza. Avvolgi bene ma non ermeticamente — vuoi un po' di respiro. Rimetti nello smoker immediatamente.",
      },
      {
        step_number: 7,
        description:
          "Il brisket è pronto quando si verificano due condizioni simultaneamente: temperatura interna di 93-96°C (200-205°F) E la sonda entra con zero resistenza — come spingere nel burro a temperatura ambiente. La temperatura da sola NON è sufficiente. Ho avuto brisket pronti alla sonda a 92°C (197°F) e altri che avevano bisogno di 98°C (208°F). Il tessuto connettivo si scioglie a velocità diverse a seconda dell'animale. Se raggiunge 95°C (203°F) ma la sonda incontra ancora resistenza, continua a cuocere.",
      },
      {
        step_number: 8,
        description:
          "Togli il brisket e fallo riposare in un contenitore termico asciutto (senza ghiaccio) foderato di vecchi asciugamani. Metti il brisket avvolto dentro, coprilo con altri asciugamani e chiudi il coperchio. Riposo MINIMO: 1 ora. Riposo IDEALE: 2-4 ore. La temperatura interna salirà di qualche grado, poi scenderà lentamente. Puoi tenere un brisket in un contenitore termico per fino a 6 ore senza che scenda sotto la temperatura di servizio. Questo periodo di riposo non è negoziabile — permette al collagene reso di reimpregnarsi nelle fibre della carne.",
      },
      {
        step_number: 9,
        description:
          "Scarta e affetta. Il flat va affettato contro la fibra a fette spesse come una matita (circa 6 mm). Ogni fetta dovrebbe tenersi insieme quando sollevata ma separarsi con una leggera trazione. Se cade a pezzi, hai cotto troppo. Se non si piega, hai cotto poco. Separa il point dal flat lungo il seam di grasso, ruota il point di 90 gradi (la fibra corre perpendicolare al flat) e affetta contro la fibra del point. Servi immediatamente con pane bianco, cetriolini, fette di cipolla bianca e salsa a parte — non sulla carne.",
      },
    ],
    es: [
      {
        step_number: 1,
        description:
          "Saca el brisket del envase la noche anterior y déjalo descubierto en el frigorífico toda la noche — esto seca la superficie y favorece la formación de la costra. A la mañana siguiente, recorta la capa de grasa a 6 mm, no menos. Elimina la media luna dura de grasa entre el point y el flat. Cuadra los bordes finos del flat — esas partes finas se quemarán hasta carbonizarse. Guarda los recortes para picar en hamburguesas.",
      },
      {
        step_number: 2,
        description:
          "Mezcla pimienta negra gruesa de malla 16 y sal kosher Diamond Crystal en proporción 2:1 por volumen. Si usas mostaza como aglutinante, aplica primero una capa fina en todas las superficies — se quema completamente y solo ayuda al rub a adherirse. Aplica el rub GENEROSAMENTE. Cuando creas que has puesto suficiente, añade más. La formación de la costra depende de una capa gruesa de condimento. Deja reposar el brisket a temperatura ambiente 1 hora mientras enciendes el ahumador.",
      },
      {
        step_number: 3,
        description:
          "Enciende tu ahumador y estabilízalo a 121°C (250°F) usando post oak como madera principal. Para un offset: construye un lecho de brasas con una chimenea llena de carbón vegetal, luego añade troncos de post oak (del tamaño de un antebrazo) cada 45-60 minutos. Quieres un humo delgado y azulado — NO nubes blancas densas. Para un kamado: llena el firebox con carbón vegetal y añade 3-4 trozos de roble del tamaño de un puño.",
      },
      {
        step_number: 4,
        description:
          "Coloca el brisket con la grasa hacia abajo si el calor viene de abajo (offset, kamado), hacia arriba si viene de arriba o detrás (algunos ahumadores de armario). La capa de grasa protege cualquier lado que esté orientado hacia la fuente de calor. Inserta una sonda en la parte más gruesa del flat, angulada hacia el centro — evita las bolsas de grasa, que dan lecturas más bajas que la carne circundante. Cierra la tapa y NO LA ABRAS durante al menos 3 horas. Cada vez que abres, pierdes 15-20 minutos de tiempo de recupero.",
      },
      {
        step_number: 5,
        description:
          "Mantén la temperatura del ahumador entre 107-135°C (225-275°F) durante toda la cocción. Alrededor de las horas 4-6, comprueba la costra — quieres un color caoba oscuro y una superficie que se sienta como cuero seco cuando la presionas. La temperatura interna se bloqueará alrededor de 65-77°C (150-170°F). Esto es el estancamiento — la evaporación de la humedad superficial enfría la carne tanto como el ahumador la calienta. Puede durar 2-6 horas. NO subas la temperatura del ahumador. Espera, o procede con el envuelto opcional en el paso 6.",
      },
      {
        step_number: 6,
        description:
          "Opcional pero recomendado para principiantes — el Texas Crutch: cuando la temperatura interna llegue a 74°C (165°F) Y la costra esté formada (oscura, seca, firme), envuelve en papel de carnicero rosa. NO en papel de aluminio — el aluminio atrapa el vapor y convierte tu costra en papilla. Si usas sebo de vaca, vierte 60-85 ml sobre la superficie antes de envolver. El sebo baña la carne y añade riqueza. Envuelve bien pero no herméticamente — quieres algo de respiración. Devuelve al ahumador de inmediato.",
      },
      {
        step_number: 7,
        description:
          "El brisket está listo cuando se dan dos condiciones simultáneamente: temperatura interna de 93-96°C (200-205°F) Y la sonda entra con cero resistencia — como empujar en mantequilla a temperatura ambiente. La temperatura sola NO es suficiente. He tenido briskets listos a la sonda a 92°C (197°F) y otros que necesitaban 98°C (208°F). El tejido conectivo se disuelve a diferentes velocidades según el animal. Si alcanza 95°C (203°F) pero la sonda aún encuentra resistencia, sigue cocinando.",
      },
      {
        step_number: 8,
        description:
          "Saca el brisket y déjalo reposar en un contenedor térmico seco (sin hielo) forrado con toallas viejas. Coloca el brisket envuelto dentro, cúbrelo con más toallas y cierra la tapa. Reposo MÍNIMO: 1 hora. Reposo IDEAL: 2-4 horas. La temperatura interna subirá unos grados, luego bajará lentamente. Puedes mantener un brisket en un contenedor térmico hasta 6 horas sin que baje de la temperatura de servicio. Este período de reposo no es negociable — permite que el colágeno rendido se reabsorba en las fibras de la carne.",
      },
      {
        step_number: 9,
        description:
          "Desenvuelve y corta. El flat se corta a contraveta en lonchas del grosor de un lápiz (unos 6 mm). Cada loncha debería mantenerse unida al levantarla pero separarse con un tirón suave. Si se deshace, lo sobrecocinaste. Si no se dobla, lo infracocinaste. Separa el point del flat por la unión de grasa, gira el point 90 grados (la fibra corre perpendicular al flat) y corta a contraveta del point. Sirve de inmediato con pan blanco, pepinillos, rodajas de cebolla blanca y salsa aparte — no sobre la carne.",
      },
    ],
  },

  // --- Smoked Baby Back Ribs with Honey Glaze ---
  nv803ryo2lyvrchzwnh33qdz: {
    it: [
      {
        step_number: 1,
        description:
          "Rimuovi la membrana dal lato dell'osso di ogni rack scivolando un coltello da burro sotto la membrana a un'estremità, afferrandola con un foglio di carta da cucina e tirandola via in un unico pezzo. Questo permette al fumo e al condimento di penetrare da entrambi i lati.",
      },
      {
        step_number: 2,
        description:
          "Applica la senape gialla su tutti i lati di ogni rack come legante. Non senti nessuna senape nel prodotto finale — brucia completamente. Poi aggiungi il rub: mescola zucchero di canna, paprika affumicata, pepe nero, aglio in polvere, cipolla in polvere, sale kosher e pepe di Cayenna. Applica abbondantemente su tutti i lati. Avvolgi in pellicola alimentare e metti in frigo per almeno 2 ore, idealmente una notte.",
      },
      {
        step_number: 3,
        description:
          "Porta lo smoker a 107°C (225°F) usando legno di ciliegio o melo. Questi legni fruttati si abbinano perfettamente al maiale. Posiziona i rack verticalmente usando un supporto per costine, oppure adagiati piatti sulla griglia. Affumica per 3 ore senza aprire — questa è la fase di formazione del fumo. La membrana rimossa permetterà al fumo di penetrare da entrambi i lati.",
      },
      {
        step_number: 4,
        description:
          "Dopo 3 ore, avvolgi ogni rack nella foil con un cucchiaio di miele, una noce di burro e un goccio di aceto di sidro di mele. Chiudi bene la foil. Questo è il metodo 3-2-1 — le 2 ore in foil rendono le costine tenere attraverso la cottura al vapore. Rimetti nello smoker a 107°C (225°F) per 2 ore.",
      },
      {
        step_number: 5,
        description:
          "Prepara la glassa: in un pentolino, mescola miele, burro non salato e aceto di sidro di mele. Scalda a fuoco basso finché il burro si scioglie e il tutto è amalgamato. Tieni in caldo.",
      },
      {
        step_number: 6,
        description:
          "Dopo 2 ore in foil, togli le costine con cura (saranno fragili). Spennella generosamente con la glassa al miele su tutti i lati. Rimetti sulle griglie dello smoker SENZA foil per l'ultima ora. Questo è il tempo di impostazione della glassa — si caramellizza e forma uno strato laccato. Spennella ancora una volta a metà di quest'ultima ora.",
      },
      {
        step_number: 7,
        description:
          "Le costine sono pronte quando la carne si è ritirata dall'osso di 6-10 mm e le costine si piegano quasi fino a rompersi quando tieni il rack con le pinze nel mezzo. Un altro test: inserisci uno stuzzicadenti tra due ossa — se entra senza resistenza, sono pronte. Togli dallo smoker, lascia riposare 10 minuti e affetta tra le ossa per servire.",
      },
    ],
    es: [
      {
        step_number: 1,
        description:
          "Retira la membrana del lado del hueso de cada costillar deslizando un cuchillo de mantequilla bajo la membrana en un extremo, sujetándola con un trozo de papel de cocina y tirando en un solo movimiento. Esto permite que el humo y el condimento penetren por ambos lados.",
      },
      {
        step_number: 2,
        description:
          "Aplica mostaza amarilla en todos los lados de cada costillar como aglutinante. No notarás ningún sabor a mostaza en el producto final — se quema completamente. Luego añade el rub: mezcla azúcar moreno, pimentón ahumado, pimienta negra, ajo en polvo, cebolla en polvo, sal kosher y pimienta de Cayena. Aplica generosamente en todos los lados. Envuelve en film transparente y refrigera al menos 2 horas, idealmente toda la noche.",
      },
      {
        step_number: 3,
        description:
          "Lleva el ahumador a 107°C (225°F) usando madera de cerezo o manzano. Estas maderas frutales se combinan perfectamente con el cerdo. Coloca los costillares verticalmente usando un soporte para costillas, o apoyados planos en la rejilla. Ahúma durante 3 horas sin abrir — esta es la fase de formación del humo. La membrana retirada permitirá que el humo penetre por ambos lados.",
      },
      {
        step_number: 4,
        description:
          "Después de 3 horas, envuelve cada costillar en papel de aluminio con una cucharada de miel, una nuez de mantequilla y un chorrito de vinagre de sidra de manzana. Cierra bien el papel de aluminio. Este es el método 3-2-1 — las 2 horas en aluminio ablandan las costillas mediante cocción al vapor. Devuelve al ahumador a 107°C (225°F) durante 2 horas.",
      },
      {
        step_number: 5,
        description:
          "Prepara el glaseado: en un cazo, mezcla la miel, la mantequilla sin sal y el vinagre de sidra de manzana. Calienta a fuego bajo hasta que la mantequilla se derrita y todo esté amalgamado. Mantén caliente.",
      },
      {
        step_number: 6,
        description:
          "Después de 2 horas en papel de aluminio, saca las costillas con cuidado (estarán frágiles). Pincela generosamente con el glaseado de miel por todos los lados. Devuelve a las rejillas del ahumador SIN papel de aluminio durante la última hora. Este es el tiempo de fijación del glaseado — se carameliza y forma una capa lacada. Pincela una vez más a mitad de esta última hora.",
      },
      {
        step_number: 7,
        description:
          "Las costillas están listas cuando la carne se ha retirado del hueso 6-10 mm y las costillas se doblan casi hasta romperse cuando sostienes el costillar con pinzas por el centro. Otra prueba: inserta un palillo entre dos huesos — si entra sin resistencia, están listas. Retira del ahumador, deja reposar 10 minutos y corta entre los huesos para servir.",
      },
    ],
  },
};

// ============================================================
// Traduzione ingredienti per ogni ricetta e locale
// ============================================================

/**
 * Dati ingredienti tradotti + metrici per ogni ricetta.
 * Per ogni ricetta: array di ingredienti con nome tradotto e unità metriche.
 */
const RECIPE_INGREDIENTS = {
  // --- Grilled Argentinian Chimichurri Steak ---
  caaovn2xyr6o4r2kjd4brb3m: {
    it: [
      { name: "Bistecca ribeye con osso (spessore 3,8 cm)", unit: "bistecche", quantity: "4" },
      { name: "Sale marino grosso", unit: "g", quantity: "30" },
      { name: "Prezzemolo fresco a foglia piatta (finemente tritato)", unit: "g", quantity: "30" },
      { name: "Origano fresco (finemente tritato)", unit: "g", quantity: "6" },
      { name: "Spicchi d'aglio (tritati)", unit: "spicchi", quantity: "6" },
      { name: "Aceto di vino rosso", unit: "ml", quantity: "60" },
      { name: "Olio extravergine di oliva", unit: "ml", quantity: "120" },
      { name: "Peperoncino in scaglie", unit: "g", quantity: "5" },
      { name: "Pepe nero (appena macinato)", unit: "g", quantity: "5" },
      { name: "Carbonella grezza", unit: "kg", quantity: "2.3" },
    ],
    es: [
      { name: "Bistec ribeye con hueso (de 3,8 cm de grosor)", unit: "bistecs", quantity: "4" },
      { name: "Sal marina gruesa", unit: "g", quantity: "30" },
      { name: "Perejil fresco de hoja plana (finamente picado)", unit: "g", quantity: "30" },
      { name: "Orégano fresco (finamente picado)", unit: "g", quantity: "6" },
      { name: "Dientes de ajo (picados)", unit: "dientes", quantity: "6" },
      { name: "Vinagre de vino tinto", unit: "ml", quantity: "60" },
      { name: "Aceite de oliva virgen extra", unit: "ml", quantity: "120" },
      { name: "Hojuelas de chile rojo", unit: "g", quantity: "5" },
      { name: "Pimienta negra (recién molida)", unit: "g", quantity: "5" },
      { name: "Carbón vegetal", unit: "kg", quantity: "2.3" },
    ],
  },

  // --- Competition-Style Pork Shoulder ---
  b4s60ez07ct83tl57og8edwf: {
    it: [
      { name: "Spalla di maiale (Boston butt) con osso, 3,6-4,5 kg, con strato di grasso intatto", unit: "intera", quantity: "1" },
      { name: "--- INIEZIONE ---", unit: "", quantity: "" },
      { name: "Succo di mela (non da concentrato)", unit: "ml", quantity: "240" },
      { name: "Acqua", unit: "ml", quantity: "120" },
      { name: "Aceto di sidro di mele", unit: "ml", quantity: "60" },
      { name: "Salsa worcestershire", unit: "ml", quantity: "30" },
      { name: "Sale kosher", unit: "g", quantity: "15" },
      { name: "Zucchero di canna", unit: "g", quantity: "15" },
      { name: "Aglio in polvere", unit: "g", quantity: "5" },
      { name: "Pepe di Cayenna", unit: "g", quantity: "2.5" },
      { name: "--- RUB ---", unit: "", quantity: "" },
      { name: "Sale kosher grosso (Diamond Crystal)", unit: "g", quantity: "32" },
      { name: "Pepe nero grosso", unit: "g", quantity: "32" },
      { name: "Paprika (dolce ungherese, non affumicata)", unit: "g", quantity: "30" },
      { name: "Zucchero di canna scuro", unit: "g", quantity: "30" },
      { name: "Aglio in polvere", unit: "g", quantity: "15" },
      { name: "Cipolla in polvere", unit: "g", quantity: "15" },
      { name: "Pepe di Cayenna", unit: "g", quantity: "5" },
      { name: "Cumino macinato", unit: "g", quantity: "5" },
      { name: "Timo secco", unit: "g", quantity: "2.5" },
      { name: "--- SPRITZ ---", unit: "", quantity: "" },
      { name: "Succo di mela", unit: "ml", quantity: "480" },
      { name: "Aceto di sidro di mele", unit: "ml", quantity: "240" },
      { name: "    Mescola in uno spruzzatore", unit: "", quantity: "" },
      { name: "--- AVVOLGIMENTO OPZIONALE (se lo stallo supera 6 ore) ---", unit: "", quantity: "" },
      { name: "    Foil resistente o carta da macellaio pesca", unit: "", quantity: "" },
      { name: "Succo di mela per avvolgere", unit: "ml", quantity: "60" },
      { name: "Burro", unit: "g", quantity: "30" },
    ],
    es: [
      { name: "Paleta de cerdo (Boston butt) con hueso, 3,6-4,5 kg, con capa de grasa intacta", unit: "entera", quantity: "1" },
      { name: "--- INYECCIÓN ---", unit: "", quantity: "" },
      { name: "Jugo de manzana (sin concentrar)", unit: "ml", quantity: "240" },
      { name: "Agua", unit: "ml", quantity: "120" },
      { name: "Vinagre de sidra de manzana", unit: "ml", quantity: "60" },
      { name: "Salsa worcestershire", unit: "ml", quantity: "30" },
      { name: "Sal kosher", unit: "g", quantity: "15" },
      { name: "Azúcar moreno", unit: "g", quantity: "15" },
      { name: "Ajo en polvo", unit: "g", quantity: "5" },
      { name: "Pimienta de Cayena", unit: "g", quantity: "2.5" },
      { name: "--- RUB ---", unit: "", quantity: "" },
      { name: "Sal kosher gruesa (Diamond Crystal)", unit: "g", quantity: "32" },
      { name: "Pimienta negra gruesa", unit: "g", quantity: "32" },
      { name: "Pimentón (dulce húngaro, sin ahumar)", unit: "g", quantity: "30" },
      { name: "Azúcar moreno oscuro", unit: "g", quantity: "30" },
      { name: "Ajo en polvo", unit: "g", quantity: "15" },
      { name: "Cebolla en polvo", unit: "g", quantity: "15" },
      { name: "Pimienta de Cayena", unit: "g", quantity: "5" },
      { name: "Comino molido", unit: "g", quantity: "5" },
      { name: "Tomillo seco", unit: "g", quantity: "2.5" },
      { name: "--- SPRITZ ---", unit: "", quantity: "" },
      { name: "Jugo de manzana", unit: "ml", quantity: "480" },
      { name: "Vinagre de sidra de manzana", unit: "ml", quantity: "240" },
      { name: "    Mezcla en un pulverizador", unit: "", quantity: "" },
      { name: "--- ENVUELTO OPCIONAL (si el estancamiento supera 6 horas) ---", unit: "", quantity: "" },
      { name: "    Papel de aluminio resistente o papel de carnicero melocotón", unit: "", quantity: "" },
      { name: "Jugo de manzana para envolver", unit: "ml", quantity: "60" },
      { name: "Mantequilla", unit: "g", quantity: "30" },
    ],
  },

  // --- Burnt Ends ---
  i7potp5m3dz61gynean8ozwx: {
    it: [
      { name: "Brisket intero, 5,4-7,3 kg (USDA Choice minimo, Prime preferito)", unit: "intero", quantity: "1" },
      { name: "--- RUB BRISKET ---", unit: "", quantity: "" },
      { name: "Sale kosher grosso (Diamond Crystal)", unit: "g", quantity: "64" },
      { name: "Pepe nero grosso (maglia 16 preferito per il brisket)", unit: "g", quantity: "64" },
      { name: "Aglio in polvere", unit: "g", quantity: "30" },
      { name: "Cipolla in polvere", unit: "g", quantity: "15" },
      { name: "--- SALSA BURNT ENDS ---", unit: "", quantity: "" },
      { name: "Salsa BBQ stile Kansas City (dolce e densa)", unit: "ml", quantity: "240" },
      { name: "Miele", unit: "ml", quantity: "30" },
      { name: "Burro non salato, fuso", unit: "g", quantity: "30" },
      { name: "Salsa piccante (Crystal o Frank's)", unit: "ml", quantity: "15" },
      { name: "Aceto di sidro di mele", unit: "ml", quantity: "15" },
      { name: "--- AGGIUNTIVI ---", unit: "", quantity: "" },
      { name: "    Senape gialla (come legante per il rub)", unit: "", quantity: "" },
      { name: "    Sego di manzo o burro (per la fase di avvolgimento)", unit: "", quantity: "" },
      { name: "    Carta da macellaio pesca (per avvolgere il flat del brisket)", unit: "", quantity: "" },
    ],
    es: [
      { name: "Brisket entero, 5,4-7,3 kg (USDA Choice mínimo, Prime preferido)", unit: "entero", quantity: "1" },
      { name: "--- RUB BRISKET ---", unit: "", quantity: "" },
      { name: "Sal kosher gruesa (Diamond Crystal)", unit: "g", quantity: "64" },
      { name: "Pimienta negra gruesa (malla 16 preferida para brisket)", unit: "g", quantity: "64" },
      { name: "Ajo en polvo", unit: "g", quantity: "30" },
      { name: "Cebolla en polvo", unit: "g", quantity: "15" },
      { name: "--- SALSA BURNT ENDS ---", unit: "", quantity: "" },
      { name: "Salsa BBQ estilo Kansas City (dulce y espesa)", unit: "ml", quantity: "240" },
      { name: "Miel", unit: "ml", quantity: "30" },
      { name: "Mantequilla sin sal, derretida", unit: "g", quantity: "30" },
      { name: "Salsa picante (Crystal o Frank's)", unit: "ml", quantity: "15" },
      { name: "Vinagre de sidra de manzana", unit: "ml", quantity: "15" },
      { name: "--- ADICIONALES ---", unit: "", quantity: "" },
      { name: "    Mostaza amarilla (como aglutinante para el rub)", unit: "", quantity: "" },
      { name: "    Sebo de vaca o mantequilla (para la fase de envuelto)", unit: "", quantity: "" },
      { name: "    Papel de carnicero melocotón (para envolver el flat del brisket)", unit: "", quantity: "" },
    ],
  },

  // --- Smoked Chicken Wings ---
  q5t73cpgrjsxunj477tvtx7w: {
    it: [
      { name: "Ali di pollo (flat e drum separati)", unit: "g", quantity: "1360" },
      { name: "Lievito in polvere senza alluminio (NON bicarbonato — è fondamentale)", unit: "g", quantity: "15" },
      { name: "Sale kosher", unit: "g", quantity: "5" },
      { name: "Aglio in polvere", unit: "g", quantity: "5" },
      { name: "Paprika affumicata", unit: "g", quantity: "5" },
      { name: "Cipolla in polvere", unit: "g", quantity: "2.5" },
      { name: "Pepe nero", unit: "g", quantity: "2.5" },
      { name: "Pepe di Cayenna", unit: "g", quantity: "1" },
      { name: "--- SALSA (aggiunta alla fine, NON durante l'affumicatura) ---", unit: "", quantity: "" },
      { name: "Salsa per ali preferita (mix Frank's RedHot e burro, o salsa BBQ allungata con aceto)", unit: "ml", quantity: "120" },
      { name: "--- OPZIONALE ---", unit: "", quantity: "" },
      { name: "Ciocchi di legno (melo o ciliegio)", unit: "ciocchi", quantity: "2" },
    ],
    es: [
      { name: "Alitas de pollo (planos y baquetas separados)", unit: "g", quantity: "1360" },
      { name: "Polvo de hornear sin aluminio (NO bicarbonato — esto es crítico)", unit: "g", quantity: "15" },
      { name: "Sal kosher", unit: "g", quantity: "5" },
      { name: "Ajo en polvo", unit: "g", quantity: "5" },
      { name: "Pimentón ahumado", unit: "g", quantity: "5" },
      { name: "Cebolla en polvo", unit: "g", quantity: "2.5" },
      { name: "Pimienta negra", unit: "g", quantity: "2.5" },
      { name: "Pimienta de Cayena", unit: "g", quantity: "1" },
      { name: "--- SALSA (se añade al final, NO durante el ahumado) ---", unit: "", quantity: "" },
      { name: "Salsa para alitas preferida (mezcla Frank's RedHot y mantequilla, o salsa BBQ diluida con vinagre)", unit: "ml", quantity: "120" },
      { name: "--- OPCIONAL ---", unit: "", quantity: "" },
      { name: "Trozos de madera (manzano o cerezo)", unit: "trozos", quantity: "2" },
    ],
  },

  // --- Reverse-Seared Tomahawk Ribeye ---
  f96s527nhldcr775efseh4h0: {
    it: [
      { name: "Ribeye tomahawk, spesso 5-6,4 cm, 1,1-1,6 kg (chiedi al macellaio — NON comprare quelli sottili)", unit: "bistecca", quantity: "1" },
      { name: "    Sale kosher grosso (Diamond Crystal preferito)", unit: "", quantity: "" },
      { name: "    Pepe nero grosso (macinalo fresco o non farlo)", unit: "", quantity: "" },
      { name: "Olio ad alto punto di fumo (olio di avocado, NON olio d'oliva)", unit: "ml", quantity: "30" },
      { name: "Burro (per spennellare, opzionale)", unit: "g", quantity: "30" },
      { name: "Aglio, schiacciato (per spennellare, opzionale)", unit: "spicchi", quantity: "3" },
      { name: "Rametti di rosmarino fresco (per spennellare, opzionale)", unit: "rametti", quantity: "2" },
      { name: "    Opzionale: 1 ciocco di legno (quercia o hickory) per un accento di fumo", unit: "", quantity: "" },
    ],
    es: [
      { name: "Ribeye tomahawk, de 5-6,4 cm de grosor, 1,1-1,6 kg (pide a tu carnicero — NO compres los finos)", unit: "bistec", quantity: "1" },
      { name: "    Sal kosher gruesa (Diamond Crystal preferida)", unit: "", quantity: "" },
      { name: "    Pimienta negra gruesa (muélela fresca o no te molestes)", unit: "", quantity: "" },
      { name: "Aceite para alta temperatura (aceite de aguacate, NO aceite de oliva)", unit: "ml", quantity: "30" },
      { name: "Mantequilla (para pincelar, opcional)", unit: "g", quantity: "30" },
      { name: "Ajo, aplastado (para pincelar, opcional)", unit: "dientes", quantity: "3" },
      { name: "Ramitas de romero fresco (para pincelar, opcional)", unit: "ramitas", quantity: "2" },
      { name: "    Opcional: 1 trozo de madera (roble o hickory) para un toque de humo", unit: "", quantity: "" },
    ],
  },

  // --- Smoked Mac and Cheese ---
  netj0s6fs78c4rgjk3ru6xeu: {
    it: [
      { name: "Maccheroni a gomito", unit: "g", quantity: "454" },
      { name: "Cheddar stagionato (grattugiato)", unit: "g", quantity: "340" },
      { name: "Formaggio Gruyère (grattugiato)", unit: "g", quantity: "114" },
      { name: "Formaggio cremoso", unit: "g", quantity: "227" },
      { name: "Latte intero", unit: "ml", quantity: "360" },
      { name: "Panna da cucina", unit: "ml", quantity: "120" },
      { name: "Uova grandi (sbattute)", unit: "uova", quantity: "2" },
      { name: "Burro non salato", unit: "g", quantity: "45" },
      { name: "Paprika affumicata", unit: "g", quantity: "5" },
      { name: "Senape in polvere", unit: "g", quantity: "5" },
      { name: "Aglio in polvere", unit: "g", quantity: "2.5" },
      { name: "Sale kosher", unit: "g", quantity: "5" },
      { name: "Pepe nero", unit: "g", quantity: "2.5" },
      { name: "Pangrattato panko", unit: "g", quantity: "64" },
    ],
    es: [
      { name: "Macarrones codo", unit: "g", quantity: "454" },
      { name: "Cheddar curado (rallado)", unit: "g", quantity: "340" },
      { name: "Queso Gruyère (rallado)", unit: "g", quantity: "114" },
      { name: "Queso crema", unit: "g", quantity: "227" },
      { name: "Leche entera", unit: "ml", quantity: "360" },
      { name: "Nata para cocinar", unit: "ml", quantity: "120" },
      { name: "Huevos grandes (batidos)", unit: "huevos", quantity: "2" },
      { name: "Mantequilla sin sal", unit: "g", quantity: "45" },
      { name: "Pimentón ahumado", unit: "g", quantity: "5" },
      { name: "Mostaza en polvo", unit: "g", quantity: "5" },
      { name: "Ajo en polvo", unit: "g", quantity: "2.5" },
      { name: "Sal kosher", unit: "g", quantity: "5" },
      { name: "Pimienta negra", unit: "g", quantity: "2.5" },
      { name: "Pan rallado panko", unit: "g", quantity: "64" },
    ],
  },

  // --- Texas-Style Smoked Brisket ---
  xs2069n8zpbvd23hsg1fgwbb: {
    it: [
      { name: "Brisket intero (USDA Choice o Prime)", unit: "kg", quantity: "6.4" },
      { name: "Pepe nero grosso (maglia 16)", unit: "g", quantity: "64" },
      { name: "Sale kosher (Diamond Crystal)", unit: "g", quantity: "32" },
      { name: "Spaccati o pezzi di post oak", unit: "kg", quantity: "3.6" },
      { name: "Senape gialla (legante, opzionale)", unit: "g", quantity: "30" },
      { name: "Sego di manzo (per avvolgere, opzionale)", unit: "g", quantity: "113" },
      { name: "Carta da macellaio (rosa, non cerosa)", unit: "rotolo", quantity: "1" },
    ],
    es: [
      { name: "Brisket entero (USDA Choice o Prime)", unit: "kg", quantity: "6.4" },
      { name: "Pimienta negra gruesa (malla 16)", unit: "g", quantity: "64" },
      { name: "Sal kosher (Diamond Crystal)", unit: "g", quantity: "32" },
      { name: "Troncos o trozos de post oak", unit: "kg", quantity: "3.6" },
      { name: "Mostaza amarilla (aglutinante, opcional)", unit: "g", quantity: "30" },
      { name: "Sebo de vaca (para envolver, opcional)", unit: "g", quantity: "113" },
      { name: "Papel de carnicero (rosa, sin cera)", unit: "rollo", quantity: "1" },
    ],
  },

  // --- Smoked Baby Back Ribs with Honey Glaze ---
  nv803ryo2lyvrchzwnh33qdz: {
    it: [
      { name: "Rack di costine baby back", unit: "rack", quantity: "3" },
      { name: "Senape gialla (legante)", unit: "g", quantity: "45" },
      { name: "Zucchero di canna", unit: "g", quantity: "64" },
      { name: "Paprika affumicata", unit: "g", quantity: "45" },
      { name: "Pepe nero", unit: "g", quantity: "30" },
      { name: "Aglio in polvere", unit: "g", quantity: "15" },
      { name: "Cipolla in polvere", unit: "g", quantity: "15" },
      { name: "Sale kosher", unit: "g", quantity: "15" },
      { name: "Pepe di Cayenna", unit: "g", quantity: "5" },
      { name: "Miele", unit: "ml", quantity: "120" },
      { name: "Burro non salato", unit: "g", quantity: "57" },
      { name: "Aceto di sidro di mele", unit: "ml", quantity: "30" },
      { name: "Succo di mela (per spruzzare)", unit: "ml", quantity: "240" },
      { name: "Ciocchi di legno di ciliegio o melo", unit: "ciocchi", quantity: "4" },
    ],
    es: [
      { name: "Costillares de costillas baby back", unit: "costillares", quantity: "3" },
      { name: "Mostaza amarilla (aglutinante)", unit: "g", quantity: "45" },
      { name: "Azúcar moreno", unit: "g", quantity: "64" },
      { name: "Pimentón ahumado", unit: "g", quantity: "45" },
      { name: "Pimienta negra", unit: "g", quantity: "30" },
      { name: "Ajo en polvo", unit: "g", quantity: "15" },
      { name: "Cebolla en polvo", unit: "g", quantity: "15" },
      { name: "Sal kosher", unit: "g", quantity: "15" },
      { name: "Pimienta de Cayena", unit: "g", quantity: "5" },
      { name: "Miel", unit: "ml", quantity: "120" },
      { name: "Mantequilla sin sal", unit: "g", quantity: "57" },
      { name: "Vinagre de sidra de manzana", unit: "ml", quantity: "30" },
      { name: "Jugo de manzana (para rociar)", unit: "ml", quantity: "240" },
      { name: "Trozos de madera de cerezo o manzano", unit: "trozos", quantity: "4" },
    ],
  },
};

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("🔍 Recupero tutte le ricette EN...");

  // Recupera tutte le ricette
  const allRecipes = [];
  let page = 1;
  while (true) {
    const d = await apiGet(
      `recipes?locale=en&pagination%5BpageSize%5D=25&pagination%5Bpage%5D=${page}`
    );
    allRecipes.push(...d.data);
    if (page >= d.meta.pagination.pageCount) break;
    page++;
  }

  console.log(`✅ Trovate ${allRecipes.length} ricette EN\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipe of allRecipes) {
    const { documentId, title } = recipe;

    const ingredientsIT = RECIPE_INGREDIENTS[documentId]?.it;
    const ingredientsES = RECIPE_INGREDIENTS[documentId]?.es;
    const instructionsIT = INSTRUCTION_TRANSLATIONS[documentId]?.it;
    const instructionsES = INSTRUCTION_TRANSLATIONS[documentId]?.es;

    if (!ingredientsIT && !instructionsIT) {
      console.log(`⏭️  Saltato (nessuna traduzione definita): ${title}`);
      skipped++;
      continue;
    }

    console.log(`\n📋 Aggiorno: ${title} (${documentId})`);

    // --- Aggiorna IT ---
    const itData = {};
    if (ingredientsIT) itData.ingredients = ingredientsIT;
    if (instructionsIT) itData.instructions = instructionsIT;

    if (Object.keys(itData).length > 0) {
      const resIT = await apiPut(documentId, "it", itData);
      if (resIT) {
        console.log(`  ✅ IT aggiornato`);
        updated++;
      } else {
        console.log(`  ❌ IT errore`);
        errors++;
      }
    }

    await delay(300);

    // --- Aggiorna ES ---
    const esData = {};
    if (ingredientsES) esData.ingredients = ingredientsES;
    if (instructionsES) esData.instructions = instructionsES;

    if (Object.keys(esData).length > 0) {
      const resES = await apiPut(documentId, "es", esData);
      if (resES) {
        console.log(`  ✅ ES aggiornato`);
        updated++;
      } else {
        console.log(`  ❌ ES errore`);
        errors++;
      }
    }

    await delay(300);
  }

  console.log(`\n📊 Riepilogo:`);
  console.log(`  ✅ Aggiornati: ${updated}`);
  console.log(`  ⏭️  Saltati: ${skipped}`);
  console.log(`  ❌ Errori: ${errors}`);
}

main().catch((e) => {
  console.error("❌ Errore fatale:", e);
  process.exit(1);
});
