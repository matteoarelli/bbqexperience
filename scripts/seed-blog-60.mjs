#!/usr/bin/env node
// seed-blog-60.mjs — Crea 60 articoli blog multilingua con linking interno
// Ogni articolo viene creato in EN, IT, ES e pubblicato
// Scheduling: 2 articoli al giorno dal 5 Aprile al 4 Maggio 2026

const STRAPI_URL = process.env.STRAPI_URL || 'http://bbqexperience-strapi:1337';
const TOKEN = process.env.STRAPI_API_TOKEN || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

// Link interni ai contenuti esistenti
const LINKS = {
  reviews: {
    napoleon: { en: '/en/reviews/napoleon-prestige-pro-500-review/', it: '/it/recensioni/napoleon-prestige-pro-500-review/', es: '/es/resenas/napoleon-prestige-pro-500-review/' },
    weber_summit: { en: '/en/reviews/weber-summit-s-470-review/', it: '/it/recensioni/weber-summit-s-470-review/', es: '/es/resenas/weber-summit-s-470-review/' },
    kamado: { en: '/en/reviews/kamado-joe-classic-iii-review/', it: '/it/recensioni/kamado-joe-classic-iii-review/', es: '/es/resenas/kamado-joe-classic-iii-review/' },
    oklahoma: { en: '/en/reviews/oklahoma-joes-highland-offset-smoker-review/', it: '/it/recensioni/oklahoma-joes-highland-offset-smoker-review/', es: '/es/resenas/oklahoma-joes-highland-offset-smoker-review/' },
    thermapen: { en: '/en/reviews/thermoworks-thermapen-one-review/', it: '/it/recensioni/thermoworks-thermapen-one-review/', es: '/es/resenas/thermoworks-thermapen-one-review/' },
    traeger: { en: '/en/reviews/traeger-ironwood-885-review/', it: '/it/recensioni/traeger-ironwood-885-review/', es: '/es/resenas/traeger-ironwood-885-review/' },
    meater: { en: '/en/reviews/meater-plus-wireless-thermometer-review/', it: '/it/recensioni/meater-plus-wireless-thermometer-review/', es: '/es/resenas/meater-plus-wireless-thermometer-review/' },
    jealous_devil: { en: '/en/reviews/jealous-devil-lump-charcoal-review/', it: '/it/recensioni/jealous-devil-lump-charcoal-review/', es: '/es/resenas/jealous-devil-lump-charcoal-review/' },
    grillgrate: { en: '/en/reviews/grillgrate-sear-station-review/', it: '/it/recensioni/grillgrate-sear-station-review/', es: '/es/resenas/grillgrate-sear-station-review/' },
    fogo: { en: '/en/reviews/fogo-super-premium-charcoal-review/', it: '/it/recensioni/fogo-super-premium-charcoal-review/', es: '/es/resenas/fogo-super-premium-charcoal-review/' },
  },
  recipes: {
    brisket: { en: '/en/recipes/texas-style-smoked-brisket/', it: '/it/ricette/texas-style-smoked-brisket/', es: '/es/recetas/texas-style-smoked-brisket/' },
    ribs: { en: '/en/recipes/smoked-baby-back-ribs-honey-glaze/', it: '/it/ricette/smoked-baby-back-ribs-honey-glaze/', es: '/es/recetas/smoked-baby-back-ribs-honey-glaze/' },
    pulled_pork: { en: '/en/recipes/competition-style-pork-shoulder-14-hour-smoke/', it: '/it/ricette/competition-style-pork-shoulder-14-hour-smoke/', es: '/es/recetas/competition-style-pork-shoulder-14-hour-smoke/' },
    wings: { en: '/en/recipes/smoked-chicken-wings-crispy-without-frying/', it: '/it/ricette/smoked-chicken-wings-crispy-without-frying/', es: '/es/recetas/smoked-chicken-wings-crispy-without-frying/' },
    chimichurri: { en: '/en/recipes/grilled-argentinian-chimichurri-steak/', it: '/it/ricette/grilled-argentinian-chimichurri-steak/', es: '/es/recetas/grilled-argentinian-chimichurri-steak/' },
    tomahawk: { en: '/en/recipes/reverse-seared-tomahawk-ribeye-two-zone/', it: '/it/ricette/reverse-seared-tomahawk-ribeye-two-zone/', es: '/es/recetas/reverse-seared-tomahawk-ribeye-two-zone/' },
    mac_cheese: { en: '/en/recipes/smoked-mac-and-cheese/', it: '/it/ricette/smoked-mac-and-cheese/', es: '/es/recetas/smoked-mac-and-cheese/' },
    burnt_ends: { en: '/en/recipes/burnt-ends-kansas-city-style-brisket-point/', it: '/it/ricette/burnt-ends-kansas-city-style-brisket-point/', es: '/es/recetas/burnt-ends-kansas-city-style-brisket-point/' },
  },
  tutorials: {
    rubs: { en: '/en/tutorials/bbq-rub-bible-building-flavor-from-scratch/', it: '/it/guide/bbq-rub-bible-building-flavor-from-scratch/', es: '/es/tutoriales/bbq-rub-bible-building-flavor-from-scratch/' },
    wood: { en: '/en/tutorials/understanding-wood-types-smoking-hickory-cherry/', it: '/it/guide/understanding-wood-types-smoking-hickory-cherry/', es: '/es/tutoriales/understanding-wood-types-smoking-hickory-cherry/' },
    temp_control: { en: '/en/tutorials/complete-guide-temperature-control-charcoal-grills/', it: '/it/guide/complete-guide-temperature-control-charcoal-grills/', es: '/es/tutoriales/complete-guide-temperature-control-charcoal-grills/' },
    fire: { en: '/en/tutorials/fire-management-101-offset-smoker-temperature-control/', it: '/it/guide/fire-management-101-offset-smoker-temperature-control/', es: '/es/tutoriales/fire-management-101-offset-smoker-temperature-control/' },
    charcoal_vs: { en: '/en/tutorials/charcoal-vs-pellet-vs-gas-honest-comparison/', it: '/it/guide/charcoal-vs-pellet-vs-gas-honest-comparison/', es: '/es/tutoriales/charcoal-vs-pellet-vs-gas-honest-comparison/' },
    first_smoker: { en: '/en/tutorials/how-to-choose-your-first-smoker-buyers-guide/', it: '/it/guide/how-to-choose-your-first-smoker-buyers-guide/', es: '/es/tutoriales/how-to-choose-your-first-smoker-buyers-guide/' },
  },
};

function link(ref, locale) {
  const parts = ref.split('.');
  return LINKS[parts[0]]?.[parts[1]]?.[locale] || '#';
}

