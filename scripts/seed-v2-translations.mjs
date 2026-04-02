/**
 * Traduzione dei 16 nuovi contenuti BBQ Experience da EN → IT e ES.
 * Voce: The Pitmaster — diretto, duro, esperto. Nessun ammorbidimento.
 *
 * Uso: node scripts/seed-v2-translations.mjs
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN =
  "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";

// --- Utility ---

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiPut(contentType, documentId, locale, data, attempt = 1) {
  const url = `${API_URL}/${contentType}/${documentId}?locale=${locale}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ data: { ...data, locale } }),
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
      await delay(4000);
      return apiPut(contentType, documentId, locale, data, attempt + 1);
    }
    console.error(`❌ TIMEOUT ${url}:`, e.message);
    return null;
  }
}

function log(ok, contentType, slug, locale) {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${contentType}] [${locale.toUpperCase()}] ${slug}`);
}

// ============================================================
// REVIEWS — 4 nuove
// ============================================================

const reviewTranslations = {
  // Oklahoma Joe's Highland Offset Smoker Review
  rheckkex7a3sjnvj8uu0kd7n: {
    it: {
      title:
        "Recensione Oklahoma Joe's Highland Offset Smoker — L'Offset Entry-Level Che Ti Insegna Facendoti Soffrire",
      slug: "oklahoma-joes-highland-offset-smoker-recensione",
      excerpt:
        "Perde fumo da ogni giuntura, le oscillazioni di temperatura metteranno alla prova la tua pazienza e i registri di fabbrica sono uno scherzo. Ma a 300$, è ancora il modo migliore per imparare il vero affumicatura offset — se sei disposto a fare il lavoro.",
      verdict:
        "Una lezione da 300$ nella gestione del fuoco che perde fumo, brucia legna a velocità industriale e richiede modifiche obbligatorie — ma premia la pazienza con un barbecue stick-burner genuinamente eccellente. Il miglior offset entry-level se sei disposto a guadagnartelo.",
      pros: [
        "Grande camera di cottura da 619 sq in — ci entrano due brisket interi o quattro spalle di maiale",
        "Il firebox ha le dimensioni giuste per tronchi veri da 40 cm",
        "Produce il sapore autentico dello stick-burner che i pellet e i kamado non possono replicare",
        "A 300$, è il punto d'ingresso più accessibile all'affumicatura offset vera",
        "Insegna i fondamentali della gestione del fuoco che ti rendono un pitmaster migliore in assoluto",
      ],
      cons: [
        "Perde fumo da ogni giuntura — le guarnizioni per le porte sono modifiche aftermarket obbligatorie",
        "Gradiente di temperatura di 40°C nella camera di cottura senza piastre di regolazione",
        "Il termometro di fabbrica sbaglia di 15-28°C ed è essenzialmente decorativo",
        "La costruzione in acciaio sottile brucia il 30-40% di legna in più rispetto agli offset premium",
        "Ruggine superficiale nel primo anno, specialmente sull'esterno del firebox",
        "Richiede attenzione costante — non puoi lasciare questo affumicatore incustodito per più di 45-60 minuti",
      ],
      editorial_content: `<h2>L'Affumicatore Che Forma il Carattere</h2>

<p>Vent'anni fa ho imparato ad affumicare la carne su un offset economico che probabilmente era peggio di questo. Nessuna guarnizione, acciaio sottile, una porta del firebox che non si chiudeva bene e un camino montato nel posto completamente sbagliato. Ho rovinato molta carne su quell'affumicatore. Ho anche imparato più sulla gestione del fuoco, la dinamica del flusso d'aria e la pazienza di quanto avrei potuto imparare con qualsiasi attrezzatura costosa. L'Oklahoma Joe's Highland è la versione moderna di quell'esperienza.</p>

<p>Voglio essere molto chiaro su una cosa: questo non è un buon affumicatore nel senso in cui un Yoder Wichita è un buon affumicatore, o anche nel senso in cui un Weber Smokey Mountain è un buon affumicatore. L'Highland è un offset da 300$ costruito secondo uno standard da 300$. Ogni compromesso che fa è una lezione, e questo è o la sua caratteristica più grande o il suo difetto più fatale, a seconda del tuo temperamento.</p>

<h2>Appena Aperto la Scatola: Preparati alla Delusione</h2>

<p>Il montaggio richiede circa due ore se hai già costruito cose, tre o più se non hai esperienza. Le istruzioni sono adeguate ma non eccellenti. Quando hai finito, ti fermi, guardi il tuo nuovo affumicatore e pensi che sembri fantastico — acciaio nero pesante, la classica forma offset, una grande camera di cottura con un serio firebox sul lato. Sembra quello che dovrebbe essere l'affumicatura.</p>

<p>Poi accendi il primo fuoco, e la realtà si fa sentire.</p>

<p>Il fumo esce da ogni giuntura. La porta della camera di cottura non sigilla — puoi vedere la luce del giorno intorno ai bordi. La porta del firebox ha uno spazio che fischia quando il vento la colpisce nel verso giusto. I registri sono dischetti di metallo stampato che scorrono liberamente nelle loro guide senza nessun arresto o clic per mantenere una posizione. Entro cinque minuti dal primo fuoco, capirai perché i pitmaster esperti parlano di "modificare" gli offset.</p>

<h2>Le Modifiche Obbligatorie (Non Opzionali)</h2>

<p>Non sto parlando di aggiornamenti opzionali che migliorano le prestazioni. Sto parlando di modifiche che devi fare prima di cucinare sul serio su questo affumicatore:</p>

<p><strong>Guarnizioni per le porte:</strong> Il kit di guarnizioni Rutland o Gasket Guy da 20-30$ è la prima cosa da acquistare. L'Highland perde dal 40-60% del calore e del fumo attraverso le porte non sigillate. Le guarnizioni sigillano questo. La differenza nel mantenimento della temperatura è immediata e drammatica.</p>

<p><strong>Piastre di regolazione del calore:</strong> Il gradiente di temperatura di 40°C da un'estremità all'altra della camera di cottura è insostenibile per cuochi lunghi. Le piastre del Smoker Services o le baffles fai-da-te in acciaio inox costano 40-80$ e riducono questo gradiente a 8-12°C — ancora non perfetto, ma funzionale.</p>

<p><strong>Termometro:</strong> Butta via quello di fabbrica il giorno in cui arriva. È off di 15-28°C e non esiste una situazione in cui dovresti affidarti ad esso. Due termometri da griglia TelTru o un sistema wireless a due sonde ti costano 30-60$ e rendono l'affumicatore effettivamente utilizzabile.</p>

<p>Metti insieme queste modifiche e hai speso 100-170$ sopra il prezzo di acquisto da 300$. Sei a 400-470$ per un affumicatore che funziona in modo affidabile — il che porta a una domanda ovvia: perché non comprare qualcosa di meglio costruito dall'inizio?</p>

<h2>Il Caso Contro di Esso</h2>

<p>Al prezzo modificato di ~450$, sei a portata di tiro di un Weber Smokey Mountain da 18 pollici (~480$) che è costruito meglio, mantiene la temperatura con più affidabilità e non richiede alcuna modifica obbligatoria. Se il tuo obiettivo è cucinare buona carne con il minimo attrito, il WSM batte l'Highland modificato ad ogni livello di confronto.</p>

<p>Stai anche a portata di tiro di un Pit Barrel Cooker originale (~350$), che produce risultati straordinariamente buoni per cuochi di media lunghezza senza quasi nessuno sforzo di gestione della temperatura.</p>

<h2>Il Caso Per di Esso</h2>

<p>Eccola: il sapore. Il vero affumicatura stick-burner — carburante di tronchi di legno puro, senza bricchette, senza pellet — produce un profilo di sapore che non si può replicare con nessun altro metodo. L'anello di fumo rosa, il sapore pulito del legno nella corteccia, la leggerezza e la complessità del fumo rispetto all'affumicatura elettrica o a pellet — queste cose richiedono un affumicatore offset alimentato a legna per essere eseguite correttamente.</p>

<p>Il Weber Smokey Mountain è eccellente, ma non produce barbecue stick-burner perché usa bricchette. Il Pit Barrel Cooker è impressionante ma ha lo stesso problema. Se vuoi imparare ad affumicare con la legna vera, l'Highland è il punto d'ingresso più conveniente che esista.</p>

<h2>Valutazione Finale</h2>

<p>Compra l'Highland se: stai imparando l'affumicatura offset, sei disposto a spendere 100-170$ in modifiche obbligatorie, vuoi il sapore stick-burner senza un investimento da 800-1.500$ e sei pronto ad attende il fuoco ogni 45-60 minuti durante le lunghe cotture.</p>

<p>Non comprare l'Highland se: vuoi un risultato affidabile con il minimo sforzo, non vuoi modificarlo, il tuo budget totale è ~300$ (spendi i soldi su un WSM invece) o non hai la pazienza per un affumicatore che ti combatte ogni singolo cuoco.</p>`,
    },
    es: {
      title:
        "Reseña Oklahoma Joe's Highland Offset Smoker — El Offset de Entrada Que te Enseña Haciéndote Sufrir",
      slug: "oklahoma-joes-highland-offset-smoker-resena",
      excerpt:
        "Pierde humo por cada junta, las oscilaciones de temperatura pondrán a prueba tu paciencia y los registros de fábrica son una broma. Pero a 300$, sigue siendo la mejor manera de aprender el ahumado offset real — si estás dispuesto a poner el trabajo.",
      verdict:
        "Una lección de 300$ en manejo del fuego que pierde humo, quema leña a velocidad industrial y requiere modificaciones obligatorias — pero recompensa la paciencia con barbacoa stick-burner genuinamente excelente. El mejor offset de entrada si estás dispuesto a ganártelo.",
      pros: [
        "Gran cámara de cocción de 619 sq in — caben dos briskets completos o cuatro paletas de cerdo",
        "El fogón tiene el tamaño correcto para leños reales de 40 cm",
        "Produce el sabor auténtico del stick-burner que las parrillas de pellets y kamados no pueden igualar",
        "A 300$, es el punto de entrada más accesible al ahumado offset de verdad",
        "Enseña los fundamentos del manejo del fuego que te hacen mejor pitmaster en general",
      ],
      cons: [
        "Pierde humo por cada junta — los sellos de puertas son modificaciones aftermarket obligatorias",
        "Gradiente de temperatura de 40°C en la cámara de cocción sin placas de ajuste",
        "El termómetro de fábrica se desvía 15-28°C y es esencialmente decorativo",
        "La construcción en acero delgado quema un 30-40% más de leña que los offsets premium",
        "Óxido superficial en el primer año, especialmente en el exterior del fogón",
        "Requiere atención constante — no puedes dejar este ahumador sin vigilancia más de 45-60 minutos",
      ],
      editorial_content: `<h2>El Ahumador Que Forma el Carácter</h2>

<p>Hace veinte años aprendí a ahumar carne en un offset barato que probablemente era peor que este. Sin sellos, acero delgado, una puerta del fogón que no cerraba bien y una chimenea montada en el lugar completamente equivocado. Arruiné mucha carne en ese ahumador. También aprendí más sobre manejo del fuego, dinámica del flujo de aire y paciencia de lo que habría podido aprender con cualquier cantidad de equipo caro. El Oklahoma Joe's Highland es la versión moderna de esa experiencia.</p>

<p>Quiero ser muy claro sobre algo: esto no es un buen ahumador en el sentido en que un Yoder Wichita es un buen ahumador, o incluso en el sentido en que un Weber Smokey Mountain es un buen ahumador. El Highland es un offset de 300$ construido según un estándar de 300$. Cada compromiso que hace es una lección, y eso es su mayor característica o su defecto más fatal, dependiendo de tu temperamento.</p>

<h2>Al Sacarlo de la Caja: Prepárate para la Decepción</h2>

<p>El montaje toma unas dos horas si ya has construido cosas antes, tres o más si no. Las instrucciones son adecuadas pero no excelentes. Cuando terminas, te quedas mirando tu nuevo ahumador y piensas que se ve genial — acero negro pesado, la forma clásica offset, una gran cámara de cocción con un serio fogón colgando del lado. Se parece a lo que se supone que debe ser el ahumado.</p>

<p>Luego enciendes tu primer fuego, y la realidad se hace presente.</p>

<p>El humo sale por cada junta. La puerta de la cámara de cocción no sella — puedes ver la luz del día alrededor de los bordes. La puerta del fogón tiene una abertura que silba cuando el viento la golpea bien. Los registros son discos de metal troquelado que se deslizan libremente en sus guías sin ningún tope o clic para mantener una posición. En cinco minutos desde tu primer fuego, entenderás por qué los pitmasters experimentados hablan de "modificar" los offsets.</p>

<h2>Las Modificaciones Obligatorias (No Opcionales)</h2>

<p>No estoy hablando de mejoras opcionales que mejoran el rendimiento. Estoy hablando de modificaciones que debes hacer antes de cocinar en serio en este ahumador.</p>

<p>Los sellos de puertas Rutland o Gasket Guy de 20-30$ son lo primero que compras. El Highland pierde un 40-60% del calor y el humo a través de las puertas sin sellar. Los sellos arreglan esto. La diferencia en el mantenimiento de temperatura es inmediata y dramática.</p>

<p>Las placas deflectoras de calor cuestan 40-80$ y reducen el gradiente de temperatura de 40°C a 8-12°C — todavía no perfecto, pero funcional.</p>

<p>Tira el termómetro de fábrica el día que llega. Se desvía 15-28°C y no existe situación en la que debas confiar en él. Dos termómetros de rejilla TelTru o un sistema inalámbrico de dos sondas te cuesta 30-60$ y hace el ahumador realmente utilizable.</p>

<h2>El Veredicto Final</h2>

<p>Compra el Highland si: estás aprendiendo el ahumado offset, estás dispuesto a gastar 100-170$ en modificaciones obligatorias, quieres el sabor stick-burner sin una inversión de 800-1.500$ y estás listo para atender el fuego cada 45-60 minutos durante las cocciones largas.</p>

<p>No compres el Highland si: quieres resultados confiables con mínimo esfuerzo, no quieres modificarlo, tu presupuesto total es ~300$ (gasta el dinero en un WSM) o no tienes paciencia para un ahumador que te pelea en cada cocción.</p>`,
    },
  },

  // Napoleon Prestige Pro 500 Review
  nv9imyxjclhodt81cn9gv96b: {
    it: {
      title:
        "Recensione Napoleon Prestige Pro 500 — Buon Gas di Fascia Media, Ma Quel Bruciatore a Infrarossi È Sopravvalutato",
      slug: "napoleon-prestige-pro-500-recensione",
      excerpt:
        "Un solido barbecue a gas canadese che supera il Weber Genesis sul valore ma non giustifica il divario di prezzo rispetto a un Weber Spirit. Il bruciatore a infrarossi SIZZLE ZONE è oro di marketing ma bronzo nella pratica.",
      verdict:
        "Un ottimo barbecue a gas di fascia media con un eccellente setup per il girarrosto ma un bruciatore a infrarossi sopravvalutato. Miglior rapporto qualità/prezzo rispetto al Weber Summit, ma il Weber Genesis offre il 90% delle prestazioni a 400-500€ in meno. Il focolare in porcellana è una preoccupazione di risparmio a questo prezzo.",
      pros: [
        "Eccellenti griglie di cottura in acciaio inox 304 con efficace design a onda",
        "Bruciatore posteriore a infrarossi per girarrosto straordinario — la vera stella di questo barbecue",
        "Il coperchio a doppia parete mantiene l'esterno fresco e trattiene bene il calore",
        "Solida produzione canadese con buona finitura generale",
        "Il sistema di accensione JETFIRE è innovativo quando funziona",
      ],
      cons: [
        "Focolare rivestito in porcellana invece di acciaio inox completo a questo prezzo — si scheggierà nel tempo",
        "Il bruciatore SIZZLE ZONE è troppo piccolo per la scottatura pratica di più bistecche — una alla volta",
        "Il sistema di gestione del grasso è sottodimensionato; il vassoio trabocca nelle cotture intense",
        "Il termometro integrato nel coperchio legge 15-20°C sotto la temperatura reale della griglia",
        "La disponibilità dei pezzi di ricambio è limitata fuori dal Nord America rispetto alla rete globale Weber",
        "L'accensione JETFIRE ha guasti occasionali che richiedono l'accensione manuale",
      ],
      editorial_content: `<h2>Iniziamo da Quello Che Conta Davvero</h2>

<p>Cucino su barbecue a gas da oltre vent'anni. Ho posseduto Weber, Napoleon, Broil King, qualche Lynx che costava più della mia prima auto e un Char-Broil dimenticabile durato esattamente una stagione prima che il focolare arrugginisse. Quindi quando dico che il Napoleon Prestige Pro 500 è un barbecue "buono", capisce che sto valutando secondo una curva molto specifica.</p>

<p>Il Prestige Pro 500 si posiziona a circa 1.600-1.800€ al dettaglio, a seconda del rivenditore e della regione. Questo lo mette direttamente in competizione con il Weber Genesis EX-335 (~1.200€) e al di sotto del Weber Summit 470 (~2.000-2.200€). Il prezzo è importante perché determina le aspettative.</p>

<h2>Cosa Funziona Bene</h2>

<p>Le griglie di cottura in acciaio inox 304 con il design a onda sono legittime. Mantengono il calore meglio delle griglie in ghisa smaltata e producono buone marcature. Sono abbastanza robuste da durare anni con la manutenzione di base.</p>

<p>Il bruciatore posteriore a infrarossi per girarrosto è effettivamente eccellente — molto migliore del bruciatore posteriore di Weber. Produce calore abbastanza intenso da cuocere un pollo intero in modo uniforme in 60-75 minuti con buona doratura. Se cucini spesso al girarrosto, questo conta.</p>

<p>Il coperchio a doppia parete è un vero vantaggio. L'esterno rimane abbastanza fresco da toccare anche a temperature di cottura complete, il che è sia una caratteristica di sicurezza sia un indicatore dell'efficienza di ritenzione del calore.</p>

<h2>Dove la Narrativa di Marketing Si Rompe</h2>

<p>Il bruciatore SIZZLE ZONE infrarossi è il principale argomento di vendita di Napoleon, e nella pratica è una delusione. La zona di cottura di 20x25 cm è abbastanza grande per una bistecca di ribeye. Una. Alla volta. Se stai cucinando per una famiglia o degli ospiti, fa la coda mentre il tuo primo pezzo di carne si raffredda.</p>

<p>Nei test di temperatura, il SIZZLE ZONE raggiunge 370-400°C — impressionante in assoluto, ma non così superiore ai bruciatori principali che raggiungono i 280-320°C a piena potenza. La differenza nella reazione di Maillard è reale ma marginale per la maggior parte dei tagli. I fili di marketing che la descrivono come rivoluzionaria sono esagerati.</p>

<h2>Il Problema del Focolare</h2>

<p>A 1.600-1.800€, il focolare rivestito in porcellana è inspiegabile. Weber usa acciaio inox completo nelle sue unità della Serie Summit a prezzi comparabili. Il rivestimento in porcellana si scheggierà eventualmente — non è una questione di se, ma di quando. Quando si scheggia, l'acciaio sottostante arrugginisce. Questo è un difetto di progettazione di risparmio su un barbecue di lusso.</p>

<h2>Confronto Diretto: Napoleon vs Weber Genesis EX-335</h2>

<p>Il Weber Genesis EX-335 costa ~400-500€ in meno e offre: tre bruciatori principali vs quattro del Napoleon (ma la differenza di dimensioni della superficie di cottura è minima), un focolare in acciaio inox completo invece del rivestimento in porcellana, la stessa connettività Bluetooth/app e una rete di pezzi di ricambio globale vastamente superiore.</p>

<p>Il Napoleon vince sul bruciatore posteriore per girarrosto e sul design del coperchio. Il Weber vince sulla costruzione del focolare, la disponibilità dei ricambi e il rapporto qualità/prezzo complessivo. Per la maggior parte degli acquirenti, il Weber Genesis è la risposta giusta.</p>`,
    },
    es: {
      title:
        "Reseña Napoleon Prestige Pro 500 — Buen Gas de Gama Media, Pero Ese Quemador Infrarrojo Está Sobrevalorado",
      slug: "napoleon-prestige-pro-500-resena",
      excerpt:
        "Una sólida parrilla de gas canadiense que supera al Weber Genesis en valor pero no justifica la diferencia de precio sobre un Weber Spirit. El quemador infrarrojo SIZZLE ZONE es oro en marketing pero bronce en la práctica.",
      verdict:
        "Una parrilla de gas de gama media sólida con un excelente setup para el asador pero un quemador infrarrojo sobrevalorado. Mejor relación calidad-precio que el Weber Summit, pero el Weber Genesis ofrece el 90% del rendimiento a 400-500€ menos. El hogar en porcelana es una preocupación de ahorro de costos a este precio.",
      pros: [
        "Excelentes rejillas de cocción en acero inoxidable 304 con diseño de onda efectivo",
        "Quemador trasero infrarrojo para asador sobresaliente — la verdadera estrella de esta parrilla",
        "La tapa de doble pared mantiene el exterior fresco y retiene bien el calor",
        "Sólida fabricación canadiense con buen acabado general",
        "El sistema de encendido JETFIRE es innovador cuando funciona",
      ],
      cons: [
        "Hogar recubierto de porcelana en lugar de acero inoxidable completo a este precio — se astillará con el tiempo",
        "El quemador SIZZLE ZONE es demasiado pequeño para sellar múltiples bistecs — uno a la vez",
        "El sistema de gestión de grasa está subdimensionado; la bandeja se desborda en cocciones intensas",
        "El termómetro integrado en la tapa lee 15-20°C por debajo de la temperatura real de la parrilla",
        "La disponibilidad de repuestos está limitada fuera de Norteamérica comparada con la red global de Weber",
        "El encendido JETFIRE tiene fallos ocasionales que requieren encendido manual",
      ],
      editorial_content: `<h2>Empecemos Por Lo Que Realmente Importa</h2>

<p>He cocinado en parrillas de gas durante más de veinte años. He tenido Weber, Napoleon, Broil King, un par de unidades Lynx que costaban más que mi primer auto y un Char-Broil olvidable que duró exactamente una temporada antes de que el hogar se oxidara. Así que cuando digo que la Napoleon Prestige Pro 500 es una parrilla "buena", entiende que estoy calificando en una curva muy específica.</p>

<p>La Prestige Pro 500 se vende a aproximadamente 1.600-1.800€ al por menor. Esto la pone directamente en competencia con la Weber Genesis EX-335 (~1.200€) y por debajo de la Weber Summit 470 (~2.000-2.200€). El precio importa porque determina las expectativas.</p>

<h2>Qué Funciona Bien</h2>

<p>Las rejillas de cocción en acero inoxidable 304 con diseño de onda son legítimas. Retienen el calor mejor que las rejillas de hierro fundido esmaltado y producen buenas marcas. Son suficientemente robustas para durar años con mantenimiento básico.</p>

<p>El quemador trasero infrarrojo para asador es efectivamente excelente — mucho mejor que el quemador trasero de Weber. Produce suficiente calor para cocinar un pollo entero de manera uniforme en 60-75 minutos con buen dorado. Si cocinas con asador frecuentemente, esto importa.</p>

<h2>Donde la Narrativa de Marketing Se Rompe</h2>

<p>El quemador infrarrojo SIZZLE ZONE es el principal argumento de venta de Napoleon, y en la práctica es una decepción. La zona de cocción de 20x25 cm es suficientemente grande para un bistec de ribeye. Uno. A la vez. Si estás cocinando para familia o invitados, haz cola mientras tu primera pieza de carne se enfría.</p>

<p>En pruebas de temperatura, el SIZZLE ZONE alcanza 370-400°C — impresionante en términos absolutos, pero no tan superior a los quemadores principales que alcanzan 280-320°C a plena potencia. La diferencia en la reacción de Maillard es real pero marginal para la mayoría de los cortes.</p>

<h2>El Problema del Hogar</h2>

<p>A 1.600-1.800€, el hogar recubierto de porcelana es inexplicable. Weber usa acero inoxidable completo en sus unidades de la Serie Summit a precios comparables. El recubrimiento de porcelana eventualmente se astillará. Cuando se astilla, el acero subyacente se oxida. Este es un defecto de diseño de ahorro de costos en una parrilla de lujo.</p>

<h2>Veredicto Final</h2>

<p>Compra la Napoleon si cocinas frecuentemente con asador y quieres el mejor quemador trasero del mercado. Pasa si tu presupuesto es ajustado — el Weber Genesis EX-335 ofrece el 90% del rendimiento a un precio significativamente menor con mejor construcción del hogar y superior disponibilidad de repuestos.</p>`,
    },
  },

  // Meater Plus Wireless Thermometer Review
  f524awngrsu1vhwe3n4c3ii5: {
    it: {
      title:
        "Recensione Meater Plus Termometro Wireless — Concetto Brillante, Esecuzione Frustrante",
      slug: "meater-plus-termometro-wireless-recensione",
      excerpt:
        "Il sogno di un termometro per carne completamente wireless è reale — quando il Bluetooth non cade, il sensore ambientale non mente e l'app non si blocca. Un 5.8 che volevo disperatamente fosse un 8.",
      verdict:
        "Un termometro wireless brillantemente progettato che viene penalizzato dalla portata Bluetooth reale, dall'accuratezza discutibile della temperatura ambientale e dai problemi di affidabilità dell'app. Usalo per grigliate casuali; affidati a sonde con cavo per tutto ciò che conta. Il concetto merita un 9, l'esecuzione guadagna un 5.8.",
      pros: [
        "Design completamente wireless — nessun cavo da instradare attraverso le ventole dell'affumicatore",
        "L'accuratezza della temperatura interna della carne è solida a ±1-2°C",
        "App ben progettata con utile funzione di cottura guidata e grafico delle temperature",
        "Forma elegante e blocco di ricarica di qualità premium",
        "Il stimatore del tempo di cottura è utile quando le letture ambientali sono accurate",
      ],
      cons: [
        "La portata Bluetooth reale è 9-24 metri — non i 50 metri pubblicizzati — a seconda del materiale dell'affumicatore",
        "Il sensore di temperatura ambientale legge 8-22°C sotto la temperatura reale a livello della griglia",
        "Le stime del tempo di cottura possono sbagliarsi di oltre un'ora a causa dell'inesattezza del sensore ambientale",
        "Crash dell'app hanno causato la perdita dei dati di cottura tre volte in sei mesi",
        "Richiede un dispositivo bridge separato per la connettività WiFi/cloud — aggiungendo complessità che vanifica la promessa di semplicità",
        "Cadute di connessione durante le cotture lunghe creano ansia nel monitoraggio",
      ],
      editorial_content: `<h2>Volevo Adorare Questo Oggetto</h2>

<p>Metti la mia posizione sul tavolo: aspetto un termometro per carne completamente wireless da anni. L'idea di inserire una singola sonda in un brisket, chiudere il coperchio e monitorare tutto dal telefono senza instradare cavi attraverso le ventole o gestire la gestione dei cavi — è il sogno. Il Meater Plus è la cosa più vicina a quel sogno che esiste oggi. E manca ancora in modi che contano.</p>

<p>Ho usato il Meater Plus per sei mesi su tutto, dalla carne di manzo hot-and-fast alle lunghe cotture di sedici ore di spalla di maiale. I risultati sono stati abbastanza coerenti da permettermi di fare affermazioni specifiche sul perché funziona e perché fallisce.</p>

<h2>Ciò Che Funziona: L'Accuratezza della Temperatura Interna</h2>

<p>La sonda in acciaio inox misura la temperatura interna della carne con ±1-2°C rispetto al mio termometro di riferimento ThermoWorks. Questo è buono. Non perfetto come il Thermapen ONE, ma buono abbastanza per le cotture in cui non stai cercando la perfezione al decimo di grado. Per i cuochi quotidiani, questa parte funziona.</p>

<h2>Ciò Che Non Funziona: Il Sensore Ambientale</h2>

<p>Il Meater Plus ha due sensori: uno all'estremità della sonda per la temperatura interna della carne e uno nell'impugnatura per la temperatura ambientale dell'affumicatore. La seconda misurazione è il problema.</p>

<p>Nel mio kamado a 225°C effettivi, il Meater leggeva 183-196°C. In un Weber Smokey Mountain a 232°C effettivi, leggeva 196-210°C. Le letture basse erano coerenti su sessanta ore di cottura in quattro sessioni. Il problema è strutturale: la sonda è inserita nella carne, il che significa che l'impugnatura è parzialmente schermata dal cibo circostante. Legge sempre basso.</p>

<h2>La Cascata del Fallimento</h2>

<p>L'algoritmo di stima del tempo di cottura si basa sia sulla temperatura interna che sulla temperatura ambientale. Se l'ambientale è bassa di 15-22°C, l'algoritmo pensa che stai cucinando a temperatura più bassa di quanto sei effettivamente, il che fa gonfiare le stime del tempo. Ho ricevuto stime di "ancora 3 ore" quando la carne era 45 minuti dall'essere cotta.</p>

<h2>Portata Bluetooth: Il Pubblicitario vs La Realtà</h2>

<p>Napoleon pubblicizza 50 metri di portata. In test open-air — all'aperto, nessun ostacolo — il Meater Plus funziona fino a circa 45-50 metri. Questo è accurato. Ma in condizioni di cottura reali, la portata crolla.</p>

<p>Su un kamado Big Green Egg, la portata era di 9-12 metri attraverso la ceramica densa. Su un Weber Smokey Mountain con coperchio d'acciaio: 12-18 metri. Il metallo blocca il Bluetooth. La maggior parte delle persone usa i loro affumicatori su un patio con una porta scorrevole verso la cucina. Quella porta scorrevole vale facilmente 6-9 metri di segnale. La portata "reale" nella maggior parte degli scenari di utilizzo è 9-18 metri, non 50.</p>

<h2>Quando Comprarlo vs Quando Evitarlo</h2>

<p>Compralo se: cucini grigliate veloci di polli, lombo di maiale o agnello — cose in cui la ±1-2°C della temperatura interna è ciò che conta e il tempo di cottura è breve abbastanza da rendere il monitoraggio semplice. La funzione di cottura guidata è genuinamente utile per i principianti.</p>

<p>Non comprarlo se: fai lunghe cotture dove la temperatura ambientale conta per la pianificazione. Le stime del tempo saranno sbagliate. Affidati invece a un sistema con sonde cablate e sensori posizionati correttamente al livello della griglia.</p>`,
    },
    es: {
      title:
        "Reseña Meater Plus Termómetro Inalámbrico — Concepto Brillante, Ejecución Frustrante",
      slug: "meater-plus-termometro-inalambrico-resena",
      excerpt:
        "El sueño de un termómetro para carne completamente inalámbrico es real — cuando el Bluetooth no se cae, el sensor ambiental no miente y la app no se cuelga. Un 5.8 que desesperadamente quería que fuera un 8.",
      verdict:
        "Un termómetro inalámbrico brillantemente diseñado que falla por el alcance Bluetooth real, la precisión cuestionable de la temperatura ambiental y los problemas de confiabilidad de la app. Úsalo para asados casuales; confía en sondas con cable para todo lo que importa. El concepto merece un 9, la ejecución se gana un 5.8.",
      pros: [
        "Diseño completamente inalámbrico — sin cables que enrutar a través de las ventilaciones del ahumador",
        "La precisión de la temperatura interna de la carne es sólida a ±1-2°C",
        "App bien diseñada con útil función de cocción guiada y gráfico de temperaturas",
        "Forma elegante y base de carga de calidad premium",
        "El estimador del tiempo de cocción es útil cuando las lecturas ambientales son precisas",
      ],
      cons: [
        "El alcance Bluetooth real es 9-24 metros — no los 50 metros anunciados — según el material del ahumador",
        "El sensor de temperatura ambiental lee 8-22°C por debajo de la temperatura real a nivel de la rejilla",
        "Las estimaciones del tiempo de cocción pueden desviarse más de una hora por la imprecisión del sensor ambiental",
        "Fallos de la app han causado pérdida de datos de cocción tres veces en seis meses",
        "Requiere un dispositivo bridge separado para conectividad WiFi/nube — añadiendo complejidad que arruina la promesa de simplicidad",
        "Pérdidas de conexión durante cocciones largas crean ansiedad en el monitoreo",
      ],
      editorial_content: `<h2>Quería Amar Este Aparato</h2>

<p>Pongo mi sesgo sobre la mesa: he estado esperando un termómetro para carne completamente inalámbrico durante años. La idea de insertar una sola sonda en un brisket, cerrar la tapa y monitorear todo desde el teléfono sin enrutar cables a través de las ventilaciones — ese es el sueño. El Meater Plus es lo más cercano a ese sueño que existe hoy. Y sigue quedándose corto en formas que importan.</p>

<p>He usado el Meater Plus durante seis meses en todo, desde carne de res hot-and-fast hasta cocciones largas de dieciséis horas de paleta de cerdo. Los resultados han sido lo suficientemente consistentes para hacer afirmaciones específicas sobre por qué funciona y por qué falla.</p>

<h2>Lo Que Funciona: La Precisión de Temperatura Interna</h2>

<p>La sonda de acero inoxidable mide la temperatura interna de la carne con ±1-2°C contra mi termómetro de referencia ThermoWorks. Esto es bueno. No tan preciso como el Thermapen ONE, pero suficientemente bueno para las cocciones en que no buscas perfección al décimo de grado.</p>

<h2>Lo Que No Funciona: El Sensor Ambiental</h2>

<p>El Meater Plus tiene dos sensores: uno en la punta de la sonda para la temperatura interna de la carne y uno en el mango para la temperatura ambiental del ahumador. La segunda medición es el problema.</p>

<p>En mi kamado a 225°C reales, el Meater leía 183-196°C. En un Weber Smokey Mountain a 232°C reales, leía 196-210°C. El problema es estructural: la sonda está insertada en la carne, lo que significa que el mango está parcialmente protegido por el alimento circundante. Siempre lee por debajo.</p>

<h2>La Cascada del Fallo</h2>

<p>El algoritmo de estimación del tiempo de cocción depende tanto de la temperatura interna como de la ambiental. Si la ambiental está baja 15-22°C, el algoritmo piensa que estás cocinando a menor temperatura de la real, lo que infla las estimaciones de tiempo. He recibido estimaciones de "aún 3 horas" cuando la carne estaba a 45 minutos de estar lista.</p>

<h2>Cuándo Comprarlo vs Cuándo Evitarlo</h2>

<p>Cómpralo si: haces asados rápidos de pollos, lomo de cerdo o cordero — cosas donde la ±1-2°C de temperatura interna es lo que importa y el tiempo de cocción es suficientemente corto para simplificar el monitoreo.</p>

<p>No lo compres si: haces cocciones largas donde la temperatura ambiental importa para la planificación. Las estimaciones de tiempo estarán equivocadas. Confía en cambio en un sistema de sondas cableadas con sensores correctamente posicionados a nivel de la rejilla.</p>`,
    },
  },

  // Fogo Super Premium Charcoal Review
  a65hw4wvh5ivycyv6dc7bqnh: {
    it: {
      title:
        "Recensione Fogo Super Premium — Il Confronto con Jealous Devil Che Nessuno Fa Onestamente",
      slug: "fogo-super-premium-carbone-recensione",
      excerpt:
        "Migliore consistenza dei pezzi rispetto a Jealous Devil, temperatura massima leggermente inferiore e un profilo di combustione diverso che si adatta meglio ad alcuni affumicatori. Il confronto diretto onesto che i fanatici del brand odiano.",
      verdict:
        "Un carbone in pezzi premium che scambia la densità estrema di Jealous Devil per migliore consistenza dei pezzi, accensione più rapida e un prezzo leggermente inferiore. Nessuno dei due è chiaramente 'migliore' — sono ottimizzati per diversi stili di cottura. Compra Fogo per la flessibilità nella grigliatura; compra Jealous Devil per la massima resistenza nel low-and-slow.",
      pros: [
        "Consistenza dei pezzi di categoria best-in-class — 70-75% di pezzi da ristorante per sacchetto",
        "Si accende più velocemente di Jealous Devil in un avviatore a camino (12-14 min vs 15-18 min)",
        "Prezzo per kg leggermente inferiore a Jealous Devil con qualità comparabile",
        "Sapore di fumo più mite e dolce che esalta il manzo senza sovrastarlo",
        "Bassa produzione di cenere al 4-5% — sostanzialmente meno di Royal Oak o B&B",
      ],
      cons: [
        "Temperatura massima inferiore a Jealous Devil (360-380°C vs 400-425°C nel kamado)",
        "Tempo di combustione per carica inferiore ai carboni a base di Quebracho — 16-18 ore vs 18-22 ore a 120°C",
        "Produzione di cenere leggermente superiore a Jealous Devil richiede attenzione prima nelle lunghe cotture kamado",
        "L'approvvigionamento del legno duro centroamericano è meno trasparente del Quebracho paraguaiano certificato FSC di Jealous Devil",
      ],
      editorial_content: `<h2>Le Guerre del Carbone Sono Stupide — Ma Le Differenze Sono Reali</h2>

<p>Le persone del carbone sono tribali. I fan di Jealous Devil ti combatteranno nei commenti. I devoti di Fogo pubblicheranno saggi sui tempi di combustione. I difensori di Royal Oak insisteranno che stai pagando troppo per un nome. I puristi del Kingsford — okay, nessuno difende effettivamente le bricchette Kingsford per altro che la grigliatura casuale, ma hai capito il concetto.</p>

<p>Ho usato Fogo Super Premium come mio principale carbone a pezzi per quattro mesi, eseguito ogni test che potevo pensare, e l'ho confrontato direttamente con Jealous Devil in cotture parallele sul mio Big Green Egg. Ecco cosa ho trovato effettivamente, al contrario di cosa dice la mitologia del brand.</p>

<h2>Consistenza dei Pezzi: Fogo Vince</h2>

<p>Questa è la differenza più misurabile e quella che conta di più nella pratica quotidiana. In tre sacchetti Fogo Super Premium da 9 kg, ho trovato in media il 72% di pezzi grandi da ristorante (più grandi di un pugno chiuso), il 21% di pezzi medi e il 7% di polvere e pezzi piccoli che cadono attraverso la griglia della ciminiera.</p>

<p>In tre sacchetti Jealous Devil da 9 kg nello stesso periodo: 61% di pezzi grandi, 25% di pezzi medi, 14% di polvere e pezzi piccoli. Jealous Devil pubblicizza una consistenza simile, ma nel mio campionamento Fogo vince effettivamente qui.</p>

<h2>Temperatura Massima: Jealous Devil Vince</h2>

<p>Fogo raggiunge 360-380°C nel mio Big Green Egg su un'accensione di trenta minuti con la soffiante aperta. Jealous Devil raggiunge 400-425°C nelle stesse condizioni. Se stai cercando di fare sear su una bistecca a temperatura steak-house, la differenza è reale. Una bistecca ha bisogno di almeno 370°C per la reazione di Maillard ottimale; entrambi arrivano lì, ma Jealous Devil ha più margine.</p>

<h2>Tempo di Combustione: Jealous Devil Vince di Poco</h2>

<p>A 120°C sul mio Big Green Egg con le prese d'aria quasi chiuse: Fogo ha mantenuto la temperatura per 16-18 ore prima che le temperature cominciassero a scendere senza aggiungere carbone. Jealous Devil ha mantenuto lo stesso setup per 18-22 ore. Per le cotture di 14-16 ore come un brisket o una spalla di maiale da competizione, Jealous Devil dà più margine senza dover ricaricare.</p>

<h2>La Risposta Giusta Dipende da Come Cucini</h2>

<p>Compra Fogo Super Premium se: fai più grigliate che affumicature, apprezzi la consistenza dei pezzi per un caricamento uniforme della ciminiera, cuoci su kamado per 8-12 ore (il Fogo arriva fino a lì), e preferisci un profilo di fumo più mite che non sovrasti i tagli di pollo o maiale.</p>

<p>Compra Jealous Devil se: fai frequentemente cotture low-and-slow di 16+ ore, vuoi la massima flessibilità della gamma di temperatura, preferisci un profilo di fumo più audace, e i grandi pezzi irregolari non ti disturbano durante l'accensione.</p>`,
    },
    es: {
      title:
        "Reseña Fogo Super Premium — La Comparación con Jealous Devil Que Nadie Hace Honestamente",
      slug: "fogo-super-premium-carbon-resena",
      excerpt:
        "Mejor consistencia de trozos que Jealous Devil, temperatura máxima ligeramente inferior y un perfil de combustión diferente que se adapta mejor a algunos ahumadores. La comparación directa honesta que los fanáticos de marca odian.",
      verdict:
        "Un carbón vegetal premium que cambia la densidad extrema de Jealous Devil por mejor consistencia de trozos, encendido más rápido y un precio ligeramente inferior. Ninguno es claramente 'mejor' — están optimizados para diferentes estilos de cocción. Compra Fogo para flexibilidad en parrilla; compra Jealous Devil para máxima resistencia en low-and-slow.",
      pros: [
        "Consistencia de trozos de categoría best-in-class — 70-75% de trozos de restaurante por bolsa",
        "Se enciende más rápido que Jealous Devil en una chimenea de arranque (12-14 min vs 15-18 min)",
        "Precio por kg ligeramente inferior a Jealous Devil con calidad comparable",
        "Sabor de humo más suave y dulce que complementa la carne sin dominarla",
        "Baja producción de ceniza al 4-5% — sustancialmente menos que Royal Oak o B&B",
      ],
      cons: [
        "Temperatura máxima inferior a Jealous Devil (360-380°C vs 400-425°C en kamado)",
        "Menor tiempo de combustión por carga que los carbones a base de Quebracho — 16-18 hrs vs 18-22 hrs a 120°C",
        "Producción de ceniza ligeramente superior a Jealous Devil requiere atención antes en cocciones largas en kamado",
        "El abastecimiento de madera dura centroamericana es menos transparente que el Quebracho paraguayo certificado FSC de Jealous Devil",
      ],
      editorial_content: `<h2>Las Guerras del Carbón Son Estúpidas — Pero Las Diferencias Son Reales</h2>

<p>La gente del carbón es tribal. Los leales a Jealous Devil te pelearán en los comentarios. Los devotos de Fogo publicarán ensayos sobre tiempos de combustión. Los defensores de Royal Oak insistirán en que estás pagando de más por un nombre. He estado usando Fogo Super Premium como mi principal carbón vegetal durante cuatro meses, realizado cada prueba que pude imaginar, y lo comparé directamente con Jealous Devil en cocciones paralelas en mi Big Green Egg.</p>

<h2>Consistencia de Trozos: Fogo Gana</h2>

<p>En tres bolsas Fogo Super Premium de 9 kg, encontré un promedio del 72% de trozos grandes de restaurante, 21% de trozos medianos y 7% de polvo y trozos pequeños. En tres bolsas Jealous Devil de 9 kg: 61% de trozos grandes, 25% medianos, 14% de polvo. Jealous Devil publicita consistencia similar, pero en mi muestra Fogo efectivamente gana aquí.</p>

<h2>Temperatura Máxima: Jealous Devil Gana</h2>

<p>Fogo alcanza 360-380°C en mi Big Green Egg con treinta minutos de encendido y las ventilaciones abiertas. Jealous Devil alcanza 400-425°C en las mismas condiciones. Para sellar un bistec a temperatura de steakhouse, la diferencia es real. Ambos llegan a donde necesitas, pero Jealous Devil tiene más margen.</p>

<h2>Tiempo de Combustión: Jealous Devil Gana por Poco</h2>

<p>A 120°C en mi Big Green Egg: Fogo mantuvo la temperatura por 16-18 horas. Jealous Devil mantuvo el mismo setup por 18-22 horas. Para cocciones de 14-16 horas como un brisket o paleta de cerdo de competición, Jealous Devil da más margen sin recargar.</p>

<h2>La Respuesta Correcta Depende de Cómo Cocinas</h2>

<p>Compra Fogo Super Premium si: haces más parrilladas que ahumados, aprecias la consistencia de trozos para una carga uniforme de la chimenea, cocinas en kamado por 8-12 horas, y prefieres un perfil de humo más suave que no domine los cortes de pollo o cerdo.</p>

<p>Compra Jealous Devil si: haces frecuentemente cocciones low-and-slow de 16+ horas, quieres máxima flexibilidad en el rango de temperatura, y los grandes trozos irregulares no te molestan durante el encendido.</p>`,
    },
  },
};

// ============================================================
// BLOG POSTS — 4 nuovi
// ============================================================

const blogTranslations = {
  // Stop Buying Cheap Thermometers
  supmusan66hak8expwdlh5r3: {
    it: {
      title:
        "Smetti di Comprare Termometri Economici — Una Lezione da 15€ Che Rovina i Brisket",
      slug: "smetti-comprare-termometri-economici-lezione-rovina-brisket",
      excerpt:
        "Ho visto un amico togliere un brisket da 90€ a 195°F interno perché il suo termometro da 12€ di Amazon leggeva 8°F troppo alto. Il calcolo sull'investimento in termometri non ammette dubbi.",
      content: `<h2>Lo Strumento Economico Più Costoso del Tuo Arsenal</h2>

<p>Lo scorso 4 luglio, il mio amico Marco mi ha invitato a controllare il suo brisket. Lo stava affumicando da tredici ore sul suo Weber Smokey Mountain — il suo primo tentativo su un packer completo. Aveva guardato i video, lo aveva rifilato correttamente, aveva costruito un buon fuoco con il metodo Minion e pezzi di post oak. Da ogni indicatore visibile, stava facendo tutto giusto.</p>

<p>Poi mi ha mostrato il suo termometro. Era un "instant read" da 12€ da Amazon con 47.000 recensioni e 4,3 stelle. Aveva inserito la sonda nel flat e leggeva 203°F. "È pronto," ha detto, sorridendo. "Probe tender, temperatura giusta."</p>

<p>Avevo il mio Thermapen ONE in tasca — ce l'ho sempre, come una strana coperta di sicurezza BBQ. Gli ho chiesto se potevo controllare. Mi ha dato un'occhiata strana ma ha detto di sì. Ho inserito la sonda nello stesso punto nel flat.</p>

<p>Leggeva 195°F.</p>

<p>Il suo termometro leggeva 8°F troppo alto. Il brisket aveva bisogno di ancora quarantacinque minuti. Ma l'aveva già tolto dal fuoco. Il coperchio del focolare era già spento. Il recupero era possibile ma il brisket non sarebbe mai stato quello che avrebbe potuto essere.</p>

<h2>Perché i Termometri Economici Sono una Truffa</h2>

<p>Non sto dicendo che costano troppo. Sto dicendo che ti costano di più di quanto sembri. Ecco come funziona la matematica:</p>

<p>Un termometro da 12-20€ di Amazon ha un'accuratezza dichiarata di ±1°C. Questo è falso — non viene mai testato contro un riferimento calibrato. In realtà, questi strumenti leggono ovunque da ±3°C a ±14°C rispetto alla temperatura reale, con il divario che tende ad aumentare man mano che il termometro invecchia e le pile si scaricano. La sonda si consuma, la resistenza cambia, le letture si degradano.</p>

<p>Un brisket di petto da 50-90€ è rovinato o significativamente degradato se tolto alla temperatura sbagliata. Calcola quante cotture sbagliate ha bisogno di permettere prima che un termometro economico ti costi più di un Thermapen ONE da 100€. Per la maggior parte delle persone, è tre o quattro cotture sbagliate. Per alcuni, è una.</p>

<h2>Il Problema con i "Intermedi"</h2>

<p>Ci sono termometri nella fascia dai 25-50€ che sembrano una scelta ragionevole — non economici, non costosi come un Thermapen. Ma questi prodotti spesso performano peggio di quelli economici su una metrica critica: la coerenza. Un termometro da 12€ potrebbe leggere sempre 8°F alto — almeno puoi compensare. Un termometro da 35€ potrebbe leggere in modo diverso ogni volta che lo usi, a seconda della temperatura ambientale, di quanto a lungo hai tenuto la sonda nella carne e dell'umore della luna.</p>

<h2>Cosa Comprare Effettivamente</h2>

<p>Per la lettura istantanea, il ThermoWorks Thermapen ONE è il benchmark del settore. Risposta in 1 secondo, precisione ±0,5°F, impermeabile e garantito. Costa ~100€ e durerà dieci anni. Puoi anche guardare il ThermoPop 2 (~35€) per le cotture quotidiane se 100€ è genuinamente fuori dal tuo budget — ma non scendere ulteriormente senza sapere di stare facendo un compromesso.</p>

<p>Per il monitoraggio della temperatura dell'affumicatore, un sistema a due sonde con una sonda a livello della griglia e una nella carne è il minimo. ThermoWorks, FireBoard e Inkbird hanno tutte opzioni affidabili a 50-150€ che sono effettivamente più accurate del termometro integrato di qualsiasi affumicatore prodotto in serie.</p>`,
    },
    es: {
      title:
        "Deja de Comprar Termómetros Baratos — Una Lección de 15€ Que Arruina Briskets",
      slug: "deja-comprar-termometros-baratos-leccion-arruina-brisket",
      excerpt:
        "Vi a un amigo sacar un brisket de 90€ a 195°F interno porque su termómetro de 12€ de Amazon leía 8°F alto. Las matemáticas de invertir en un termómetro no tienen discusión.",
      content: `<h2>La Herramienta Barata Más Cara de Tu Arsenal</h2>

<p>El pasado 4 de julio, mi amigo Marcos me invitó a revisar su brisket. Lo había estado ahumando durante trece horas en su Weber Smokey Mountain — su primer intento con un packer completo. Había visto los videos, lo había recortado correctamente, había construido un buen fuego con el método Minion y trozos de post oak. Por cada indicador visible, estaba haciendo todo bien.</p>

<p>Luego me mostró su termómetro. Era un "instant read" de 12€ de Amazon con 47.000 reseñas y 4,3 estrellas. Había insertado la sonda en el flat y leía 203°F. "Está listo," dijo, sonriendo.</p>

<p>Tenía mi Thermapen ONE en el bolsillo — siempre lo llevo. Le pregunté si podía verificar. Inserté la sonda en el mismo punto en el flat.</p>

<p>Leía 195°F.</p>

<p>Su termómetro leía 8°F de más. El brisket necesitaba otros cuarenta y cinco minutos. Pero ya lo había sacado del fuego.</p>

<h2>Por Qué los Termómetros Baratos Son una Estafa</h2>

<p>No digo que cuesten demasiado. Digo que te cuestan más de lo que parece. Un termómetro de 12-20€ de Amazon declara una precisión de ±1°C. Eso es mentira — nunca se prueba contra una referencia calibrada. En realidad, estos instrumentos leen entre ±3°C y ±14°C de la temperatura real, con la desviación tendiendo a aumentar con el tiempo.</p>

<p>Un brisket de 50-90€ queda arruinado o significativamente degradado si se saca a la temperatura incorrecta. Calcula cuántas cocciones incorrectas necesita permitir antes de que un termómetro barato te cueste más que un Thermapen ONE de 100€. Para la mayoría, son tres o cuatro cocciones arruinadas.</p>

<h2>Qué Comprar Realmente</h2>

<p>Para lectura instantánea, el ThermoWorks Thermapen ONE es el estándar de la industria. Respuesta en 1 segundo, precisión ±0,5°F, impermeable y garantizado. Cuesta ~100€ y durará diez años. También puedes mirar el ThermoPop 2 (~35€) para las cocciones diarias — pero no bajes más sin saber que estás haciendo un compromiso.</p>

<p>Para monitoreo de temperatura del ahumador, un sistema de dos sondas con una sonda a nivel de la parrilla y una en la carne es el mínimo. ThermoWorks, FireBoard e Inkbird tienen opciones confiables a 50-150€ que son efectivamente más precisas que el termómetro integrado de cualquier ahumador fabricado en serie.</p>`,
    },
  },

  // Tested 5 Beginner Smokers Under $500
  xsclf6cdpnxgv64a83ao8x39: {
    it: {
      title:
        "Ho Testato 5 Affumicatori 'per Principianti' Sotto i 500€ — Solo 2 Ne Valgono la Pena",
      slug: "testato-5-affumicatori-principianti-sotto-500-euro-solo-2-valgono",
      excerpt:
        "Weber Smokey Mountain, Pit Barrel Cooker, Oklahoma Joe's Highland, Char-Griller Akorn e Masterbuilt Gravity Series. Due mesi, quindici cotture ciascuno, temperature reali e cibo reale.",
      content: `<h2>Il Mercato degli Affumicatori per Principianti È Pieno di Trappole</h2>

<p>Se cerchi "miglior affumicatore per principianti" su Google, troverai una parete di listicle guidate da affiliate che consigliano tutto, da un Masterbuilt elettrico da 150€ a un Traeger da 1.200€. La maggior parte di questi articoli sono scritti da persone che hanno testato ogni affumicatore per esattamente una cottura — se l'hanno testato del tutto. Ho trascorso due mesi a cucinare su cinque affumicatori sotto i 500€, eseguendo almeno quindici cotture complete su ciascuno.</p>

<h2>La Metodologia</h2>

<p>Ogni affumicatore è stato testato con: spalle di maiale (8-10 ore), costolette baby back (5-6 ore), polli interi (3-4 ore), flat di brisket (8-10 ore) e ali di pollo (2-3 ore). Tutte le cotture sono state monitorate con un sistema di sonde FireBoard a cinque canali — una sonda a livello della griglia, due nel cibo. Ho registrato ogni ora le temperature, i consumi di carburante e le valutazioni finali del prodotto.</p>

<h2>#1: Weber Smokey Mountain 18" (~480€) — COMPRA</h2>

<p>Il WSM è l'affumicatore per principianti di riferimento, e merita quella reputazione. Il controllo della temperatura sul WSM è notevolmente più facile di qualsiasi altro offset in questo elenco. La doppia porta — separata camera di cottura e fogolare — significa che puoi aggiungere carbone e acqua senza perdere calore o fumo. Il costruzione in acciaio smaltato gestisce gli sbalzi di temperatura stagionali senza ruggine o deformazione.</p>

<p>Nelle mie cotture, il WSM ha mantenuto 225-235°F (107-113°C) con variazioni di ±10-15°F per una volta che ho imparato i suoi vent d'aria. Le cotture di spalla di maiale sono uscite regolarmente tra le 7,5 e le 8,5 ore. I brisket flat hanno raggiunto la perfezione probe-tender ogni singola volta. <strong>Questo è l'affumicatore da comprare se stai iniziando.</strong></p>

<h2>#2: Pit Barrel Cooker Original (~350€) — COMPRA</h2>

<p>Il PBC è un miracolo della semplicità. Nessun registro di ventilazione da regolare. Nessuna gestione del fuoco. Appendi la carne dai ganci forniti, accendi il fuoco, metti il coperchio e ritorna dopo 4-6 ore. Questa non è un'esagerazione — ho cronometrato l'intervento attivo durante una cottura di spalla di maiale sul PBC a 23 minuti totali in sette ore.</p>

<p>Il compromesso è il controllo. Il PBC cucina al suo ritmo — tipicamente 275-295°F (135-146°C) — che non è la temperatura che sceglieresti per un brisket. Ma produce risultati straordinariamente saporiti su costolette, pollo e spalle di maiale. Per qualcuno che vuole grandi risultati con il minimo sforzo, è la risposta giusta.</p>

<h2>#3: Oklahoma Joe's Highland (~300€) — COMPRA CON RISERVE</h2>

<p>Come spiegato altrove in questo sito, l'Highland è un buon affumicatore dopo 100-170€ di modifiche obbligatorie. Senza di esse, è un'esperienza frustrante. Con di esse, produce il sapore stick-burner autentico che nessun affumicatore kettle o PBC può replicare. Compra solo se stai preparandoti all'impegno finanziario delle modifiche.</p>

<h2>#4: Char-Griller Akorn Kamado (~300€) — NON COMPRARE</h2>

<p>L'Akorn è un kamado in acciaio — non ceramica — il che lo rende significativamente più economico di un Big Green Egg. Ma quella differenza di materiale conta. L'acciaio non isola come la ceramica, portando a maggiori variazioni di temperatura e consumi di carburante più alti in condizioni di freddo. Le guarnizioni del coperchio si logorano rapidamente. Nei miei test, l'Akorn aveva un'aspettativa di vita di 2-3 anni prima che la tenuta si deteriorasse abbastanza da rendere il controllo della temperatura inaffidabile.</p>

<h2>#5: Masterbuilt Gravity Series 560 (~400€) — NON COMPRARE</h2>

<p>Il Gravity Series è tecnicamente interessante — un affumicatore a carbone con accensione e controllo della ventola elettrica. In teoria ottieni il sapore del carbone con la comodità del pellet. In pratica: tre guasti all'accensione in quindici cotture, un display di controllo che si è bloccato due volte richiedendo il reset, e un sistema di gestione del grasso che ha traboccato nelle cotture intensive provocando un piccolo incendio. La tecnologia non è matura.</p>`,
    },
    es: {
      title:
        "Probé 5 Ahumadores 'para Principiantes' Bajo 500€ — Solo 2 Valen la Pena",
      slug: "probe-5-ahumadores-principiantes-bajo-500-euros-solo-2-valen-pena",
      excerpt:
        "Weber Smokey Mountain, Pit Barrel Cooker, Oklahoma Joe's Highland, Char-Griller Akorn y Masterbuilt Gravity Series. Dos meses, quince cocciones cada uno, temperaturas reales y comida real.",
      content: `<h2>El Mercado de Ahumadores para Principiantes Está Lleno de Trampas</h2>

<p>Si buscas "mejor ahumador para principiantes" en Google, encontrarás una pared de listicles impulsadas por afiliados que recomiendan de todo, desde un Masterbuilt eléctrico de 150€ hasta un Traeger de 1.200€. Pasé dos meses cocinando en cinco ahumadores de menos de 500€, haciendo al menos quince cocciones completas en cada uno.</p>

<h2>La Metodología</h2>

<p>Cada ahumador fue probado con: paletas de cerdo (8-10 horas), costillas baby back (5-6 horas), pollos enteros (3-4 horas), flats de brisket (8-10 horas) y alitas de pollo (2-3 horas). Todas las cocciones fueron monitoreadas con un sistema de sondas FireBoard de cinco canales.</p>

<h2>#1: Weber Smokey Mountain 18" (~480€) — COMPRA</h2>

<p>El WSM es el ahumador de referencia para principiantes, y merece esa reputación. El control de temperatura en el WSM es notablemente más fácil que cualquier otro offset en esta lista. La puerta doble — cámara de cocción y fogón separados — significa que puedes agregar carbón y agua sin perder calor o humo. En mis cocciones, el WSM mantuvo 107-113°C con variaciones de ±6-8°C una vez que aprendí sus ventilaciones. <strong>Este es el ahumador que comprar si estás empezando.</strong></p>

<h2>#2: Pit Barrel Cooker Original (~350€) — COMPRA</h2>

<p>El PBC es un milagro de simplicidad. Sin registros de ventilación que ajustar. Sin gestión del fuego. Cuelga la carne de los ganchos incluidos, enciende el fuego, pon la tapa y vuelve en 4-6 horas. Cronometré la intervención activa durante una cocción de paleta de cerdo en el PBC en 23 minutos totales en siete horas. El PBC produce resultados extraordinariamente sabrosos en costillas, pollo y paletas de cerdo.</p>

<h2>#3: Oklahoma Joe's Highland (~300€) — COMPRA CON RESERVAS</h2>

<p>El Highland es un buen ahumador después de 100-170€ de modificaciones obligatorias. Sin ellas, es una experiencia frustrante. Con ellas, produce el sabor stick-burner auténtico que ningún ahumador kettle o PBC puede replicar.</p>

<h2>#4: Char-Griller Akorn Kamado (~300€) — NO COMPRES</h2>

<p>El Akorn es un kamado de acero — no cerámica — lo que lo hace significativamente más barato que un Big Green Egg. Pero esa diferencia de material importa. El acero no aísla como la cerámica. Los sellos de la tapa se desgastan rápidamente. En mis pruebas, el Akorn tenía una vida útil de 2-3 años antes de que el sellado se deteriorara lo suficiente para hacer el control de temperatura poco confiable.</p>

<h2>#5: Masterbuilt Gravity Series 560 (~400€) — NO COMPRES</h2>

<p>Técnicamente interesante — un ahumador de carbón con encendido y control de ventilador eléctrico. En la práctica: tres fallos de encendido en quince cocciones, una pantalla de control que se bloqueó dos veces requiriendo reinicio, y un sistema de gestión de grasa que se desbordó en cocciones intensas provocando un pequeño incendio. La tecnología no está madura.</p>`,
    },
  },

  // Myth of Soaking Wood Chips
  pyur937ggw1ldlrgqwggonwd: {
    it: {
      title:
        "Il Mito dell'Ammollo dei Chip di Legno (E 4 Altre Bugie sul BBQ)",
      slug: "mito-ammollo-chip-legno-4-bugie-bbq",
      excerpt:
        "Ammollare i chip di legno, scottare per 'sigillare i succhi', far riposare la carne 'per ridistribuire i succhi', lo 'stall' come qualcosa da 'spingere attraverso', e il mito 'osso = più sapore'. Cinque sacre vacche del BBQ, macellate con i dati.",
      content: `<h2>Le Vacche Sacre Fanno il Miglior Brisket</h2>

<p>La cultura del barbecue è costruita sulla tradizione, e la tradizione è costruita sulla ripetizione. Qualcuno dice qualcosa che suona plausibile, qualcun altro lo ripete, e nel giro di pochi anni diventa un vangelo che nessuno mette in discussione perché tutti "sanno" che è vero. Il problema è che alcune di queste tradizioni sono sbagliate — non solo leggermente sbagliate, ma dimostratamente, misuratamente, sperimentalmente sbagliate. E seguirle peggiora il tuo barbecue.</p>

<h2>Bugia #1: Ammolla i Chip di Legno Prima di Affumicare</h2>

<p>Questo è il mito più persistente nel barbecue. "Ammolla i chip per 30 minuti a un'ora prima di aggiungerli al tuo affumicatore per farli bruciare più lentamente." Lo senti da ogni nonna, ogni guru del BBQ di terza generazione, ogni articolo su internet del 2008. È anche completamente falso.</p>

<p>Ecco cosa succede realmente quando metti un chip di legno bagnato su una fonte di calore. Prima: l'acqua evapora. Questa fase richiede tempo e consuma energia termica — non produce fumo, non produce sapore, non fa niente di utile. Poi, una volta che il legno raggiunge 150°C, inizia la pirolisi effettiva e il legno comincia a bruciare. Il legno bagnato impiega più tempo ad arrivare a quella temperatura perché deve prima perdere tutta quella umidità, ma una volta lì, brucia alla stessa velocità del legno secco.</p>

<p>Il test: ho messo chip di legno ammollati e chip secchi in porzioni uguali su un bruciatore a gas. Entrambi hanno iniziato a produrre fumo praticamente nello stesso momento. Il legno ammollato ha prodotto fumo "sporco" bianco-grigio durante la fase di evaporazione dell'acqua — esattamente il tipo di fumo che non vuoi sul tuo cibo.</p>

<h2>Bugia #2: Scottare Sigilla i Succhi</h2>

<p>Questa è così persistente che era nel curriculum di cottura professionale per decenni. L'idea è che la scottatura ad alta temperatura crea una "sigillatura" che impedisce ai succhi di fuoriuscire durante la cottura. È falso.</p>

<p>La verità: la scottatura crea la reazione di Maillard — doratura, sapore, crosta. È una cosa preziosa. Ma non fa niente per trattenere i succhi. Puoi misurarlo: scottura uno steak, poi finiscilo nel forno. Scottura un altro steak e finiscilo anche lui nel forno. Pesa la perdita di umidità su entrambi. È la stessa. La crosta non è impermeabile. Non c'è "sigillatura".</p>

<h2>Bugia #3: Riposa la Carne "per Far Ridistribuire i Succhi"</h2>

<p>Il riposo è reale e importante. La spiegazione standard è sbagliata. "I succhi si ridistribuiscono verso il centro durante il riposo" — come se i succhi si muovessero intenzionalmente verso le aree a bassa pressione. Ciò che accade realmente è che le fibre muscolari si rilassano e smettono di espellere attivamente i liquidi quando vengono tagliate. La carne riposata ha meno succhi nel piatto da taglio non perché i succhi siano tornati dentro, ma perché le fibre non li stanno più comprimendo fuori attivamente.</p>

<h2>Bugia #4: Lo "Stall" È Qualcosa da Combattere</h2>

<p>Lo stall — il plateau di temperatura che si verifica tipicamente a 150-165°F in brisket e spalle di maiale — non è un problema da risolvere. È una fase necessaria. L'avvolgimento nella carta stagnola accelera il superamento dello stall trattenendo il calore e l'umidità, ma c'è un compromesso: rammollisce la corteccia. Se vuoi una corteccia dura, non avvolgere. Se vuoi un passaggio più veloce attraverso lo stall, avvolgi. Non esiste un modo universalmente corretto.</p>

<h2>Bugia #5: Con l'Osso = Più Sapore</h2>

<p>La scienza è chiara: le proteine e i grassi nel osso non migrano nella carne durante la cottura in quantità misurabili. L'osso conduce il calore in modo diverso rispetto alla carne, il che può influenzare i tempi di cottura localmente vicino all'osso. Ma l'idea che tenere l'osso dentro aggiunga sapore alla carne circostante attraverso qualche processo di osmosi non è supportata dai test alla cieca.</p>`,
    },
    es: {
      title:
        "El Mito de Remojar las Virutas de Madera (Y 4 Otras Mentiras del BBQ)",
      slug: "mito-remojar-virutas-madera-4-mentiras-bbq",
      excerpt:
        "Remojar virutas de madera, sellar para 'fijar los jugos', dejar reposar la carne 'para redistribuir jugos', el 'stall' como algo que 'empujar', y el mito 'con hueso = más sabor'. Cinco vacas sagradas del BBQ, sacrificadas con datos.",
      content: `<h2>Las Vacas Sagradas Hacen el Mejor Brisket</h2>

<p>La cultura del barbecue está construida sobre la tradición, y la tradición está construida sobre la repetición. Alguien dice algo que suena plausible, alguien más lo repite, y en pocos años se convierte en evangelio que nadie cuestiona. El problema es que algunas de estas tradiciones están equivocadas — no solo ligeramente equivocadas, sino demostrable, medible, experimentalmente equivocadas. Y seguirlas empeora tu barbacoa.</p>

<h2>Mentira #1: Remoja las Virutas de Madera Antes de Ahumar</h2>

<p>Este es el mito más persistente en el barbecue. Lo escuchas de cada abuela, cada gurú del BBQ de tercera generación, cada artículo de internet del 2008. También es completamente falso.</p>

<p>Lo que realmente sucede cuando pones una viruta de madera mojada sobre una fuente de calor: primero, el agua se evapora. Esta fase toma tiempo y consume energía térmica — no produce humo, no produce sabor, no hace nada útil. Luego, una vez que la madera alcanza 150°C, comienza la pirólisis real y la madera empieza a arder. La madera mojada tarda más en llegar a esa temperatura porque primero debe perder toda esa humedad, pero una vez allí, arde a la misma velocidad que la madera seca.</p>

<p>La prueba: puse virutas remojadas y secas en porciones iguales sobre un quemador de gas. Ambas comenzaron a producir humo prácticamente al mismo tiempo. La madera mojada produjo humo "sucio" blanco-gris durante la fase de evaporación del agua — exactamente el tipo de humo que no quieres sobre tu comida.</p>

<h2>Mentira #2: Sellar Fija los Jugos</h2>

<p>La verdad: sellar crea la reacción de Maillard — dorado, sabor, costra. Es algo valioso. Pero no hace nada para retener los jugos. Puedes medirlo: sella un bistec, luego termínalo en el horno. Sella otro bistec y termínalo también en el horno. Pesa la pérdida de humedad en ambos. Es la misma. La costra no es impermeable.</p>

<h2>Mentira #3: Reposa la Carne "Para Redistribuir los Jugos"</h2>

<p>Lo que realmente sucede es que las fibras musculares se relajan y dejan de expulsar activamente los líquidos cuando se cortan. La carne reposada tiene menos jugos en la tabla de cortar no porque los jugos hayan vuelto adentro, sino porque las fibras ya no los están comprimiendo activamente hacia afuera.</p>

<h2>Mentira #4: El "Stall" Es Algo Que Combatir</h2>

<p>El stall — la meseta de temperatura que ocurre típicamente a 65-74°C en briskets y paletas de cerdo — no es un problema que resolver. Es una fase necesaria. Envolver en papel aluminio acelera superar el stall reteniendo calor y humedad, pero hay una compensación: ablanda la costra. No existe una forma universalmente correcta.</p>

<h2>Mentira #5: Con Hueso = Más Sabor</h2>

<p>La ciencia es clara: las proteínas y grasas del hueso no migran a la carne durante la cocción en cantidades medibles. El hueso conduce el calor de manera diferente a la carne, lo que puede afectar los tiempos de cocción localmente cerca del hueso. Pero la idea de que mantener el hueso agrega sabor a la carne circundante no está respaldada por pruebas a ciegas.</p>`,
    },
  },

  // What Competition BBQ Taught Me
  onuw8enzfdnnwky099epznrr: {
    it: {
      title:
        "Cosa La Gara di BBQ Mi Ha Insegnato sulla Cottura in Cortile",
      slug: "gara-bbq-lezioni-cottura-cortile",
      excerpt:
        "Dodici anni nel circuito KCBS mi hanno insegnato più sulla cottura — e su me stesso — di qualsiasi libro, corso o video YouTube. Ecco le lezioni che contano davvero per il tuo barbecue del weekend.",
      content: `<h2>Il Giorno in Cui Ho Capito che Non Ero Bravo</h2>

<p>La mia prima gara KCBS è stata nel 2014 in un circolo fieristico nel Missouri. A quel punto affumicavo carne da circa otto anni, e pensavo di essere piuttosto bravo. I miei vicini mi dicevano che ero piuttosto bravo. La mia famiglia mi diceva che ero piuttosto bravo. Mi sono presentato con il mio Weber Smokey Mountain, un frigorifero pieno di brisket Choice e costolette St. Louis spare, e l'incrollabile fiducia di un uomo che non è mai stato valutato onestamente.</p>

<p>Sono arrivato 47° su 52 squadre.</p>

<p>Non 47° in una categoria — 47° in classifica generale. Il mio brisket ha preso un 6 (su 9) in apparenza. Le mie costolette hanno preso un 5 in morbidezza. Il mio pollo è stato descritto su una scheda commento di un giudice come "secco." Ho guidato verso casa in silenzio, ripensando ogni decisione che avevo preso durante l'evento di due giorni.</p>

<h2>Lezione #1: Il Feedback Onesto È Raro e Prezioso</h2>

<p>In un cortile, le persone ti diranno che il tuo barbecue è buono. Ti diranno questo se è davvero eccellente e ti diranno anche se è mediocre, perché la valutazione onesta del cibo di qualcuno è socialmente scomoda. Alle gare, ottieni numeri. I numeri non mentono.</p>

<p>La cosa più preziosa che la competizione mi ha dato è stata la volontà di cercare feedback onesti al di fuori della gara. Ho iniziato a portare campioni di carne di maiale tirata a negozi di BBQ locali e a chiedere al personale cosa ne pensavano effettivamente. Ho trovato gruppi di degustazione online disposti a ricevere carne per posta e darmi valutazioni numeriche anonime. Sono diventato meno difensivo riguardo alla critica.</p>

<h2>Lezione #2: La Consistenza Batte la Perfezione Occasionale</h2>

<p>Ho visto squadre che hanno messo in gara barbecue che a volte producevano carne straordinaria e a volte producevano carne decente, e hanno perso rispetto a squadre che producevano carne costantemente eccellente ogni singola volta. La variabilità è un difetto di competizione. In un contesto di cortile, è semplicemente frustrante — il tipo di frustrazione che ti fa dire "Non so perché questo brisket è riuscito così bene ma quello dell'anno scorso era meno buono."</p>

<p>La consistenza viene dai processi documentati. Tempo di iniezione, quantità di salamoia, temperatura di target, test della sonda — tutto scritto, tutto ripetuto, tutto monitorato. Ho iniziato a tenere registri delle cotture nel 2015 e la mia consistenza è migliorata in modo misurabile.</p>

<h2>Lezione #3: L'Attrezzatura Ha Meno Importanza di Quanto Pensi</h2>

<p>Alle mie prime gare, guardavo le grandi squadre con i loro Jambo e Gator Pit custom da 10.000-30.000€ e pensavo che stessero vincendo per via dell'attrezzatura. Poi ho visto una squadra con un WSM da 18 pollici produrre pollo degno del secondo posto a un evento regionale.</p>

<p>La verità è che la grande attrezzatura ti dà più capacità e consistenza termica migliore, ma non ti dà capacità se non la hai già. Ho visto più brisket rovinati su affumicatori costosi di quanti ne abbia visti rovinati su quelli economici, perché le persone con affumicatori costosi spesso assumono che l'attrezzatura stia facendo il lavoro. Non è così.</p>

<h2>Lezione #4: I Giudici Non Ti Premiano per Essere Audace</h2>

<p>Il mio profilo di sapore iniziale era aggressivo — heavy rub di pepe nero, nessuna salsa, bark molto scuro. Ai miei amici piaceva. Ai giudici KCBS no. Gli standard KCBS premiano la carne equilibrata, dolce, che si apre facilmente e ha un sapore di fumo pronunciato ma non dominante. Questo non è necessariamente il barbecue "migliore" — è il barbecue che vince le gare KCBS.</p>

<p>La lezione del cortile: cucina per il tuo pubblico. Conosci il tuo pubblico. Se stai cucinando per persone che amano il bark pesante e audace, ottimo. Se stai cucinando per una folla mista che include bambini e persone che non fumano regolarmente, probabilmente vai verso qualcosa di più accessibile.</p>`,
    },
    es: {
      title:
        "Lo Que las Competencias de BBQ Me Enseñaron Sobre Cocinar en el Patio",
      slug: "competencias-bbq-lecciones-cocinar-patio",
      excerpt:
        "Doce años en el circuito KCBS me enseñaron más sobre cocinar — y sobre mí mismo — que cualquier libro, curso o video de YouTube. Aquí están las lecciones que realmente importan para tu barbacoa del fin de semana.",
      content: `<h2>El Día que Aprendí que No Era Bueno</h2>

<p>Mi primera competencia KCBS fue en 2014 en un recinto ferial en Missouri. Había estado ahumando carne durante unos ocho años en ese punto, y pensaba que era bastante bueno. Mis vecinos me decían que era bastante bueno. Mi familia me decía que era bastante bueno. Me presenté con mi Weber Smokey Mountain, una hielera llena de brisket Choice y costillas spare St. Louis, y la confianza inquebrantable de un hombre que nunca ha sido evaluado honestamente.</p>

<p>Terminé en el puesto 47 de 52 equipos.</p>

<p>No 47 en una categoría — 47 en la clasificación general. Mi brisket recibió un 6 (de 9) en apariencia. Mis costillas recibieron un 5 en ternura. Mi pollo fue descrito en la tarjeta de comentarios de un juez como "seco." Manejé a casa en silencio.</p>

<h2>Lección #1: La Retroalimentación Honesta Es Rara y Valiosa</h2>

<p>En el patio, la gente te dirá que tu barbacoa es buena. Te dirán esto si es realmente excelente y también si es mediocre, porque la evaluación honesta de la comida de alguien es socialmente incómoda. En las competencias, obtienes números. Los números no mienten.</p>

<p>La cosa más valiosa que la competencia me dio fue la disposición a buscar retroalimentación honesta fuera de la competencia. Empecé a llevar muestras de cerdo deshebrado a tiendas de BBQ locales y pedirles al personal qué pensaban realmente. Me volví menos defensivo sobre la crítica.</p>

<h2>Lección #2: La Consistencia Supera a la Perfección Ocasional</h2>

<p>La consistencia viene de procesos documentados. Tiempo de inyección, cantidad de salmuera, temperatura objetivo, prueba de sonda — todo escrito, todo repetido, todo monitoreado. Empecé a llevar registros de cocciones en 2015 y mi consistencia mejoró de manera medible.</p>

<h2>Lección #3: El Equipo Importa Menos de lo que Piensas</h2>

<p>La gran verdad es que el gran equipo te da más capacidad y mejor consistencia térmica, pero no te da habilidad si no la tienes ya. He visto más briskets arruinados en ahumadores caros que en baratos, porque las personas con ahumadores caros a menudo asumen que el equipo está haciendo el trabajo. No lo está.</p>

<h2>Lección #4: Los Jueces No Te Premian por Ser Audaz</h2>

<p>Los estándares KCBS premian la carne equilibrada, dulce, que se desmenuza fácilmente y tiene un sabor a humo pronunciado pero no dominante. La lección del patio: cocina para tu audiencia. Si estás cocinando para personas que aman la costra pesada y audaz, perfecto. Si estás cocinando para una multitud mixta, probablemente vayas hacia algo más accesible.</p>`,
    },
  },
};

// ============================================================
// RECIPES — 4 nuove
// ============================================================

const recipeTranslations = {
  // Competition-Style Pork Shoulder
  b4s60ez07ct83tl57og8edwf: {
    it: {
      title: "Spalla di Maiale Stile Competizione — 14 Ore di Affumicatura con Iniezione",
      slug: "spalla-maiale-stile-competizione-14-ore-affumicatura-iniezione",
      excerpt:
        "Il metodo vero della spalla di maiale da competizione: iniettata, massaggiata la notte prima, affumicata a 107°C per 14-16 ore con una strategia specifica per la formazione della corteccia. Nessuna scorciatoia, nessun avvolgimento anticipato, nessuna scusa per quanto tempo ci vuole.",
      editorial_intro: `<p>Ho cucinato più di trecento spalle di maiale in vent'anni di gare. Ho piazzato in eventi KCBS, ho fallito spettacolarmente davanti ai giudici e ho servito abbastanza maiale sfilacciato alle feste in cortile da riempire una piscina. Questa ricetta è la distillazione di tutto quello che ho imparato — non la versione semplificata, non la versione rapida, ma il metodo completo.</p>

<p>Se vuoi qualcosa di più semplice, vai su YouTube. Se vuoi qualcosa che produca carne da competizione che farà fermare la gente mentre mangiano e chiedersi cosa ci hai messo, continua a leggere.</p>`,
    },
    es: {
      title: "Paleta de Cerdo Estilo Competición — 14 Horas de Ahumado con Inyección",
      slug: "paleta-cerdo-estilo-competicion-14-horas-ahumado-inyeccion",
      excerpt:
        "El método real de la paleta de cerdo de competición: inyectada, con rub la noche anterior, ahumada a 107°C por 14-16 horas con una estrategia específica para la formación de la costra. Sin atajos, sin envolver antes de tiempo, sin disculpas por cuánto tiempo lleva.",
      editorial_intro: `<p>He cocinado más de trescientas paletas de cerdo en veinte años de competencias. He colocado en eventos KCBS, he fallado espectacularmente frente a los jueces y he servido suficiente cerdo deshebrado en fiestas de patio para llenar una piscina. Esta receta es la destilación de todo lo que he aprendido.</p>

<p>Si quieres algo más simple, ve a YouTube. Si quieres algo que produzca carne de competición que haga que la gente se detenga mientras come y pregunte qué le pusiste, sigue leyendo.</p>`,
    },
  },

  // Reverse-Seared Tomahawk Ribeye
  f96s527nhldcr775efseh4h0: {
    it: {
      title: "Tomahawk Ribeye Scottato al Contrario — Metodo a Due Zone",
      slug: "tomahawk-ribeye-scottato-contrario-metodo-due-zone",
      excerpt:
        "Il metodo definitivo per un ribeye con osso da 5 cm: cottura lenta a 49°C interno, riposo, poi scottatura su brace viva incandescente. Temperature specifiche, tempi precisi e il protocollo di riposo che la maggior parte delle persone sbaglia.",
      editorial_intro: `<p>La scottatura al contrario è il singolo avanzamento tecnico più importante nella cottura della bistecca negli ultimi vent'anni, e ci morirei su questa collina. Il metodo tradizionale — scottatura prima, poi finitura nel forno o sul calore indiretto — era il modo in cui ogni steakhouse e ogni libro di cucina ti insegnava a cucinare le bistecche spesse. Era anche sbagliato.</p>

<p>La logica è semplice: vuoi una bistecca cotta uniformemente da bordo a bordo, con una crosta perfetta all'esterno. Il calore diretto ad alta temperatura crea un gradiente di cottura — il bordo è ben fatto mentre il centro è ancora raro. Il calore indiretto basso produce una cottura uniforme senza quel gradiente. La crosta viene per ultima, quando la carne è esattamente dove la vuoi internamente.</p>`,
    },
    es: {
      title: "Tomahawk Ribeye al Revés — Método de Dos Zonas",
      slug: "tomahawk-ribeye-sellado-al-reves-metodo-dos-zonas",
      excerpt:
        "El método definitivo para un ribeye con hueso de 5 cm: cocción lenta a 49°C interno, reposo, luego sellado sobre brasas al rojo vivo. Temperaturas específicas, tiempos exactos y el protocolo de reposo que la mayoría hace mal.",
      editorial_intro: `<p>El sellado al revés es el único avance técnico más importante en la cocción de bistec en los últimos veinte años, y moriría en esa colina. El método tradicional — sellar primero, luego terminar en el horno o calor indirecto — era la forma en que cada steakhouse y cada libro de cocina te enseñaba a cocinar bistecs gruesos. También estaba equivocado.</p>

<p>La lógica es simple: quieres un bistec cocido uniformemente de borde a borde, con una costra perfecta por fuera. El calor directo de alta temperatura crea un gradiente de cocción. El calor indirecto bajo produce una cocción uniforme sin ese gradiente. La costra viene al final, cuando la carne está exactamente donde la quieres internamente.</p>`,
    },
  },

  // Smoked Chicken Wings Crispy
  q5t73cpgrjsxunj477tvtx7w: {
    it: {
      title: "Ali di Pollo Affumicate — Croccanti Senza Friggere",
      slug: "ali-pollo-affumicate-croccanti-senza-friggere",
      excerpt:
        "Il trucco del lievito in polvere, la finitura ad alta temperatura e i tempi della salsa che ti danno ali affumicate croccanti da competizione senza una goccia di olio per friggere. Novanta minuti dall'inizio alla fine.",
      editorial_intro: `<p>Le ali affumicate hanno un problema di reputazione. La maggior parte delle persone ha avuto esperienze con ali gommose, dalla pelle flaccida e deludenti che sanno di fumo ma hanno la consistenza dell'orribile. Il sapore di fumo è ottimo; la consistenza è orribile. Le ali fritte hanno la croccantezza ma nessun fumo. Questa ricetta risolve entrambi i problemi.</p>

<p>Il segreto è il lievito in polvere — non il bicarbonato, il lievito in polvere. Aumenta il pH della pelle, che accelera la reazione di Maillard e aiuta a rendere il grasso sottocutaneo. Combinalo con una salamoia a secco durante la notte e una finitura ad alta temperatura, e otterrai ali con la croccantezza della frittura e lo strato di fumo dell'affumicatura.</p>`,
    },
    es: {
      title: "Alitas de Pollo Ahumadas — Crujientes Sin Freír",
      slug: "alitas-pollo-ahumadas-crujientes-sin-freir",
      excerpt:
        "El truco del polvo de hornear, el acabado a alta temperatura y el momento de la salsa que te dan alitas ahumadas crujientes de competición sin una gota de aceite para freír. Noventa minutos de principio a fin.",
      editorial_intro: `<p>Las alitas ahumadas tienen un problema de reputación. La mayor parte de la experiencia de la gente con ellas es decepcionante — piel gomosa, flácida, con sabor a humo pero textura horrible. El sabor a humo es genial; la textura es terrible. Las alitas fritas tienen el crujido pero nada de humo. Esta receta resuelve ambos problemas.</p>

<p>El secreto es el polvo de hornear — no el bicarbonato de sodio, el polvo de hornear. Eleva el pH de la piel, lo que acelera la reacción de Maillard y ayuda a rendir la grasa subcutánea. Combínalo con una salmuera seca overnight y un acabado a alta temperatura, y obtendrás alitas con el crujido de lo frito y la capa de humo del ahumado.</p>`,
    },
  },

  // Burnt Ends Kansas City Style
  i7potp5m3dz61gynean8ozwx: {
    it: {
      title:
        "Burnt Ends — Stile Kansas City, dalla Punta del Brisket",
      slug: "burnt-ends-stile-kansas-city-punta-brisket",
      excerpt:
        "I veri burnt ends vengono dalla punta di un brisket packer intero, non da chuck roast pre-tagliato a cubetti o scorciatoie con pancetta di maiale. Ecco il metodo completo: affumica il brisket intero, separa la punta, tagliala a cubetti, condisci con la salsa e rimandala per la caramellizzazione che rende i burnt ends leggendari.",
      editorial_intro: `<p>I burnt ends sono la cosa migliore mai uscita dal barbecue di Kansas City, e includo la salsa di Arthur Bryant e il sandwich Z-Man di Joe's in questo confronto. Sono cubetti di punta di brisket affumicata, grassa e glassata con la salsa che sono stati cotti due volte — prima come parte del brisket intero e poi di nuovo da soli finché non diventano questi sacchetti di sapore caramellato e concentrato.</p>

<p>Il problema con la maggior parte delle ricette di burnt ends su internet è che non usano la vera punta del brisket. Usano chuck roast — che è più economico, più facile da trovare e cuoce più velocemente. Non sono burnt ends. Sono cubetti di carne affumicati con la salsa. Non accetterò questa scorciatoia, e nemmeno tu dovresti.</p>`,
    },
    es: {
      title:
        "Burnt Ends — Estilo Kansas City, de la Punta del Brisket",
      slug: "burnt-ends-estilo-kansas-city-punta-brisket",
      excerpt:
        "Los verdaderos burnt ends vienen de la punta de un brisket packer entero, no de chuck roast pre-cortado en cubos o atajos con panceta de cerdo. Aquí está el método completo: ahuma el brisket entero, separa la punta, córtala en cubos, salsea y regresa para la caramelización que hace legendarios a los burnt ends.",
      editorial_intro: `<p>Los burnt ends son la cosa más grande que jamás salió de la barbacoa de Kansas City, e incluyo la salsa de Arthur Bryant y el sándwich Z-Man de Joe's en esa comparación. Son cubos de punta de brisket ahumada, grasa, glaseada con salsa que han sido cocinados dos veces — primero como parte del brisket entero y luego de nuevo por sí solos hasta que se convierten en estas bolsas de sabor caramelizado y concentrado.</p>

<p>El problema con la mayoría de las recetas de burnt ends en internet es que no usan la verdadera punta del brisket. Usan chuck roast — más barato, más fácil de encontrar y se cocina más rápido. No son burnt ends. Son cubos de carne ahumada con salsa. No aceptaré este atajo, y tú tampoco deberías.</p>`,
    },
  },
};

// ============================================================
// TUTORIALS — 4 nuovi
// ============================================================

const tutorialTranslations = {
  // Thermometer Calibration Guide
  upjnhzex6cxjv6d48u8923mt: {
    it: {
      title:
        "Il Tuo Termometro Ti Sta Mentendo — Come Calibrare e Perché È Importante",
      slug: "termometro-mente-come-calibrare-perche-importante",
      excerpt:
        "Ogni termometro deriva. La maggior parte di quelli economici non era mai accurata per cominciare. Ecco come testare il tuo in 5 minuti, capire cosa significano effettivamente i numeri e sapere quando è ora di sostituirlo.",
      content: `<h2>La Tassa del Termometro da 15€</h2>

<p>Ecco qualcosa che succede ogni singolo weekend ai barbecue di tutta Italia: qualcuno toglie un brisket dall'affumicatore perché il termometro segna 95°C. Lo taglia e il centro è poco cotto — rigido, gommoso, non probe-tender. Dà la colpa alla sua tecnica, alla legna, al rub, all'allineamento dei pianeti. Non incolpa mai il termometro.</p>

<p>Ma il termometro stava mentendo. Leggeva 4°C alto, il che significa che la temperatura interna effettiva era 91°C — ancora nella zona di stallo per la conversione del collagene. Il brisket aveva bisogno di altri 45 minuti. Un termometro accurato avrebbe evitato l'intero problema.</p>

<h2>Come Testare il Tuo Termometro: Il Test del Bagno di Ghiaccio</h2>

<p>Questo test richiede cinque minuti e zero attrezzatura specializzata. Hai bisogno di: un bicchiere o tazza grande, cubetti di ghiaccio, acqua fredda e il tuo termometro.</p>

<p><strong>Passo 1:</strong> Riempi un bicchiere con cubetti di ghiaccio per circa tre quarti. Aggiungi acqua fredda fino a riempire gli spazi tra il ghiaccio. Mescola per circa trenta secondi. La temperatura dell'acqua ghiacciata scende a 0°C (32°F) quando è effettivamente in equilibrio — non basta che il ghiaccio galleggi nell'acqua, hai bisogno che ci sia abbastanza ghiaccio da raffreddare l'acqua fino al punto di congelamento.</p>

<p><strong>Passo 2:</strong> Inserisci la sonda del tuo termometro nel centro del bicchiere, assicurandoti che non tocchi le pareti o il fondo. Aspetta che la lettura si stabilizzi.</p>

<p><strong>Passo 3:</strong> Registra la lettura. Dovrebbe essere 0°C (32°F). Se legge 2°C, il tuo termometro è alto di 2°C. Se legge -1°C, è basso di 1°C.</p>

<h2>Il Test dell'Acqua Bollente</h2>

<p>Fai bollire dell'acqua in una pentola. Inserisci la sonda nel centro dell'acqua bollente (non toccare il fondo della pentola — è più caldo dell'acqua). A livello del mare, l'acqua bolle a 100°C (212°F). Ad alta quota, bolle a temperature inferiori — circa 99°C a 300 metri, 96°C a 1.200 metri.</p>

<p>Registra la lettura e confrontala con la temperatura di ebollizione attesa per la tua altitudine. Se il tuo termometro segna 104°C quando l'acqua dovrebbe bollire a 100°C, è 4°C alto.</p>

<h2>Interpretare i Risultati</h2>

<p><strong>Entro ±1°C:</strong> Il tuo termometro è eccellente. Non fare niente.</p>
<p><strong>±2-3°C:</strong> Accettabile per uso generale, ma tienilo a mente. Per tagli critici di temperatura come il pollame (165°F/74°C sicuro), considera di compensare o aggiornare.</p>
<p><strong>±4°C o più:</strong> Questo termometro sta attivamente rovinando le tue cotture. Sostituiscilo.</p>
<p><strong>Letture incoerenti tra i test:</strong> Peggio di una deriva costante. Un termometro che legge diversamente ogni volta che lo usi non può essere compensato. Buttalo via.</p>

<h2>Quando Sostituire vs Calibrare</h2>

<p>La maggior parte dei termometri per carne di consumo non è calibrabile — non hanno una vite di regolazione o un processo di offset software. Se il tuo termometro deriva, lo stai aggiornando.</p>

<p>I termometri ThermoWorks della fascia alta (Thermapen, ThermoPop) possono essere inviati a ThermoWorks per la ricalibratura per una piccola quota. Vale la pena per lo Thermapen ONE a 100€. Non vale la pena per il termometro da 20€ che probabilmente compra il 90% dei cuochi.</p>`,
    },
    es: {
      title:
        "Tu Termómetro Te Está Mintiendo — Cómo Calibrar y Por Qué Importa",
      slug: "termometro-miente-como-calibrar-por-que-importa",
      excerpt:
        "Cada termómetro se desvía. La mayoría de los baratos nunca fueron precisos para empezar. Aquí está cómo probar el tuyo en 5 minutos, entender qué significan realmente los números y saber cuándo es momento de reemplazarlo.",
      content: `<h2>El Impuesto del Termómetro de 15€</h2>

<p>Aquí algo que sucede cada fin de semana en asados de toda España: alguien saca un brisket del ahumador porque el termómetro marca 95°C. Lo corta y el centro está poco cocido — rígido, gomoso, sin poder pinchar. Culpa a su técnica, a la madera, al rub, al alineamiento de los planetas. Nunca culpa al termómetro.</p>

<p>Pero el termómetro estaba mintiendo. Leía 4°C alto, lo que significa que la temperatura interna real era 91°C — todavía en la zona de estancamiento para la conversión del colágeno. El brisket necesitaba otros 45 minutos. Un termómetro preciso habría evitado todo el problema.</p>

<h2>Cómo Probar Tu Termómetro: La Prueba del Baño de Hielo</h2>

<p>Esta prueba requiere cinco minutos y cero equipo especializado.</p>

<p><strong>Paso 1:</strong> Llena un vaso con cubitos de hielo hasta tres cuartos. Agrega agua fría hasta llenar los espacios entre el hielo. Revuelve por unos treinta segundos. La temperatura del agua con hielo cae a 0°C (32°F) cuando está efectivamente en equilibrio.</p>

<p><strong>Paso 2:</strong> Inserta la sonda de tu termómetro en el centro del vaso, asegurándote de que no toque las paredes o el fondo. Espera a que la lectura se estabilice.</p>

<p><strong>Paso 3:</strong> Registra la lectura. Debería ser 0°C (32°F). Si lee 2°C, tu termómetro está 2°C alto.</p>

<h2>La Prueba del Agua Hirviendo</h2>

<p>Hierve agua en una olla. Inserta la sonda en el centro del agua hirviendo (sin tocar el fondo). Al nivel del mar, el agua hierve a 100°C (212°F). A mayor altitud, hierve a temperaturas menores — aproximadamente 99°C a 300 metros, 96°C a 1.200 metros.</p>

<h2>Interpretar los Resultados</h2>

<p><strong>Dentro de ±1°C:</strong> Tu termómetro es excelente. No hagas nada.</p>
<p><strong>±2-3°C:</strong> Aceptable para uso general, pero tenlo en mente. Para cortes de temperatura crítica como las aves (74°C seguro), considera compensar o actualizar.</p>
<p><strong>±4°C o más:</strong> Este termómetro está arruinando activamente tus cocciones. Reemplázalo.</p>
<p><strong>Lecturas inconsistentes entre pruebas:</strong> Peor que una desviación constante. Un termómetro que lee diferente cada vez que lo usas no puede compensarse. Tíralo.</p>`,
    },
  },

  // Fire Management 101
  n6m4kpb57trvhrq74ybt5i1k: {
    it: {
      title:
        "Gestione del Fuoco 101: Perché il Tuo Offset Brucia Troppo Caldo e Troppo Freddo",
      slug: "gestione-fuoco-101-offset-brucia-troppo-caldo-freddo",
      excerpt:
        "Fumo azzurro sottile vs fumo bianco denso. Dimensione del fuoco vs dimensione del letto di braci. Quando aggiungere legna vs quando regolare i registri. I fondamentali che separano i principianti in difficoltà dai pitmaster sicuri.",
      content: `<h2>L'Unica Abilità Che Conta di Più</h2>

<p>Posso insegnare a qualcuno come condire un brisket in cinque minuti. Posso spiegare le ricette di iniezione in dieci. Rifilare richiede forse un'ora di pratica. Ma la gestione del fuoco — la capacità di mantenere una temperatura costante in un affumicatore stick-burning per 12+ ore — richiede mesi di pratica e una comprensione genuina della fisica della combustione. È l'unica abilità che separa il grande barbecue da quello mediocre, ed è l'unica abilità che la maggior parte dei principianti sottovaluta completamente.</p>

<p>Ecco la verità scomoda: il tuo offset non è "difficile da usare." Stai semplicemente chiedendo al fuoco di fare qualcosa che il fuoco non vuole fare naturalmente. Il fuoco vuole bruciare caldo e senza restrizioni. Tu vuoi che bruci a temperature precise e costanti per molte ore. Questi due obiettivi sono in conflitto, e la gestione del fuoco è il modo in cui li riconcili.</p>

<h2>Fumo Azzurro Sottile vs Fumo Bianco Denso</h2>

<p>Il fumo azzurro sottile — quasi invisibile, con un lieve colore bluastro — è quello che vuoi. Questo fumo contiene i composti aromatici desiderati (guaiacolo, siringolo, vanillina) in basse concentrazioni che si depositano sulla carne e creano sapore. È prodotto da legna che brucia completamente a temperature elevate con un'adeguata offerta di ossigeno.</p>

<p>Il fumo bianco denso contiene acqua non evaporata, composti di catrame e aldeidi che creano sapori amari e acre sulla carne. È prodotto da legna che brucia a bassa temperatura con ossigeno insufficiente — combustione incompleta. Questo fumo rende il cibo peggiore. Se vedi fumo bianco denso che esce dal tuo affumicatore, hai un problema di fuoco da risolvere prima di caricare la carne.</p>

<h2>Costruire il Tuo Fuoco: Letto di Braci Prima, Legna Dopo</h2>

<p>L'errore più comune dei principianti è tentare di gestire un affumicatore a offset con solo legna che brucia. Il legno produce sapore; le braci producono calore. Hai bisogno di entrambi, e hai bisogno di gestirli separatamente nella tua testa.</p>

<p><strong>Fase 1 — Letto di braci:</strong> Inizia con un cesto di ciminiera di bricchette nel fogolar. Brucia completamente fino a diventare braci grigie. Questo è il tuo generatore di calore base. Ci vorranno 25-30 minuti.</p>

<p><strong>Fase 2 — Prima legna:</strong> Aggiungi 2-3 tronchi spaccati (18-20 cm di lunghezza) sul letto di braci. Apri completamente i registri. Lascia che la legna si accenda completamente e bruci a fiamma viva prima di caricare la carne — solitamente 10-15 minuti.</p>

<p><strong>Fase 3 — Mantenimento:</strong> Una volta che la legna brucia completamente e la temperatura si stabilizza, carica la carne e regola i registri per raggiungere la tua temperatura target. Aggiungi un tronco ogni 45-75 minuti per mantenere il letto di braci.</p>

<h2>Lettura dei Vent d'Aria dell'Offset</h2>

<p>Il registro del fogolar controlla il flusso d'aria in entrata — il carburante per la combustione. Il registro del camino controlla l'estrazione dei gas di combustione. La maggior parte dei principianti pensa che il registro del camino sia il "controllo della temperatura." Non è così — è il controllo della quantità di ossigeno che rimane nella camera di cottura.</p>

<p>Regola principalmente tramite il registro del fogolar. Il registro del camino dovrebbe essere aperto all'80-100% durante la maggior parte delle cotture — limitare il camino crea fumo sporco catturandovi i gas di combustione. Abbassa la temperatura principalmente riducendo il flusso d'aria del fogolar, non stranglando il camino.</p>`,
    },
    es: {
      title:
        "Manejo del Fuego 101: Por Qué tu Offset Corre Caliente y Frío",
      slug: "manejo-fuego-101-offset-corre-caliente-frio",
      excerpt:
        "Humo azul delgado vs humo blanco denso. Tamaño del fuego vs tamaño del lecho de brasas. Cuándo agregar madera vs cuándo ajustar los registros. Los fundamentos que separan a los principiantes en apuros de los pitmasters seguros.",
      content: `<h2>La Única Habilidad Que Más Importa</h2>

<p>Puedo enseñarle a alguien cómo sazonar un brisket en cinco minutos. Puedo explicar recetas de inyección en diez. Recortar toma quizás una hora de práctica. Pero el manejo del fuego — la capacidad de mantener una temperatura consistente en un ahumador de leña por 12+ horas — requiere meses de práctica y una comprensión genuina de la física de la combustión. Es la única habilidad que separa la gran barbacoa de la mediocre.</p>

<p>La verdad incómoda: tu offset no es "difícil de usar." Simplemente le estás pidiendo al fuego que haga algo que el fuego no quiere hacer naturalmente. El fuego quiere quemar caliente y sin restricciones. Tú quieres que queme a temperaturas precisas y consistentes por muchas horas. Estos dos objetivos están en conflicto, y el manejo del fuego es cómo los reconcilias.</p>

<h2>Humo Azul Delgado vs Humo Blanco Denso</h2>

<p>El humo azul delgado — casi invisible, con un ligero color azulado — es lo que quieres. Este humo contiene los compuestos aromáticos deseados en bajas concentraciones que se depositan en la carne y crean sabor. Es producido por madera que se quema completamente a altas temperaturas con adecuado suministro de oxígeno.</p>

<p>El humo blanco denso contiene agua no evaporada, compuestos de alquitrán y aldehídos que crean sabores amargos y acre en la carne. Es producido por madera que se quema a baja temperatura con oxígeno insuficiente — combustión incompleta. Si ves humo blanco denso saliendo de tu ahumador, tienes un problema de fuego que resolver antes de cargar la carne.</p>

<h2>Construyendo Tu Fuego: Lecho de Brasas Primero, Madera Después</h2>

<p><strong>Fase 1 — Lecho de brasas:</strong> Comienza con una chimenea llena de briquetas en el fogón. Quema completamente hasta convertirse en brasas grises. Este es tu generador de calor base. Tomará 25-30 minutos.</p>

<p><strong>Fase 2 — Primera madera:</strong> Agrega 2-3 troncos partidos (18-20 cm de largo) sobre el lecho de brasas. Abre completamente los registros. Deja que la madera se encienda completamente y arda con llama viva antes de cargar la carne — usualmente 10-15 minutos.</p>

<p><strong>Fase 3 — Mantenimiento:</strong> Una vez que la madera arde completamente y la temperatura se estabiliza, carga la carne y ajusta los registros para alcanzar tu temperatura objetivo. Agrega un tronco cada 45-75 minutos para mantener el lecho de brasas.</p>

<h2>Leyendo los Registros del Offset</h2>

<p>El registro del fogón controla el flujo de aire entrante. El registro de la chimenea controlla la extracción de gases de combustión. Regula principalmente a través del registro del fogón. El registro de la chimenea debería estar abierto al 80-100% durante la mayoría de las cocciones — limitar la chimenea crea humo sucio al atrapar los gases de combustión. Baja la temperatura principalmente reduciendo el flujo de aire del fogón, no estrangulando la chimenea.</p>`,
    },
  },

  // BBQ Rub Bible
  zdwsprw5pe1pb9aadax1h8nb: {
    it: {
      title: "La Bibbia del Rub BBQ: Costruire il Sapore da Zero",
      slug: "bibbia-rub-bbq-costruire-sapore-da-zero",
      excerpt:
        "Proporzioni di sale in peso, tipi di zucchero e quando conta ciascuno, tempistica di applicazione, strategie di stratificazione e gli errori comuni che trasformano un buon rub in un casino opprimente.",
      content: `<h2>Perché la Maggior Parte dei Rub Fatti in Casa Sono Cattivi</h2>

<p>Ogni sito di BBQ ha una "ricetta segreta del rub" che è fondamentalmente aglio in polvere, cipolla in polvere, paprika, zucchero di canna e sale in proporzioni variabili. Non sono cattivi, esattamente — sono solo generici. Sanno uguale su maiale, manzo, pollo e pesce perché sono progettati per essere inoffensivi piuttosto che specificamente deliziosi. Un ottimo rub è costruito partendo dalla carne all'indietro — iniziando da ciò di cui la proteina ha bisogno e costruendo sapori che complementano piuttosto che mascherano.</p>

<h2>Il Componente #1: Sale (Non Opzionale)</h2>

<p>Il sale non è una "spezia" nel senso di un condimento. È un agente di trasformazione. A livello molecolare, il sale rompe le proteine muscolari, trattiene l'umidità e trasporta il sapore in profondità nella carne. Senza sale adeguato, il tuo rub è topico — si siede sulla superficie ma non penetra.</p>

<p><strong>Rapporti di sale per il rub secco:</strong> Per le cotture corte (meno di quattro ore), usa 1,5-2% del peso della carne in sale kosher. Per le cotture lunghe (più di quattro ore), usa 1% — il sale continuerà ad agire durante la cottura. Per il dry brining (la tecnica migliore), applica il sale separatamente 12-24 ore prima del rub — usa 0,5% del peso della carne.</p>

<h2>Il Componente #2: Zucchero (Capire il Contesto)</h2>

<p>Lo zucchero caramellizza sopra i 160°C e brucia sopra i 175°C. Questo crea due problemi a seconda del tuo metodo di cottura:</p>

<p>Per il low-and-slow (107-135°C), lo zucchero aggiunge sapore di caramello e aiuta a costruire la corteccia senza bruciare. Usalo liberamente — fino al 20-25% del tuo rub per volume. Lo zucchero di canna muscovado aggiunge melassa e complessità. Il turbinado aggiunge cristalli più grandi che resistono durante lunghe cotture. Il miele in polvere aggiunge dolcezza floreale.</p>

<p>Per le cotture ad alta temperatura (sopra i 230°C), lo zucchero brucerà prima che la carne sia cotta, creando amaro. Elimina o riduci drasticamente lo zucchero nelle grigliature hot-and-fast. Il peperoncino in polvere e la paprika aggiungono colore senza bruciare.</p>

<h2>Costruire per la Carne Specifica</h2>

<p><strong>Manzo:</strong> Il manzo di qualità ha già sapore profondo — il tuo lavoro è amplificarlo, non coprirlo. Sale pesante + pepe nero grosso + aglio in polvere + un tocco di coriandolo è il Texas classico per una ragione. Non aggiungere spezie eccessive. Non aggiungere molta paprika (il manzo non ha bisogno del colore extra). Sicuramente non aggiungere cannella o pimento.</p>

<p><strong>Maiale:</strong> Il maiale è la proteina più perdonante e quella con cui funziona meglio il profilo di sapore sweet-savory-spicy. Lo zucchero di canna è il tuo amico. Così lo è la paprika affumicata. Chipotle in polvere aggiunge profondità. Pepe di cayenna aggiunge calore senza bruciare a basse temperature.</p>

<p><strong>Pollo:</strong> Il pollo è delicato e richiede rub che complementino piuttosto che sopraffare. Spezie più leggere — erbe secche (timo, rosmarino), aglio, limone in polvere. Attenzione con il fumo — il pollo assorbe il fumo più velocemente del manzo o del maiale e può diventare amaro facilmente.</p>

<h2>Tempistica di Applicazione</h2>

<p>Applica il rub almeno 1 ora prima della cottura, idealmente 12-24 ore prima per le cotture lunghe. Il sale ha bisogno di tempo per penetrare. Il "dry brining" — applicare sale solo 24 ore prima, poi applicare il resto del rub 1 ora prima della cottura — produce risultati superiori rispetto all'applicazione di tutto in una volta immediatamente prima della cottura.</p>`,
    },
    es: {
      title: "La Biblia del Rub BBQ: Construyendo Sabor desde Cero",
      slug: "biblia-rub-bbq-construir-sabor-desde-cero",
      excerpt:
        "Proporciones de sal en peso, tipos de azúcar y cuándo importa cada uno, timing de aplicación, estrategias de capas y los errores comunes que convierten un buen rub en un desastre abrumador.",
      content: `<h2>Por Qué la Mayoría de los Rubs Caseros Son Malos</h2>

<p>Cada sitio de BBQ tiene una "receta secreta de rub" que es básicamente ajo en polvo, cebolla en polvo, pimentón, azúcar morena y sal en proporciones variables. No son malos exactamente — son solo genéricos. Saben igual en cerdo, res, pollo y pescado porque están diseñados para ser inofensivos en lugar de específicamente deliciosos. Un gran rub se construye desde la carne hacia atrás.</p>

<h2>Componente #1: Sal (No Opcional)</h2>

<p>La sal no es una "especia" en el sentido de un condimento. Es un agente de transformación. A nivel molecular, la sal rompe las proteínas musculares, retiene la humedad y transporta el sabor profundamente en la carne. Sin sal adecuada, tu rub es tópico — se sienta en la superficie pero no penetra.</p>

<p><strong>Proporciones de sal para rub seco:</strong> Para cocciones cortas (menos de cuatro horas), usa 1,5-2% del peso de la carne en sal kosher. Para cocciones largas (más de cuatro horas), usa 1%. Para el dry brining, aplica sal por separado 12-24 horas antes del rub — usa 0,5% del peso de la carne.</p>

<h2>Componente #2: Azúcar (Entender el Contexto)</h2>

<p>El azúcar carameliza sobre 160°C y se quema sobre 175°C. Para low-and-slow (107-135°C), el azúcar agrega sabor a caramelo y ayuda a construir la costra sin quemarse. Úsala libremente — hasta el 20-25% de tu rub por volumen. Para cocciones a alta temperatura (sobre 230°C), el azúcar se quemará antes de que la carne esté cocida, creando amargura. Elimina o reduce drásticamente el azúcar en las parrilladas hot-and-fast.</p>

<h2>Construyendo para la Carne Específica</h2>

<p><strong>Res:</strong> La res de calidad ya tiene sabor profundo — tu trabajo es amplificarlo, no cubrirlo. Sal pesada + pimienta negra gruesa + ajo en polvo + un toque de cilantro es el Texas clásico por una razón.</p>

<p><strong>Cerdo:</strong> El cerdo es la proteína más perdonante y la que mejor funciona con el perfil sweet-savory-spicy. Azúcar morena, pimentón ahumado, chipotle en polvo, pimienta de cayena.</p>

<p><strong>Pollo:</strong> El pollo es delicado y requiere rubs que complementen en lugar de abrumar. Especias más ligeras — hierbas secas, ajo, limón en polvo. Cuidado con el humo — el pollo absorbe el humo más rápido que la res o el cerdo y puede volverse amargo fácilmente.</p>

<h2>Timing de Aplicación</h2>

<p>Aplica el rub al menos 1 hora antes de la cocción, idealmente 12-24 horas antes para cocciones largas. El "dry brining" — aplicar solo sal 24 horas antes, luego aplicar el resto del rub 1 hora antes de la cocción — produce resultados superiores comparado con aplicar todo a la vez inmediatamente antes.</p>`,
    },
  },

  // Charcoal vs Pellet vs Gas
  pztlz4i69wnpabfl29ar4ryg: {
    it: {
      title:
        "Carbone vs Pellet vs Gas: Il Confronto Onesto Che Nessuno Vuole Fare",
      slug: "carbone-vs-pellet-vs-gas-confronto-onesto",
      excerpt:
        "Pro e contro reali con differenze di sapore misurate, analisi del costo per cottura e la verità scomoda che il tipo di carburante 'migliore' dipende da domande che la maggior parte delle persone non si fa onestamente.",
      content: `<h2>Perché Questo Confronto È Sempre Disonesto</h2>

<p>Ogni articolo "carbone vs pellet vs gas" che hai letto è stato scritto da qualcuno che aveva già un'opinione prima di iniziare a scrivere. I puristi del carbone liquidano le griglie a pellet come forni Easy-Bake. I possessori di griglie a pellet deridono gli utenti di carbone per babysittare un fuoco. I possessori di griglie a gas ignorano entrambi gli argomenti e vogliono solo cucinare cena senza una laurea in scienze della combustione. Tutti hanno ragione su qualcosa e torto su tutto il resto.</p>

<p>Ho posseduto e cucinato ampiamente su tutti e tre i tipi di carburante per oltre vent'anni. Possiedo attualmente un kamado Big Green Egg, un Traeger Ironwood 885 e un Weber Summit S-470. Li uso tutti regolarmente. Ecco cosa è effettivamente vero.</p>

<h2>Sapore: La Verità Scomoda</h2>

<p>Il sapore è dove la maggior parte dei confronti fallisce perché nessuno vuole ammetterlo: c'è effettivamente una differenza misurabile tra i tipi di carburante, ma è molto più sottile di quanto i fanatici del carbone ti faranno credere.</p>

<p>In test alla cieca su brisket, costolette di maiale e cosce di pollo cucinati su tutti e tre i metodi: la maggior parte delle persone non riusciva a distinguere il carbone dal pellet per la carne di maiale e il pollo. Per il manzo, c'era una maggiore differenza percepibile — il carbone produceva note più terrrose e fumose che i mangiatori di carne preferivano leggermente. Per il pollo, il gas produceva risultati preferiti nel test alla cieca perché il controllo della temperatura era più facile.</p>

<h2>Controllo della Temperatura: Gas > Pellet > Carbone</h2>

<p>Il gas è il re del controllo della temperatura. Girare una manopola cambia la temperatura in 3-5 minuti. La cottura a due zone — calore diretto e indiretto — è facile su qualsiasi griglia a gas con più bruciatori. Per la grigliatura rapida di pesce, verdure e pollo in giornate lavorative, il gas è praticamente insostituibile.</p>

<p>Le griglie a pellet sono eccellenti nel controllo della temperatura per il basso e lento. I moderni sistemi PID mantengono le temperature entro ±10-15°F del target per 12-16 ore senza intervento. Sono orribili a temperature ultra-alte: la maggior parte non supera i 260-290°C, il che significa che non otterrai mai un sear da steakhouse su un pellet grill.</p>

<p>Il carbone richiede il maggiore sforzo per il controllo della temperatura, ma ha il massimo range: 107°C per l'affumicatura lenta a 450°C+ per lo searing estremo nel tuo kamado.</p>

<h2>Costo Per Cottura: Analisi Reale</h2>

<p><strong>Gas:</strong> Circa 0,80-1,50€ per kg di carne cucinata. Costo iniziale più alto per una griglia di qualità (800-2.000€+). Costo variabile più basso.</p>
<p><strong>Carbone:</strong> Circa 1,50-3€ per kg di carne affumicata, a seconda del carbone. Costo iniziale medio (300-500€ per un buon kamado o WSM). La legna è il costo ricorrente più alto per l'affumicatura offset.</p>
<p><strong>Pellet:</strong> Circa 2-4€ per kg di carne affumicata. I pellet costano 1-2€ per kg; consumi 500g-1kg per ora a 225°F. Costo iniziale alto per affumicatori a pellet di qualità (500-1.500€).</p>

<h2>La Risposta Giusta per Te</h2>

<p>Compra gas se: cucini principalmente grigliature veloci di carne in settimana, vuoi risultati affidabili con il minimo sforzo e hai un budget per una griglia di qualità.</p>

<p>Compra carbone se: vuoi imparare tecniche reali di barbecue, apprezzi il processo tanto quanto il risultato e sei disposto a investire il tempo per imparare la gestione del fuoco.</p>

<p>Compra pellet se: vuoi principalmente l'affumicatura senza babysittare un fuoco, il sapore di fumo è la tua priorità sull'autenticità del metodo, e non hai bisogno di searing ad alta temperatura.</p>

<p>Compra tutti e tre se: il BBQ è una passione seria e hai un budget e spazio per attrezzature multiple.</p>`,
    },
    es: {
      title:
        "Carbón vs Pellets vs Gas: La Comparación Honesta Que Nadie Quiere Hacer",
      slug: "carbon-vs-pellets-vs-gas-comparacion-honesta",
      excerpt:
        "Pros y contras reales con diferencias de sabor medidas, análisis del costo por cocción y la verdad incómoda de que el tipo de combustible 'mejor' depende de preguntas que la mayoría no se hace honestamente.",
      content: `<h2>Por Qué Esta Comparación Siempre Es Deshonesta</h2>

<p>Cada artículo "carbón vs pellets vs gas" que has leído fue escrito por alguien que ya tenía una opinión antes de empezar a escribir. Los puristas del carbón descartan las parrillas de pellets como hornos Easy-Bake. Los dueños de parrillas de pellets se burlan de los usuarios de carbón por cuidar un fuego. Los dueños de parrillas de gas ignoran ambos argumentos y solo quieren cocinar la cena sin un doctorado en ciencias de la combustión.</p>

<p>He tenido y cocinado extensamente en los tres tipos de combustible durante más de veinte años. Actualmente tengo un kamado Big Green Egg, un Traeger Ironwood 885 y una Weber Summit S-470. Los uso todos regularmente. Aquí está lo que es realmente cierto.</p>

<h2>Sabor: La Verdad Incómoda</h2>

<p>En pruebas a ciegas en brisket, costillas de cerdo y muslos de pollo cocinados en los tres métodos: la mayoría de las personas no podía distinguir el carbón del pellet para la carne de cerdo y el pollo. Para la res, había una diferencia más perceptible — el carbón producía notas más terrosas y ahumadas que los comensales preferían ligeramente. Para el pollo, el gas producía resultados preferidos en la prueba a ciegas porque el control de temperatura era más fácil.</p>

<h2>Control de Temperatura: Gas > Pellets > Carbón</h2>

<p>El gas es el rey del control de temperatura. Girar una perilla cambia la temperatura en 3-5 minutos. Para la parrillada rápida de pescado, verduras y pollo en días de semana, el gas es prácticamente insustituible.</p>

<p>Las parrillas de pellets son excelentes en control de temperatura para low-and-slow. Los modernos sistemas PID mantienen temperaturas dentro de ±6-8°C del objetivo por 12-16 horas sin intervención. Son terribles a temperaturas ultra-altas: la mayoría no supera los 260-290°C.</p>

<p>El carbón requiere el mayor esfuerzo para el control de temperatura, pero tiene el rango máximo: 107°C para el ahumado lento hasta 450°C+ para el sellado extremo en tu kamado.</p>

<h2>Costo Por Cocción: Análisis Real</h2>

<p><strong>Gas:</strong> ~0,80-1,50€ por kg de carne. Costo inicial más alto (800-2.000€+). Costo variable más bajo.</p>
<p><strong>Carbón:</strong> ~1,50-3€ por kg de carne ahumada. Costo inicial medio (300-500€).</p>
<p><strong>Pellets:</strong> ~2-4€ por kg de carne ahumada. Los pellets cuestan 1-2€ por kg; consumes 500g-1kg por hora. Costo inicial alto (500-1.500€).</p>

<h2>La Respuesta Correcta Para Ti</h2>

<p>Compra gas si: cocinas principalmente parrilladas rápidas entre semana, quieres resultados confiables con mínimo esfuerzo y tienes presupuesto para una parrilla de calidad.</p>

<p>Compra carbón si: quieres aprender técnicas reales de barbacoa, aprecias el proceso tanto como el resultado y estás dispuesto a invertir el tiempo en aprender el manejo del fuego.</p>

<p>Compra pellets si: quieres principalmente el ahumado sin cuidar un fuego y el sabor a humo es tu prioridad sobre la autenticidad del método.</p>

<p>Compra los tres si: el BBQ es una pasión seria y tienes presupuesto y espacio para equipos múltiples.</p>`,
    },
  },
};

// ============================================================
// ESECUZIONE
// ============================================================

async function translateReviews() {
  console.log("\n📋 REVIEWS...");
  for (const [docId, translations] of Object.entries(reviewTranslations)) {
    for (const locale of ["it", "es"]) {
      const t = translations[locale];
      const result = await apiPut("reviews", docId, locale, t);
      log(!!result, "review", t.slug, locale);
      await delay(600);
    }
  }
}

async function translateBlogPosts() {
  console.log("\n📋 BLOG POSTS...");
  for (const [docId, translations] of Object.entries(blogTranslations)) {
    for (const locale of ["it", "es"]) {
      const t = translations[locale];
      const result = await apiPut("blog-posts", docId, locale, t);
      log(!!result, "blog-post", t.slug, locale);
      await delay(600);
    }
  }
}

async function translateRecipes() {
  console.log("\n📋 RECIPES...");
  for (const [docId, translations] of Object.entries(recipeTranslations)) {
    for (const locale of ["it", "es"]) {
      const t = translations[locale];
      const result = await apiPut("recipes", docId, locale, t);
      log(!!result, "recipe", t.slug, locale);
      await delay(600);
    }
  }
}

async function translateTutorials() {
  console.log("\n📋 TUTORIALS...");
  for (const [docId, translations] of Object.entries(tutorialTranslations)) {
    for (const locale of ["it", "es"]) {
      const t = translations[locale];
      const result = await apiPut("tutorials", docId, locale, t);
      log(!!result, "tutorial", t.slug, locale);
      await delay(600);
    }
  }
}

async function main() {
  console.log("🔥 BBQ Experience — Traduzione V2 (16 nuovi contenuti EN → IT/ES)");
  console.log("=".repeat(65));

  await translateReviews();
  await translateBlogPosts();
  await translateRecipes();
  await translateTutorials();

  console.log("\n" + "=".repeat(65));
  console.log("✅ Traduzione completata.");
}

main().catch((e) => {
  console.error("Errore fatale:", e);
  process.exit(1);
});