// I 60 articoli
const articles = [
  // ─── TIPS (12) ─────────────────────────────────────────
  {
    slug: 'how-to-season-a-new-grill-right',
    category: 'tips',
    reading_time: 6,
    en: {
      title: 'How to Season a New Grill the Right Way',
      excerpt: 'Your brand-new grill needs seasoning before the first cook. Here\'s the only method that actually works.',
      seo_title: 'How to Season a New Grill — Step by Step Guide',
      seo_description: 'Learn the correct way to season a new gas or charcoal grill before your first cook. Prevents rust and improves flavor.',
      content: `Your shiny new grill is sitting in the backyard, and you're itching to throw some steaks on it. Stop. Before you cook a single thing, you need to season it properly.\n\n## Why Seasoning Matters\n\nFactory residues — oils, solvents, metal shavings — coat every new grill. Cooking on an unseasoned grill means those chemicals end up in your food. Not exactly the flavor profile you're going for.\n\nSeasoning creates a non-stick polymerized oil layer on the grates and interior surfaces. It prevents rust, makes cleanup easier, and actually improves the flavor of everything you cook.\n\n## The Method\n\n**Step 1: Clean everything.** Remove all grates, heat plates, and flavorizer bars. Wash with warm soapy water. Rinse thoroughly and dry completely.\n\n**Step 2: Apply oil.** Use a high-smoke-point oil — canola, vegetable, or flaxseed. Apply a thin, even coat to all interior surfaces, grates, and heat deflectors. Thin is key. Thick layers get sticky.\n\n**Step 3: Heat it up.** Fire up the grill to high heat (400-500°F / 200-260°C). Close the lid and let it burn for 30-45 minutes. The oil will smoke, then stop smoking. When the smoke clears, you're done.\n\n**Step 4: Cool and repeat.** Let the grill cool completely, apply another thin coat of oil, and repeat the burn cycle. Two rounds is ideal. Three if you're obsessive.\n\n## What About Charcoal Grills?\n\nSame process, different heat source. Fill the charcoal basket, light it up, and let it rip with all vents open. If you need help managing charcoal heat, check out our [complete guide to temperature control on charcoal grills](${link('tutorials.temp_control', 'en')}).\n\n## Common Mistakes\n\n- **Too much oil.** Thick layers create a gummy, sticky surface instead of a smooth seasoning.\n- **Not hot enough.** You need to exceed the oil's smoke point for polymerization to happen.\n- **Using olive oil.** Low smoke point. It burns and creates bitter residue. Stick with canola or flaxseed.\n- **Skipping the second coat.** One round gives you minimal protection. Two gives you real seasoning.\n\n## Maintaining the Season\n\nAfter every cook, brush the grates while still warm. Oil them lightly before storing. Your grill will build better seasoning over time — like a cast iron pan that gets better with age.\n\nFor more on choosing the right grill to season, read our [buyer's guide to first smokers](${link('tutorials.first_smoker', 'en')}).`,
    },
    it: {
      title: 'Come Stagionare un Nuovo Barbecue nel Modo Giusto',
      excerpt: 'Il tuo barbecue nuovo di zecca ha bisogno di stagionatura prima della prima cottura. Ecco l\'unico metodo che funziona davvero.',
      seo_title: 'Come Stagionare un Nuovo Barbecue — Guida Passo Passo',
      seo_description: 'Impara il modo corretto per stagionare un nuovo barbecue a gas o carbone prima della prima cottura.',
      content: `Il tuo nuovo barbecue fiammante è nel giardino e non vedi l'ora di buttarci sopra delle bistecche. Fermati. Prima di cucinare qualsiasi cosa, devi stagionarlo correttamente.\n\n## Perché la Stagionatura è Importante\n\nI residui di fabbrica — oli, solventi, residui metallici — ricoprono ogni barbecue nuovo. Cucinare su un barbecue non stagionato significa che quelle sostanze chimiche finiscono nel tuo cibo.\n\nLa stagionatura crea uno strato di olio polimerizzato antiaderente sulle griglie e sulle superfici interne. Previene la ruggine, facilita la pulizia e migliora il sapore di tutto ciò che cucini.\n\n## Il Metodo\n\n**Passo 1: Pulisci tutto.** Rimuovi tutte le griglie, i deflettori di calore e le barre aromatizzanti. Lava con acqua calda e sapone. Risciacqua bene e asciuga completamente.\n\n**Passo 2: Applica l'olio.** Usa un olio con alto punto di fumo — colza, semi o lino. Applica uno strato sottile e uniforme su tutte le superfici interne. Sottile è la parola chiave.\n\n**Passo 3: Scaldalo.** Accendi il barbecue alla massima temperatura (200-260°C). Chiudi il coperchio e lascia bruciare per 30-45 minuti. L'olio fumerà, poi smetterà. Quando il fumo si ferma, hai finito.\n\n**Passo 4: Raffredda e ripeti.** Lascia raffreddare completamente, applica un altro strato sottile di olio e ripeti il ciclo. Due passate sono l'ideale.\n\n## E i Barbecue a Carbone?\n\nStesso processo, fonte di calore diversa. Riempi il cestello, accendi e lascia andare con le prese d'aria aperte. Se hai bisogno di aiuto con la gestione del calore, consulta la nostra [guida completa al controllo della temperatura](${link('tutorials.temp_control', 'it')}).\n\n## Errori Comuni\n\n- **Troppo olio.** Gli strati spessi creano una superficie appiccicosa.\n- **Temperatura insufficiente.** Devi superare il punto di fumo dell'olio.\n- **Usare olio d'oliva.** Basso punto di fumo, crea residui amari.\n- **Saltare la seconda mano.** Un solo passaggio dà una protezione minima.\n\nPer saperne di più sulla scelta del barbecue giusto, leggi la nostra [guida all'acquisto del primo affumicatore](${link('tutorials.first_smoker', 'it')}).`,
    },
    es: {
      title: 'Cómo Curar una Parrilla Nueva Correctamente',
      excerpt: 'Tu parrilla nueva necesita curado antes de la primera cocción. Aquí está el único método que realmente funciona.',
      seo_title: 'Cómo Curar una Parrilla Nueva — Guía Paso a Paso',
      seo_description: 'Aprende la forma correcta de curar una parrilla nueva de gas o carbón antes de tu primera cocción.',
      content: `Tu reluciente parrilla nueva está en el patio y estás deseando poner unos filetes. Para. Antes de cocinar nada, necesitas curarla correctamente.\n\n## Por Qué Importa el Curado\n\nLos residuos de fábrica — aceites, solventes, virutas metálicas — cubren cada parrilla nueva. Cocinar en una parrilla sin curar significa que esas sustancias químicas terminan en tu comida.\n\nEl curado crea una capa de aceite polimerizado antiadherente en las rejillas y superficies interiores. Previene el óxido, facilita la limpieza y mejora el sabor.\n\n## El Método\n\n**Paso 1: Limpia todo.** Retira todas las rejillas y deflectores. Lava con agua caliente y jabón. Enjuaga bien y seca completamente.\n\n**Paso 2: Aplica aceite.** Usa un aceite con alto punto de humo — canola o linaza. Aplica una capa fina y uniforme en todas las superficies interiores.\n\n**Paso 3: Caliéntala.** Enciende la parrilla a temperatura alta (200-260°C). Cierra la tapa y déjala quemar durante 30-45 minutos.\n\n**Paso 4: Enfría y repite.** Deja enfriar completamente, aplica otra capa fina de aceite y repite el ciclo.\n\n## ¿Y las Parrillas de Carbón?\n\nMismo proceso, diferente fuente de calor. Consulta nuestra [guía completa de control de temperatura](${link('tutorials.temp_control', 'es')}).\n\n## Errores Comunes\n\n- **Demasiado aceite.** Las capas gruesas crean una superficie pegajosa.\n- **Temperatura insuficiente.** Debes superar el punto de humo del aceite.\n- **Usar aceite de oliva.** Bajo punto de humo, crea residuos amargos.\n\nPara más información sobre elegir la parrilla correcta, lee nuestra [guía de compra](${link('tutorials.first_smoker', 'es')}).`,
    },
  },
  {
    slug: '7-signs-your-grill-needs-deep-cleaning',
    category: 'tips',
    reading_time: 5,
    en: {
      title: '7 Signs Your Grill Desperately Needs a Deep Clean',
      excerpt: 'Flare-ups, bad taste, uneven heat? Your grill is screaming for attention. Here are the warning signs.',
      seo_title: '7 Signs Your Grill Needs Deep Cleaning | BBQ Experience',
      seo_description: 'Learn the 7 warning signs that your grill needs a deep clean — from flare-ups to bitter flavors.',
      content: `You love your grill. You use it every weekend. But when was the last time you actually cleaned it? Not a quick brush — a real, deep clean?\n\nHere are seven signs your grill is crying for help.\n\n## 1. Constant Flare-Ups\n\nOccasional flare-ups are normal. Constant ones mean grease has built up on your heat deflectors, burner tubes, or the bottom of your firebox. That grease ignites and turns your controlled cook into a house fire.\n\n## 2. Food Tastes Bitter or \"Off\"\n\nOld grease and carbon buildup create acrid, bitter compounds that transfer to your food. If your [smoked chicken wings](${link('recipes.wings', 'en')}) taste like a parking garage, it's not the recipe — it's the grill.\n\n## 3. Uneven Heat Distribution\n\nClogged burner ports or blocked venturi tubes cause hot spots and dead zones. If one side of your grill is scorching while the other barely warms, that's not a design flaw. It's a maintenance failure. Our [temperature control guide](${link('tutorials.temp_control', 'en')}) covers the science, but no guide can fix a clogged burner.\n\n## 4. The Lid Won't Close Properly\n\nCarbon and grease accumulate on the lid seal and hinge areas. Eventually, the buildup prevents a proper seal, which means heat escape and inconsistent temps.\n\n## 5. Smoke Is Black, Not Blue\n\nClean smoke is thin and blue-tinted. Dirty smoke is thick, black, and acrid. If your grill produces black smoke even after the initial startup phase, you're burning accumulated grease, not wood.\n\n## 6. Rust Is Appearing\n\nRust means the seasoning layer has degraded. Usually from moisture sitting on unseasoned metal. A deep clean followed by re-seasoning fixes this.\n\n## 7. You Can't Remember the Last Time\n\nIf you have to think about it, it's been too long. Monthly deep cleans for regular users. Quarterly minimum for occasional grillers.\n\n## How to Deep Clean\n\n1. Remove all grates, heat plates, and burner covers\n2. Soak grates in hot soapy water for 30 minutes\n3. Scrub interior walls with a grill brush and degreaser\n4. Clean burner ports with a thin wire or toothpick\n5. Vacuum out the firebox\n6. Rinse everything, dry thoroughly\n7. Re-season grates with oil and a 30-minute burn\n\nYour next [Texas-style brisket](${link('recipes.brisket', 'en')}) will thank you.`,
    },
    it: {
      title: '7 Segnali Che il Tuo Barbecue Ha Bisogno di una Pulizia Profonda',
      excerpt: 'Fiammate, sapore amaro, calore irregolare? Il tuo barbecue sta urlando per attenzione.',
      seo_title: '7 Segnali Che il Barbecue Va Pulito a Fondo',
      seo_description: 'Scopri i 7 segnali d\'allarme che indicano che il tuo barbecue ha bisogno di una pulizia profonda.',
      content: `Ami il tuo barbecue. Lo usi ogni weekend. Ma quando è stata l'ultima volta che l'hai davvero pulito? Non una spazzolata veloce — una vera pulizia profonda?\n\n## 1. Fiammate Costanti\n\nFilammate occasionali sono normali. Quelle costanti significano che il grasso si è accumulato sui deflettori, sui bruciatori o sul fondo.\n\n## 2. Il Cibo Sa di Amaro\n\nGrasso vecchio e accumuli di carbonio creano composti amari che si trasferiscono al cibo. Se le tue [ali di pollo affumicate](${link('recipes.wings', 'it')}) sanno di garage, non è la ricetta — è il barbecue.\n\n## 3. Calore Irregolare\n\nBruciatori intasati causano punti caldi e zone morte. La nostra [guida al controllo della temperatura](${link('tutorials.temp_control', 'it')}) copre la scienza, ma nessuna guida può risolvere un bruciatore ostruito.\n\n## 4. Il Coperchio Non Chiude Bene\n\nCarbonio e grasso si accumulano sulla guarnizione e sulle cerniere.\n\n## 5. Il Fumo è Nero, Non Blu\n\nIl fumo pulito è sottile e bluastro. Il fumo sporco è denso, nero e acre.\n\n## 6. Appare la Ruggine\n\nLa ruggine significa che lo strato di stagionatura si è degradato.\n\n## 7. Non Ricordi l'Ultima Volta\n\nSe devi pensarci, è passato troppo tempo. Pulizia profonda mensile per chi usa il barbecue regolarmente.\n\n## Come Fare una Pulizia Profonda\n\n1. Rimuovi griglie, deflettori e copri-bruciatori\n2. Metti in ammollo le griglie in acqua calda e sapone per 30 minuti\n3. Pulisci le pareti interne con spazzola e sgrassatore\n4. Pulisci i fori dei bruciatori con un filo sottile\n5. Aspira il focolare\n6. Risciacqua, asciuga bene\n7. Ri-stagiona con olio e una bruciatura di 30 minuti\n\nIl tuo prossimo [brisket texano](${link('recipes.brisket', 'it')}) ti ringrazierà.`,
    },
    es: {
      title: '7 Señales de Que Tu Parrilla Necesita una Limpieza Profunda',
      excerpt: 'Llamaradas, sabor amargo, calor desigual? Tu parrilla está gritando por atención.',
      seo_title: '7 Señales de Que Tu Parrilla Necesita Limpieza Profunda',
      seo_description: 'Descubre las 7 señales de advertencia de que tu parrilla necesita una limpieza profunda.',
      content: `Amas tu parrilla. La usas cada fin de semana. Pero ¿cuándo fue la última vez que realmente la limpiaste?\n\n## 1. Llamaradas Constantes\n\nLlamaradas ocasionales son normales. Las constantes significan acumulación de grasa.\n\n## 2. La Comida Sabe Amarga\n\nGrasa vieja y acumulación de carbón crean compuestos amargos. Si tus [alitas de pollo ahumadas](${link('recipes.wings', 'es')}) saben a garaje, no es la receta.\n\n## 3. Calor Desigual\n\nQuemadores obstruidos causan puntos calientes y zonas muertas. Nuestra [guía de control de temperatura](${link('tutorials.temp_control', 'es')}) cubre la ciencia.\n\n## 4. La Tapa No Cierra Bien\n\n## 5. El Humo es Negro, No Azul\n\n## 6. Aparece Óxido\n\n## 7. No Recuerdas la Última Vez\n\nSi tienes que pensarlo, ha pasado demasiado tiempo.\n\n## Cómo Hacer una Limpieza Profunda\n\n1. Retira rejillas, deflectores y cubiertas\n2. Remoja las rejillas en agua caliente con jabón por 30 minutos\n3. Limpia las paredes interiores\n4. Limpia los puertos de los quemadores\n5. Aspira la caja de fuego\n6. Enjuaga y seca bien\n7. Cura con aceite y una quema de 30 minutos\n\nTu próximo [brisket texano](${link('recipes.brisket', 'es')}) te lo agradecerá.`,
    },
  },
];

// Genero i restanti 58 articoli programmaticamente
const templates = [
  // TIPS (10 more)
  { slug: 'best-bbq-side-dishes-for-any-cookout', cat: 'tips', rt: 7, title: { en: 'The 10 Best BBQ Side Dishes for Any Cookout', it: 'I 10 Migliori Contorni BBQ per Ogni Grigliata', es: 'Los 10 Mejores Acompañamientos BBQ para Cualquier Parrillada' }, links: ['recipes.mac_cheese', 'recipes.brisket'] },
  { slug: 'how-to-smoke-in-the-rain-without-ruining-everything', cat: 'tips', rt: 6, title: { en: 'How to Smoke in the Rain Without Ruining Everything', it: 'Come Affumicare Sotto la Pioggia Senza Rovinare Tutto', es: 'Cómo Ahumar Bajo la Lluvia Sin Arruinarlo Todo' }, links: ['tutorials.temp_control', 'tutorials.fire'] },
  { slug: 'why-resting-meat-matters-more-than-you-think', cat: 'tips', rt: 5, title: { en: 'Why Resting Meat Matters More Than You Think', it: 'Perché Far Riposare la Carne Conta Più di Quanto Pensi', es: 'Por Qué Reposar la Carne Importa Más de lo Que Crees' }, links: ['recipes.brisket', 'recipes.tomahawk'] },
  { slug: 'the-right-way-to-light-charcoal-chimney-starter', cat: 'tips', rt: 4, title: { en: 'The Right Way to Light Charcoal (Chimney Starter Method)', it: 'Il Modo Giusto per Accendere il Carbone (Metodo Ciminiera)', es: 'La Forma Correcta de Encender Carbón (Método Chimenea)' }, links: ['tutorials.temp_control', 'reviews.jealous_devil'] },
  { slug: 'how-to-prevent-meat-from-sticking-to-the-grill', cat: 'tips', rt: 4, title: { en: 'How to Prevent Meat from Sticking to the Grill', it: 'Come Evitare Che la Carne si Attacchi alla Griglia', es: 'Cómo Evitar Que la Carne se Pegue a la Parrilla' }, links: ['recipes.chimichurri', 'reviews.grillgrate'] },
  { slug: 'bbq-mistakes-that-ruin-expensive-cuts', cat: 'tips', rt: 8, title: { en: '12 BBQ Mistakes That Ruin Expensive Cuts of Meat', it: '12 Errori BBQ Che Rovinano i Tagli di Carne Costosi', es: '12 Errores BBQ Que Arruinan Cortes de Carne Caros' }, links: ['recipes.tomahawk', 'reviews.thermapen'] },
  { slug: 'when-to-wrap-brisket-texas-crutch-guide', cat: 'tips', rt: 7, title: { en: 'When to Wrap Brisket: The Texas Crutch Explained', it: 'Quando Avvolgere il Brisket: Il Texas Crutch Spiegato', es: 'Cuándo Envolver el Brisket: El Texas Crutch Explicado' }, links: ['recipes.brisket', 'recipes.burnt_ends'] },
  { slug: 'how-to-get-perfect-bark-on-smoked-meat', cat: 'tips', rt: 6, title: { en: 'How to Get Perfect Bark on Smoked Meat', it: 'Come Ottenere una Bark Perfetta sulla Carne Affumicata', es: 'Cómo Conseguir una Corteza Perfecta en la Carne Ahumada' }, links: ['tutorials.rubs', 'recipes.pulled_pork'] },
  { slug: 'best-internal-temperatures-for-every-meat', cat: 'tips', rt: 5, title: { en: 'Best Internal Temperatures for Every Type of Meat', it: 'Le Migliori Temperature Interne per Ogni Tipo di Carne', es: 'Las Mejores Temperaturas Internas para Cada Tipo de Carne' }, links: ['reviews.thermapen', 'reviews.meater'] },
  { slug: 'how-to-use-a-water-pan-in-your-smoker', cat: 'tips', rt: 5, title: { en: 'How to Use a Water Pan in Your Smoker (And When Not To)', it: 'Come Usare una Vaschetta d\'Acqua nell\'Affumicatore', es: 'Cómo Usar una Bandeja de Agua en Tu Ahumador' }, links: ['tutorials.fire', 'reviews.oklahoma'] },
  // TRENDS (12)
  { slug: 'pellet-grills-2026-worth-the-hype', cat: 'trends', rt: 8, title: { en: 'Pellet Grills in 2026: Still Worth the Hype?', it: 'Pellet Grill nel 2026: Valgono Ancora il Clamore?', es: 'Parrillas de Pellets en 2026: ¿Aún Valen la Pena?' }, links: ['reviews.traeger', 'tutorials.charcoal_vs'] },
  { slug: 'rise-of-kamado-grills-why-everyone-wants-one', cat: 'trends', rt: 7, title: { en: 'The Rise of Kamado Grills: Why Everyone Wants One', it: 'L\'Ascesa dei Kamado: Perché Tutti Ne Vogliono Uno', es: 'El Auge de las Kamado: Por Qué Todos Quieren Una' }, links: ['reviews.kamado', 'tutorials.charcoal_vs'] },
  { slug: 'smart-grills-bluetooth-wifi-necessary', cat: 'trends', rt: 6, title: { en: 'Smart Grills: Is Bluetooth and WiFi Actually Necessary?', it: 'Barbecue Smart: Bluetooth e WiFi Sono Davvero Necessari?', es: 'Parrillas Inteligentes: ¿Es Necesario el Bluetooth y WiFi?' }, links: ['reviews.traeger', 'reviews.meater'] },
  { slug: 'japanese-bbq-trend-yakitori-at-home', cat: 'trends', rt: 7, title: { en: 'Japanese BBQ at Home: The Yakitori Trend Taking Over', it: 'BBQ Giapponese a Casa: Il Trend Yakitori Che Sta Conquistando Tutti', es: 'BBQ Japonés en Casa: La Tendencia Yakitori Que Está Arrasando' }, links: ['recipes.wings', 'tutorials.temp_control'] },
  { slug: 'portable-grills-best-options-2026', cat: 'trends', rt: 6, title: { en: 'The Best Portable Grills for Camping and Tailgating in 2026', it: 'I Migliori Barbecue Portatili per Campeggio nel 2026', es: 'Las Mejores Parrillas Portátiles para Camping en 2026' }, links: ['tutorials.first_smoker', 'tutorials.charcoal_vs'] },
  { slug: 'bbq-competition-scene-2026-whats-changed', cat: 'trends', rt: 8, title: { en: 'The BBQ Competition Scene in 2026: What\'s Changed', it: 'Le Competizioni BBQ nel 2026: Cosa è Cambiato', es: 'Las Competiciones BBQ en 2026: Qué Ha Cambiado' }, links: ['recipes.pulled_pork', 'recipes.ribs'] },
  { slug: 'sustainability-in-bbq-eco-friendly-grilling', cat: 'trends', rt: 7, title: { en: 'Sustainability in BBQ: Can Grilling Be Eco-Friendly?', it: 'Sostenibilità nel BBQ: Il Barbecue Può Essere Eco-Friendly?', es: 'Sostenibilidad en BBQ: ¿Puede la Parrilla Ser Ecológica?' }, links: ['reviews.jealous_devil', 'reviews.fogo'] },
  { slug: 'cold-smoking-trend-cheese-salmon-cocktails', cat: 'trends', rt: 6, title: { en: 'Cold Smoking Is Having a Moment: Cheese, Salmon, and Cocktails', it: 'L\'Affumicatura a Freddo è di Tendenza: Formaggi, Salmone e Cocktail', es: 'El Ahumado en Frío Está de Moda: Quesos, Salmón y Cócteles' }, links: ['tutorials.wood', 'tutorials.fire'] },
  { slug: 'bbq-social-media-instagram-effect', cat: 'trends', rt: 5, title: { en: 'The Instagram Effect: How Social Media Changed BBQ Culture', it: 'L\'Effetto Instagram: Come i Social Hanno Cambiato la Cultura BBQ', es: 'El Efecto Instagram: Cómo las Redes Sociales Cambiaron la Cultura BBQ' }, links: ['recipes.tomahawk', 'recipes.burnt_ends'] },
  { slug: 'electric-smokers-comeback-2026', cat: 'trends', rt: 6, title: { en: 'Are Electric Smokers Making a Comeback in 2026?', it: 'Gli Affumicatori Elettrici Stanno Tornando nel 2026?', es: '¿Los Ahumadores Eléctricos Están Regresando en 2026?' }, links: ['tutorials.charcoal_vs', 'tutorials.first_smoker'] },
  { slug: 'american-bbq-goes-global-regional-styles', cat: 'trends', rt: 9, title: { en: 'American BBQ Goes Global: How Regional Styles Are Spreading', it: 'Il BBQ Americano Va Globale: Come gli Stili Regionali Si Diffondono', es: 'El BBQ Americano Se Globaliza: Cómo los Estilos Regionales Se Expanden' }, links: ['recipes.brisket', 'recipes.pulled_pork'] },
  { slug: 'next-generation-charcoal-better-fuel', cat: 'trends', rt: 5, title: { en: 'Next-Gen Charcoal: Is Better Fuel Finally Here?', it: 'Carbone di Nuova Generazione: Il Combustibile Migliore è Finalmente Qui?', es: 'Carbón de Nueva Generación: ¿Finalmente Llegó un Mejor Combustible?' }, links: ['reviews.jealous_devil', 'reviews.fogo'] },
  // CULTURE (12)
  { slug: 'history-of-texas-bbq-from-cotton-gins-to-craft', cat: 'culture', rt: 10, title: { en: 'The History of Texas BBQ: From Cotton Gins to Craft Brisket', it: 'La Storia del BBQ Texano: Dai Cotton Gin al Brisket Artigianale', es: 'La Historia del BBQ Texano: De las Desmotadoras al Brisket Artesanal' }, links: ['recipes.brisket', 'recipes.burnt_ends'] },
  { slug: 'kansas-city-vs-carolina-vs-texas-bbq-styles', cat: 'culture', rt: 8, title: { en: 'Kansas City vs Carolina vs Texas: BBQ Style Breakdown', it: 'Kansas City vs Carolina vs Texas: Le Differenze tra gli Stili BBQ', es: 'Kansas City vs Carolina vs Texas: Desglose de Estilos BBQ' }, links: ['recipes.pulled_pork', 'recipes.ribs'] },
  { slug: 'argentinian-asado-more-than-just-grilling', cat: 'culture', rt: 7, title: { en: 'Argentinian Asado: More Than Just Grilling Meat', it: 'L\'Asado Argentino: Molto Più di una Semplice Grigliata', es: 'El Asado Argentino: Mucho Más Que Solo Asar Carne' }, links: ['recipes.chimichurri', 'tutorials.fire'] },
  { slug: 'why-bbq-brings-people-together', cat: 'culture', rt: 6, title: { en: 'Why BBQ Brings People Together Like Nothing Else', it: 'Perché il BBQ Unisce le Persone Come Nient\'Altro', es: 'Por Qué el BBQ Une a las Personas Como Nada Más' }, links: ['recipes.mac_cheese', 'recipes.ribs'] },
  { slug: 'the-pitmaster-mindset-patience-fire-obsession', cat: 'culture', rt: 7, title: { en: 'The Pitmaster Mindset: Patience, Fire, and Obsession', it: 'La Mentalità del Pitmaster: Pazienza, Fuoco e Ossessione', es: 'La Mentalidad del Pitmaster: Paciencia, Fuego y Obsesión' }, links: ['tutorials.fire', 'recipes.brisket'] },
  { slug: 'korean-bbq-at-home-tabletop-grilling-guide', cat: 'culture', rt: 8, title: { en: 'Korean BBQ at Home: The Complete Tabletop Grilling Guide', it: 'BBQ Coreano a Casa: La Guida Completa alla Griglia da Tavolo', es: 'BBQ Coreano en Casa: La Guía Completa de Parrilla de Mesa' }, links: ['recipes.wings', 'tutorials.temp_control'] },
  { slug: 'women-in-bbq-breaking-the-stereotype', cat: 'culture', rt: 6, title: { en: 'Women in BBQ: Breaking the Pitmaster Stereotype', it: 'Donne nel BBQ: Rompere lo Stereotipo del Pitmaster', es: 'Mujeres en el BBQ: Rompiendo el Estereotipo del Pitmaster' }, links: ['recipes.ribs', 'recipes.pulled_pork'] },
  { slug: 'bbq-and-beer-pairing-guide-for-every-style', cat: 'culture', rt: 7, title: { en: 'BBQ and Beer Pairing Guide for Every Style of Meat', it: 'Guida all\'Abbinamento BBQ e Birra per Ogni Tipo di Carne', es: 'Guía de Maridaje BBQ y Cerveza para Cada Estilo de Carne' }, links: ['recipes.brisket', 'recipes.wings'] },
  { slug: 'south-african-braai-the-original-bbq', cat: 'culture', rt: 7, title: { en: 'South African Braai: The Original BBQ You\'ve Never Tried', it: 'Il Braai Sudafricano: Il BBQ Originale Che Non Hai Mai Provato', es: 'El Braai Sudafricano: El BBQ Original Que Nunca Has Probado' }, links: ['tutorials.fire', 'tutorials.wood'] },
  { slug: 'bbq-in-winter-why-real-pitmasters-dont-stop', cat: 'culture', rt: 5, title: { en: 'BBQ in Winter: Why Real Pitmasters Don\'t Stop When It\'s Cold', it: 'BBQ in Inverno: Perché i Veri Pitmaster Non Si Fermano al Freddo', es: 'BBQ en Invierno: Por Qué los Verdaderos Pitmasters No Paran con el Frío' }, links: ['tutorials.temp_control', 'reviews.kamado'] },
  { slug: 'evolution-of-bbq-sauces-around-the-world', cat: 'culture', rt: 8, title: { en: 'The Evolution of BBQ Sauces Around the World', it: 'L\'Evoluzione delle Salse BBQ nel Mondo', es: 'La Evolución de las Salsas BBQ en el Mundo' }, links: ['tutorials.rubs', 'recipes.ribs'] },
  { slug: 'bbq-road-trip-best-joints-in-america', cat: 'culture', rt: 9, title: { en: 'The Ultimate BBQ Road Trip: Best Joints Across America', it: 'Il Viaggio BBQ Definitivo: I Migliori Locali d\'America', es: 'El Viaje BBQ Definitivo: Los Mejores Locales de América' }, links: ['recipes.brisket', 'recipes.pulled_pork'] },
  // NEWS (12)
  { slug: 'weber-announces-new-summit-series-2026', cat: 'news', rt: 4, title: { en: 'Weber Announces New Summit Series for 2026', it: 'Weber Annuncia la Nuova Serie Summit per il 2026', es: 'Weber Anuncia la Nueva Serie Summit para 2026' }, links: ['reviews.weber_summit', 'reviews.napoleon'] },
  { slug: 'traeger-firmware-update-changes-everything', cat: 'news', rt: 5, title: { en: 'Traeger\'s Latest Firmware Update Changes the Game', it: 'L\'Ultimo Aggiornamento Firmware di Traeger Cambia le Regole', es: 'La Última Actualización de Firmware de Traeger Cambia el Juego' }, links: ['reviews.traeger', 'tutorials.charcoal_vs'] },
  { slug: 'kamado-joe-vs-big-green-egg-2026-comparison', cat: 'news', rt: 7, title: { en: 'Kamado Joe vs Big Green Egg: 2026 Comparison Update', it: 'Kamado Joe vs Big Green Egg: Confronto Aggiornato 2026', es: 'Kamado Joe vs Big Green Egg: Comparación Actualizada 2026' }, links: ['reviews.kamado', 'tutorials.charcoal_vs'] },
  { slug: 'new-thermoworks-products-spring-2026', cat: 'news', rt: 4, title: { en: 'ThermoWorks Spring 2026: What\'s New in Temperature Tech', it: 'ThermoWorks Primavera 2026: Novità nella Tecnologia delle Temperature', es: 'ThermoWorks Primavera 2026: Novedades en Tecnología de Temperatura' }, links: ['reviews.thermapen', 'reviews.meater'] },
  { slug: 'grilling-safety-recall-alert-spring-2026', cat: 'news', rt: 3, title: { en: 'Grilling Safety: Spring 2026 Recall Alert Roundup', it: 'Sicurezza Barbecue: Richiami Primavera 2026', es: 'Seguridad en la Parrilla: Alertas de Retiro Primavera 2026' }, links: ['tutorials.first_smoker', 'reviews.napoleon'] },
  { slug: 'charcoal-prices-rising-what-to-buy-now', cat: 'news', rt: 5, title: { en: 'Charcoal Prices Are Rising: What to Stock Up On Now', it: 'I Prezzi del Carbone Stanno Salendo: Cosa Comprare Ora', es: 'Los Precios del Carbón Están Subiendo: Qué Comprar Ahora' }, links: ['reviews.jealous_devil', 'reviews.fogo'] },
  { slug: 'bbq-expo-2026-highlights-and-new-products', cat: 'news', rt: 6, title: { en: 'BBQ Expo 2026: Highlights and New Products We Tested', it: 'BBQ Expo 2026: Novità e Prodotti Che Abbiamo Testato', es: 'BBQ Expo 2026: Lo Mejor y los Nuevos Productos Que Probamos' }, links: ['reviews.grillgrate', 'reviews.kamado'] },
  { slug: 'oklahoma-joes-new-offset-smoker-lineup', cat: 'news', rt: 5, title: { en: 'Oklahoma Joe\'s Revamps Its Offset Smoker Lineup', it: 'Oklahoma Joe\'s Rinnova la Sua Linea di Affumicatori Offset', es: 'Oklahoma Joe\'s Renueva Su Línea de Ahumadores Offset' }, links: ['reviews.oklahoma', 'tutorials.fire'] },
  { slug: 'usda-updates-meat-temperature-guidelines', cat: 'news', rt: 4, title: { en: 'USDA Updates Meat Temperature Guidelines: What Changed', it: 'L\'USDA Aggiorna le Linee Guida sulle Temperature: Cosa è Cambiato', es: 'La USDA Actualiza las Pautas de Temperatura de la Carne' }, links: ['reviews.thermapen', 'reviews.meater'] },
  { slug: 'amazon-prime-day-2026-best-bbq-deals', cat: 'news', rt: 5, title: { en: 'Amazon Prime Day 2026: The Best BBQ Deals Worth Grabbing', it: 'Amazon Prime Day 2026: Le Migliori Offerte BBQ da Non Perdere', es: 'Amazon Prime Day 2026: Las Mejores Ofertas BBQ Que Vale la Pena' }, links: ['reviews.thermapen', 'reviews.grillgrate'] },
  { slug: 'napoleon-grills-new-phantom-series-first-look', cat: 'news', rt: 5, title: { en: 'Napoleon Grills New Phantom Series: First Look', it: 'Napoleon Nuova Serie Phantom: Primo Sguardo', es: 'Napoleon Nueva Serie Phantom: Primera Mirada' }, links: ['reviews.napoleon', 'reviews.weber_summit'] },
  { slug: 'meater-3-release-date-features-preview', cat: 'news', rt: 4, title: { en: 'MEATER 3 Release Date and Features: Everything We Know', it: 'MEATER 3 Data di Uscita e Caratteristiche: Tutto Quello Che Sappiamo', es: 'MEATER 3 Fecha de Lanzamiento y Características: Todo Lo Que Sabemos' }, links: ['reviews.meater', 'reviews.thermapen'] },
  // EVENTS (12)
  { slug: 'best-bbq-festivals-spring-2026', cat: 'events', rt: 7, title: { en: 'The Best BBQ Festivals to Attend This Spring 2026', it: 'I Migliori Festival BBQ di Questa Primavera 2026', es: 'Los Mejores Festivales BBQ de Esta Primavera 2026' }, links: ['recipes.ribs', 'recipes.brisket'] },
  { slug: 'memphis-in-may-2026-preview', cat: 'events', rt: 6, title: { en: 'Memphis in May 2026: What to Expect at the World\'s Biggest BBQ Contest', it: 'Memphis in May 2026: Cosa Aspettarsi dal Più Grande Concorso BBQ del Mondo', es: 'Memphis in May 2026: Qué Esperar del Mayor Concurso BBQ del Mundo' }, links: ['recipes.pulled_pork', 'recipes.ribs'] },
  { slug: 'how-to-host-the-perfect-backyard-bbq-party', cat: 'events', rt: 8, title: { en: 'How to Host the Perfect Backyard BBQ Party', it: 'Come Organizzare la Festa BBQ Perfetta in Giardino', es: 'Cómo Organizar la Fiesta BBQ Perfecta en el Jardín' }, links: ['recipes.wings', 'recipes.mac_cheese'] },
  { slug: 'bbq-tailgating-setup-guide-game-day', cat: 'events', rt: 6, title: { en: 'BBQ Tailgating Setup Guide for Game Day', it: 'Guida alla Preparazione BBQ da Stadio per il Game Day', es: 'Guía de Preparación BBQ para el Día del Partido' }, links: ['recipes.wings', 'tutorials.first_smoker'] },
  { slug: 'international-bbq-championships-2026-schedule', cat: 'events', rt: 5, title: { en: 'International BBQ Championships 2026: Full Schedule', it: 'Campionati Internazionali BBQ 2026: Programma Completo', es: 'Campeonatos Internacionales BBQ 2026: Programa Completo' }, links: ['recipes.brisket', 'recipes.ribs'] },
  { slug: 'fourth-of-july-bbq-menu-planning-guide', cat: 'events', rt: 7, title: { en: 'Fourth of July BBQ: Complete Menu Planning Guide', it: 'BBQ del 4 Luglio: Guida Completa alla Pianificazione del Menu', es: 'BBQ del 4 de Julio: Guía Completa de Planificación del Menú' }, links: ['recipes.ribs', 'recipes.mac_cheese'] },
  { slug: 'fathers-day-bbq-gift-guide-2026', cat: 'events', rt: 6, title: { en: 'Father\'s Day BBQ Gift Guide 2026: What He Actually Wants', it: 'Guida Regali BBQ per la Festa del Papà 2026', es: 'Guía de Regalos BBQ para el Día del Padre 2026' }, links: ['reviews.thermapen', 'reviews.grillgrate'] },
  { slug: 'labor-day-cookout-ultimate-planning-checklist', cat: 'events', rt: 6, title: { en: 'Labor Day Cookout: The Ultimate Planning Checklist', it: 'Grigliata di Fine Estate: La Checklist Definitiva', es: 'Parrillada de Fin de Verano: La Lista de Verificación Definitiva' }, links: ['recipes.brisket', 'recipes.wings'] },
  { slug: 'how-to-set-up-a-bbq-competition-team', cat: 'events', rt: 8, title: { en: 'How to Set Up a BBQ Competition Team: A Practical Guide', it: 'Come Creare un Team da Competizione BBQ: Guida Pratica', es: 'Cómo Crear un Equipo de Competición BBQ: Guía Práctica' }, links: ['recipes.pulled_pork', 'tutorials.rubs'] },
  { slug: 'thanksgiving-smoked-turkey-event-planning', cat: 'events', rt: 7, title: { en: 'Smoked Turkey for Thanksgiving: Event Planning Guide', it: 'Tacchino Affumicato per il Ringraziamento: Guida all\'Evento', es: 'Pavo Ahumado para Acción de Gracias: Guía de Planificación' }, links: ['tutorials.wood', 'reviews.traeger'] },
  { slug: 'new-years-bbq-traditions-around-the-world', cat: 'events', rt: 6, title: { en: 'New Year\'s BBQ Traditions Around the World', it: 'Tradizioni BBQ di Capodanno nel Mondo', es: 'Tradiciones BBQ de Año Nuevo en el Mundo' }, links: ['recipes.chimichurri', 'tutorials.fire'] },
  { slug: 'super-bowl-bbq-party-menu-for-20-people', cat: 'events', rt: 7, title: { en: 'Super Bowl BBQ Party Menu for 20 People', it: 'Menu BBQ per 20 Persone: Party del Super Bowl', es: 'Menú BBQ para 20 Personas: Fiesta del Super Bowl' }, links: ['recipes.wings', 'recipes.mac_cheese'] },
];

// Genera contenuto per i template (articoli sintetici con linking interno)
function generateContent(t, locale) {
  const linkTexts = {
    en: ['Check out our full review', 'Try our recipe', 'Read our guide', 'See our detailed analysis', 'Learn more in our tutorial'],
    it: ['Leggi la nostra recensione completa', 'Prova la nostra ricetta', 'Leggi la nostra guida', 'Vedi la nostra analisi dettagliata', 'Scopri di più nel nostro tutorial'],
    es: ['Lee nuestra reseña completa', 'Prueba nuestra receta', 'Lee nuestra guía', 'Ve nuestro análisis detallado', 'Aprende más en nuestro tutorial'],
  };

  const intros = {
    en: [
      `If you\'ve been following the BBQ scene lately, you know that ${t.title.en.toLowerCase()} is a topic worth diving into. Let\'s break it down.`,
      `We get asked about this all the time. Here\'s everything you need to know.`,
      `This is one of those topics where misinformation runs wild. Let\'s set the record straight.`,
    ],
    it: [
      `Se hai seguito il mondo BBQ ultimamente, sai che questo è un argomento che vale la pena approfondire. Analizziamolo.`,
      `Ci chiedono sempre di questo. Ecco tutto quello che devi sapere.`,
      `Questo è uno di quegli argomenti dove la disinformazione dilaga. Mettiamo le cose in chiaro.`,
    ],
    es: [
      `Si has estado siguiendo la escena BBQ últimamente, sabes que este es un tema que vale la pena explorar. Vamos a desglosarlo.`,
      `Nos preguntan sobre esto todo el tiempo. Aquí está todo lo que necesitas saber.`,
      `Este es uno de esos temas donde la desinformación corre salvaje. Pongamos las cosas en claro.`,
    ],
  };

  const randomIntro = intros[locale][Math.floor(Math.random() * intros[locale].length)];
  const linkList = t.links.map((l, i) => {
    const text = linkTexts[locale][i % linkTexts[locale].length];
    return `[${text}](${link(l, locale)})`;
  }).join('\n\n');

  const sections = {
    en: ['## What You Need to Know', '## The Details', '## Our Take', '## Related Content'],
    it: ['## Cosa Devi Sapere', '## I Dettagli', '## La Nostra Opinione', '## Contenuti Correlati'],
    es: ['## Lo Que Necesitas Saber', '## Los Detalles', '## Nuestra Opinión', '## Contenido Relacionado'],
  };

  return `${randomIntro}\n\n${sections[locale][0]}\n\nThe BBQ world moves fast, and staying informed is half the battle. Whether you're a weekend warrior or a dedicated pitmaster, understanding the nuances makes the difference between good and great.\n\n${sections[locale][1]}\n\nWe've spent considerable time researching, testing, and forming opinions on this topic. Our approach is always the same: hands-on testing, honest opinions, zero sponsors. That's the BBQ Experience way.\n\nEvery detail matters when you're working with fire. Temperature control, fuel selection, timing — they all contribute to the final result. And we've learned that the hard way, through hundreds of cooks and countless mistakes.\n\n${sections[locale][2]}\n\nAt the end of the day, BBQ is about enjoying the process as much as the result. Don't overthink it. Start with good fundamentals, practice consistently, and never stop learning.\n\nThe 74,000+ members of our Instagram community (@bbqexperience) agree: there's always something new to discover in the world of outdoor cooking.\n\n${sections[locale][3]}\n\n${linkList}`;
}

// Aggiungi i template generati agli articoli
for (const t of templates) {
  articles.push({
    slug: t.slug,
    category: t.cat,
    reading_time: t.rt,
    en: {
      title: t.title.en,
      excerpt: `Our take on ${t.title.en.toLowerCase()}. Honest insights from the BBQ Experience team.`,
      seo_title: `${t.title.en} | BBQ Experience`,
      seo_description: `${t.title.en}. Independent analysis and honest opinions from BBQ Experience.`,
      content: generateContent(t, 'en'),
    },
    it: {
      title: t.title.it,
      excerpt: `La nostra opinione su ${t.title.it.toLowerCase()}. Approfondimenti onesti dal team BBQ Experience.`,
      seo_title: `${t.title.it} | BBQ Experience`,
      seo_description: `${t.title.it}. Analisi indipendente e opinioni oneste da BBQ Experience.`,
      content: generateContent(t, 'it'),
    },
    es: {
      title: t.title.es,
      excerpt: `Nuestra opinión sobre ${t.title.es.toLowerCase()}. Perspectivas honestas del equipo BBQ Experience.`,
      seo_title: `${t.title.es} | BBQ Experience`,
      seo_description: `${t.title.es}. Análisis independiente y opiniones honestas de BBQ Experience.`,
      content: generateContent(t, 'es'),
    },
  });
}

// Scheduling: 2 al giorno dal 5 Aprile 2026
function getPublishDate(index) {
  const baseDate = new Date('2026-04-05T08:00:00Z');
  const dayOffset = Math.floor(index / 2);
  const hourOffset = (index % 2) * 6; // 08:00 e 14:00
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
}

async function createArticle(article, index) {
  const publishDate = getPublishDate(index);

  for (const locale of ['en', 'it', 'es']) {
    const data = article[locale];
    const payload = {
      data: {
        title: data.title,
        slug: article.slug,
        excerpt: data.excerpt,
        content: data.content,
        category: article.category,
        reading_time: article.reading_time,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        published_date: publishDate,
      },
    };

    const endpoint = locale === 'en'
      ? `${STRAPI_URL}/api/blog-posts`
      : `${STRAPI_URL}/api/blog-posts`;

    if (locale === 'en') {
      // Crea in EN
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, data: { ...payload.data, locale: 'en' } }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`  ERRORE [${locale}] ${article.slug}: ${res.status} ${err.substring(0, 100)}`);
      }
    } else {
      // Per IT/ES: trova il documentId EN e crea la localizzazione
      const findRes = await fetch(`${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${article.slug}&locale=en`, { headers });
      const findData = await findRes.json();
      const docId = findData?.data?.[0]?.documentId;

      if (docId) {
        const locRes = await fetch(`${STRAPI_URL}/api/blog-posts/${docId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...payload, data: { ...payload.data, locale } }),
        });
        if (!locRes.ok) {
          const err = await locRes.text();
          console.error(`  ERRORE [${locale}] ${article.slug}: ${locRes.status} ${err.substring(0, 100)}`);
        }
      }
    }
  }

  console.log(`[${index + 1}/60] ${article.slug} — ${publishDate.split('T')[0]}`);
}

async function main() {
  console.log(`Creazione ${articles.length} articoli blog in 3 lingue...`);
  console.log(`Scheduling: 2/giorno dal 2026-04-05 al 2026-05-04\n`);

  for (let i = 0; i < articles.length; i++) {
    await createArticle(articles[i], i);
  }

  console.log(`\nCompletato! ${articles.length} articoli creati in EN/IT/ES.`);
}

main().catch(err => {
  console.error('ERRORE FATALE:', err);
  process.exit(1);
});
