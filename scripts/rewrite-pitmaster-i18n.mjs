/**
 * Script di traduzione contenuti BBQ Experience — Pitmaster voice
 * Traduce tutti i contenuti EN (reviews, recipes, tutorials, blog-posts) in IT e ES.
 * Mantiene tono diretto, esperto, brutalmente onesto del Pitmaster.
 * Scores, specs, tempi e dati numerici non vengono toccati.
 */

import https from 'https';

const BASE_URL = 'https://cms.bbq-experience.com/api';
const TOKEN = '60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9';

// ============================================================================
// Utility HTTP
// ============================================================================

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/${path}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 500)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Errore parsing: ${data.slice(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// TRADUZIONI REVIEWS
// ============================================================================

const reviewTranslations = {

  // --- WEBER SUMMIT S-470 ---
  'y9qbb054u90oqc9ywte9kq66': {
    it: {
      title: 'Weber Summit S-470 Recensione: Il Grill a Gas che Fa di Tutto',
      excerpt: 'Un grill a gas solido e ben costruito, competente su quasi tutto, ma che fa pagare caro il privilegio. Buono per chi vuole un solo grill a fare tutto — se riesce a mandare giù il prezzo.',
      verdict: 'Il Weber Summit S-470 è il classico tuttofare che padroneggia la griglia e lo spiedo ma si limita a sfiorare l\'affumicatura — e costa più di quanto dovrebbe per questo compromesso.',
      pros: [
        'Costruzione in acciaio inox granitica, durerà più del tuo mutuo',
        'La zona sear arriva davvero a 900°F+ — territorio da steakhouse vera',
        'Il bruciatore per lo spiedo produce la pelle di pollo più croccante che abbia mai ottenuto su un grill a gas',
        'Distribuzione uniforme del calore con meno di 15°F di variazione sull\'intera superficie',
        'L\'accensione Snap-Jet funziona ogni singola volta — niente click e preghiere',
      ],
      cons: [
        'A 2.800$+ di listino stai pagando una bella tassa Weber — il Napoleon Prestige 665 offre prestazioni simili a 600$ in meno',
        'La scatola per affumicare è un gesto carino, ma siamo onesti: il sapore di fumo è sottile e pallido rispetto a qualsiasi setup a carbone o a pellet vero',
        '282 libbre assemblato — una volta posizionato non si muove più, misura due volte',
        'Il termometro integrato sul coperchio segna 20-30°F in più: i principianti cuociono tutto troppo finché non imparano a ignorarlo',
        'Il bruciatore laterale è appena sufficiente per scaldare una pentola di fagioli — scorda la cottura al wok seria',
        'Il prezzo è salito del 15% in due anni senza miglioramenti sostanziali a giustificarlo',
      ],
      editorial_content: `<h2>Parliamoci Chiaro</h2>
<p>Il Weber Summit S-470 è un grill a gas molto buono. Non eccezionale. Non leggendario. Molto buono, a un prezzo leggendario. E questa distinzione conta quando stai firmando un assegno da quasi tremila euro.</p>
<p>Ci cuocio da sette mesi. Hamburger del fine settimana, cosce di pollo del martedì sera, qualche ambizioso tentativo di affumicatura, innumerevoli polli allo spiedo. Conosco questo grill a menadito. E la mia valutazione onesta è che Weber ha costruito una macchina da cottura splendidamente ingegnerizzata e straordinariamente affidabile, che fa l'80% di quello che promette al 100% del prezzo.</p>

<h2>Qualità Costruttiva: Qui Weber Si Guadagna i Soldi</h2>
<p>Su questo non ho esitazioni — Weber costruisce grill come se dovessero andare in guerra. L'acciaio inox 304 del Summit è il vero affare, non la roba economica 430 che trovi sui grill a metà prezzo. Ogni pannello è preciso. Ogni cerniera è rigida. Il carrello chiuso non balla di un millimetro, e i portelli si chiudono con uno scatto soddisfacente. Dopo sette mesi di pioggia, sole e qualche grandinata, non c'è traccia di ruggine.</p>
<p>Le Flavorizer Bars sono robuste e angolate correttamente per convogliare i grassi nel vassoio. Le griglie di cottura sono in acciaio inox pesante con ottima ritenzione del calore. Il tutto pesa 128 kg, il che la dice lunga sul contenuto di metallo rispetto ai grill di plastica del centro commerciale.</p>
<p>Confrontalo con il Broil King Regal o con il Napoleon Prestige Pro — entrambi ottimi grill — e il Weber regge il confronto nella qualità costruttiva. Ma non li demolisce. Non a questo differenziale di prezzo.</p>

<h2>Prestazioni: Dove le Cose si Complicano</h2>
<p>I quattro bruciatori principali erogano 48.800 BTU su 3.742 cm² di superficie di cottura primaria. La distribuzione del calore è davvero eccellente — ho posizionato sei termometri a sonda sulla griglia e misurato meno di 8°C di variazione da bordo a bordo. Per hamburger, bistecche, pollo, verdure e pesce, questo grill si comporta esattamente come ti aspetti da un grill da 2.800$: impeccabilmente.</p>
<p>La zona sear è il punto forte. Quel bruciatore a infrarossi tra i due bruciatori di sinistra raggiunge 480°C+ sulla superficie della griglia. Ho rosolato una costata da 4 cm per 90 secondi per lato e ottenuto una crosta che farebbe annuire il cuoco di una steakhouse. Se la cottura ad alta temperatura è la tua cosa, questa funzione da sola giustifica la considerazione.</p>

<h3>La Questione Affumicatura — Siamo Onesti</h3>
<p>Weber commercializza la scatola per affumicare integrata e il bruciatore dedicato come punto di forza. E funziona. In un certo senso. Ho caricato chips di ciliegio, regolato il bruciatore affumicatore a 120°C e affumicato un rack di ribs St. Louis per sei ore. Il risultato è stato... discreto. Il smoke ring era appena visibile — forse 2 mm se sono generoso. Il sapore di fumo era presente ma delicato, come se qualcuno avesse sventolato un pezzo di hickory vicino alla carne e fosse andato via.</p>
<p>Confrontalo con quello che ottengo dal mio Weber Smokey Mountain da 400$ o da un pellet grill di fascia media, e la capacità di affumicatura del Summit sembra un ripensamento progettato da persone che non avevano mai affumicato un brisket seriamente. Se compri questo grill per affumicare, risparmia i soldi. Compra un affumicatore vero da 500$ e un grill a gas solido da 1.200$. Otterrai risultati migliori su entrambi i fronti a meno soldi in totale.</p>

<h3>Lo Spiedo: la Stella Nascosta</h3>
<p>Il bruciatore a infrarossi posteriore per lo spiedo da 10.600 BTU è davvero ottimo. Ho cotto allo spiedo più di una dozzina di polli, due prime rib e un cosciotto d'agnello, e ogni singolo pezzo è venuto con la pelle impossibilmente croccante e la carne perfettamente succosa. Il motore è abbastanza potente da reggere fino a 11 kg senza faticare. Se dovessi scegliere una funzione che rende speciale il Summit, è questa — meglio di qualsiasi attacco per spiedo separato che abbia mai usato.</p>

<h2>Le Cose che Non Ti Dicono</h2>
<p>Il termometro integrato sul coperchio è spazzatura. L'ho misurato costantemente a 10-15°C sopra i miei probe ThermoWorks calibrati. Se stai seguendo una ricetta che dice "imposta il grill a 175°C" e ti fidi di quel termometro a cupola, stai effettivamente cuocendo a 160-165°C. Per un grill a questo prezzo, non ci sono scuse. Compra un Thermapen o un FireBoard e ignora completamente il gauge integrato.</p>
<p>Il bruciatore laterale produce circa 12.000 BTU — adeguato per far sobbollire una pentola di salsa BBQ o scaldare i fagioli, ma assolutamente insufficiente per cucinare al wok o rosolare in una padella di ghisa seria. Se volevi che il bruciatore laterale fosse una seconda stazione di cottura legittima, rimarrai deluso.</p>

<h2>Chi Dovrebbe Comprarlo</h2>
<p>Se vuoi esattamente un grill che griglie, rosoli e cuocia allo spiedo in modo eccellente, con la possibilità di avvicinarsi all'affumicatura, e hai il budget per assorbire il premium di un brand di lusso — il Summit S-470 è una scelta legittima. Durerà 15+ anni con manutenzione ordinaria.</p>

<h2>Chi Non Dovrebbe Comprarlo</h2>
<p>Se l'affumicatura è prioritaria, lascia perdere. Se hai attenzione al budget, il Napoleon Prestige 500 ti dà il 90% delle prestazioni al 60% del prezzo. Se vuoi imparare la vera gestione del fuoco, compra un kamado o un offset — i grill a gas non ti insegnano nulla sul fuoco.</p>

<h2>Il Verdetto Finale</h2>
<p>Il Summit S-470 è un grill premium a prezzo premium che offre risultati premium — ma non eccezionali. Rispetto l'ingegneria. Mi fido della qualità costruttiva. Ma faccio fatica a dire a qualcuno di spendere 2.800$ quando a 1.800$ compri il 90% dell'esperienza da tre concorrenti diversi. Il nome Weber ha un peso, e lo stai pagando. Se quel premium vale, dipende interamente da quanto conta per te il marchio sul carrello.</p>`,
    },
    es: {
      title: 'Weber Summit S-470 Review: La Parrilla a Gas que lo Hace Todo',
      excerpt: 'Una parrilla a gas sólida y bien construida, competente en casi todo, pero que cobra caro el privilegio. Buena para quien quiere una sola parrilla que mande — si puede digerir el precio.',
      verdict: 'El Weber Summit S-470 es un todoterreno que domina la parrilla y el asado en espeto pero apenas roza el ahumado — y cuesta más de lo que debería por ese compromiso.',
      pros: [
        'Construcción de acero inoxidable a prueba de bombas, durará más que tu hipoteca',
        'La zona sear llega de verdad a 900°F+ — territorio de asador profesional auténtico',
        'El quemador para espeto produce la piel de pollo más crujiente que he conseguido en una parrilla a gas',
        'Distribución de calor uniforme con menos de 15°F de variación en toda la superficie',
        'La ignición Snap-Jet funciona siempre, sin excepción — no más clics y rezos',
      ],
      cons: [
        'A más de 2.800$ de precio, estás pagando un impuesto Weber considerable — el Napoleon Prestige 665 ofrece prestaciones similares por 600$ menos',
        'La caja ahumadora es un gesto bonito, pero seamos honestos: el sabor a humo es tenue y pálido comparado con cualquier setup de carbón o pellet de verdad',
        '282 libras montado — una vez que lo colocas, ahí se queda para siempre, así que mide dos veces',
        'El termómetro integrado en la tapa lee 20-30°F de más, lo que significa que los principiantes están cocinando de más hasta que aprenden a ignorarlo',
        'El quemador lateral apenas da para calentar una olla de alubias — olvídate de cocinar con wok en serio',
        'El precio ha subido un 15% en dos años sin mejoras sustanciales que lo justifiquen',
      ],
      editorial_content: `<h2>Voy a Ser Directo</h2>
<p>El Weber Summit S-470 es una parrilla a gas muy buena. No excepcional. No legendaria. Muy buena, a un precio legendario. Y esa distinción importa cuando estás firmando un cheque de casi tres mil euros.</p>
<p>Llevo siete meses cocinando en esto. Hamburguesas de fin de semana, muslos de pollo del martes por la noche, algunos intentos ambiciosos de ahumado, innumerables pollos en espeto. Conozco esta parrilla a fondo. Y mi valoración honesta es que Weber ha construido una máquina de cocción bellamente diseñada y extremadamente fiable que hace el 80% de lo que promete al 100% del precio.</p>

<h2>Calidad de Construcción: Aquí Weber Se Gana el Dinero</h2>
<p>En esto no tengo dudas — Weber construye parrillas como si fueran a la guerra. El acero inox 304 del Summit es el auténtico, no el 430 barato que encuentras en parrillas a mitad de precio. Cada panel es preciso. Cada bisagra es firme. El carro cerrado no tiene ni un milímetro de bamboleo, y las puertas cierran con un clic satisfactorio. Después de siete meses de lluvia, sol y algún granizo, no hay ni rastro de óxido.</p>
<p>Las Flavorizer Bars son robustas y anguladas correctamente para conducir la grasa hacia la bandeja. Las rejillas de cocción son de acero inox de calibre grueso con excelente retención de calor. El conjunto pesa 128 kg, lo que dice mucho sobre el contenido real de metal frente a las parrillas de plástico del centro comercial.</p>

<h2>Rendimiento: Donde se Complica la Cosa</h2>
<p>Los cuatro quemadores principales generan 48.800 BTU en 3.742 cm² de superficie de cocción primaria. La distribución del calor es genuinamente excelente — coloqué seis termómetros de sonda en la rejilla y medí menos de 8°C de variación de un extremo al otro. Para hamburguesas, filetes, pollo, verduras y pescado, esta parrilla funciona exactamente como esperarías de una parrilla de 2.800$: sin defectos.</p>
<p>La zona sear es el punto fuerte. Ese quemador de infrarrojos entre los dos quemadores de la izquierda alcanza 480°C+ en la superficie de la rejilla. Sellé un chuletón de 4 cm por 90 segundos por lado y conseguí una costra que haría asentir al chef de cualquier asador de categoría. Si las altas temperaturas son lo tuyo, esta función por sí sola justifica considerarlo.</p>

<h3>El Asunto del Ahumado — Seamos Honestos</h3>
<p>Weber vende la caja ahumadora integrada y el quemador dedicado como argumento de venta. Y funciona. En cierto modo. Cargué astillas de cerezo, regulé el quemador ahumador para mantener 120°C y ahumé un rack de costillas St. Louis durante seis horas. El resultado fue... correcto. El anillo de humo era apenas visible — quizás 2 mm si soy generoso. El sabor a humo estaba presente pero delicado, como si alguien hubiera agitado un trozo de hickory cerca de la carne y se hubiera ido.</p>
<p>Compáralo con lo que saco de mi Weber Smokey Mountain de 400$ o de una parrilla de pellet de gama media, y la capacidad de ahumado del Summit parece una ocurrencia de ingenieros que nunca habían ahumado un brisket en serio. Si compras esta parrilla para ahumar carne seriamente, ahorra el dinero. Compra un ahumador de verdad por 500$ y una parrilla a gas sólida por 1.200$. Obtendrás mejores resultados en ambas tareas con menos dinero en total.</p>

<h3>El Espeto: la Estrella Oculta</h3>
<p>El quemador de infrarrojos trasero para el espeto de 10.600 BTU es genuinamente fantástico. He preparado en espeto más de una docena de pollos, dos solomillos y una pierna de cordero, y todos han salido con la piel imposiblemente crujiente y la carne perfectamente jugosa. El motor aguanta hasta 11 kg sin esfuerzo. Si tuviera que elegir una función que hace especial al Summit, es esta — mejor que cualquier accesorio de espeto independiente que haya usado.</p>

<h2>Lo que No Te Cuentan</h2>
<p>El termómetro integrado en la tapa es basura. Lo he medido consistentemente leyendo 10-15°C por encima de mis sondas ThermoWorks calibradas. Si sigues una receta que dice "pon la parrilla a 175°C" y te fías de ese termómetro de cúpula, en realidad estás cocinando a 160-165°C. Para una parrilla a este precio, no hay excusa. Compra un Thermapen o un FireBoard e ignora completamente el medidor integrado.</p>

<h2>Quién Debería Comprarlo</h2>
<p>Si quieres exactamente una parrilla que ase, selle y cocine en espeto de forma excelente, con la opción de acercarse al ahumado, y tienes presupuesto para asumir la prima de una marca premium — el Summit S-470 es una elección legítima. Durará más de 15 años con mantenimiento básico.</p>

<h2>Quién No Debería Comprarlo</h2>
<p>Si el ahumado es prioridad, ni te molestes. Si cuidas el presupuesto, el Napoleon Prestige 500 te da el 90% del rendimiento al 60% del precio. Si quieres aprender a gestionar el fuego de verdad, compra un kamado o un offset — las parrillas a gas no te enseñan nada sobre el fuego.</p>

<h2>Conclusión</h2>
<p>El Summit S-470 es una parrilla premium a precio premium que entrega resultados premium — pero no excepcionales. Respeto la ingeniería. Confío en la calidad de construcción. Pero me cuesta decirle a alguien que gaste 2.800$ cuando por 1.800$ tienes el 90% de la experiencia con tres competidores distintos. El nombre Weber tiene peso, y lo estás pagando. Si esa prima vale la pena depende enteramente de cuánto importa el logotipo en el carro.</p>`,
    },
  },

  // --- TRAEGER IRONWOOD 885 ---
  'uiy1wt1lt885st9n3cut2wlk': {
    it: {
      title: 'Traeger Ironwood 885 Recensione: L\'Affumicatura Senza Sbattersi Portata alla Perfezione',
      excerpt: 'Il Traeger Ironwood 885 rende l\'affumicatura della carne imbarazzantemente semplice — ed è allo stesso tempo il suo punto di forza più grande e la sua verità più scomoda. Quando hai bisogno del telefono per cucinare la cena, qualcosa si è spostato.',
      verdict: 'Una macchina di convenienza brillante che produce carne affumicata genuinamente buona, frenata dalla dipendenza dall\'app, dal costo dei pellet e da un sapore di fumo che i veri pitmasters troveranno sempre un po\' sottile.',
      pros: [
        'Il drivetrain D2 mantiene la temperatura entro ±5°F per ore — più costante del 90% degli smoker offset nelle mani di qualsiasi cuoco',
        '885 pollici quadrati di superficie di cottura gestiscono volumi seri — ci entrano 6 rack di ribs contemporaneamente',
        'L\'app WiFIRE funziona davvero bene e ti permette di monitorare le cotture da qualsiasi posto',
        'L\'isolamento a doppia parete si comporta egregiamente al freddo — testato fino a -2°C ambientali',
        'La modalità Super Smoke a basse temperature aumenta davvero il sapore di fumo',
      ],
      cons: [
        'Il sapore di fumo è notevolmente più leggero rispetto al carbone o agli offset a legna — i giudici di gara e i palati esperti lo notiranno',
        'Temperatura massima di 260°C: niente rosolatura vera — le tue bistecche saranno buone ma non ottime',
        'La dipendenza dall\'app WiFIRE è un problema reale: gli aggiornamenti firmware hanno mandato in tilt i controller, i down del server ti tagliano fuori dalle funzioni che hai pagato',
        'Il consumo di pellet va da 0,5 a 1,5 kg l\'ora — su una cottura lunga aggiunge costi reali che quasi nessuna recensione menziona',
        'La coclea, il ventilatore e il controller sono componenti meccanici che PRIMA O POI si romperanno — metti da parte 150-300$ per riparazioni negli anni 3-5',
        'La capacità del tramoggia di 9 kg sembra generosa finché non realizzi che una cottura di 14 ore può svuotarla — rimanere senza pellet a metà cottura è un disastro autentico',
      ],
      editorial_content: `<h2>La Verità Scomoda sui Pellet Grill</h2>
<p>Eccola, la cosa che nessuno nel settore dei pellet grill vuole dire ad alta voce: il Traeger Ironwood 885 è fondamentalmente un forno a convezione da esterno che brucia legno. E va bene. È davvero un buon forno a convezione da esterno che brucia legno. Ma la smettiamo di far finta che sia la stessa cosa di cucinare su fuoco vero, perché non lo è, e i palati esperti la differenza la sentono.</p>
<p>Ho usato l'Ironwood 885 come affumicatore principale per quattro mesi. Brisket, spalle di maiale, ribs, pollo, salmone. Ogni cottura è venuta bene. Costantemente bene. Prevedibilmente bene. Il tipo di bene che richiede quasi zero abilità, zero attenzione, zero conoscenza nella gestione del fuoco. Per molte persone, è esattamente quello che vogliono. Per me, ha esposto la tensione centrale dell'affumicatura a pellet: quando togli l'artigianalità, cosa resta?</p>

<h2>Installazione e Qualità Costruttiva</h2>
<p>Il montaggio richiede circa due ore ed è semplice. La costruzione in acciaio inox a doppia parete è solida — non solida come un kamado o un Weber Summit, ma abbastanza da farmi aspettare 8-10 anni di servizio con manutenzione ordinaria. Le griglie in smalto porcellanato sono sufficienti ma meno durevoli dell'acciaio inox o della ghisa. Il sistema di raccolta grasso funziona ma richiede monitoraggio attento sulle cotture grasse — ho rischiato un incendio di grassi durante una spalla di maiale notturna quando il vassoio ha traboccato alla 9a ora.</p>
<p>La tramoggia tiene 9 kg, che sembrano tanti finché non fai i conti su una cottura di 14 ore a 107°C con freddo. A 1 kg l'ora di consumo conservativo con -1°C fuori, sono 14 kg di pellet — il che significa che dovrai ricaricare a metà cottura. Metti la sveglia.</p>

<h2>Il Drivetrain D2: Davvero Impressionante</h2>
<p>Merito dove è dovuto — la coclea a velocità variabile D2 e il ventilatore a induzione mantengono la temperatura con precisione chirurgica. Ho registrato sei cotture di brisket con monitoraggio continuo della temperatura, e la varianza è stata costantemente entro ±3°C dal setpoint. Meglio di quanto riesca a tenere sul mio offset senza attenzione costante. Per una macchina "imposta e vai", questa tecnologia è al massimo di quello che esiste.</p>

<h3>La Modalità Super Smoke: Marketing con un Granello di Verità</h3>
<p>Sotto i 107°C, puoi attivare la modalità Super Smoke, che pulsa il ventilatore per creare più brace fumante e quindi più fumo. Funziona? Sì, marginalmente. Ho fatto cotture parallele di ribs — una standard, una Super Smoke — e il batch Super Smoke aveva un aroma di fumo notevolmente più intenso. Ma confrontato con le stesse ribs sul mio Weber Smokey Mountain con chunks di ciliegio e hickory? Non c'è paragone. È la differenza tra un sussurro e una conversazione, quando quello che vuoi davvero è un grido.</p>

<h2>WiFIRE: Benedizione e Maledizione</h2>
<p>L'app WiFIRE funziona bene, glielo concedo. Impostare la temperatura, monitorare le sonde, ricevere avvisi quando la carne raggiunge la temperatura target — tutto fluido e reattivo. Ho regolato la temperatura dal divano, dall'ufficio e da un ristorante mentre il mio brisket se ne stava felicemente a casa nell'Ironwood. Una tecnologia genuinamente utile.</p>
<p>Ma c'è il lato oscuro. In quattro mesi, ho vissuto due problemi di aggiornamento firmware che hanno richiesto reset completi. I server Traeger sono andati giù una volta per circa 6 ore, durante le quali l'app non riusciva a connettersi al grill. E c'è qualcosa di filosoficamente inquietante nel dover dipendere da una connessione Wi-Fi e da un server app funzionante per far funzionare completamente un dispositivo di cottura. Quando Traeger deciderà di dismettere il firmware di questo modello tra 5-7 anni — e lo farà — cosa succederà al tuo investimento da 1.800$?</p>
<p>Confrontalo con il mio offset, che funzionerà esattamente allo stesso modo tra 50 anni perché è fatto di acciaio e usa il fuoco. Nessun server da dismettere. Nessun firmware da corrompere. Nessuna app da deprecare.</p>

<h2>La Questione del Sapore</h2>
<p>Ho servito brisket affumicato nell'Ironwood a dozzine di persone. La gente normale — chi mangia BBQ poche volte all'anno — lo trova fantastico. E lo è. La bark si sviluppa bene, il smoke ring è decente (3-4 mm), e la tenerezza è eccellente grazie alla temperatura costante.</p>
<p>Ma metti quel brisket accanto a uno del mio offset con spaccati di rovere, e chi ha esperienza di BBQ sceglie l'offset ogni volta. L'Ironwood produce un sapore di fumo più pulito e leggero. È piacevole, ma gli manca la profondità, la complessità e il carattere che vengono dalla combustione reale di legna dura. Il fumo da pellet sta al fumo da legna come una bella candela sta a un fuoco da campo — tecnicamente la stessa sostanza, esperienza completamente diversa.</p>

<h2>I Costi che Non Ti Dicono</h2>
<p>Il prezzo d'acquisto è solo l'inizio. I pellet costano. L'elettricità costa. Le parti di ricambio costano. Su 5 anni, metti in preventivo altri 2.000-3.000$ oltre al prezzo d'acquisto. È il costo totale di possesso onesto che nessuna recensione menciona.</p>

<h2>Chi Dovrebbe Comprarlo</h2>
<p>Persone indaffarate che vogliono carne affumicata eccellente con sforzo minimo. Genitori che non possono stare dietro a un fuoco per 14 ore. Principianti che vogliono produrre subito del buon BBQ. Chi valorizza la costanza rispetto al picco di sapore.</p>

<h2>Chi Non Dovrebbe Comprarlo</h2>
<p>Chiunque possieda già un affumicatore a carbone e ami il processo. I pitmasters di gara che necessitano della massima profondità di fumo. Chi non è a suo agio con gli elettrodomestici dipendenti da un'app. E chiunque viva in una zona con corrente inaffidabile — senza elettricità questo grill è un mattone.</p>

<h2>Il Verdetto Finale</h2>
<p>Il Traeger Ironwood 885 è la Toyota Camry degli affumicatori. Affidabile, competente, confortevole, e totalmente privo di anima. Produrrà cibo costantemente buono per anni, e la maggior parte delle persone sarà perfettamente soddisfatta. Ma se hai assaggiato quello che uno smoker a carbone o a legna riesce a fare nelle mani giuste, l'Ironwood ti lascerà sempre con una piccola voglia di qualcosa in più.</p>`,
    },
    es: {
      title: 'Traeger Ironwood 885 Review: El Ahumado Sin Complicaciones Llevado a la Perfección',
      excerpt: 'El Traeger Ironwood 885 hace que ahumar carne sea vergonzosamente fácil — y eso es a la vez su mayor fortaleza y su verdad más incómoda. Cuando necesitas el teléfono para cocinar la cena, algo ha cambiado.',
      verdict: 'Una brillante máquina de conveniencia que produce comida ahumada genuinamente buena, lastrada por la dependencia de la app, el coste de los pellets y un sabor a humo que los pitmasters de verdad siempre encontrarán un poco flojo.',
      pros: [
        'El drivetrain D2 mantiene la temperatura dentro de ±5°F durante horas — mejor consistencia que el 90% de los offset en manos de la mayoría de cocineros',
        '885 pulgadas cuadradas de superficie de cocción manejan volumen serio — caben 6 racks de costillas a la vez',
        'La app WiFIRE funciona bien de verdad y te permite monitorear cocciones desde cualquier lugar',
        'El aislamiento de doble pared rinde admirablemente en frío — probado hasta -2°C ambientales',
        'El modo Super Smoke a bajas temperaturas realmente aumenta el sabor a humo',
      ],
      cons: [
        'El sabor a humo es notablemente más ligero que el carbón o los offset de leña — los jueces de competición y los paladares experimentados lo notarán',
        'Temperatura máxima de 260°C significa que no puedes sellar de verdad — tus filetes estarán buenos pero no perfectos',
        'La dependencia de la app WiFIRE es un problema real: actualizaciones de firmware han inutilizado controladores, caídas del servidor te cortan el acceso a funciones por las que pagaste',
        'El consumo de pellets corre entre 0,5 y 1,5 kg por hora — en una cocción larga suma un coste real que casi ninguna reseña menciona',
        'La coclea, el ventilador y el controlador son componentes mecánicos que ACABARÁN fallando — presupuesta 150-300$ en reparaciones en los años 3-5',
        'La capacidad de la tolva de 9 kg parece generosa hasta que te das cuenta de que una cocción de 14 horas puede vaciarla — quedarse sin pellets a mitad de cocción es un desastre real',
      ],
      editorial_content: `<h2>La Verdad Incómoda sobre las Parrillas de Pellets</h2>
<p>Lo que nadie en la industria de las parrillas de pellets quiere decir en voz alta: el Traeger Ironwood 885 es básicamente un horno de convección exterior que quema madera. Y está bien. Es genuinamente un buen horno de convección exterior que quema madera. Pero dejemos de fingir que es lo mismo que cocinar sobre fuego real, porque no lo es, y los comensales con experiencia notan la diferencia.</p>
<p>He usado el Ironwood 885 como ahumador principal durante cuatro meses. Briskets, paletas de cerdo, costillas, pollo, salmón. Y cada cocción salió bien. Consistentemente bien. Previsiblemente bien. El tipo de bien que requiere casi cero habilidad, cero atención y cero conocimiento de gestión del fuego. Para mucha gente, eso es exactamente lo que quieren. Para mí, expuso la tensión central del ahumado con pellets: cuando eliminas el oficio, ¿qué queda?</p>

<h2>Montaje y Calidad de Construcción</h2>
<p>El montaje lleva unas dos horas y es sencillo. La construcción de acero inox de doble pared se siente sólida — no tan sólida como un kamado o un Weber Summit, pero suficiente como para esperar 8-10 años de servicio con mantenimiento normal. Las rejillas esmaltadas en porcelana son correctas pero menos duraderas que el acero inox o la fundición. El sistema de recogida de grasa funciona pero necesita vigilancia atenta en cocciones grasas — casi tuve un incendio de grasa durante una paleta de cerdo nocturna cuando la bandeja se desbordó a las 9 horas.</p>
<p>La tolva aguanta 9 kg, que suena a mucho hasta que haces los números en una cocción de 14 horas a 107°C con frío. A 1 kg por hora de consumo conservador a -1°C, son 14 kg de pellets — lo que significa que tendrás que rellenar a mitad de cocción. Pon una alarma.</p>

<h2>El Drivetrain D2: Genuinamente Impresionante</h2>
<p>Reconocimiento donde es debido — el tornillo sin fin de velocidad variable D2 y el ventilador de inducción mantienen la temperatura con precisión quirúrgica. Registré seis cocciones de brisket con monitoreo continuo de temperatura, y la varianza fue consistentemente de ±3°C respecto al punto de ajuste. Mejor de lo que puedo mantener en mi offset sin atención constante. Para un cocinero de "pon y olvida", esta tecnología está tan buena como puede estar.</p>

<h3>El Modo Super Smoke: Marketing con un Grano de Verdad</h3>
<p>Por debajo de 107°C, puedes activar el modo Super Smoke, que pulsa el ventilador para crear más brasas humeantes y por tanto más humo. ¿Funciona? Sí, marginalmente. Hice cocciones paralelas de costillas — una estándar, una Super Smoke — y el lote Super Smoke tenía un aroma a humo notablemente más profundo. Pero comparado con las mismas costillas en mi Weber Smokey Mountain con trozos de cerezo y hickory, ni punto de comparación. Es la diferencia entre un susurro y una conversación, cuando lo que realmente quieres es un grito.</p>

<h2>WiFIRE: Bendición y Maldición</h2>
<p>La app WiFIRE funciona bien, se lo reconozco. Ajustar temperatura, monitorear sondas, recibir alertas cuando la carne alcanza la temperatura objetivo — todo fluido y reactivo. He ajustado la temperatura desde el sofá, desde la oficina y desde un restaurante mientras mi brisket estaba tranquilamente en casa en el Ironwood. Tecnología genuinamente útil.</p>
<p>Pero está el lado oscuro. En cuatro meses, tuve dos problemas de actualización de firmware que requirieron reinicios completos. Los servidores de Traeger cayeron una vez durante unas 6 horas, tiempo durante el cual la app no podía conectarse a la parrilla. Y hay algo filosóficamente perturbador en necesitar una conexión Wi-Fi y un servidor de app funcionando para operar completamente un dispositivo de cocción. Cuando Traeger decida discontinuar el firmware de este modelo en 5-7 años — y lo hará — ¿qué pasa con tu inversión de 1.800$?</p>

<h2>La Cuestión del Sabor</h2>
<p>He servido brisket ahumado en el Ironwood a docenas de personas. La gente normal — quienes comen BBQ unas pocas veces al año — lo encuentra fantástico. Y lo es. La costra se desarrolla bien, el anillo de humo es decente (3-4 mm) y la terneza es excelente gracias a la temperatura constante.</p>
<p>Pero pon ese brisket junto a uno de mi offset con troncos de roble, y los comensales con experiencia en BBQ eligen el offset siempre. El Ironwood produce un sabor a humo más limpio y ligero. Es agradable, pero le falta la profundidad, la complejidad y el carácter que vienen de la combustión real de madera dura. El humo de pellets es al humo de leña como una vela bonita es a una fogata — técnicamente la misma sustancia, experiencia completamente diferente.</p>

<h2>Conclusión</h2>
<p>El Traeger Ironwood 885 es el Toyota Camry de los ahumadores. Fiable, competente, cómodo y totalmente carente de alma. Producirá comida consistentemente buena durante años, y la mayoría de la gente estará perfectamente satisfecha. Pero si has probado lo que un ahumador de carbón o leña puede hacer en manos expertas, el Ironwood siempre te dejará con ganas de un poco más.</p>`,
    },
  },

  // --- THERMAPEN ONE ---
  'fz5b8j87fl85wjkuqyaa5lqp': {
    it: {
      title: 'ThermoWorks Thermapen ONE Recensione: L\'Unico Termometro di cui Hai Bisogno',
      excerpt: 'È il pezzo di attrezzatura BBQ che salverei da un incendio. Un secondo. Precisione assoluta. Costruito come un carro armato. Tutti gli altri termometri a lettura istantanea stanno solo recitando la parte.',
      verdict: 'Il Thermapen ONE non è il miglior termometro a lettura istantanea — è l\'unico termometro a lettura istantanea. Tutto il resto è un compromesso che non dovresti accettare.',
      pros: [
        'Letture genuine in un secondo verificate con riferimenti tracciabili NIST — niente altro si avvicina',
        'Precisione ±0,5°F sull\'intero intervallo — l\'ho confrontato con strumenti da laboratorio e non ho trovato deviazioni',
        'IP67 impermeabile — l\'ho fatto cadere in un contenitore pieno di acqua ghiacciata e in un lavello pieno di piatti: funziona perfettamente in entrambi i casi',
        'Oltre 2.000 ore di batteria da una singola AAA — non ho cambiato la batteria in 10 mesi di uso intenso',
        'Il display retroilluminato con rotazione automatica è genuinamente utile ai controlli del brisket delle 5 del mattino',
        'La punta sottile della sonda dà letture accurate anche su tagli sottili come petti di pollo e filetti di pesce',
      ],
      cons: [
        'A 105$, costa 5 volte più dei termometri economici — devi decidere se la velocità di un secondo vale quel premium per te',
        'Nessuna funzione wireless o sonda da lasciare inserita — è solo uno strumento per misure puntuali, ti serve comunque un termometro a sonda separato per il monitoraggio continuo',
        'La finitura del colore sull\'impugnatura si consuma e sbiadisce con l\'uso intenso all\'aperto — puramente estetico ma fastidioso a questo prezzo',
        'La cerniera della sonda può sembrare allentata dopo 2-3 anni di uso quotidiano — funziona ancora benissimo ma non si sente rigida come quando era nuova',
        'Nessun magnete o clip per una conservazione comoda — facile da perdere in una cucina esterna disordinata',
      ],
      editorial_content: `<h2>Sto per Farti Risparmiare un Sacco di Soldi</h2>
<p>Smettila di comprare termometri economici. So che quelli da 15$ su Amazon hanno 4,5 stelle e 30.000 recensioni. So che "funzionano benissimo". So che 105$ sembrano assurdi per un termometro. Ho sentito ogni argomentazione, e ti dirò perché sono tutte sbagliate.</p>
<p>Ho testato oltre 20 termometri a lettura istantanea nell'ultimo decennio. Economici, di fascia media, costosi. Li ho immersi in bagni di ghiaccio, acqua bollente, e confrontati con un NIST-traceable reference calibrator. Il Thermapen ONE è fuori categoria in ogni singola metrica che conta. Non un po' meglio. Fuori categoria.</p>

<h2>Il Caso della Velocità: un Secondo vs. Tre-Cinque Secondi</h2>
<p>Sembra una differenza banale. Non lo è. Quando stai aprendo il coperchio di uno smoker caldo, ogni secondo costa calore. Quando stai controllando trenta hamburger a una grigliata con la famiglia, la velocità di lettura fa la differenza tra mantenere il ritmo e creare un ingorgo. Quando sei con il braccio dentro un affumicatore caldo cercando di sondare un brisket avvolto, un secondo sembra un'eternità.</p>
<p>Il Thermapen ONE legge in un secondo. Non "circa un secondo". Non "di solito un secondo". Un secondo, ogni volta, su ogni taglio, a ogni temperatura. Non ho trovato un termine di paragone che ci si avvicini a meno del doppio del tempo.</p>

<h2>La Precisione: Dove i Termometri Economici Mentono a Te</h2>
<p>Ho testato 11 termometri economici con range di prezzo da 12 a 40$ contro un calibratore tracciabile NIST. Solo due erano entro ±2°F. Quattro erano fuori di oltre 5°F. Uno era fuori di 8°F a temperature elevate — il che significa che pensavi di cucinare il pollo a 74°C quando era effettivamente a 69°C. Questo è il territorio della salmonella.</p>
<p>Il Thermapen ONE è costantemente entro ±0,5°F sull'intero intervallo. Questo non è marketing — l'ho verificato personalmente contro strumenti di grado laboratorio. A quelle temperature in cui la differenza tra carne sicura e rischio sanitario è di 2-3 gradi, la precisione non è discrezionale.</p>

<h2>Il Caso della Resistenza all'Acqua</h2>
<p>La mia prova preferita: ho lasciato cadere intenzionalmente il mio Thermapen ONE in un contenitore di acqua ghiacciata mentre testavo la temperatura interna di una punta di petto. È rimasto sommerso per circa 20 secondi mentre lo recuperavo. Ho acceso il display — funzionava perfettamente. IP67 significa sigillato ermeticamente contro la polvere e capace di reggere l'immersione in acqua fino a 1 metro. Per un termometro che vive in cucine all'aperto dove si riversa ghiaccio, cadono salse e occasionalmente piove, questo è fondamentale.</p>

<h2>Il Vero Costo di Possesso</h2>
<p>Considera questo: se compri tre termometri economici da 20-30$ nei prossimi cinque anni quando falliscono o derivano fuori dal range accettabile — una stima conservativa — hai speso 60-90$. Il Thermapen ONE costa 105$ e probabilmente durerà dieci anni. Su quella finestra temporale, non è nemmeno il termometro più costoso; è il più economico per uso.</p>

<h2>L'Unico Avvertimento Vero</h2>
<p>Il Thermapen ONE è uno strumento di controllo spot, non una sonda da lasciare inserita. Non monitora la temperatura in continuo durante una cottura di 14 ore. Per questo ti serve qualcosa come un FireBoard 2 o un MEATER+. Ma per ogni momento in cui hai bisogno di sapere esattamente dove si trova la temperatura interna della tua carne in questo preciso secondo — non c'è sostituto.</p>

<h2>Il Verdetto Finale</h2>
<p>Se stai cucinando carne — qualsiasi carne, qualsiasi metodo — hai bisogno di questo termometro. Non come accessorio. Non come aggiornamento nice-to-have. Come attrezzatura fondamentale. La differenza tra carne ben cotta e carne overcookata, tra sicurezza alimentare e rischio sanitario, tra un brisket perfetto e uno asciutto spesso si riduce a 2-3 gradi. Il Thermapen ONE legge quei gradi con precisione, velocità e affidabilità che nient'altro può eguagliare a qualsiasi prezzo.</p>`,
    },
    es: {
      title: 'ThermoWorks Thermapen ONE Review: El Único Termómetro que Necesitas',
      excerpt: 'Es el único equipo de BBQ que salvaría de un incendio. Un segundo. Precisión absoluta. Construido como un tanque. Todos los demás termómetros de lectura instantánea solo están fingiendo.',
      verdict: 'El Thermapen ONE no es el mejor termómetro de lectura instantánea — es el único termómetro de lectura instantánea. Todo lo demás es un compromiso que no deberías aceptar.',
      pros: [
        'Lecturas genuinas en un segundo verificadas con referencias trazables NIST — nada más se acerca',
        'Precisión ±0,5°F en todo el rango — lo comparé con equipos de laboratorio y no encontré desviación',
        'IP67 resistente al agua — lo he caído en un contenedor de agua con hielo y en un fregadero con platos, funciona perfectamente en ambos casos',
        'Más de 2.000 horas de batería con una sola AAA — no he cambiado la batería en 10 meses de uso intensivo',
        'La pantalla retroiluminada con rotación automática es genuinamente útil en los controles de brisket de las 5 de la mañana',
        'La punta delgada de la sonda da lecturas precisas incluso en cortes finos como pechugas de pollo y filetes de pescado',
      ],
      cons: [
        'A 105$, cuesta 5 veces más que los termómetros baratos — debes decidir si la velocidad de un segundo vale esa prima para ti',
        'Sin función inalámbrica ni sonda para dejar insertada — es solo una herramienta de medición puntual, sigues necesitando un termómetro de sonda separado para monitoreo continuo',
        'El acabado del color en el mango se desgasta y destiñe con el uso intensivo al aire libre — puramente estético pero molesto a este precio',
        'La bisagra de la sonda puede sentirse floja después de 2-3 años de uso diario — sigue funcionando bien pero no se siente tan firme como cuando era nueva',
        'Sin imán ni clip para almacenamiento conveniente — fácil de perder en una cocina exterior desordenada',
      ],
      editorial_content: `<h2>Voy a Ahorrarte Mucho Dinero</h2>
<p>Deja de comprar termómetros baratos. Sé que los de 15$ en Amazon tienen 4,5 estrellas y 30.000 reseñas. Sé que "funcionan bien". Sé que 105$ parece absurdo para un termómetro. He escuchado todos los argumentos, y voy a decirte por qué todos están equivocados.</p>
<p>He probado más de 20 termómetros de lectura instantánea en la última década. Baratos, de gama media, caros. Los he sumergido en baños de hielo, agua hirviendo, y los he comparado contra un calibrador trazable NIST. El Thermapen ONE está en otra categoría en cada métrica que importa. No un poco mejor. En otra categoría.</p>

<h2>El Caso de la Velocidad: Un Segundo vs. Tres-Cinco Segundos</h2>
<p>Parece una diferencia trivial. No lo es. Cuando estás abriendo la tapa de un ahumador caliente, cada segundo cuesta calor. Cuando estás comprobando treinta hamburguesas en una barbacoa familiar, la velocidad de lectura marca la diferencia entre mantener el ritmo y crear un embotellamiento. Cuando tienes el brazo dentro de un ahumador caliente intentando sondear un brisket envuelto, un segundo parece una eternidad.</p>
<p>El Thermapen ONE lee en un segundo. No "aproximadamente un segundo". No "normalmente un segundo". Un segundo, siempre, en cualquier corte, a cualquier temperatura. No he encontrado ningún competidor que se acerque a menos del doble del tiempo.</p>

<h2>La Precisión: Donde los Termómetros Baratos te Mienten</h2>
<p>Probé 11 termómetros baratos con precios entre 12 y 40$ contra un calibrador trazable NIST. Solo dos estaban dentro de ±2°F. Cuatro estaban fuera por más de 5°F. Uno estaba fuera por 8°F a altas temperaturas — lo que significa que creías que estabas cocinando el pollo a 74°C cuando en realidad estaba a 69°C. Eso es territorio de salmonela.</p>
<p>El Thermapen ONE está consistentemente dentro de ±0,5°F en todo el rango. Esto no es marketing — lo verifiqué personalmente contra instrumentos de grado laboratorio. A esas temperaturas donde la diferencia entre carne segura y riesgo sanitario es de 2-3 grados, la precisión no es opcional.</p>

<h2>El Caso de la Resistencia al Agua</h2>
<p>Mi prueba favorita: dejé caer intencionalmente mi Thermapen ONE en un contenedor de agua helada mientras medía la temperatura interna de una punta de falda. Estuvo sumergido unos 20 segundos mientras lo recuperaba. Encendí la pantalla — funcionaba perfectamente. IP67 significa sellado herméticamente contra el polvo y capaz de resistir inmersión en agua hasta 1 metro. Para un termómetro que vive en cocinas al aire libre donde se vierte hielo, caen salsas y ocasionalmente llueve, esto es fundamental.</p>

<h2>El Único Aviso Real</h2>
<p>El Thermapen ONE es una herramienta de comprobación puntual, no una sonda para dejar insertada. No monitorea la temperatura continuamente durante una cocción de 14 horas. Para eso necesitas algo como un FireBoard 2 o un MEATER+. Pero para cada momento en que necesitas saber exactamente dónde está la temperatura interna de tu carne en este preciso segundo — no hay sustituto.</p>

<h2>Conclusión</h2>
<p>Si cocinas carne — cualquier carne, cualquier método — necesitas este termómetro. No como accesorio. No como mejora opcional. Como equipo fundamental. La diferencia entre carne bien cocinada y sobrecocinada, entre seguridad alimentaria y riesgo sanitario, entre un brisket perfecto y uno seco a menudo se reduce a 2-3 grados. El Thermapen ONE lee esos grados con la precisión, velocidad y fiabilidad que nada más puede igualar a ningún precio.</p>`,
    },
  },

  // --- KAMADO JOE CLASSIC III ---
  'tc0kijbb31drwhwi5san7syb': {
    it: {
      title: 'Kamado Joe Classic III Recensione: Il Forno in Ceramica che Domina Tutto',
      excerpt: 'Il Kamado Joe Classic III è la cosa più vicina a un cuocitore perfetto che esista — se sei disposto a imparare il suo linguaggio, a reggerne il peso e ad accettare che 406 pollici quadrati siano abbastanza per i tuoi bisogni.',
      verdict: 'Il miglior cuocitore tuttotondo che abbia mai usato, limitato solo dal peso, dalla curva d\'apprendimento e dalla superficie di cottura ridotta — ma quello che fa entro questi limiti è genuinamente straordinario.',
      pros: [
        'L\'inserto SloRoller produce la distribuzione di calore e fumo più uniforme che abbia mai misurato su qualsiasi kamado — punto',
        'Mantiene la temperatura entro ±4°C per 14+ ore con un\'unica carica di carbone senza regolare i tiratori',
        'La versatilità è impareggiabile: affumica a 107°C, cuoce la pizza a 400°C e tutto quello che c\'è in mezzo',
        'Il sistema Divide & Conquer ti permette di cuocere a più temperature simultaneamente — ingegneria brillante',
        'La cerniera Air Lift rende il coperchio da 110 kg imponderabile — essenziale per un cuocitore pesante come questo',
        'L\'efficienza del carburante è straordinaria: 2 kg di carbonella per 12 ore di cottura',
      ],
      cons: [
        '110 kg significa che servono due persone robuste e un piano per posizionarlo — e non si muoverà mai più',
        'La curva d\'apprendimento è reale: aspettati 5-10 cotture frustranti prima di capire la gestione dei tiratori e il recupero della temperatura',
        '406 pollici quadrati di superficie di cottura primaria ti limita a circa 2 spalle di maiale o 12 hamburger — non basta per grandi tavolate senza pianificazione attenta',
        'La ceramica SI CRACCHERÀ se la sottoponi a shock termico aprendo il coperchio troppo velocemente ad alte temperature — il flashback può far salire 100°C in pochi secondi',
        'A 2.500$+, è un investimento serio che ha senso solo se cucini almeno settimanalmente',
        'La sostituzione della guarnizione ogni 2-3 anni (30$ + lavoro) è noiosa ma necessaria — la guarnizione di fabbrica si degrada più velocemente di quanto dovrebbe',
      ],
      editorial_content: `<h2>Confessione di un Convertito al Kamado</h2>
<p>Ho resistito ai cuocitori kamado per anni. Ero un purista dell'offset. I veri pitmasters cucinano con la legna, no? Il vero fumo viene dal vero fuoco, non da un uovo di ceramica che sembra uscito da uno studio di ceramica. Poi un amico mi ha fatto un brisket sul suo Kamado Joe Classic III, e ho chiuso la bocca e ne ho comprato uno la settimana dopo.</p>
<p>Sono passati 14 mesi. Da allora ho cucinato oltre 200 pasti su questo attrezzo. Brisket, spalle di maiale, pizza, pane, pollo allo spiedo, filetti di salmone, crostacei. Il Kamado Joe Classic III è il cuocitore più versatile che abbia mai usato. Non è il migliore per nessuna singola cottura — non fuma la carne meglio di un offset ben gestito, non produce grigliature migliori di una griglia a carbone ben costruita — ma non c'è nient'altro che sia al 90%+ su ogni tipo di cottura che esiste.</p>

<h2>La Qualità Costruttiva: Pesa 110 kg per un Motivo</h2>
<p>La ceramica del Classic III ha uno spessore di 38 mm e un peso che la dice lunga sulla ritenzione termica. Una volta che questo cuocitore arriva a temperatura, non cede al vento freddo, alle porte del garage aperte o alle mamme preoccupate per il tempo. Ho cucinato con -7°C fuori e il kamado manteneva 107°C con le stesse impostazioni dei tiratori che avrei usato a 20°C. L'isolamento termico è fuori dal comune.</p>
<p>La cerniera Air Lift brevettata è vera ingegneria. Il coperchio da 110 kg si solleva con due dita grazie a un sistema di controbilanciamento a molla. Dopo 14 mesi di uso quotidiano, la cerniera non ha ceduto, non si è sbloccata e non ha avuto bisogno di regolazioni. Confrontala con il Primo XL o anche con il Big Green Egg — il Kamado Joe ha la migliore ingegneria del coperchio nel settore.</p>

<h2>Il Sistema SloRoller: Il Punto di Svolta</h2>
<p>Il SloRoller è un deflettore brevettato che sostituisce il piatto del deflettore convenzionale per cotture a bassa temperatura. Invece di bloccare il calore e il fumo e permettergli di girare in modo piatto, il SloRoller li fa muovere a spirale intorno al cibo. Il risultato è la distribuzione di calore e fumo più uniforme che abbia misurato su qualsiasi cuocitore che non sia un armadio da competizione da 10.000$.</p>
<p>In termini pratici: brisket con un bark uniforme dal bordo al bordo, rack di ribs che non hanno mai un lato più scuro dell'altro, pollo senza zone asciutte nella parte più spessa del petto. Non si tratta di marketing. Ho i dati del grafico delle temperature a dimostrarlo.</p>

<h2>La Curva d\'Apprendimento: Sarà Frustrante. Poi Non lo Sarà Più.</h2>
<p>Le prime 5-10 cotture su un kamado sono difficili. Non difficili come capire come accenderlo — quella parte è semplice. Difficili come imparare come la ceramica regge e trattiene la temperatura, come risponde il fuoco alle regolazioni dei tiratori dopo 10 minuti invece che immediatamente, come recuperare la temperatura dopo aver aperto il coperchio.</p>
<p>Il kamado ha inerzia termica. Aprire il coperchio a 350°C e lasciare entrare ossigeno può mandare la temperatura a 500°C in 30 secondi. Questo si chiama "flashback" e può craccare la ceramica se accade ripetutamente. La regola: apri sempre il coperchio lentamente e "prugna" — aprila di un centimetro per 10-15 secondi per lasciar sfiatare prima l'eccesso di ossigeno.</p>

<h2>La Questione della Dimensione</h2>
<p>406 pollici quadrati di superficie di cottura primaria è sufficiente per la maggior parte delle cotture domestiche — 12-14 hamburger, due rack di ribs, una spalla di maiale, un brisket da 7 kg. Ma se cucini regolarmente per più di 6-8 persone, sentirai i vincoli. Non c'è un modo per aggirare questo: il Classic III è un cuocitore per famiglie normali, non per eventi di catering.</p>
<p>Il sistema Divide & Conquer mitiga parzialmente questo con cottura su più livelli, ma griglie su più livelli non raddoppiano la tua capacità effettiva — cambiano le dinamiche di cottura e richiedono più attenzione. Se la capacità è il tuo principale problema, guarda il Big Joe III (582 pollici quadrati) o un cuocitore da competizione a grandezza intera.</p>

<h2>Il Verdetto Finale</h2>
<p>Il Kamado Joe Classic III è il cuocitore che raccomanderei a qualcuno che voglia solo uno cuocitore per fare tutto — grigliare, affumicare, arrostire, cuocere — al massimo livello che la tecnologia del kamado può offrire. Non è economico, non è leggero, e non perdona i principianti che non leggono il manuale. Ma quello che produce nelle mani di un cuoco attento è genuinamente straordinario. È il meglio che esiste entro i suoi vincoli — e quei vincoli sono piuttosto ampi.</p>`,
    },
    es: {
      title: 'Kamado Joe Classic III Review: El Cocedor de Cerámica que Domina Todo',
      excerpt: 'El Kamado Joe Classic III es lo más cercano a un cocedor perfecto que existe — si estás dispuesto a aprender su lenguaje, aguantar su peso y aceptar que 406 pulgadas cuadradas son suficientes para tus necesidades.',
      verdict: 'El mejor cocedor polivalente que he usado jamás, limitado solo por el peso, la curva de aprendizaje y la superficie de cocción reducida — pero lo que hace dentro de esas limitaciones es genuinamente extraordinario.',
      pros: [
        'El inserto SloRoller produce la distribución de calor y humo más uniforme que he medido en cualquier kamado — sin discusión',
        'Mantiene la temperatura dentro de ±4°C durante 14+ horas con una sola carga de carbón sin tocar las ventilaciones',
        'La versatilidad es inigualable: ahúma a 107°C, hornea pizza a 400°C y todo lo que hay entre medias',
        'El sistema Divide & Conquer permite cocinar a varias temperaturas simultáneamente — ingeniería brillante',
        'La bisagra Air Lift hace que la tapa de 110 kg parezca ingrávida — esencial para un cocedor tan pesado',
        'La eficiencia del combustible es asombrosa: 2 kg de carbón vegetal para 12 horas de cocción',
      ],
      cons: [
        '110 kg significa que necesitas dos personas fuertes y un plan para colocarlo — y no se moverá nunca más',
        'La curva de aprendizaje es real: espera 5-10 cocciones frustrantes antes de entender la gestión de ventilaciones y la recuperación de temperatura',
        '406 pulgadas cuadradas de superficie de cocción primaria te limita a unos 2 paletas de cerdo o 12 hamburguesas — no da para reuniones grandes sin planificación cuidadosa',
        'La cerámica SE AGRIETARÁ si la sometes a choque térmico abriendo la tapa demasiado rápido a altas temperaturas — el "flashback" puede disparar la temperatura 100°C en segundos',
        'A más de 2.500$, es una inversión seria que solo tiene sentido si cocinas al menos una vez a la semana',
        'El reemplazo de la junta cada 2-3 años (30$ + mano de obra) es tedioso pero necesario — la junta de fábrica se degrada más rápido de lo que debería',
      ],
      editorial_content: `<h2>Confesión de un Converso al Kamado</h2>
<p>Durante años me resistí a los cocedores kamado. Era un purista del offset. Los auténticos pitmasters cocinan con leña, ¿no? El humo real viene del fuego real, no de un huevo de cerámica que parece salido de un estudio de alfarería. Entonces un amigo me preparó un brisket en su Kamado Joe Classic III, y cerré la boca y compré uno a la semana siguiente.</p>
<p>Han pasado 14 meses. Desde entonces he cocinado más de 200 comidas en este trasto. Briskets, paletas de cerdo, pizza, pan, pollo en espeto, filetes de salmón, mariscos. El Kamado Joe Classic III es el cocedor más versátil que he usado. No es el mejor en ninguna cocción individual — no ahúma la carne mejor que un offset bien gestionado, no produce mejores marcas de parrilla que una buena parrilla de carbón — pero no hay nada más que esté al 90%+ en cada tipo de cocción que existe.</p>

<h2>Calidad de Construcción: Pesa 110 kg por una Razón</h2>
<p>La cerámica del Classic III tiene 38 mm de espesor y un peso que habla por sí solo en cuanto a retención térmica. Una vez que este cocedor alcanza la temperatura, no cede al viento frío, puertas abiertas del garaje o madres preocupadas por el tiempo. He cocinado con -7°C afuera y el kamado mantenía 107°C con la misma configuración de ventilaciones que usaría a 20°C. El aislamiento térmico no tiene comparación.</p>

<h2>El Sistema SloRoller: El Cambio de Juego</h2>
<p>El SloRoller es un deflector patentado que reemplaza la placa deflectora convencional para cocciones a baja temperatura. En lugar de bloquear el calor y el humo y dejarlos circular planos, el SloRoller los hace moverse en espiral alrededor de la comida. El resultado es la distribución de calor y humo más uniforme que he medido en cualquier cocedor que no sea una cámara de competición de 10.000$.</p>

<h2>La Curva de Aprendizaje: Será Frustrante. Y Luego No lo Será.</h2>
<p>Las primeras 5-10 cocciones en un kamado son difíciles. No difíciles como aprender a encenderlo — esa parte es sencilla. Difíciles como aprender cómo la cerámica retiene la temperatura, cómo responde el fuego a los ajustes de ventilación con 10 minutos de retraso, cómo recuperar la temperatura después de abrir la tapa.</p>
<p>El kamado tiene inercia térmica. Abrir la tapa a 350°C y dejar entrar oxígeno puede disparar la temperatura a 500°C en 30 segundos. Esto se llama "flashback" y puede agrietar la cerámica si ocurre repetidamente. La regla: siempre abre la tapa lentamente y "sángra" — ábrela un centímetro durante 10-15 segundos para dejar escapar el exceso de oxígeno primero.</p>

<h2>Conclusión</h2>
<p>El Kamado Joe Classic III es el cocedor que recomendaría a alguien que quiere solo uno para hacerlo todo — asar, ahumar, hornear — al máximo nivel que la tecnología kamado puede ofrecer. No es barato, no es ligero y no perdona a los principiantes que no leen el manual. Pero lo que produce en manos de un cocinero atento es genuinamente extraordinario.</p>`,
    },
  },

  // --- JEALOUS DEVIL CHARCOAL ---
  'zfmo7x9sdlbyu1lm1i6gahxg': {
    it: {
      title: 'Jealous Devil Carbonella Grezza Recensione: Il Combustibile che Brucia Più a Lungo e Più Caldo',
      excerpt: 'Carbonella premium che brucia più a lungo e più calda della concorrenza, ma a un prezzo che ti fa chiedere se la carbonella debba mai costare così tanto. Per i cuochi seri, la risposta è probabilmente sì.',
      verdict: 'La carbonella grezza con le migliori prestazioni sul mercato, punto — ma il premium di prezzo e la disponibilità limitata impediscono di raccomandarla automaticamente a tutti.',
      pros: [
        'Brucia del 40-50% più a lungo di Royal Oak, Cowboy e altre carbonelle di massa nei test controllati',
        'La produzione di cenere è davvero minima, circa il 3% — le tue ventilazioni rimangono libere e il flusso d\'aria rimane costante sulle cotture lunghe',
        'Pezzi grandi, selezionati a mano, con poca polvere e frammenti — paghi per la qualità dei pezzi e la ottieni',
        'Brucia pulita con un sapore neutro che lascia parlare il fumo del legno e la carne',
      ],
      cons: [
        'A 2,50-3,00$ a libbra, costa il doppio di B&B o Royal Oak — e il gap di prestazioni non giustifica sempre un premio 2x',
        'La disponibilità nei negozi è frustrantemente incostante — ho dovuto ordinare online e pagare la spedizione più volte quando i negozi locali erano esauriti',
        'Il sacco da 16 kg è davvero scomodo da maneggiare — niente maniglie sui lati e il sacco di carta si strappa se lo prendi male',
        'Il legno di quebracho produce scintille aggressive durante i primi 10 minuti di accensione — tieni la faccia e gli avambracci lontani quando accendi una ciminiera',
        'I pezzi sono COSÌ densi che impiegano notevolmente più tempo ad accendersi rispetto alle carbonelle meno dense — aggiungi 5-7 minuti in più al tempo della ciminiera',
        'Per le cotture lente dove bruci 2 kg in 12 ore, il vantaggio prestazionale rispetto a un sacco da 15$ di B&B Oak è trascurabile',
      ],
      editorial_content: `<h2>Parliamo dell\'Elefante nel Sacco</h2>
<p>Jealous Devil è carbonella cara. Non un po' cara. Non oh-costa-un-po'-di-più del solito cara. Costa circa il doppio della carbonella grezza premium mainstream, e in alcuni mercati con la spedizione può arrivare a 6-7€ al kg. Per un prodotto consumabile che letteralmente diventa cenere, è una pillola dura da ingoiare.</p>
<p>Quindi la domanda non è "Jealous Devil è buona carbonella?" — è oggettivamente eccellente. La domanda è: "Vale il doppio dei soldi?"</p>
<p>Dipende interamente da come cuoci.</p>

<h2>I Dati di Prestazione: Cosa Mostrano i Test</h2>
<p>Ho eseguito test comparativi di combustione su undici marche di carbonella grezza negli ultimi tre anni. Ho usato un Kamado Joe Classic III controllato con termometri a sonda multipli per standardizzare le variabili. Ecco cosa ho trovato costantemente su Jealous Devil:</p>
<ul>
<li><strong>Durata di combustione:</strong> 40-50% più lunga di Royal Oak, Cowboy e Weber brand charcoal nelle stesse condizioni di ventilazione</li>
<li><strong>Produzione di calore massimo:</strong> La temperatura di grigliatura diretta raggiunge 290°C dove Royal Oak raggiunge 260°C nelle stesse condizioni</li>
<li><strong>Produzione di cenere:</strong> circa 3% in peso rispetto all'8-12% per la carbonella mainstream</li>
<li><strong>Profilo di sapore:</strong> neutro — nessun sapore chimico o artificiale, lascia parlare la carne e il legno da affumicatura</li>
</ul>
<p>Questi non sono numeri piccoli. Una durata di combustione del 40% più lunga significa cotture di 16 ore dove prima ne servivano 22. Significa meno ricariche di carbonella su lunghe cotture. Significa mantenimento di temperatura più stabile a metà cottura.</p>

<h2>Dove il Premium Ha Senso</h2>
<p>Grigliatura ad alta temperatura: quando stai cercando di raggiungere 290°C+ per un bruciore perfetto di bistecca, la densità del quebracho si traduce in temperatura più alta e più stabile. Il vantaggio è reale e misurabile.</p>
<p>Cotture lunghe su kamado o offset dove la durata della combustione influisce sulla stabilità della temperatura: meno ricariche di carbone significa meno fluttuazioni di temperatura, il che si traduce in carne migliore.</p>
<p>Cuochi avanzati che capiscono la correlazione tra qualità del combustibile e qualità del prodotto finale: se tratti la carbonella come variabile di cottura invece che come spesa da minimizzare, Jealous Devil vale il prezzo.</p>

<h2>Dove il Premium Non Ha Senso</h2>
<p>Grigliate di hamburger veloci dove bruci 2-3 kg in un'ora: la differenza di prestazione viene annullata dalla breve durata di cottura. Usa B&B o Royal Oak — stai letteralmente bruciando soldi con il premium.</p>
<p>Principianti che stanno ancora imparando la gestione della temperatura: fino a quando non capisci il controllo di base della ventilazione, la qualità della carbonella è il tuo ultimo problema.</p>

<h2>Il Verdetto Finale</h2>
<p>Jealous Devil è la carbonella più performante che puoi comprare. Su questo non ho dubbi. Ma le prestazioni più elevate si traducono in ricompense tangibili solo in contesti specifici. Se sei un cuoco serio che fa cotture lunghe o che cerca il massimo dalla grigliatura ad alta temperatura, l'investimento si ripaga. Per la grigliata domenicale, non sprecare i soldi.</p>`,
    },
    es: {
      title: 'Jealous Devil Carbón Vegetal Review: El Combustible que Arde Más Tiempo y Más Caliente',
      excerpt: 'Carbón premium que arde más tiempo y más caliente que la competencia, pero a un precio que te hace preguntarte si el carbón debería costar tanto. Para los cocineros serios, la respuesta es probablemente sí.',
      verdict: 'El mejor carbón vegetal del mercado en rendimiento, sin discusión — pero la prima de precio y la disponibilidad limitada impiden recomendarlo automáticamente a todo el mundo.',
      pros: [
        'Arde un 40-50% más que Royal Oak, Cowboy y otros carbones masivos en pruebas controladas',
        'La producción de ceniza es genuinamente mínima, alrededor del 3% — tus ventilaciones se mantienen libres y el flujo de aire es consistente en cocciones largas',
        'Trozos grandes, seleccionados a mano, con poco polvo ni fragmentos — pagas por la calidad del trozo y la obtienes',
        'Combustión limpia con sabor neutro que deja hablar al humo de la madera y a la carne',
      ],
      cons: [
        'A 2,50-3,00$ por libra, cuesta el doble que B&B o Royal Oak — y la diferencia de rendimiento no siempre justifica una prima 2x',
        'La disponibilidad en tiendas es frustrante e inconsistente — he tenido que pedir online y pagar envío varias veces cuando las tiendas locales estaban agotadas',
        'El saco de 16 kg es genuinamente incómodo de manejar — sin asas en los lados y el saco de papel se rompe si lo agarras mal',
        'La madera de quebracho produce chispas agresivas durante los primeros 10 minutos de ignición — mantén la cara y los antebrazos alejados cuando enciendes la chimenea',
        'Las piezas son TAN densas que tardan notablemente más en encenderse que los carbones menos densos — añade 5-7 minutos extra al tiempo de chimenea',
        'Para cocciones lentas donde quemas 2 kg en 12 horas, la ventaja de rendimiento frente a un saco de 15$ de B&B Oak es insignificante',
      ],
      editorial_content: `<h2>Hablemos del Elefante en el Saco</h2>
<p>Jealous Devil es carbón caro. No un poco caro. No oh-cuesta-algo-más-de-lo-normal caro. Cuesta aproximadamente el doble que el carbón vegetal premium mainstream, y en algunos mercados con envío puede llegar a 6-7€ el kg. Para un producto consumible que literalmente se convierte en ceniza, es una pastilla difícil de tragar.</p>
<p>Así que la pregunta no es "¿Es Jealous Devil buen carbón?" — es objetivamente excelente. La pregunta es: "¿Vale el doble de dinero?"</p>
<p>Depende enteramente de cómo cocines.</p>

<h2>Los Datos de Rendimiento: Qué Muestran las Pruebas</h2>
<p>He realizado pruebas comparativas de combustión en once marcas de carbón vegetal durante los últimos tres años. Los resultados con Jealous Devil son consistentes:</p>
<ul>
<li><strong>Duración de combustión:</strong> 40-50% más larga que Royal Oak, Cowboy y Weber brand charcoal en las mismas condiciones de ventilación</li>
<li><strong>Calor máximo:</strong> La temperatura de parrilla directa alcanza 290°C donde Royal Oak llega a 260°C en las mismas condiciones</li>
<li><strong>Producción de ceniza:</strong> alrededor del 3% en peso frente al 8-12% del carbón masivo</li>
<li><strong>Perfil de sabor:</strong> neutro — sin sabores químicos ni artificiales, deja que la carne y la madera ahumadora hablen</li>
</ul>

<h2>Dónde la Prima Tiene Sentido</h2>
<p>Parrilla a alta temperatura: cuando intentas alcanzar 290°C+ para un sellado perfecto de filete, la densidad del quebracho se traduce en temperatura más alta y estable. La ventaja es real y medible.</p>
<p>Cocciones largas en kamado o offset donde la duración de la combustión afecta a la estabilidad de temperatura: menos recargas de carbón significan menos fluctuaciones, lo que se traduce en mejor carne.</p>
<p>Cocineros avanzados que entienden la correlación entre calidad del combustible y calidad del resultado final.</p>

<h2>Dónde la Prima No Tiene Sentido</h2>
<p>Barbacoas rápidas de hamburguesas donde quemas 2-3 kg en una hora: la diferencia de rendimiento queda anulada por la corta duración de cocción. Usa B&B o Royal Oak — literalmente estás quemando dinero con la prima.</p>

<h2>Conclusión</h2>
<p>Jealous Devil es el carbón de mayor rendimiento que puedes comprar. En eso no tengo dudas. Pero ese mayor rendimiento solo se traduce en recompensas tangibles en contextos específicos. Si eres un cocinero serio que hace cocciones largas o busca el máximo en parrilla a alta temperatura, la inversión merece la pena. Para la barbacoa del domingo, no malgastes el dinero.</p>`,
    },
  },

  // --- GRILLGRATE ---
  'uyy1eeax19asf47imchhll65': {
    it: {
      title: 'GrillGrate Sear Station Recensione: Trasforma Qualsiasi Grill in una Macchina da Rosolatura',
      excerpt: 'Un accessorio intelligente che fa esattamente una cosa — amplificare il calore per una rosolatura migliore — e la fa bene. Ma non è magia, e viene con compromessi che ogni acquirente dovrebbe capire.',
      verdict: 'Un upgrade di rosolatura legittimo per i proprietari di pellet grill e grill a gas che vogliono crosta da steakhouse, ma le striature a binario e la seccatura della pulizia lo tengono lontano dall\'essere una raccomandazione universale.',
      pros: [
        'Amplifica davvero la temperatura del grill di 50-100°C — ho misurato 360°C su un grill che arriva a 260°C',
        'Compatibilità universale con gas, carbone, pellet e kamado — vera versatilità',
        'La costruzione in alluminio anodizzato duro non mostra deformazioni dopo 8 mesi di uso intenso',
        'Elimina i flare-up catturando i gocciolamenti nelle vallette tra i binari',
        'Trasforma un pellet grill da discreto grigliatore in una macchina da rosolatura rispettabile',
      ],
      cons: [
        'Crea caratteristiche striature a binario invece di una crosta uniforme su tutta la superficie — se vuoi la reazione di Maillard da bordo a bordo, questo non è il tuo strumento',
        'Pulire tra i binari stretti è genuinamente noioso — il GrateTool in dotazione aiuta ma non risolve il problema, specialmente con formaggio fuso o salse zuccherate',
        'La copertura completa del grill per un grill a gas standard costa 150-200$, che è tanto per quello che è essenzialmente una sostituzione della griglia',
        'Le vallette tra i binari cuociono il cibo leggermente a vapore invece di rosolarlo, il che significa che solo circa il 60% della superficie della carne riceve calore da contatto diretto',
        'Blocca la radiazione infrarossa dalla fonte di calore sotto, il che significa che le zone tra i binari cuociono diversamente da quelle sui binari',
        'La costruzione in alluminio trasferisce calore velocemente ma si raffredda altrettanto velocemente quando posi cibo freddo sopra — la prima bistecca rosola meglio della quarta',
      ],
      editorial_content: `<h2>Che Problema Stiamo Effettivamente Risolvendo?</h2>
<p>Il GrillGrate esiste perché la maggior parte dei grill — specialmente i pellet grill e i grill a gas di fascia media — non riesce a rosolare un granché. Un Traeger Ironwood arriva al massimo a 260°C. Un Weber Spirit medio si ferma intorno a 290°C. Nessuna di queste temperature ti darà la reazione di Maillard scura, con la crosta, da steakhouse che rende una grande bistecca grande. Per quello ti servono 340°C+, e il GrillGrate sostiene di colmare quel gap.</p>
<p>Funziona? Sì. Con riserve.</p>

<h2>La Scienza Dietro i Binari</h2>
<p>Il GrillGrate è costruito in alluminio anodizzato duro con binari rialzati che concentrano il calore e le vallette che catturano i gocciolamenti. L'alluminio conduce il calore circa 16 volte più velocemente dell'acciaio inox, il che spiega perché le superfici dei binari raggiungono temperature notevolmente più alte della superficie della griglia del grill sottostante. In teoria è ingegneria elegante. In pratica funziona come pubblicizzato.</p>
<p>Ho testato il GrillGrate su un Traeger Ironwood 885 impostato a 230°C — la temperatura massima che la maggior parte dei proprietari di pellet grill usa per la grigliatura. Con il GrillGrate, le punte dei binari hanno raggiunto 360°C. Senza GrillGrate, la superficie della griglia era a 230-240°C. Quella differenza di 120°C è reale e ha un impatto reale sulla crosticina della bistecca.</p>

<h2>Dove Funziona Bene</h2>
<p>Bistecche spesse (4+ cm) su pellet grill e grill a gas: questo è lo scenario d'uso principale, ed è qui che il GrillGrate offre il beneficio più chiaro. Le striature a binario producono una bella crosta scura sulle aree di contatto, e la temperatura più alta significa tempi di cottura più brevi che si traducono in carne più succosa.</p>
<p>Hamburger e cotolette di maiale: i pezzi più spessi beneficiano del calore aggiuntivo senza soffrire troppo del problema delle striature. I risultati sono costantemente migliori di quelli che otterrei sulla griglia standard di un pellet grill.</p>

<h2>Dove Non Funziona Bene</h2>
<p>Bistecche sottili (meno di 2,5 cm): la conduttività termica elevata dell'alluminio significa che puoi facilmente overcookare strati sottili prima che si sviluppi una buona crosta. Lo spessore è un requisito, non un'opzione.</p>
<p>Gamberi, capesante e pesce: cadono nelle vallette, si attaccano ai binari, e la pulizia dopo proteine delicate è un incubo. Usa una padella di ghisa invece.</p>
<p>Chiunque voglia una crosta uniforme da bordo a bordo: la struttura a binari crea per definizione striature, non una rosolatura uniforme. Se il tuo obiettivo è la crosta massima su tutta la superficie, hai bisogno di una padella di ghisa o di un vero bruciatore a infrarossi.</p>

<h2>Il Verdetto Finale</h2>
<p>Il GrillGrate fa quello che dice di fare: aumenta la temperatura della superficie di grigliatura e produce migliori striature di rosolatura su grill che altrimenti non riescono a raggiungere temperature adeguate. Per i proprietari di pellet grill che vogliono grigliare bistecche più spesse senza comprare un secondo dispositivo, vale la spesa. Per tutti gli altri, le limitazioni — pulizia noiosa, copertura parziale, costi elevati — lo rendono difficile da raccomandare universalmente.</p>`,
    },
    es: {
      title: 'GrillGrate Sear Station Review: Convierte Cualquier Parrilla en una Máquina de Sellado',
      excerpt: 'Un accesorio inteligente que hace exactamente una cosa — amplificar el calor para mejor sellado — y la hace bien. Pero no es magia, y viene con compromisos que todo comprador debería entender.',
      verdict: 'Una mejora de sellado legítima para propietarios de parrillas de pellets y gas que quieren costra de asador, pero las marcas de rejilla y el fastidio de la limpieza lo alejan de ser una recomendación universal.',
      pros: [
        'Amplifica genuinamente la temperatura de la parrilla en 50-100°C — medí 360°C en una parrilla que tiene 260°C de máximo',
        'Compatibilidad universal con gas, carbón, pellets y kamado — versatilidad real',
        'La construcción en aluminio anodizado duro no muestra deformaciones tras 8 meses de uso intensivo',
        'Elimina los llamaradas capturando los goteos en los valles entre los raíles',
        'Convierte una parrilla de pellets de aceptable en una máquina de sellado respetable',
      ],
      cons: [
        'Crea marcas características de raíl en lugar de una costra uniforme en toda la superficie — si quieres la reacción de Maillard de borde a borde, esta no es tu herramienta',
        'Limpiar entre los raíles estrechos es genuinamente tedioso — el GrateTool incluido ayuda pero no resuelve el problema, especialmente con queso fundido o salsas azucaradas',
        'La cobertura completa de la parrilla para una parrilla de gas estándar cuesta 150-200$, mucho para lo que es esencialmente un reemplazo de rejilla',
        'Los valles entre los raíles cuecen la comida ligeramente al vapor en lugar de sellarla, lo que significa que solo alrededor del 60% de la superficie de la carne recibe calor de contacto directo',
        'Bloquea la radiación infrarroja de la fuente de calor inferior, lo que significa que las zonas entre raíles cocinan diferente que las zonas sobre los raíles',
        'La construcción de aluminio transfiere calor rápido pero también se enfría rápido cuando colocas comida fría — el primer filete sella mejor que el cuarto',
      ],
      editorial_content: `<h2>¿Qué Problema Estamos Resolviendo Exactamente?</h2>
<p>El GrillGrate existe porque la mayoría de las parrillas — especialmente las de pellets y las de gas de gama media — no pueden sellar nada bien. Un Traeger Ironwood llega como máximo a 260°C. Un Weber Spirit de gama media ronda los 290°C. Ninguna de esas temperaturas te dará la reacción de Maillard oscura, con costra, de asador que hace grande a un gran filete. Para eso necesitas 340°C+, y el GrillGrate afirma cerrar esa brecha.</p>
<p>¿Funciona? Sí. Con matices.</p>

<h2>La Ciencia Detrás de los Raíles</h2>
<p>El GrillGrate está construido en aluminio anodizado duro con raíles elevados que concentran el calor y valles que recogen los goteos. El aluminio conduce el calor unas 16 veces más rápido que el acero inox, lo que explica por qué las superficies de los raíles alcanzan temperaturas notablemente más altas que la superficie de la rejilla de la parrilla subyacente. En teoría es ingeniería elegante. En la práctica funciona como se anuncia.</p>
<p>Probé el GrillGrate en un Traeger Ironwood 885 ajustado a 230°C. Con el GrillGrate, las puntas de los raíles alcanzaron 360°C. Sin GrillGrate, la superficie de la rejilla estaba a 230-240°C. Esa diferencia de 120°C es real y tiene impacto real en la costra del filete.</p>

<h2>Dónde Funciona Bien</h2>
<p>Filetes gruesos (4+ cm) en parrillas de pellets y gas: este es el caso de uso principal, y aquí el GrillGrate ofrece el beneficio más claro. Las marcas de raíl producen una bonita costra oscura en las zonas de contacto, y la mayor temperatura significa tiempos de cocción más cortos que se traducen en carne más jugosa.</p>

<h2>Dónde No Funciona Bien</h2>
<p>Filetes finos (menos de 2,5 cm): la alta conductividad térmica del aluminio significa que puedes sobrecocinar capas finas fácilmente antes de que se desarrolle una buena costra. El grosor es un requisito, no una opción.</p>
<p>Gambas, vieiras y pescado: caen en los valles, se pegan a los raíles y la limpieza tras proteínas delicadas es una pesadilla. Usa una sartén de hierro fundido.</p>

<h2>Conclusión</h2>
<p>El GrillGrate hace lo que dice que hace: aumenta la temperatura de la superficie de la parrilla y produce mejores marcas de sellado en parrillas que de otro modo no alcanzan temperaturas adecuadas. Para los propietarios de parrillas de pellets que quieren asar filetes gruesos sin comprar un segundo dispositivo, vale el dinero. Para todos los demás, las limitaciones — limpieza tediosa, cobertura parcial, costes elevados — lo hacen difícil de recomendar universalmente.</p>`,
    },
  },
};

// ============================================================================
// TRADUZIONI RECIPES
// ============================================================================

const recipeTranslations = {

  // --- TEXAS BRISKET ---
  'xs2069n8zpbvd23hsg1fgwbb': {
    it: {
      title: 'Brisket Affumicato Stile Texas',
      excerpt: 'La roba vera. Niente scorciatoie, niente iniezioni, niente avvolgimento se hai pazienza. Sale, pepe, post oak e 14 ore della tua vita che non rimpiangerai mai. Questa è la cottura che separa i pitmasters dai grigliatori.',
      editorial_intro: `<h2>Questa Cottura Ti Metterà Alla Prova</h2>
<p>Sarò onesto: il tuo primo brisket probabilmente sarà mediocre. Forse anche il secondo. Il brisket è la cosa più difficile da affumicare bene, e chiunque ti dica che il suo primo tentativo era perfetto o sta mentendo o ha avuto culo. Affumico brisket da quasi vent'anni e imparo ancora qualcosa ogni volta.</p>
<p>Questa ricetta non è la versione facile. È la versione corretta. Post oak. Sale e pepe. Controllo della temperatura attraverso la gestione del fuoco reale. Se stai cercando istruzioni per pellet grill con salsa BBQ in bottiglia, questa non è la tua pagina.</p>`,
      ingredients: [
        { quantity: '14', unit: 'lbs', name: 'Brisket intero (USDA Choice o Prime)' },
        { quantity: '1/2', unit: 'tazza', name: 'Pepe nero grosso (maglia 16)' },
        { quantity: '1/4', unit: 'tazza', name: 'Sale kosher (Diamond Crystal)' },
        { quantity: '8', unit: 'lbs', name: 'Spaccati o pezzi di post oak' },
        { quantity: '2', unit: 'cucchiai', name: 'Senape gialla (legante, opzionale)' },
        { quantity: '4', unit: 'oz', name: 'Sego di manzo (per avvolgere, opzionale)' },
        { quantity: '1', unit: 'rotolo', name: 'Carta da macellaio (rosa, non cerata)' },
      ],
      instructions: [
        { step_number: 1, description: 'Togli il brisket dalla confezione la sera prima e lascialo scoperto in frigo per la notte — questo asciuga la superficie e favorisce la formazione della bark. La mattina dopo, taglia il cap di grasso a 6 mm, non meno. Rimuovi la falce dura di grasso tra il point e il flat. Quadra i bordi sottili del flat — quelle parti sottili si bruceranno diventando carbone. Tieni i ritagli per macinare e fare hamburger.' },
        { step_number: 2, description: 'Mescola pepe nero grosso a maglia 16 e sale kosher Diamond Crystal in rapporto 2:1 per volume. Se usi la senape come legante, applica prima un velo sottile su tutte le superfici — si brucia completamente e aiuta solo il rub ad aderire. Applica il rub ABBONDANTEMENTE. Quando pensi di averne messo abbastanza, aggiungine altro. La formazione della bark dipende da uno strato spesso di condimento. Lascia riposare il brisket a temperatura ambiente per 1 ora mentre accendi lo smoker.' },
        { step_number: 3, description: 'Accendi il tuo smoker e stabilizzalo a 120°C usando il post oak come legna principale. Per un offset: costruisci un letto di braci con una ciminiera piena di carbonella grezza, poi aggiungi spaccati di post oak su questo letto di braci. Per un kamado: accendi con la carbonella e aggiungi 2-3 pezzi grandi di post oak direttamente sulla brace. Per un pellet grill: riempi la tramoggia con pellet di hickory o post oak e imposta il Super Smoke se disponibile.' },
        { step_number: 4, description: 'Posiziona il brisket con il grasso verso il basso se il calore viene dal basso (offset, kamado), con il grasso verso l\'alto se il calore viene dall\'alto o da dietro (alcuni affumicatori a cabinet). La logica: il grasso protegge la carne dalla fonte di calore.' },
        { step_number: 5, description: 'Mantieni la temperatura dello smoker tra 107-135°C per tutta la durata. Intorno alle ore 4-6, controlla la bark — vuoi un colore mogano scuro e una superficie che sembri asciutta al tatto. Se è ancora umida e morbida, non avvolgere ancora. La bark deve essere impostata prima di avvolgere.' },
        { step_number: 6, description: 'Opzionale ma consigliato per i principianti — la "Texas Crutch": quando la temperatura interna raggiunge 74°C E la bark è formata (scura, asciutta, compatta), avvolgi nella carta da macellaio rosa (non nella carta stagnola — la carta da macellaio respira). Aggiungi 2-4 oz di sego di manzo prima di chiudere il pacchetto. Questo accelera la cottura attraverso lo stallo di evaporazione mantenendo intatta la bark.' },
        { step_number: 7, description: 'Il brisket è pronto quando si verificano due condizioni simultaneamente: temperatura interna di 93-96°C E la sonda entra con zero resistenza — come burro. La temperatura è una guida, non una sentenza definitiva. Ho mangiato brisket perfetti a 91°C e brisket stracotti a 99°C. La sonda non mente.' },
        { step_number: 8, description: 'Togli il brisket e lascialo riposare in un contenitore termico a secco (senza ghiaccio) foderato di vecchi asciugamani. Metti il brisket avvolto dentro, coprilo con altri asciugamani e chiudi il coperchio. Riposo minimo: 2 ore. Ottimale: 4 ore. Ho riposato brisket per 8 ore e la qualità era ancora eccellente. Il riposo non è opzionale — è dove il brisket finisce di cuocere e i succhi si redistribuiscono.' },
        { step_number: 9, description: 'Scarta e affetta. Il flat va affettato contro la fibra a fette spesse come una matita (circa 6 mm). Ogni fetta dovrebbe tenersi insieme quando viene sollevata ma piegarsi leggermente sotto il suo stesso peso — questo è il test del bend della fetta. Il point può essere affettato in cubi per burnt ends, o affettato separatamente contro la sua fibra (che corre in una direzione diversa dal flat).' },
      ],
    },
    es: {
      title: 'Brisket Ahumado Estilo Texas',
      excerpt: 'La versión auténtica. Sin atajos, sin inyecciones, sin envolver si tienes paciencia. Sal, pimienta, post oak y 14 horas de tu vida que nunca lamentarás. Esta es la cocción que separa los pitmasters de los parrilleros.',
      editorial_intro: `<h2>Esta Cocción te Pondrá a Prueba</h2>
<p>Voy a ser honesto: tu primer brisket probablemente será mediocre. Quizás también el segundo. El brisket es la cosa más difícil de ahumar bien, y cualquiera que te diga que su primer intento fue perfecto o está mintiendo o tuvo suerte. Llevo casi veinte años ahumando briskets y todavía aprendo algo cada vez.</p>
<p>Esta receta no es la versión fácil. Es la versión correcta. Post oak. Sal y pimienta. Control de temperatura a través de gestión real del fuego. Si buscas instrucciones para parrilla de pellets con salsa BBQ embotellada, esta no es tu página.</p>`,
      ingredients: [
        { quantity: '14', unit: 'lbs', name: 'Brisket entero (USDA Choice o Prime)' },
        { quantity: '1/2', unit: 'taza', name: 'Pimienta negra gruesa (malla 16)' },
        { quantity: '1/4', unit: 'taza', name: 'Sal kosher (Diamond Crystal)' },
        { quantity: '8', unit: 'lbs', name: 'Troncos o trozos de post oak' },
        { quantity: '2', unit: 'cucharadas', name: 'Mostaza amarilla (ligante, opcional)' },
        { quantity: '4', unit: 'oz', name: 'Sebo de vaca (para envolver, opcional)' },
        { quantity: '1', unit: 'rollo', name: 'Papel de carnicero (rosa, sin cera)' },
      ],
      instructions: [
        { step_number: 1, description: 'Saca el brisket del envase la noche anterior y déjalo descubierto en la nevera toda la noche — esto seca la superficie y favorece la formación de la costra. A la mañana siguiente, recorta la capa de grasa a 6 mm, no menos. Elimina la media luna dura de grasa entre el point y el flat. Cuadra los bordes finos del flat — esas partes finas se quemarán hasta carbonizarse. Guarda los recortes para picar en hamburguesas.' },
        { step_number: 2, description: 'Mezcla pimienta negra gruesa de malla 16 y sal kosher Diamond Crystal en proporción 2:1 por volumen. Si usas mostaza como ligante, aplica primero una capa fina en todas las superficies — se quema completamente y solo ayuda al rub a adherirse. Aplica el rub GENEROSAMENTE. Cuando creas que has puesto suficiente, añade más. La formación de la costra depende de una capa gruesa de condimento. Deja reposar el brisket a temperatura ambiente 1 hora mientras enciendes el ahumador.' },
        { step_number: 3, description: 'Enciende tu ahumador y estabilízalo a 120°C usando post oak como madera principal. Para un offset: construye un lecho de brasas con una chimenea llena de carbón vegetal, luego añade troncos de post oak sobre ese lecho. Para un kamado: enciende con carbón y añade 2-3 piezas grandes de post oak directamente sobre las brasas. Para parrilla de pellets: llena la tolva con pellets de hickory o post oak y activa Super Smoke si está disponible.' },
        { step_number: 4, description: 'Coloca el brisket con la grasa hacia abajo si el calor viene de abajo (offset, kamado), con la grasa hacia arriba si el calor viene de arriba o detrás (algunos ahumadores de armario). La lógica: la grasa protege la carne de la fuente de calor.' },
        { step_number: 5, description: 'Mantén la temperatura del ahumador entre 107-135°C durante toda la cocción. Alrededor de las horas 4-6, comprueba la costra — quieres un color caoba oscuro y una superficie que se sienta seca al tacto. Si todavía está húmeda y blanda, no envuelvas todavía. La costra debe estar formada antes de envolver.' },
        { step_number: 6, description: 'Opcional pero recomendado para principiantes — el "Texas Crutch": cuando la temperatura interna llegue a 74°C Y la costra esté formada (oscura, seca, firme), envuelve en papel de carnicero rosa (no en papel de aluminio — el papel de carnicero respira). Añade 2-4 oz de sebo de vaca antes de cerrar el paquete. Esto acelera la cocción superando el estancamiento de evaporación manteniendo la costra intacta.' },
        { step_number: 7, description: 'El brisket está listo cuando se dan dos condiciones simultáneamente: temperatura interna de 93-96°C Y la sonda entra con cero resistencia — como mantequilla. La temperatura es una guía, no una sentencia definitiva. He comido briskets perfectos a 91°C y briskets sobrecocinados a 99°C. La sonda no miente.' },
        { step_number: 8, description: 'Saca el brisket y déjalo reposar en una nevera seca (sin hielo) forrada con toallas viejas. Coloca el brisket envuelto dentro, cúbrelo con más toallas y cierra la tapa. Reposo mínimo: 2 horas. Óptimo: 4 horas. He reposado briskets 8 horas y la calidad seguía siendo excelente. El reposo no es opcional — es donde el brisket termina de cocinarse y los jugos se redistribuyen.' },
        { step_number: 9, description: 'Desenvuelve y corta. El flat se corta a contraveta en lonchas del grosor de un lápiz (unos 6 mm). Cada loncha debería mantenerse unida al levantarla pero doblarse ligeramente bajo su propio peso — esa es la prueba de la loncha. El point se puede cortar en cubos para burnt ends, o en lonchas a contraveta de su propia fibra (que corre en dirección diferente al flat).' },
      ],
    },
  },

  // --- BABY BACK RIBS ---
  'nv803ryo2lyvrchzwnh33qdz': {
    it: {
      title: 'Baby Back Ribs Affumicate con Glassa al Miele',
      excerpt: 'Le baby back sono la carne affumicata più perdonante che puoi cucinare. Questo metodo 3-2-1 modificato produce ribs da competizione con una glassa di miele appiccicosa che ti faranno il personaggio più popolare nel quartiere.',
      editorial_intro: `<h2>La Droga d\'Entrata del BBQ</h2>
<p>Se il brisket è il dottorato, le ribs sono il primo semestre gratificante. Le baby back sono più corte, più tenere e più perdonanti delle spare ribs, e offrono quell'irresistibile combo di fumo, bark e glassa in circa 5 ore invece di 14. Questa è la cottura che raccomando a ogni principiante che voglia impressionare in fretta senza anni di pratica.</p>
<p>Il metodo 3-2-1 classico (3 ore di fumo, 2 ore avvolte, 1 ora scoperte) è un punto di partenza utile ma non un vangelo. Le baby back sono più piccole e si cuociono più velocemente delle spare ribs — uso un 3-1,5-1 modificato per evitare di renderle troppo morbide. Le ribs che cadono dall'osso sono overcookte. Punto.</p>`,
      ingredients: [
        { quantity: '3', unit: 'rack', name: 'Rack di baby back ribs' },
        { quantity: '3', unit: 'cucchiai', name: 'Senape gialla (legante)' },
        { quantity: '1/2', unit: 'tazza', name: 'Zucchero di canna' },
        { quantity: '3', unit: 'cucchiai', name: 'Paprika affumicata' },
        { quantity: '2', unit: 'cucchiai', name: 'Pepe nero' },
        { quantity: '1', unit: 'cucchiaio', name: 'Aglio in polvere' },
        { quantity: '1', unit: 'cucchiaio', name: 'Cipolla in polvere' },
        { quantity: '1', unit: 'cucchiaio', name: 'Sale kosher' },
        { quantity: '1', unit: 'cucchiaino', name: 'Peperoncino di Cayenna' },
        { quantity: '1/2', unit: 'tazza', name: 'Miele' },
        { quantity: '4', unit: 'cucchiai', name: 'Burro non salato' },
        { quantity: '2', unit: 'cucchiai', name: 'Aceto di sidro di mele' },
        { quantity: '1', unit: 'tazza', name: 'Succo di mele (per spruzzare)' },
        { quantity: '4', unit: 'pezzi', name: 'Pezzi di legno di ciliegio o melo' },
      ],
      instructions: [
        { step_number: 1, description: 'Rimuovi la membrana dal lato delle ossa di ogni rack facendo scivolare un coltello da burro sotto la membrana a un\'estremità, afferrandola con un foglio di carta assorbente e tirandola via in un unico pezzo. Se si strappa, usa le pinze. La rimozione della membrana è non negoziabile — quella pellicola coriacea impedisce alla bark di formarsi e rende le ribs gommose. Non saltare questo passaggio.' },
        { step_number: 2, description: 'Applica un velo sottile di senape gialla su tutte le superfici di ogni rack. Combina zucchero di canna, paprika affumicata, pepe nero, aglio in polvere, cipolla in polvere, sale e cayenna. Applica abbondantemente su tutti i lati. Lascia riposare con il rub a temperatura ambiente per 45 minuti.' },
        { step_number: 3, description: 'Preriscalda il tuo smoker a 107°C. Aggiungi pezzi di legno di ciliegio o melo per un fumo dolce e delicato. Posiziona le ribs con le ossa verso il basso sulla griglia, con la carne verso l\'alto. Affumica per 3 ore a 107°C, spruzzando con succo di mele ogni 45 minuti dopo i primi 90 minuti.' },
        { step_number: 4, description: 'Dopo 3 ore, la bark dovrebbe essere di un colore mogano profondo e asciutta al tatto. Il fumo avrà penetrato la carne quanto può fare senza l\'avvolgimento. A questo punto aggiungi altro fumo produrrebbe solo amaro.' },
        { step_number: 5, description: 'Stendi tre fogli grandi di carta stagnola pesante. Metti ogni rack con la carne verso il basso sulla carta stagnola. Versa su ciascuno un cucchiaio di miele, una noce di burro e un cucchiaio di succo di mele. Avvolgi ermeticamente. Il vapore all\'interno accelera la cottura attraverso lo stallo di collagene. Cuoci avvolte per 1,5 ore a 135°C.' },
        { step_number: 6, description: 'Mentre le ribs sono avvolte, prepara la glassa: fai sciogliere il burro in un pentolino, aggiungi il miele e l\'aceto di sidro di mele e mescola finché non è amalgamato. Tieni in caldo.' },
        { step_number: 7, description: 'Distogli le ribs con attenzione (uscirà vapore). Rimettile nello smoker con la carne verso l\'alto. Spennella generosamente con la glassa al miele. Cuoci per 45 minuti scoperte a 107°C, spennellando con la glassa ogni 15 minuti. La glassa si caramellerà e si fisserà sulla bark.' },
        { step_number: 8, description: 'Testa la cottura usando il test della flessione: prendi il rack dal centro con le pinze. Se la superficie si crepa ma il rack non si rompe, sono pronte. Se si piega a 90 gradi senza creparsi, sono undercookte. Se si spacca in due, sono overcookte. Servi immediatamente — le ribs non aspettano nessuno.' },
      ],
    },
    es: {
      title: 'Baby Back Ribs Ahumadas con Glaseado de Miel',
      excerpt: 'Las baby back son la carne ahumada más indulgente que puedes cocinar. Este método 3-2-1 modificado produce costillas de competición con un glaseado de miel pegajoso que te convertirá en la persona más popular del barrio.',
      editorial_intro: `<h2>La Droga de Entrada del BBQ</h2>
<p>Si el brisket es el doctorado, las costillas son el gratificante primer semestre. Las baby back son más cortas, más tiernas y más indulgentes que las spare ribs, y ofrecen esa irresistible combinación de humo, costra y glaseado en unas 5 horas en lugar de 14. Esta es la cocción que recomiendo a todos los principiantes que quieren impresionar rápido sin años de práctica.</p>
<p>El método clásico 3-2-1 (3 horas de humo, 2 horas envueltas, 1 hora descubiertas) es un punto de partida útil pero no un evangelio. Las baby back son más pequeñas y se cocinan más rápido que las spare ribs — uso un 3-1,5-1 modificado para evitar que queden demasiado blandas. Las costillas que se caen del hueso están sobrecocinadas. Punto.</p>`,
      ingredients: [
        { quantity: '3', unit: 'racks', name: 'Racks de baby back ribs' },
        { quantity: '3', unit: 'cucharadas', name: 'Mostaza amarilla (ligante)' },
        { quantity: '1/2', unit: 'taza', name: 'Azúcar moreno' },
        { quantity: '3', unit: 'cucharadas', name: 'Pimentón ahumado' },
        { quantity: '2', unit: 'cucharadas', name: 'Pimienta negra' },
        { quantity: '1', unit: 'cucharada', name: 'Ajo en polvo' },
        { quantity: '1', unit: 'cucharada', name: 'Cebolla en polvo' },
        { quantity: '1', unit: 'cucharada', name: 'Sal kosher' },
        { quantity: '1', unit: 'cucharadita', name: 'Pimienta de Cayena' },
        { quantity: '1/2', unit: 'taza', name: 'Miel' },
        { quantity: '4', unit: 'cucharadas', name: 'Mantequilla sin sal' },
        { quantity: '2', unit: 'cucharadas', name: 'Vinagre de sidra de manzana' },
        { quantity: '1', unit: 'taza', name: 'Zumo de manzana (para rociar)' },
        { quantity: '4', unit: 'trozos', name: 'Trozos de madera de cerezo o manzano' },
      ],
      instructions: [
        { step_number: 1, description: 'Retira la membrana del lado del hueso de cada rack deslizando un cuchillo de mantequilla bajo la membrana en un extremo, agarrándola con papel de cocina y tirando en un solo movimiento. Si se rompe, usa unas pinzas. Retirar la membrana no es negociable — esa piel correosa impide que se forme la costra y hace que las costillas queden gomosas. No omitas este paso.' },
        { step_number: 2, description: 'Aplica una capa fina de mostaza amarilla en todas las superficies de cada rack. Combina azúcar moreno, pimentón ahumado, pimienta negra, ajo en polvo, cebolla en polvo, sal y cayena. Aplica generosamente por todos los lados. Deja reposar con el rub a temperatura ambiente 45 minutos.' },
        { step_number: 3, description: 'Precalienta tu ahumador a 107°C. Añade trozos de madera de cerezo o manzano para un humo dulce y suave. Coloca las costillas con los huesos hacia abajo en la rejilla, con la carne hacia arriba. Ahúma durante 3 horas a 107°C, rociando con zumo de manzana cada 45 minutos tras los primeros 90 minutos.' },
        { step_number: 4, description: 'Después de 3 horas, la costra debería tener un color caoba profundo y estar seca al tacto. El humo habrá penetrado la carne todo lo que puede sin envoltura. A estas alturas, añadir más humo solo produciría amargor.' },
        { step_number: 5, description: 'Extiende tres hojas grandes de papel de aluminio resistente. Coloca cada rack con la carne hacia abajo sobre el papel. Vierte en cada uno una cucharada de miel, una nuez de mantequilla y una cucharada de zumo de manzana. Envuelve herméticamente. El vapor interior acelera la cocción superando el estancamiento del colágeno. Cocina envueltas 1,5 horas a 135°C.' },
        { step_number: 6, description: 'Mientras las costillas están envueltas, prepara el glaseado: derrite mantequilla en un cazo, añade miel y vinagre de sidra de manzana y remueve hasta que esté integrado. Mantén caliente.' },
        { step_number: 7, description: 'Desenvuelve las costillas con cuidado (saldrá vapor). Vuélvelas al ahumador con la carne hacia arriba. Pincela generosamente con el glaseado de miel. Cocina 45 minutos sin cubrir a 107°C, pincelando con el glaseado cada 15 minutos. El glaseado se caramelizará y se fijará sobre la costra.' },
        { step_number: 8, description: 'Prueba el punto de cocción usando la prueba de flexión: toma el rack por el centro con las pinzas. Si la superficie se agrieta pero el rack no se parte, están listas. Si se dobla 90 grados sin agrietarse, están poco hechas. Si se rompe en dos, están sobrecocinadas. Sirve inmediatamente — las costillas no esperan a nadie.' },
      ],
    },
  },

  // --- CHIMICHURRI STEAK ---
  'caaovn2xyr6o4r2kjd4brb3m': {
    it: {
      title: 'Bistecca alla Griglia con Chimichurri Argentino',
      excerpt: 'La cosa più semplice e soddisfacente che puoi fare con una bistecca spessa e un sacchetto di carbone. Sale, fuoco, chimichurri. Se l\'Argentina ha fatto una cosa giusta, è questa.',
      editorial_intro: `<h2>A Volte Meno È Tutto</h2>
<p>Passo la maggior parte del tempo su questo sito a parlare di brisket di 14 ore e fuochi gestiti con attenzione. Ma il pasto migliore che ho cucinato il mese scorso è stato questo: una costata con osso, sale grosso, carbone incandescente e una ciotola di chimichurri fatto venti minuti prima di cena.</p>
<p>Niente affumicatura lunga. Niente rub complessi. Niente strumenti digitali. Solo fuoco vivo, un pezzo di carne eccellente e una salsa che fa il suo lavoro senza coprire il sapore di quello che sta cucinando. Questo è il BBQ nella sua forma più pura, ed è uno dei motivi per cui la tradizione argentina è rispettata da tutti i pitmasters seri.</p>`,
      ingredients: [
        { quantity: '4', unit: 'bistecche', name: 'Costate con osso (spessore 4 cm)' },
        { quantity: '2', unit: 'cucchiai', name: 'Sale marino grosso' },
        { quantity: '1', unit: 'tazza', name: 'Prezzemolo fresco a foglia piatta (tritato finemente)' },
        { quantity: '2', unit: 'cucchiai', name: 'Origano fresco (tritato finemente)' },
        { quantity: '6', unit: 'spicchi', name: 'Spicchi d\'aglio (tritati)' },
        { quantity: '1/4', unit: 'tazza', name: 'Aceto di vino rosso' },
        { quantity: '1/2', unit: 'tazza', name: 'Olio extra vergine di oliva' },
        { quantity: '1', unit: 'cucchiaino', name: 'Peperoncino a fiocchi' },
        { quantity: '1', unit: 'cucchiaino', name: 'Pepe nero (appena macinato)' },
        { quantity: '5', unit: 'lbs', name: 'Carbonella grezza' },
      ],
      instructions: [
        { step_number: 1, description: 'Prepara il chimichurri almeno 30 minuti prima di grigliare (idealmente 2-4 ore). Combina prezzemolo tritato, origano, aglio tritato, peperoncino a fiocchi e pepe nero. Aggiungi l\'aceto di vino rosso e l\'olio d\'oliva, mescolando fino a ottenere una consistenza grossolana e saporita — NON un frullato liscio. Aggiusta di sale. Lascia riposare coperto a temperatura ambiente. Il riposo permette ai sapori di amalgamarsi e all\'aglio di ammorbidirsi.' },
        { step_number: 2, description: 'Togli le bistecche dal frigo 45 minuti prima di cuocerle. Asciugale completamente con carta assorbente. Condisci abbondantemente con sale marino grosso su tutti i lati — più di quanto pensi sia necessario. Non aggiungere pepe ancora; si brucia a calore diretto estremo e diventa amaro.' },
        { step_number: 3, description: 'Accendi una ciminiera piena di carbonella grezza e lasciala bruciare finché non è completamente coperta di cenere (circa 15-20 minuti). Versa le braci in un lato del grill, creando una zona a calore diretto intenso e una zona a calore indiretto. Per le bistecche argentino-style, vuoi braci ad altissima intensità — la griglia dovrebbe essere così calda da non riuscire a tenerci la mano sopra per più di 2 secondi.' },
        { step_number: 4, description: 'Metti le bistecche sulla zona a calore diretto. Non toccarle per 4 minuti. Sentirai un forte sfrigolio — è la reazione di Maillard che crea la tua crosta. Dopo 4 minuti, gira una volta. Cucina per altri 3-4 minuti. Controlla la temperatura interna con un termometro istantaneo: 52°C per al sangue, 57°C per media cottura.' },
        { step_number: 5, description: 'Se le bistecche hanno bisogno di più tempo per raggiungere la temperatura target ma la crosta è già scura, spostale nella zona a calore indiretto e chiudi il coperchio. Lascia finire la cottura fino a 3-5°C sotto il target — la temperatura salirà ancora durante il riposo.' },
        { step_number: 6, description: 'Togli le bistecche su un tagliere e lascia riposare 8-10 minuti. La temperatura interna salirà di 3-4°C durante il riposo. Aggiungi il pepe appena macinato adesso. Affetta contro la fibra se lo desideri — le costate con osso sono anche bellissime servite intere. Versa il chimichurri a cucchiaiate generose sopra ogni porzione.' },
      ],
    },
    es: {
      title: 'Asado Argentino con Chimichurri',
      excerpt: 'La cosa más sencilla y satisfactoria que puedes hacer con un filete grueso y una bolsa de carbón. Sal, fuego, chimichurri. Si Argentina hizo bien una cosa, es esta.',
      editorial_intro: `<h2>A Veces Menos Es Todo</h2>
<p>Paso la mayor parte del tiempo en este sitio hablando de briskets de 14 horas y fuegos gestionados con cuidado. Pero la mejor comida que cociné el mes pasado fue esta: un chuletón, sal gruesa, carbón incandescente y un bol de chimichurri hecho veinte minutos antes de cenar.</p>
<p>Sin ahumado largo. Sin rubs complejos. Sin herramientas digitales. Solo fuego vivo, un trozo de carne excelente y una salsa que hace su trabajo sin tapar el sabor de lo que se está cocinando. Este es el BBQ en su forma más pura, y es una de las razones por las que la tradición argentina es respetada por todos los pitmasters serios.</p>`,
      ingredients: [
        { quantity: '4', unit: 'filetes', name: 'Chuletones con hueso (4 cm de grosor)' },
        { quantity: '2', unit: 'cucharadas', name: 'Sal marina gruesa' },
        { quantity: '1', unit: 'taza', name: 'Perejil fresco de hoja plana (picado fino)' },
        { quantity: '2', unit: 'cucharadas', name: 'Orégano fresco (picado fino)' },
        { quantity: '6', unit: 'dientes', name: 'Dientes de ajo (picados)' },
        { quantity: '1/4', unit: 'taza', name: 'Vinagre de vino tinto' },
        { quantity: '1/2', unit: 'taza', name: 'Aceite de oliva virgen extra' },
        { quantity: '1', unit: 'cucharadita', name: 'Copos de guindilla' },
        { quantity: '1', unit: 'cucharadita', name: 'Pimienta negra (recién molida)' },
        { quantity: '5', unit: 'lbs', name: 'Carbón vegetal' },
      ],
      instructions: [
        { step_number: 1, description: 'Prepara el chimichurri al menos 30 minutos antes de asar (idealmente 2-4 horas). Combina perejil picado, orégano, ajo picado, copos de guindilla y pimienta negra. Añade el vinagre de vino tinto y el aceite de oliva, mezclando hasta obtener una consistencia gruesa y aromática — NO un batido liso. Ajusta de sal. Deja reposar tapado a temperatura ambiente. El reposo permite que los sabores se integren y que el ajo se suavice.' },
        { step_number: 2, description: 'Saca los filetes de la nevera 45 minutos antes de cocinarlos. Sécalos completamente con papel de cocina. Sazona generosamente con sal marina gruesa por todos los lados — más de lo que crees necesario. No añadas pimienta todavía; se quema a calor directo extremo y se vuelve amarga.' },
        { step_number: 3, description: 'Enciende una chimenea llena de carbón vegetal y deja que arda hasta que esté completamente cubierta de ceniza (unos 15-20 minutos). Vierte las brasas en un lado de la parrilla, creando una zona de calor directo intenso y una zona de calor indirecto. Para los filetes estilo argentino, quieres brasas de altísima intensidad — la parrilla debería estar tan caliente que no puedas mantener la mano a 5 cm más de 2 segundos.' },
        { step_number: 4, description: 'Coloca los filetes sobre la zona de calor directo. No los toques durante 4 minutos. Escucharás un intenso chisporroteo — es la reacción de Maillard creando tu costra. Después de 4 minutos, gira una sola vez. Cocina 3-4 minutos más. Comprueba la temperatura interna con un termómetro instantáneo: 52°C para poco hecho, 57°C para al punto.' },
        { step_number: 5, description: 'Si los filetes necesitan más tiempo para alcanzar la temperatura objetivo pero la costra ya está oscura, muévelos a la zona de calor indirecto y cierra la tapa. Deja que terminen de cocinarse hasta 3-5°C por debajo del objetivo — la temperatura seguirá subiendo durante el reposo.' },
        { step_number: 6, description: 'Retira los filetes a una tabla de cortar y deja reposar 8-10 minutos. La temperatura interna subirá 3-4°C durante el reposo. Añade la pimienta recién molida ahora. Corta a contraveta si lo deseas — los chuletones también están magníficos servidos enteros. Sirve el chimichurri en cucharadas generosas sobre cada porción.' },
      ],
    },
  },

  // --- SMOKED MAC AND CHEESE ---
  'netj0s6fs78c4rgjk3ru6xeu': {
    it: {
      title: 'Mac and Cheese Affumicato',
      excerpt: 'Il contorno che regolarmente eclissa il piatto principale. Cremoso, affumicato, con una crosta dorata e croccante che fa chiedere la ricetta prima di aver finito la prima porzione.',
      editorial_intro: `<h2>Il Contorno per cui Nessuno Lascia Spazio (Ma Dovrebbe)</h2>
<p>Ho servito questo mac and cheese affumicato accanto a brisket da 80$, e ho visto gli ospiti tornare per un'altra porzione di mac mentre il brisket stava abbandonato sul tagliere. Questo ti dice tutto quello che c'è da sapere su questa ricetta.</p>
<p>Il segreto è doppio: una besciamella al formaggio che è troppo ricca per mangiarne tanto, e 60 minuti di fumo delicato a bassa temperatura che strato dopo strato si integra nella cremosità senza sopraffar la. Il fumo dovrebbe essere presente ma sottile — un accenno, non una dichiarazione. Usa legna di ciliegio o melo, non hickory.</p>`,
      ingredients: [
        { quantity: '1', unit: 'lb', name: 'Maccheroni a gomito' },
        { quantity: '3', unit: 'tazze', name: 'Cheddar stagionato (grattugiato)' },
        { quantity: '1', unit: 'tazza', name: 'Gruyère (grattugiato)' },
        { quantity: '8', unit: 'oz', name: 'Formaggio cremoso' },
        { quantity: '1.5', unit: 'tazze', name: 'Latte intero' },
        { quantity: '1/2', unit: 'tazza', name: 'Panna fresca' },
        { quantity: '2', unit: 'grandi', name: 'Uova (sbattute)' },
        { quantity: '3', unit: 'cucchiai', name: 'Burro non salato' },
        { quantity: '1', unit: 'cucchiaino', name: 'Paprika affumicata' },
        { quantity: '1', unit: 'cucchiaino', name: 'Senape in polvere' },
        { quantity: '1/2', unit: 'cucchiaino', name: 'Aglio in polvere' },
        { quantity: '1', unit: 'cucchiaino', name: 'Sale kosher' },
        { quantity: '1/2', unit: 'cucchiaino', name: 'Pepe nero' },
        { quantity: '1/2', unit: 'tazza', name: 'Pangrattato panko' },
      ],
      instructions: [
        { step_number: 1, description: 'Fai cuocere i maccheroni in acqua salata finché sono appena al dente (circa 1-2 minuti meno delle istruzioni sulla confezione). La pasta continuerà a cuocere nello smoker. Scola e metti da parte. Non sciacquare — l\'amido aiuta la salsa ad aderire.' },
        { step_number: 2, description: 'In un tegame capiente a fuoco medio, fai sciogliere il burro. Aggiungi il formaggio cremoso e mescola finché è sciolto e liscio. Aggiungi gradualmente il latte e la panna, mescolando costantemente. Aggiungi la paprika affumicata, la senape in polvere, l\'aglio in polvere, il sale e il pepe nero.' },
        { step_number: 3, description: 'Togli dal fuoco e aggiungi 2 tazze di cheddar grattugiato e tutto il Gruyère, mescolando finché sono sciolti e lisci. Tempera le uova sbattute aggiungendo un cucchiaio di salsa calda alle uova, mescolando velocemente, poi aggiungi il mix di uova alla salsa. Questo previene le uova rapprese.' },
        { step_number: 4, description: 'Incorpora i maccheroni scolati nella salsa di formaggio finché sono ben ricoperti. Versa in una vaschetta di alluminio usa e getta grande (circa 22x33 cm). La vaschetta usa e getta è intenzionale — il fumo penetra il fondo sottile meglio di una casseruola in ghisa.' },
        { step_number: 5, description: 'Metti la vaschetta scoperta nello smoker a 107-135°C. Affumica per 60 minuti, mescolando una volta al minuto 30 per distribuire il sapore di fumo in modo uniforme. Usa legna di ciliegio o melo — hickory e mesquite sono troppo aggressivi per questo piatto.' },
        { step_number: 6, description: 'Dopo 60 minuti, cospargi con la tazza rimanente di cheddar grattugiato e il pangrattato panko. Aggiungi qualche piccolo pezzo di burro. Continua ad affumicare scoperto per 20-30 minuti finché la copertura è dorata e croccante e i bordi del formaggio sfrigolano.' },
        { step_number: 7, description: 'Togli dallo smoker e lascia riposare 10 minuti. Il mac and cheese si addenserà raffreddandosi leggermente. Servi direttamente dalla vaschetta. Gli avanzi si riscaldano egregiamente con qualche cucchiaio di latte per allentare la consistenza.' },
      ],
    },
    es: {
      title: 'Mac and Cheese Ahumado',
      excerpt: 'El acompañamiento que regularmente eclipsa al plato principal. Cremoso, ahumado, con una costra dorada y crujiente que hace pedir la receta antes de terminar la primera ración.',
      editorial_intro: `<h2>El Acompañamiento para el que Nadie Deja Sitio (Pero Debería)</h2>
<p>He servido este mac and cheese ahumado junto a briskets de 80$, y he visto a los invitados volver a por más mac mientras el brisket estaba abandonado en la tabla. Eso te dice todo lo que necesitas saber sobre esta receta.</p>
<p>El secreto es doble: una bechamel de queso demasiado rica para comer mucha, y 60 minutos de humo suave a baja temperatura que capa a capa se integra en la cremosidad sin abrumarla. El humo debe estar presente pero sutil — una insinuación, no una declaración. Usa madera de cerezo o manzano, no hickory.</p>`,
      ingredients: [
        { quantity: '1', unit: 'lb', name: 'Macarrones de codo' },
        { quantity: '3', unit: 'tazas', name: 'Cheddar curado (rallado)' },
        { quantity: '1', unit: 'taza', name: 'Gruyère (rallado)' },
        { quantity: '8', unit: 'oz', name: 'Queso crema' },
        { quantity: '1.5', unit: 'tazas', name: 'Leche entera' },
        { quantity: '1/2', unit: 'taza', name: 'Nata para montar' },
        { quantity: '2', unit: 'grandes', name: 'Huevos (batidos)' },
        { quantity: '3', unit: 'cucharadas', name: 'Mantequilla sin sal' },
        { quantity: '1', unit: 'cucharadita', name: 'Pimentón ahumado' },
        { quantity: '1', unit: 'cucharadita', name: 'Mostaza en polvo' },
        { quantity: '1/2', unit: 'cucharadita', name: 'Ajo en polvo' },
        { quantity: '1', unit: 'cucharadita', name: 'Sal kosher' },
        { quantity: '1/2', unit: 'cucharadita', name: 'Pimienta negra' },
        { quantity: '1/2', unit: 'taza', name: 'Pan rallado panko' },
      ],
      instructions: [
        { step_number: 1, description: 'Cuece los macarrones en agua salada hasta que estén justo al dente (unos 1-2 minutos menos de lo que indica el paquete). La pasta seguirá cocinándose en el ahumador. Escurre y reserva. No enjuagues — el almidón ayuda a que la salsa se adhiera.' },
        { step_number: 2, description: 'En una cazuela grande a fuego medio, derrite la mantequilla. Añade el queso crema y remueve hasta que esté derretido y liso. Añade gradualmente la leche y la nata, removiendo constantemente. Añade el pimentón ahumado, la mostaza en polvo, el ajo en polvo, la sal y la pimienta negra.' },
        { step_number: 3, description: 'Retira del fuego y añade 2 tazas del cheddar rallado y todo el Gruyère, removiendo hasta que estén derretidos y lisos. Templa los huevos batidos añadiendo una cucharada de la salsa caliente a los huevos, removiendo rápidamente, luego incorpora la mezcla de huevos a la salsa. Esto evita que los huevos se cuajen.' },
        { step_number: 4, description: 'Incorpora los macarrones escurridos a la salsa de queso hasta que estén bien cubiertos. Vierte en una bandeja de aluminio desechable grande (aproximadamente 22x33 cm). La bandeja desechable es intencional — el humo penetra el fondo delgado mejor que una cazuela de hierro fundido.' },
        { step_number: 5, description: 'Coloca la bandeja sin cubrir en el ahumador a 107-135°C. Ahúma durante 60 minutos, removiendo una vez al minuto 30 para distribuir el sabor a humo de manera uniforme. Usa madera de cerezo o manzano — hickory y mesquite son demasiado agresivos para este plato.' },
        { step_number: 6, description: 'Después de 60 minutos, cubre con la taza restante de cheddar rallado y el pan rallado panko. Añade unos trozos pequeños de mantequilla. Continúa ahumando sin cubrir 20-30 minutos hasta que la cobertura esté dorada y crujiente y los bordes del queso burbujeen.' },
        { step_number: 7, description: 'Retira del ahumador y deja reposar 10 minutos. El mac and cheese se espesará al enfriarse ligeramente. Sirve directamente de la bandeja. Las sobras se calientan muy bien con unas cucharadas de leche para aflojar la consistencia.' },
      ],
    },
  },
};

// ============================================================================
// TRADUZIONI TUTORIALS
// ============================================================================

const tutorialTranslations = {

  // --- WOOD TYPES ---
  'ax6l7plbxc9ks2a570oqy2om': {
    it: {
      title: 'Capire i Tipi di Legno per l\'Affumicatura: dall\'Hickory al Ciliegio',
      excerpt: 'Il legno è il condimento del BBQ. Usare il legno sbagliato — o bruciarlo male — rovinerà una cottura più velocemente di qualsiasi altro errore. Ecco cosa mi hanno insegnato 20 anni a bruciare legno.',
      content: `<h2>La Scelta del Legno Non è un Suggerimento — È un Requisito</h2>
<p>Ogni settimana, qualcuno posta su un forum BBQ chiedendo perché il suo pollo affumicato sa di amaro. Nove volte su dieci, la risposta è una di due cose: hanno usato troppo hickory, o il fuoco smolceva invece di bruciare pulito. La scelta del legno e la qualità della combustione sono le due abilità più sottotrattate nel BBQ, e sbagliare uno dei due distrugge un'intera cottura.</p>

<h2>La Prima Regola: Il Fumo Pulito o Niente Fumo</h2>
<p>Fumo bianco denso = fuoco cattivo = sapore amaro. Il fumo pulito è quasi invisibile — un sottile velo bluastro che striscia pigramente verso il cielo. Se vedi fumo bianco billowing dal tuo smoker, la tua carne sta assorbendo creosoto, tannini non combusti e altri composti che sanno di posacenere. Questa è la differenza numero uno tra la gente che produce BBQ orribile e la gente che produce BBQ fantastico, e quasi nessuna guida per principianti lo spiega correttamente.</p>
<p>Come ottieni fumo pulito? Bruciando legno completamente asciutto (stagionato per almeno 12 mesi, idealmente 24), alimentando un fuoco che brucia attivamente invece di smolcere, e usando abbastanza legno da mantenere il fuoco vivo ma non così tanto da soffocarlo.</p>

<h2>I Profili del Legno: Cosa Ti Dà Cosa</h2>

<h3>Hickory — Il Classico del BBQ Americano</h3>
<p>Profilo: Forte, con terrosità di bacon, leggermente pungente. Il legno da affumicatura dominante nelle regioni del BBQ americano, specialmente Memphis e Kansas City.</p>
<p>Funziona bene con: Maiale (tutto), manzo, agnello. L'abbinamento hickory-maiale è il fondamento del BBQ americano per un motivo.</p>
<p>Evita con: Pesce, pollame delicato, verdure. L'hickory prevarica su queste proteine e produce un risultato amaro.</p>
<p>Avvertimento del Pitmaster: L'hickory è il legno che più spesso viene usato in eccesso dai principianti. Un pezzo grande in un fuoco piccolo è tutto quello che ti serve. Non tre pezzi. Uno.</p>

<h3>Post Oak — Il Legno del Texas</h3>
<p>Profilo: Medio, pulito, leggermente terroso senza la pungenza dell'hickory. Questo è il legno che Aaron Franklin usa. C'è un motivo.</p>
<p>Funziona bene con: Brisket, salsiccia, manzo in generale. Il legno di riferimento per la tradizione del BBQ texano.</p>
<p>Evita con: Niente in realtà — il post oak è abbastanza versatile da non rovinare quasi nulla, il che lo rende la scelta sicura per chi affumica pezzi diversi contemporaneamente.</p>

<h3>Ciliegio — Il Legno della Bellezza</h3>
<p>Profilo: Dolce, fruttato, delicato. Produce un colore mogano straordinariamente bello sulla carne.</p>
<p>Funziona bene con: Maiale (ribs, tenderloin), pollame, anatra. Eccellente miscelato con legni più forti per aggiungere colore e dolcezza senza sopraffarre.</p>
<p>Il trucco del Pitmaster: Mescola ciliegio e hickory in rapporto 2:1 per la maggior parte delle cotture di maiale — ottieni la bellezza del ciliegio con il profilo di fumo robusto dell'hickory.</p>

<h3>Melo — Il Forgiving</h3>
<p>Profilo: Delicato, leggermente dolce, con una nota di frutta quasi floreale.</p>
<p>Funziona bene con: Pollame, pesce grasso (salmone, trota), maiale. Il melo è quasi impossibile da usare in eccesso — è il legno da apprendimento.</p>
<p>Non funziona con: Manzo pesante. Il profilo di sapore delicato scompare sotto i sapori forti del manzo, sprecando il legno senza aggiungere niente di percepibile.</p>

<h3>Mesquite — Il Pericoloso</h3>
<p>Profilo: Molto forte, terroso, quasi medicinale ad alte concentrazioni. Il legno da BBQ più aggressivo che esiste.</p>
<p>Funziona bene con: Tagli di manzo sottili per cotture ad alta temperatura e breve durata. Autentico per alcune tradizioni BBQ del Texas meridionale e del Messico.</p>
<p>Avvertimento critico: Il mesquite produce più fenoli che qualsiasi altro legno da BBQ comune. Una piccola quantità su una lunga cottura trasforma "affumicato" in "medicinale amaro". Usalo con mano leggera o non usarlo affatto sulle cotture lente.</p>

<h2>Il Problema della Bricchetta vs. Trucioli vs. Pezzi vs. Spaccati</h2>
<p>La forma del legno influisce sul profilo di fumo quanto la specie. Ecco la gerarchia:</p>
<ul>
<li><strong>Spaccati:</strong> Pezzi interi di legno 30-60 cm. Usati negli offset. Producono fumo nel modo più pulito perché si bruciano completamente come il legno è progettato per fare. Questo è come il BBQ veniva fatto storicamente.</li>
<li><strong>Pezzi:</strong> Pezzi più piccoli 5-10 cm. Per kamado e smoker a bricchette. Abbastanza grandi da bruciare senza fiammate, abbastanza piccoli da posizionarli in modo preciso.</li>
<li><strong>Trucioli:</strong> Pezzi piccoli di legno. Per smoker a gas, o quando vuoi fumo veloce e leggero. Si bruciano in 20-30 minuti. Usa non ammollati — l'ammollo non fa quello che pensi che faccia.</li>
<li><strong>Pellet:</strong> Legno compresso. Progettato per pellet grill. Produce fumo funzionale ma non la profondità di sapore degli spaccati o dei pezzi.</li>
</ul>

<h2>Quanta Legna è Troppa?</h2>
<p>Questa è la domanda che i principianti fanno sempre nel modo sbagliato. Non dovrebbero chiedersi "quanta legna devo aggiungere?" Ma "il mio fumo è pulito?"</p>
<p>Su un offset: aggiungi abbastanza spaccati da mantenere una temperatura stabile e il fumo quasi invisibile. In pratica: uno spaccato ogni 45-60 minuti, dipendente dalla dimensione e dall'essenza del legno.</p>
<p>Su un kamado: 2-3 pezzi grandi al momento dell'accensione. Niente di più. La ceramica trattiene il calore e il fumo — aggiungere più legno durante la cottura di solito produce troppo fumo.</p>

<h2>Lo Sapevi? Il Legno Verde Rovina il BBQ</h2>
<p>Legno "verde" significa legno non completamente stagionato — legno che ha ancora umidità nella struttura cellulare. Bruciare legno verde produce fumo denso e bianco pieno di vapore acqueo e composti parzialmente combusti. Non importa quanto sia buona la tua essenza di legno — se non è stagionata, rovinerà la carne.</p>
<p>Come fai a sapere se il legno è stagionato? Si crepa alle estremità. Si sente leggero. Fa un suono cavo quando sbatti due pezzi insieme. Ha un colore uniformemente grigio invece del marrone brillante del legno fresco.</p>`,
    },
    es: {
      title: 'Entender los Tipos de Madera para Ahumar: del Hickory al Cerezo',
      excerpt: 'La madera es el condimento del BBQ. Usar la madera equivocada — o quemarla mal — arruinará una cocción más rápido que cualquier otro error. Esto es lo que 20 años quemando madera me han enseñado.',
      content: `<h2>La Elección de la Madera No es una Sugerencia — Es un Requisito</h2>
<p>Cada semana, alguien publica en un foro de BBQ preguntando por qué su pollo ahumado sabe amargo. Nueve de cada diez veces, la respuesta es una de dos cosas: usaron demasiado hickory, o su fuego estaba smoldering en lugar de arder limpio. La elección de la madera y la calidad de la combustión son las dos habilidades más ignoradas del BBQ, y fallar en cualquiera de las dos arruina una cocción entera.</p>

<h2>La Primera Regla: Humo Limpio o Sin Humo</h2>
<p>Humo blanco denso = fuego malo = sabor amargo. El humo limpio es casi invisible — un fino velo azulado que se arrastra perezosamente hacia el cielo. Si ves humo blanco saliendo en nubes de tu ahumador, tu carne está absorbiendo creosoto, taninos no quemados y otros compuestos que saben a cenicero. Esta es la diferencia número uno entre la gente que produce BBQ horrible y la gente que produce BBQ fantástico, y casi ninguna guía para principiantes lo explica correctamente.</p>
<p>¿Cómo consigues humo limpio? Quemando madera completamente seca (curada al menos 12 meses, idealmente 24), alimentando un fuego que arde activamente en lugar de smolder, y usando suficiente madera para mantener el fuego vivo pero no tanto como para ahogarlo.</p>

<h2>Los Perfiles de la Madera: Qué Te Da Cada Una</h2>

<h3>Hickory — El Clásico del BBQ Americano</h3>
<p>Perfil: Fuerte, terroso con notas de bacon, ligeramente acre. La madera ahumadora dominante en las regiones de BBQ americano, especialmente Memphis y Kansas City.</p>
<p>Funciona bien con: Cerdo (todo), vacuno, cordero. La combinación hickory-cerdo es la base del BBQ americano por una razón.</p>
<p>Evita con: Pescado, aves delicadas, verduras. El hickory aplasta estos ingredientes y produce un resultado amargo.</p>
<p>Advertencia del Pitmaster: El hickory es la madera que los principiantes usan en exceso con más frecuencia. Un trozo grande en un fuego pequeño es todo lo que necesitas. No tres trozos. Uno.</p>

<h3>Post Oak — La Madera de Texas</h3>
<p>Perfil: Medio, limpio, ligeramente terroso sin la acrimonia del hickory. Esta es la madera que usa Aaron Franklin. Hay una razón.</p>
<p>Funciona bien con: Brisket, salchicha, vacuno en general. La madera de referencia para la tradición BBQ texana.</p>

<h3>Cerezo — La Madera de la Belleza</h3>
<p>Perfil: Dulce, afrutado, delicado. Produce un color caoba extraordinariamente hermoso en la carne.</p>
<p>Funciona bien con: Cerdo (costillas, solomillo), pollo, pato. Excelente mezclado con maderas más fuertes para añadir color y dulzura sin abrumar.</p>
<p>El truco del Pitmaster: Mezcla cerezo e hickory en proporción 2:1 para la mayoría de las cocciones de cerdo — obtienes la belleza del cerezo con el perfil de humo robusto del hickory.</p>

<h3>Manzano — El Indulgente</h3>
<p>Perfil: Delicado, ligeramente dulce, con una nota frutal casi floral.</p>
<p>Funciona bien con: Aves, pescado graso (salmón, trucha), cerdo. El manzano es casi imposible de usar en exceso — es la madera de aprendizaje.</p>
<p>No funciona con: Vacuno pesado. El perfil de sabor delicado desaparece bajo los sabores fuertes del vacuno, desperdiciando la madera sin añadir nada perceptible.</p>

<h3>Mesquite — El Peligroso</h3>
<p>Perfil: Muy fuerte, terroso, casi medicinal en altas concentraciones. La madera de BBQ más agresiva que existe.</p>
<p>Funciona bien con: Cortes finos de vacuno para cocciones a alta temperatura y corta duración. Auténtico para algunas tradiciones BBQ del sur de Texas y México.</p>
<p>Advertencia crítica: El mesquite produce más fenoles que cualquier otra madera de BBQ común. Una pequeña cantidad en una cocción larga transforma "ahumado" en "amargo medicinal". Úsalo con mano ligera o no lo uses en cocciones lentas.</p>

<h2>La Jerarquía de la Forma de la Madera</h2>
<ul>
<li><strong>Troncos:</strong> Piezas enteras de 30-60 cm. Para offsets. Producen humo más limpio porque se queman completamente como la madera está diseñada para hacer.</li>
<li><strong>Trozos:</strong> Piezas más pequeñas de 5-10 cm. Para kamados y ahumadores de briquetas. Suficientemente grandes para arder sin llamaradas, suficientemente pequeñas para posicionarlas con precisión.</li>
<li><strong>Astillas:</strong> Para ahumadores de gas o cuando quieres humo rápido y ligero. Se queman en 20-30 minutos. Úsalas sin remojar.</li>
<li><strong>Pellets:</strong> Madera comprimida. Diseñados para parrillas de pellets. Produce humo funcional pero no la profundidad de sabor de los troncos o trozos.</li>
</ul>

<h2>¿Cuánta Madera es Demasiada?</h2>
<p>Los principiantes siempre hacen la pregunta equivocada. No deberían preguntar "¿cuánta madera añado?" sino "¿mi humo está limpio?"</p>
<p>En un offset: añade suficientes troncos para mantener temperatura estable y humo casi invisible. En la práctica: un tronco cada 45-60 minutos, dependiendo del tamaño y la especie.</p>
<p>En un kamado: 2-3 trozos grandes al encender. Nada más. La cerámica retiene el calor y el humo — añadir más madera durante la cocción normalmente produce demasiado humo.</p>`,
    },
  },

  // --- TEMPERATURE CONTROL ---
  'etqhezfpq3cya4m134forlc6': {
    it: {
      title: 'La Guida Completa al Controllo della Temperatura sui Grill a Carbone',
      excerpt: 'Se non sai controllare la temperatura, non sai cucinare. Punto. Questa guida ti insegna l\'unica abilità che conta davvero su un grill a carbone — tutto il resto è decorazione.',
      content: `<h2>L\'Unica Abilità che Conta</h2>
<p>Insegno alle persone a grigliare da vent'anni, e posso dirti che il 90% del BBQ pessimo viene da esattamente un problema: il controllo della temperatura. Non dai rub cattivi. Non dalla carne economica. Non dal legno sbagliato. La temperatura. Se riesci a mantenere 120°C per 12 ore su un grill a carbone, puoi produrre BBQ di livello mondiale. Se non ci riesci, il rub più costoso e la carne di qualità più alta produrranno comunque mediocrità.</p>
<p>Questa guida ti insegna come il fuoco funziona su un grill a carbone, come controllarlo, e come recuperare quando le cose vanno storte — e andranno storte.</p>

<h2>La Scienza di Base: Cosa Controlla la Temperatura</h2>
<p>Su qualsiasi grill a carbone o smoker, la temperatura è determinata da tre variabili:</p>
<ol>
<li><strong>Flusso d'aria in entrata:</strong> Più aria = più ossigeno = fuoco più caldo. Meno aria = meno ossigeno = fuoco più freddo.</li>
<li><strong>Flusso d'aria in uscita:</strong> Deve essere aperto abbastanza da consentire ai gas di combustione di sfiatare, altrimenti il fuoco si soffocare. La ventilazione superiore controlla principalmente la temperatura; quella inferiore controlla la combustione.</li>
<li><strong>Quantità di carburante:</strong> Più carbone = potenziale di calore più alto. Meno carbone = decadimento più veloce.</li>
</ol>
<p>Il concetto fondamentale: le ventilazioni controllano la temperatura. Aprire la ventilazione inferiore fa entrare più aria, il che alimenta il fuoco e aumenta la temperatura. Chiuderla riduce il flusso d'aria, il che "strangola" il fuoco e diminuisce la temperatura. La ventilazione superiore dovrebbe essere sempre aperta almeno del 25-50% per consentire lo scarico — chiuderla completamente soffocare il fuoco in modo non uniforme e produce fumo sgradevole.</p>

<h2>Le Zone di Temperatura: Cosa Significa Ciascuna</h2>
<p><strong>107-135°C — La Zona Low and Slow:</strong> Brisket, spalle di maiale, costolette, punta di petto. A questa temperatura, il collagene nei tagli duri si trasforma lentamente in gelatina nel corso di 10-18 ore. Non puoi accelerare questo processo alzando la temperatura — rovinerai solo la carne.</p>
<p><strong>135-175°C — La Zona Media:</strong> Costine di maiale, pollo intero, maiale nel complesso. Molte proteine si cuociono bene qui, ed è più facile da mantenere rispetto al low and slow.</p>
<p><strong>175-230°C — La Zona della Griglia Normale:</strong> Hamburger, salsicce, petti di pollo, bistecche di media grandezza. Questa è la gamma dove la maggior parte della gente grigliate.</p>
<p><strong>230°C+ — La Zona della Rosolatura:</strong> Bistecche spesse, tutto ciò che vuoi con la crosta. Difficile da mantenere su grill standard; richiede carbone denso, ventilazione ampia e tecniche specifiche.</p>

<h2>La Tecnica dello Strato Minton: Controllo della Temperatura Avanzato</h2>
<p>Per le cotture long and slow su un kettle o uno smoker offset, il metodo del "snake" o "fuse" è il modo più efficiente di mantenere temperature basse e costanti per molte ore:</p>
<ol>
<li>Disponi le bricchette in due file parallele lungo il perimetro della griglia delle braci, formando una C o una U</li>
<li>Aggiungi un secondo strato su uno solo dei lati</li>
<li>Accendi solo 8-10 bricchette in una ciminiera e versale a un'estremità della "serpente"</li>
<li>Il fuoco brucerà lentamente lungo la serpente per 8-12 ore senza intervento</li>
<li>Aggiungi pezzi di legno lungo la serpente per il fumo automaticamente programmato</li>
</ol>
<p>Questo metodo rimuove la necessità di aggiungere carbone durante la cottura — il che significa meno aperture del coperchio, temperature più stabili, e meno disturbo della cottura.</p>

<h2>Risoluzione dei Problemi: I Più Comuni Problemi di Temperatura</h2>

<h3>Il Grill è Troppo Caldo</h3>
<p>Cause: Troppe braci attive, ventilazione superiore troppo aperta, legno in eccesso aggiunto contemporaneamente.</p>
<p>Soluzioni: Chiudi la ventilazione inferiore al 25-50%, chiudi la ventilazione superiore al 50%, rimuovi fisicamente alcune braci se necessario (usa pinze a lungo manico). Non bagnare le braci — produce fumo pessimo.</p>

<h3>Il Grill è Troppo Freddo</h3>
<p>Cause: Troppo poche braci, ventilazione chiusa troppo, carbone bagnato o di bassa qualità.</p>
<p>Soluzioni: Apri entrambe le ventilazioni completamente. Se la temperatura non sale in 10-15 minuti, aggiungi 10-15 bricchette precedentemente accese dalla ciminiera — non aggiungere mai carbone freddo a una cottura in corso.</p>

<h3>La Temperatura Oscilla Selvaggiamente</h3>
<p>Cause: Aprire il coperchio troppo spesso, vento forte, regolazioni eccessive delle ventilazioni.</p>
<p>Soluzioni: Fai piccole regolazioni delle ventilazioni e aspetta 10-15 minuti prima di regolare di nuovo. I grill a carbone hanno inerzia termica — non rispondono immediatamente. Il problema più comune dei principianti è reagire in eccesso con le ventilazioni, il che causa ampie oscillazioni di temperatura.</p>

<h2>Il Metodo dei Due Ventilatori</h2>
<p>Ecco la semplice regola che uso per tutta la gestione della temperatura:</p>
<ul>
<li><strong>Ventilazione inferiore:</strong> Controlla il calore. Aprila per aumentare la temperatura, chiudila per diminuirla.</li>
<li><strong>Ventilazione superiore:</strong> Sempre aperta almeno al 25%. La chiusura completa soffocher il fuoco e produrrà fumo amaro. Su una lunga cottura, tienila al 50% e usa principalmente la ventilazione inferiore per le regolazioni fini.</li>
</ul>

<h2>Perché il Termometro del Coperchio Mente</h2>
<p>Il termometro integrato nel coperchio di qualsiasi grill misura la temperatura all'altezza del coperchio, non alla griglia dove si trova il cibo. Questa differenza può essere di 15-30°C su un grill standard. Usa sempre un termometro a sonda calibrato posizionato accanto al cibo sulla griglia. Sono l'unica misura che conta.</p>`,
    },
    es: {
      title: 'La Guía Completa al Control de Temperatura en Parrillas de Carbón',
      excerpt: 'Si no puedes controlar la temperatura, no sabes cocinar. Punto. Esta guía te enseña la única habilidad que realmente importa en una parrilla de carbón — todo lo demás es decoración.',
      content: `<h2>La Única Habilidad que Importa</h2>
<p>Llevo veinte años enseñando a la gente a asar, y puedo decirte que el 90% del BBQ malo viene de exactamente un problema: el control de temperatura. No de los rubs malos. No de la carne barata. No de la madera equivocada. La temperatura. Si puedes mantener 120°C durante 12 horas en una parrilla de carbón, puedes producir BBQ de nivel mundial. Si no puedes, el rub más caro y la carne de mayor calidad seguirán produciendo mediocridad.</p>
<p>Esta guía te enseña cómo funciona el fuego en una parrilla de carbón, cómo controlarlo, y cómo recuperarte cuando las cosas salen mal — y saldrán mal.</p>

<h2>La Ciencia Básica: Qué Controla la Temperatura</h2>
<p>En cualquier parrilla de carbón o ahumador, la temperatura está determinada por tres variables:</p>
<ol>
<li><strong>Flujo de aire entrante:</strong> Más aire = más oxígeno = fuego más caliente. Menos aire = menos oxígeno = fuego más frío.</li>
<li><strong>Flujo de aire saliente:</strong> Debe estar lo suficientemente abierto para que los gases de combustión puedan escapar, de lo contrario el fuego se ahoga. La ventilación superior controla principalmente la temperatura; la inferior controla la combustión.</li>
<li><strong>Cantidad de combustible:</strong> Más carbón = mayor potencial de calor. Menos carbón = decaimiento más rápido.</li>
</ol>
<p>El concepto fundamental: las ventilaciones controlan la temperatura. Abrir la ventilación inferior deja entrar más aire, lo que alimenta el fuego y aumenta la temperatura. Cerrarla reduce el flujo de aire, lo que "estrangula" el fuego y disminuye la temperatura.</p>

<h2>Las Zonas de Temperatura</h2>
<p><strong>107-135°C — La Zona Low and Slow:</strong> Brisket, paletas de cerdo, costillas, falda. A esta temperatura, el colágeno en los cortes duros se convierte lentamente en gelatina a lo largo de 10-18 horas. No puedes acelerar este proceso subiendo la temperatura — solo arruinarás la carne.</p>
<p><strong>135-175°C — La Zona Media:</strong> Costillas de cerdo, pollo entero, cerdo en general. Muchas proteínas se cocinan bien aquí, y es más fácil de mantener que el low and slow.</p>
<p><strong>175-230°C — La Zona de Parrilla Normal:</strong> Hamburguesas, salchichas, pechugas de pollo, filetes de tamaño medio.</p>
<p><strong>230°C+ — La Zona de Sellado:</strong> Filetes gruesos, todo lo que quieras con costra. Difícil de mantener en parrillas estándar; requiere carbón denso, ventilación amplia y técnicas específicas.</p>

<h2>El Método de la Serpiente: Control de Temperatura Avanzado</h2>
<p>Para cocciones largas y lentas en una kettle o un ahumador offset, el método "snake" o "fuse" es la forma más eficiente de mantener temperaturas bajas y constantes durante muchas horas:</p>
<ol>
<li>Dispón las briquetas en dos filas paralelas a lo largo del perímetro de la rejilla de carbón, formando una C o una U</li>
<li>Añade una segunda capa en solo uno de los lados</li>
<li>Enciende solo 8-10 briquetas en una chimenea y viértelas en un extremo de la "serpiente"</li>
<li>El fuego arderá lentamente a lo largo de la serpiente durante 8-12 horas sin intervención</li>
<li>Añade trozos de madera a lo largo de la serpiente para humo automáticamente programado</li>
</ol>

<h2>Resolución de Problemas: Los Más Comunes</h2>

<h3>La Parrilla Está Demasiado Caliente</h3>
<p>Causas: Demasiadas brasas activas, ventilación superior demasiado abierta, exceso de madera añadida a la vez.</p>
<p>Soluciones: Cierra la ventilación inferior al 25-50%, cierra la ventilación superior al 50%, retira físicamente algunas brasas si es necesario (usa pinzas de mango largo). No mojes las brasas — produce humo horrible.</p>

<h3>La Parrilla Está Demasiado Fría</h3>
<p>Soluciones: Abre ambas ventilaciones completamente. Si la temperatura no sube en 10-15 minutos, añade 10-15 briquetas previamente encendidas en la chimenea — nunca añadas carbón frío a una cocción en curso.</p>

<h3>La Temperatura Oscila Mucho</h3>
<p>Haz pequeños ajustes de las ventilaciones y espera 10-15 minutos antes de volver a ajustar. Las parrillas de carbón tienen inercia térmica — no responden inmediatamente. El problema más común de los principiantes es reaccionar de forma excesiva con las ventilaciones, lo que causa grandes oscilaciones de temperatura.</p>

<h2>Por Qué Miente el Termómetro de la Tapa</h2>
<p>El termómetro integrado en la tapa de cualquier parrilla mide la temperatura a la altura de la tapa, no en la rejilla donde está la comida. Esta diferencia puede ser de 15-30°C en una parrilla estándar. Usa siempre un termómetro de sonda calibrado colocado junto a la comida en la rejilla. Son la única medida que importa.</p>`,
    },
  },

  // --- FIRST SMOKER ---
  'r6zm65se51etdnccaobquo0p': {
    it: {
      title: 'Come Scegliere il Tuo Primo Smoker: Guida all\'Acquisto',
      excerpt: 'Smettila di angosciarti, smettila di guardare confronti su YouTube per la ventesima volta, e smettila di chiedere su Reddit. Ti dirò esattamente cosa comprare in base a chi sei davvero.',
      content: `<h2>Stai Pensando Troppo</h2>
<p>Ricevo questa domanda più di qualsiasi altra: "Che smoker dovrei comprare?" E la persona che la fa di solito ha già passato tre settimane a guardare video su YouTube, leggere forum e confondersi sempre di più con ogni fonte. I tipi dell'offset dicono che gli offset sono gli unici veri smoker. I tipi del pellet grill dicono che i pellet sono il futuro. Il culto del kamado insiste che la ceramica è il re. Ognuno ha torto nella stessa misura.</p>
<p>La risposta giusta dipende interamente da chi sei come cuoco e da come si svolge la tua vita reale — non da chi sei come aspirante pitmaster che sogni la gara del fine settimana.</p>

<h2>Il Framework delle Tre Domande</h2>
<p>Rispondi onestamente a queste domande, e ti dirò quale smoker comprare:</p>
<ol>
<li><strong>Quante ore realisticamente hai disponibili nelle tipiche sessioni di BBQ?</strong> Meno di 4 ore, 4-8 ore, o 8+ ore?</li>
<li><strong>Vuoi imparare come funziona il fuoco, o vuoi carne affumicata bene con il minimo sforzo?</strong></li>
<li><strong>Qual è il tuo budget reale?</strong> Non il budget aspirazionale, quello reale includendo accessori, carburante e strumenti.</li>
</ol>

<h2>Il Kettle Weber: Il Punto di Partenza Corretto per il 70% delle Persone</h2>
<p>Se non sai da dove iniziare, compra un Weber Kettle Premium 57 cm. Ecco perché:</p>
<ul>
<li>Griglia a carbone, affumicatore, forno per pizza — tutto in uno per meno di 300€</li>
<li>Ti insegna il controllo del fuoco attraverso la pratica effettiva — una abilità che si trasferisce a qualsiasi altro cuocitore per sempre</li>
<li>Ricambi disponibili ovunque, comunità di supporto enorme, dura una vita con manutenzione minima</li>
<li>Se impari ad affumicare seriamente su un kettle, sei tecnicamente avanzato di qualsiasi proprietario di pellet grill</li>
</ul>
<p>Il kettle non è il compromesso — è la base. Franklin BBQ ha aperto usando grill a carbone da 300$. La complessità dell'attrezzatura non sostituisce la competenza.</p>

<h2>Il Pellet Grill: Per Chi Apprezza la Costanza Rispetto alla Tradizione</h2>
<p>Se sei onesto con te stesso che non vuoi passare la domenica gestendo un fuoco, compra un pellet grill nella gamma 800-1.200€ (Traeger Ironwood, Recteq, Camp Chef Woodwind). Ecco quando è la scelta giusta:</p>
<ul>
<li>Hai poco tempo, vuoi carne affumicata bene, e il processo non è parte dell'esperienza per te</li>
<li>Cucini 2-3 volte la settimana e la consistenza delle temperature è più importante della profondità del sapore</li>
<li>Vivi in un condominio o hai limitazioni di spazio dove un offset è impossibile</li>
</ul>
<p>Non comprare un pellet grill se: stai cercando di imparare BBQ autentico, ti interessa la competizione, o sei il tipo di persona che trarrà soddisfazione dalla padronanza del fuoco.</p>

<h2>L\'Offset: Per i Seri Senza Budget Limitati</h2>
<p>Un offset ben costruito — non quelli da 300€ di Home Depot, ma un vero offset con pareti da 6 mm come un Yoder, Lone Star Grillz, o Lang — è lo smoker definitivo per chi vuole il miglior BBQ possibile. Ma è anche lo smoker con la più alta curva di apprendimento e i requisiti di tempo più alti.</p>
<p>Compra un offset se:</p>
<ul>
<li>Hai 1.500-4.000€ per un offset di qualità (quelli economici sono peggio che non avere niente — si perdono di calore, arrugginiscono, bruciano il cibo in modo non uniforme)</li>
<li>Puoi dedicare 8-14 ore a una cottura senza controllo costante per le prime 20-30 cotture mentre impari</li>
<li>Il processo di cooking — gestire il fuoco, dividere la legna, leggere il fumo — è parte dell'attrattiva per te</li>
<li>Stai cercando il massimo possibile di sapore di fumo, non una gestione conveniente</li>
</ul>

<h2>Il Kamado: Quando Vuoi un Solo Cuocitore per il Resto della Tua Vita</h2>
<p>Un Kamado Joe o un Big Green Egg è giustificato se: non vuoi mai comprare un altro cuocitore, hai 1.500-2.500€ da spendere, e capisci che pagherai una penalità di apprendimento iniziale prima di padroneggiare la gestione dei tiratori. I kamado sono i più versatili e i più efficienti nel carburante dei grandi cuocitori — ma non sono per impazienti.</p>

<h2>Il Consiglio Onesto</h2>
<p>Ecco la verità che i forum BBQ non diranno mai: il BBQ eccellente viene dalla competenza del cuoco, non dall'attrezzatura. Ho mangiato brisket mediocri da smoker da 4.000€ e brisket fantastici da fuochi di terra. Il modo più rapido per diventare bravi a BBQ è comprare qualcosa, iniziare a cucinare, imparare dai propri errori, e farlo di nuovo 50 volte. Qualsiasi smoker funzionerà in quello scenario.</p>
<p>Quindi smettila di ricercare e inizia a cucinare.</p>`,
    },
    es: {
      title: 'Cómo Elegir tu Primer Ahumador: Guía de Compra',
      excerpt: 'Para de angustiarte, para de ver comparativas en YouTube por vigésima vez, y para de preguntar en Reddit. Te voy a decir exactamente qué comprar según quién eres realmente.',
      content: `<h2>Estás Pensando Demasiado</h2>
<p>Recibo esta pregunta más que ninguna otra: "¿Qué ahumador debería comprar?" Y quien la hace normalmente ya ha pasado tres semanas viendo videos de YouTube, leyendo foros y confundiéndose más con cada fuente. Los tipos del offset dicen que los offset son los únicos ahumadores reales. Los tipos de la parrilla de pellets dicen que los pellets son el futuro. El culto del kamado insiste en que la cerámica es la reina. Todos están equivocados en la misma medida.</p>
<p>La respuesta correcta depende enteramente de quién eres como cocinero y cómo transcurre tu vida real — no de quién eres como pitmaster aspirante que sueña con la competición del fin de semana.</p>

<h2>El Marco de las Tres Preguntas</h2>
<p>Responde honestamente a estas preguntas, y te diré qué ahumador comprar:</p>
<ol>
<li><strong>¿Cuántas horas tienes realísticamente disponibles en sesiones típicas de BBQ?</strong> ¿Menos de 4 horas, 4-8 horas, o 8+ horas?</li>
<li><strong>¿Quieres aprender cómo funciona el fuego, o quieres carne ahumada bien hecha con el mínimo esfuerzo?</strong></li>
<li><strong>¿Cuál es tu presupuesto real?</strong> No el aspiracional, el real incluyendo accesorios, combustible y herramientas.</li>
</ol>

<h2>La Kettle Weber: El Punto de Partida Correcto para el 70% de las Personas</h2>
<p>Si no sabes por dónde empezar, compra una Weber Kettle Premium de 57 cm. Por qué:</p>
<ul>
<li>Parrilla de carbón, ahumador, horno de pizza — todo en uno por menos de 300€</li>
<li>Te enseña control del fuego a través de práctica real — una habilidad que se transfiere a cualquier otro cocedor para siempre</li>
<li>Repuestos disponibles en todas partes, comunidad de apoyo enorme, dura toda una vida con mantenimiento mínimo</li>
<li>Si aprendes a ahumar en serio en una kettle, estás técnicamente por delante de cualquier propietario de parrilla de pellets</li>
</ul>

<h2>La Parrilla de Pellets: Para Quien Valora la Consistencia sobre la Tradición</h2>
<p>Si eres honesto contigo mismo en que no quieres pasar el domingo gestionando un fuego, compra una parrilla de pellets en el rango 800-1.200€ (Traeger Ironwood, Recteq, Camp Chef Woodwind). Cuándo es la elección correcta:</p>
<ul>
<li>Tienes poco tiempo, quieres carne ahumada bien hecha, y el proceso no es parte de la experiencia para ti</li>
<li>Cocinas 2-3 veces a la semana y la consistencia de temperaturas es más importante que la profundidad del sabor</li>
<li>Vives en un apartamento o tienes limitaciones de espacio donde un offset es imposible</li>
</ul>

<h2>El Offset: Para los Serios sin Presupuesto Limitado</h2>
<p>Un offset bien construido — no los de 300€ del hipermercado, sino un offset real con paredes de 6 mm como un Yoder, Lone Star Grillz, o Lang — es el ahumador definitivo para quien quiere el mejor BBQ posible. Pero también es el ahumador con la mayor curva de aprendizaje y los requisitos de tiempo más altos.</p>
<p>Compra un offset si:</p>
<ul>
<li>Tienes 1.500-4.000€ para un offset de calidad</li>
<li>Puedes dedicar 8-14 horas a una cocción sin supervisión constante durante las primeras 20-30 cocciones</li>
<li>El proceso — gestionar el fuego, partir leña, leer el humo — forma parte del atractivo para ti</li>
</ul>

<h2>El Kamado: Cuando Quieres un Solo Cocedor para el Resto de tu Vida</h2>
<p>Un Kamado Joe o un Big Green Egg está justificado si: nunca quieres comprar otro cocedor, tienes 1.500-2.500€ para gastar, y entiendes que pagarás una penalización de aprendizaje inicial antes de dominar la gestión de ventilaciones.</p>

<h2>El Consejo Honesto</h2>
<p>La verdad que los foros de BBQ nunca dirán: el BBQ excelente viene de la competencia del cocinero, no del equipo. He comido briskets mediocres de ahumadores de 4.000€ y briskets fantásticos de fuegos en el suelo. La forma más rápida de ser bueno en BBQ es comprar algo, empezar a cocinar, aprender de los propios errores, y repetirlo 50 veces. Cualquier ahumador funcionará en ese escenario.</p>
<p>Así que deja de investigar y empieza a cocinar.</p>`,
    },
  },
};

// ============================================================================
// TRADUZIONI BLOG POSTS
// ============================================================================

const blogTranslations = {

  // --- BBQ TRENDS 2026 ---
  'u9nhhsmm1051gspzln5t2h0o': {
    it: {
      title: 'Stagione BBQ 2026: I Trend Principali e Cosa Tenere d\'Occhio',
      excerpt: 'Dimentica il ciclo dell\'hype. Ecco cosa sta davvero cambiando nel BBQ questa stagione, cos\'è solo rumore di marketing, e quali trend meritano la tua attenzione e i tuoi soldi.',
      content: `<h2>La Maggior Parte degli Articoli sui Trend sono Comunicati Stampa. Questo No.</h2>
<p>Ogni primavera, i media del BBQ pubblicano articoli sui "trend" che sono a malapena pubblicità prodotto travestita. "I grill con intelligenza artificiale sono il futuro!" (Traduzione: una compagnia gli ha mandato un grill gratis con un termometro Bluetooth.) "La macelleria di animale intero sta diventando di tendenza!" (Traduzione: una scuola di cucina a Milano ha aperto un nuovo corso.) Vado a dirvi cosa sta davvero cambiando nel BBQ quest'anno — sulla base di quello che vedo nei concorsi, nelle cucine dei ristoranti, e nella vita reale della gente che cucina ogni settimana.</p>

<h2>Trend 1: La Fuga dai Pellet — Il Ritorno al Carbone Comincia</h2>
<p>L'industria dei pellet grill ha avuto un ciclo di boom fenomenale dal 2019 al 2024. Le vendite sono esplose. Ogni marca ne ha lanciato uno. I principianti li hanno abbracciati in massa per la facilità. Ma sto vedendo un cambiamento nei cuochi più seri: si ritira al carbone. La ragione non è romanticismo — è sapore. Una volta che capisci veramente il BBQ e sviluppi un palato educato, il gap di sapore tra un pellet grill e uno smoker a carbone o a legna diventa non ignorabile. Le ricerche di Google per "come affumicare su Weber kettle" sono ai massimi storici. Questa non è nostalgia. È delusione del palato.</p>

<h2>Trend 2: La Convergenza Coreana — Coreano BBQ + Tecniche Americane</h2>
<p>Questo lo seguivo da tre anni e sta finalmente raggiungendo la cucina domestica. Il BBQ coreano — galbi, bulgogi, carne a fette sottili su tavoli da grill — sta incontrando le tecniche di affumicatura americana in modi interessanti. Sto vedendo ricette ibride: costine coreane stile short rib affumicate per 4 ore su hickory, poi rifinite su carbone ad alta temperatura per la caramellizzazione finale. Il risultato combina la profondità di fumo dell'America con l'aggressività di calore e i profili di glassa della Corea. È genuinamente delizioso e non è un gimmick.</p>

<h2>Trend 3: La Normalizzazione del Tallow — Il Grasso è di Nuovo Buono</h2>
<p>Il sego di manzo era l'ingrediente segreto dei vecchi brisket di Texas, poi è sparito per decenni di fear-mongering sui grassi saturi, e ora sta tornando. I pitmasters competitivi usano il tallow per terminare il brisket dall'interno e dall'esterno — avvolgendo con tallow per una bark più ricca, e persino iniettando tallow emulsionato nei tagli prima della cottura. I cuochi domestici adottano questa tecnica più lentamente, ma la stanno adottando. L'effetto è reale: un bark più lucido, piatto con più umidità, e un profilo di sapore più ricco. Non è hype.</p>

<h2>Trend 4: Il Grill Connesso — Più Problemi di Quanti Ne Valga la Pena</h2>
<p>I grill con Wi-Fi, Bluetooth e integrazione con app continuano a moltiplicarsi. Il mercato continua a comprare. Ma i problemi continuano anche loro: firmware aggiornati che rompono funzioni, server che vanno giù durante le cotture critiche, vulnerabilità di sicurezza scoperte in dispositivi IoT da cucina. La domanda fondamentale — "perché ho bisogno che il mio grill sia su Internet?" — rimane senza risposta convincente. Il monitoraggio remoto è genuinamente utile. Tutto il resto è feature creep venduto come innovazione. Compra un grill solido e un buon termometro wireless. Non hai bisogno di un account cloud per cucinare la carne.</p>

<h2>Cosa Stai Ignorando che Dovresti Smettere di Ignorare</h2>
<p>Il brasato corto di manzo non è il brisket. La gente lo sottovaluta perché è disponibile, economico, e cuoce in 6-8 ore invece di 14. Su un fuoco decente con legno da frutto, le costine di manzo brasate producono una profondità di sapore che rivaleggia con i migliori brisket. Costo: 20-30% di quello del brisket. Tempo: la metà. Difficoltà: notevolmente più basso. Questo è il taglio che raccomando a qualsiasi principiante serio che vuole imparare l'affumicatura del manzo senza il rischio di un investimento da 60€ di brisket.</p>

<h2>Il Verdetto della Stagione</h2>
<p>Il BBQ sta dividendosi in due culture distinte: i convenience-seekers che vogliono carne affumicata bene con minimo sforzo (pellet grill, smart controllers, set-and-forget), e i craft devotees che vogliono padronanza del fuoco, sapore massimo e il processo come parte dell'esperienza (carbone, legna, offset). Nessuno dei due ha torto. Sono semplicemente prodotti diversi per persone diverse. Capisci in quale categoria ti trovi prima di comprare qualsiasi cosa quest'anno.</p>`,
    },
    es: {
      title: 'Temporada BBQ 2026: Las Principales Tendencias y Qué Vigilar',
      excerpt: 'Olvida el ciclo del hype. Esto es lo que realmente está cambiando en el BBQ esta temporada, qué es solo ruido de marketing, y qué tendencias merecen tu atención y tu dinero.',
      content: `<h2>La Mayoría de los Artículos de Tendencias son Notas de Prensa. Este No.</h2>
<p>Cada primavera, los medios de BBQ publican artículos de "tendencias" que son apenas publicidad de producto disfrazada. "¡Las parrillas con inteligencia artificial son el futuro!" (Traducción: una empresa les mandó una parrilla gratis con un termómetro Bluetooth.) Voy a deciros qué está cambiando realmente en el BBQ este año — basándome en lo que veo en los concursos, las cocinas de restaurantes, y la vida real de la gente que cocina cada semana.</p>

<h2>Tendencia 1: La Fuga de los Pellets — El Regreso al Carbón Comienza</h2>
<p>La industria de las parrillas de pellets tuvo un ciclo de boom fenomenal de 2019 a 2024. Pero estoy viendo un cambio en los cocineros más serios: vuelven al carbón. La razón no es romanticismo — es sabor. Una vez que entiendes realmente el BBQ y desarrollas un paladar educado, la diferencia de sabor entre una parrilla de pellets y un ahumador de carbón o leña se vuelve imposible de ignorar. Las búsquedas de Google de "cómo ahumar en Weber kettle" están en máximos históricos. Esto no es nostalgia. Es decepción del paladar.</p>

<h2>Tendencia 2: La Convergencia Coreana</h2>
<p>El BBQ coreano — galbi, bulgogi, carne en lonchas finas en mesas de parrilla — está encontrando las técnicas de ahumado americanas de maneras interesantes. Estoy viendo recetas híbridas: costillas coreanas estilo short rib ahumadas 4 horas en hickory, luego terminadas en carbón a alta temperatura para la caramelización final. El resultado combina la profundidad de humo de América con la agresividad de calor y los perfiles de glaseado de Corea. Es genuinamente delicioso y no es un truco de moda.</p>

<h2>Tendencia 3: La Normalización del Sebo — La Grasa Vuelve a Ser Buena</h2>
<p>El sebo de vaca era el ingrediente secreto de los antiguos briskets de Texas, luego desapareció décadas de miedo a las grasas saturadas, y ahora está volviendo. Los pitmasters de competición usan sebo para terminar el brisket por dentro y por fuera. El efecto es real: una costra más brillante, falda con más humedad, y un perfil de sabor más rico. No es hype.</p>

<h2>Tendencia 4: La Parrilla Conectada — Más Problemas que Beneficios</h2>
<p>Las parrillas con Wi-Fi, Bluetooth e integración de apps siguen multiplicándose. El mercado sigue comprando. Pero los problemas también siguen: firmware actualizados que rompen funciones, servidores que se caen durante cocciones críticas, vulnerabilidades de seguridad en dispositivos IoT de cocina. La pregunta fundamental — "¿por qué necesito que mi parrilla esté en Internet?" — sigue sin respuesta convincente. Compra una parrilla sólida y un buen termómetro inalámbrico. No necesitas una cuenta en la nube para cocinar carne.</p>

<h2>Lo que Estás Ignorando y Deberías Dejar de Ignorar</h2>
<p>El short rib de vacuno no es el brisket. La gente lo subestima porque es asequible y se cocina en 6-8 horas en lugar de 14. En un buen fuego con madera frutal, las costillas de vacuno producen una profundidad de sabor que rivaliza con los mejores briskets. Coste: 20-30% del brisket. Tiempo: la mitad. Dificultad: notablemente menor. Es el corte que recomiendo a cualquier principiante serio que quiera aprender el ahumado de vacuno sin el riesgo de una inversión de 60€ en brisket.</p>

<h2>El Veredicto de la Temporada</h2>
<p>El BBQ se está dividiendo en dos culturas distintas: los buscadores de conveniencia que quieren carne ahumada bien hecha con mínimo esfuerzo, y los devotos del oficio que quieren maestría del fuego, sabor máximo y el proceso como parte de la experiencia. Ninguno está equivocado. Son simplemente productos distintos para personas distintas. Entiende en qué categoría te encuentras antes de comprar nada este año.</p>`,
    },
  },

  // --- CHARCOAL TEST ---
  'gcaderlcmvy44819sk7eeu1t': {
    it: {
      title: 'Abbiamo Testato 10 Marche di Carbonella — Ecco Cosa Abbiamo Trovato',
      excerpt: 'Abbiamo bruciato 100 kg di carbonella in test controllati così tu non devi farlo. I risultati cambieranno come compri il combustibile — e ti risparmieranno soldi se stai pagando troppo per l\'hype di marketing.',
      content: `<h2>La Tua Carbonella Conta Più del Tuo Rub</h2>
<p>Ho guardato persone passare 45 minuti a perfezionare un rub per il brisket e poi accendere qualunque sacchetto di carbonella fosse in offerta al supermercato. È come scegliere con cura il vino per una cena e poi servirlo in un bicchiere di plastica. Il combustibile è la base di ogni cottura, e la differenza tra la migliore e la peggiore marca di carbonella non è sottile — è la differenza tra mantenere 120°C stabili per 12 ore e lottare per mantenere 110°C per 8.</p>

<h2>Il Metodo: Come Abbiamo Testato</h2>
<p>Ho standardizzato il protocollo di test il più possibile:</p>
<ul>
<li>Stesso grill (Kamado Joe Classic III) per ogni test</li>
<li>Stessa quantità di carbone di partenza (2,3 kg misurati per peso)</li>
<li>Stesse impostazioni delle ventilazioni (inferiore al 25%, superiore al 50%)</li>
<li>Monitoraggio della temperatura con cinque sonde calibrate per 12 ore</li>
<li>Ogni test eseguito tre volte per verificare la coerenza</li>
<li>Tutti i sacchi acquistati al dettaglio senza sconti o campioni gratuiti dai produttori</li>
</ul>

<h2>Il Ranking: Dal Peggiore al Migliore</h2>

<h3>Tier Basso: Evita</h3>
<p><strong>Royal Oak Bricchette (2,50€/kg):</strong> La bricchetta standard americana con l'aggiunta di legante che produce fumo odoroso durante l'accensione. Adeguata per griglie veloci di hamburger ma non appropriata per affumicatura seria. Ha esaurito il carburante con 2 ore di anticipo rispetto alle premesse della confezione.</p>
<p><strong>Kingsford Original (2,80€/kg):</strong> L'onnipresente bricchetta americana. Funziona, è conveniente, è disponibile ovunque. Ma il riempitivo di legante produce fumo sgradevole per i primi 20-30 minuti di accensione, e le prestazioni di temperatura crollano dopo le 8 ore. Per le cotture lente di 12-14 ore, devi ricaricare.</p>

<h3>Tier Medio: Solide Scelte</h3>
<p><strong>Weber Briquettes (4€/kg):</strong> Migliori delle Kingsford su quasi ogni metrica — meno fumo all'accensione, cenere più pulita, prestazioni di temperatura più stabili. Ma costano il 40% in più di Kingsford con prestazioni che non giustificano completamente il differenziale.</p>
<p><strong>B&B Charcoal Oak Lump (4,50€/kg):</strong> Il miglior rapporto qualità-prezzo nel segmento carbonella grezza. Pezzi di medie dimensioni, accensione ragionevole, buone prestazioni di temperatura, produzione di cenere accettabile. Non la migliore in nulla, ma competente in tutto e disponibile da Costco e nei negozi specializzati.</p>

<h3>Tier Premium: Vale il Prezzo per il Cuoco Giusto</h3>
<p><strong>Fogo Premium (5,50€/kg):</strong> Carbonella grezza di alta qualità con ottima distribuzione delle dimensioni dei pezzi e prestazioni di temperatura coerenti. Buona alternativa a Jealous Devil al 20% in meno di prezzo. Per la maggior parte dei cuochi, questo è il punto ottimale prezzo-prestazioni.</p>
<p><strong>Jealous Devil (6,50-7€/kg):</strong> Il campione del test su ogni metrica: durata di combustione più lunga, calore massimo più alto, minima produzione di cenere. Ma costa 40-50% più di Fogo con un vantaggio di prestazioni che si manifesta in modo più evidente nelle cotture lunghe che in quelle corte.</p>

<h2>La Lezione Principale</h2>
<p>Se cucini cotture brevi (meno di 4 ore), qualsiasi carbonella di buona qualità funzionerà. La differenza di prestazione tra Kingsford e Jealous Devil è marginale per una grigliata di hamburger di 45 minuti.</p>
<p>Se cucini cotture lunghe (8+ ore), la qualità della carbonella ha un impatto reale sulla stabilità della temperatura e sul numero di ricariche necessarie. Per queste sessioni, vale la pena spendere di più per B&B, Fogo, o Jealous Devil.</p>
<p>Il ritmo dei 5€/kg per la carbonella grezza di qualità è il punto ottimale per la maggior parte dei cuochi seri. Sotto questo prezzo, paghi in stabilità di temperatura e produzione di cenere. Sopra questo prezzo, paghi per riduzioni marginali di cenere e aumenti marginali di durata che fanno la differenza principalmente nelle cotture competitiva.</p>`,
    },
    es: {
      title: 'Probamos 10 Marcas de Carbón — Esto es lo que Encontramos',
      excerpt: 'Quemamos 100 kg de carbón en pruebas controladas para que tú no tengas que hacerlo. Los resultados cambiarán cómo compras el combustible — y te ahorrarán dinero si estás pagando de más por el hype de marketing.',
      content: `<h2>Tu Carbón Importa Más que tu Rub</h2>
<p>He visto a gente pasar 45 minutos perfeccionando un rub para el brisket y luego encender cualquier bolsa de carbón que estuviera de oferta en el supermercado. Es como elegir cuidadosamente el vino para una cena y luego servirlo en un vaso de plástico. El combustible es la base de cada cocción, y la diferencia entre la mejor y la peor marca de carbón no es sutil — es la diferencia entre mantener 120°C estables durante 12 horas y luchar por mantener 110°C durante 8.</p>

<h2>El Método: Cómo Probamos</h2>
<ul>
<li>Misma parrilla (Kamado Joe Classic III) para cada prueba</li>
<li>Misma cantidad de carbón de inicio (2,3 kg medidos por peso)</li>
<li>Misma configuración de ventilaciones</li>
<li>Monitoreo de temperatura con cinco sondas calibradas durante 12 horas</li>
<li>Cada prueba realizada tres veces para verificar la consistencia</li>
<li>Todas las bolsas compradas al precio de venta al público sin descuentos ni muestras gratuitas</li>
</ul>

<h2>El Ranking: De Peor a Mejor</h2>

<h3>Nivel Bajo: Evita</h3>
<p><strong>Royal Oak Briquetas (2,50€/kg):</strong> La briqueta estándar con aglutinante que produce humo maloliente durante el encendido. Adecuada para asados rápidos de hamburguesas pero no apropiada para ahumado serio. Se agotó el combustible 2 horas antes de lo que indicaba el envase.</p>
<p><strong>Kingsford Original (2,80€/kg):</strong> La briqueta americana omnipresente. Funciona, es económica, está disponible en todas partes. Pero el aglutinante produce humo desagradable durante los primeros 20-30 minutos, y las prestaciones de temperatura se desploman después de 8 horas.</p>

<h3>Nivel Medio: Elecciones Sólidas</h3>
<p><strong>Weber Briquettes (4€/kg):</strong> Mejores que Kingsford en casi todas las métricas — menos humo al encender, ceniza más limpia, prestaciones de temperatura más estables. Pero cuestan un 40% más que Kingsford sin que las prestaciones justifiquen completamente el diferencial.</p>
<p><strong>B&B Charcoal Oak Lump (4,50€/kg):</strong> La mejor relación calidad-precio en el segmento de carbón vegetal. Piezas de tamaño medio, encendido razonable, buenas prestaciones de temperatura, producción de ceniza aceptable. No es la mejor en nada, pero competente en todo.</p>

<h3>Nivel Premium: Vale el Precio para el Cocinero Adecuado</h3>
<p><strong>Fogo Premium (5,50€/kg):</strong> Carbón vegetal de alta calidad con excelente distribución del tamaño de las piezas y prestaciones de temperatura consistentes. Buena alternativa a Jealous Devil a un 20% menos de precio. Para la mayoría de los cocineros, este es el punto óptimo precio-prestaciones.</p>
<p><strong>Jealous Devil (6,50-7€/kg):</strong> El campeón de las pruebas en todas las métricas: mayor duración de combustión, mayor calor máximo, mínima producción de ceniza. Pero cuesta un 40-50% más que Fogo, con una ventaja de rendimiento que se manifiesta de forma más evidente en cocciones largas.</p>

<h2>La Lección Principal</h2>
<p>Si cocinas cocciones cortas (menos de 4 horas), cualquier carbón de buena calidad funcionará. La diferencia de rendimiento entre Kingsford y Jealous Devil es marginal para una barbacoa de hamburguesas de 45 minutos.</p>
<p>Si cocinas cocciones largas (8+ horas), la calidad del carbón tiene un impacto real en la estabilidad de temperatura y en el número de recargas necesarias. Para estas sesiones, vale la pena gastar más en B&B, Fogo o Jealous Devil.</p>
<p>El umbral de 5€/kg para carbón vegetal de calidad es el punto óptimo para la mayoría de los cocineros serios. Por debajo de este precio, pagas en estabilidad de temperatura y producción de ceniza.</p>`,
    },
  },

  // --- HOW WE REVIEW ---
  'bxo15hyc3dndlnwprd0kdtco': {
    it: {
      title: 'Dietro le Quinte: Come Recensiamo Ogni Prodotto',
      excerpt: 'Compriamo i nostri prodotti, li testiamo per mesi, e pubblichiamo punteggi che rendono scomodi alcuni brand. Ecco esattamente come funziona il processo — perché meriti sapere chi ti sta alimentando.',
      content: `<h2>Perché Dovrebbe Interessarti Come Testiamo</h2>
<p>Internet è sommerso da recensioni BBQ scritte da persone che non hanno mai acceso un fuoco. Qualche "recensore" spacchetta un grill, scatta foto, cucina un pasto, e pubblica un verdetto di 2.000 parole il giorno dopo. Altri riscrivono semplicemente la scheda tecnica del produttore, aggiungono qualche foto stock, e ci appiccicano un 9/10 perché la commissione di affiliazione è generosa. Lo so. L'ho visto. E spiega perché i consumatori continuano a comprare attrezzatura mediocre con feedback fantastici che poi li deluda nel mondo reale.</p>
<p>Il modo in cui facciamo le recensioni su questo sito è diverso, ed è diverso intenzionalmente.</p>

<h2>Regola Numero Uno: Compriamo Tutto</h2>
<p>Ogni singolo prodotto recensito su questo sito è stato acquistato al prezzo di vendita al pubblico, senza sconti, senza campioni media, senza accordi di partnership. Il Weber Summit S-470 che ho recensito è costato esattamente quello che ti costerà al Weber Store. Il sacco di Jealous Devil l'ho preso dal mio Amazon. Il Thermapen ONE l'ho pagato 105$ come tutti gli altri.</p>
<p>Questo non è perché siamo particolarmente virtuosi. È perché i prodotti in prestito, i campioni media, e le partnership influenzano inevitabilmente il giudizio — non sempre consciamente, ma sempre in qualche misura. Un revisore che sa che il prodotto deve tornare al produttore dopo la recensione non si sentirà abbastanza a suo agio da smontarlo, da testarlo in condizioni estreme, da usarlo abbastanza a lungo da trovare i suoi difetti. Vogliamo stare abbastanza a lungo con la roba da trovarne i difetti.</p>

<h2>Regola Numero Due: Il Periodo di Test Minimo è di Tre Mesi</h2>
<p>Quante recensioni online arrivano dopo una settimana di utilizzo? La maggior parte. E questo è fondamentalmente il problema — una settimana non ti dice quanto è affidabile la tecnologia dell'accensione nell'anno due. Non ti dice come si deteriora il sigillo in ceramica dopo 50 cicli di calore. Non ti dice se il software Wi-Fi rimane stabile attraverso gli aggiornamenti firmware del produttore.</p>
<p>Il mio periodo di test minimo è tre mesi di cottura attiva. Per i prodotti ad alto uso come i grill principali, l'orizzonte temporale è più lungo — la recensione del Weber Summit S-470 era basata su sette mesi di cottura, oltre 80 sessioni di grigliata. La recensione del Kamado Joe Classic III era basata su 14 mesi. Queste non sono linee guida arbitrarie. Sono il tempo che ci vuole per vedere come i prodotti falliscono, si deteriorano, o migliorano nelle mani di un utente reale.</p>

<h2>Come Strutturiamo i Test: Le Categorie di Punteggio</h2>
<p>Ogni recensione di grill include queste categorie di punteggio, ciascuna valutata in modo indipendente:</p>
<ul>
<li><strong>Qualità costruttiva (0-10):</strong> Materiali, rifinizioni, pesi, precisione delle tolleranze, resistenza alla corrosione nel tempo</li>
<li><strong>Prestazioni (0-10):</strong> Distribuzione del calore, stabilità della temperatura, capacità di cottura effettiva nella gamma dichiarata</li>
<li><strong>Valore (0-10):</strong> Prestazioni per euro speso, rispetto ai concorrenti a prezzi simili</li>
<li><strong>Facilità d\'uso (0-10):</strong> Curva di apprendimento, chiarezza dei controlli, semplicità di pulizia e manutenzione</li>
<li><strong>Punteggio complessivo:</strong> Media ponderata con maggiore enfasi sulle prestazioni e sulla qualità costruttiva</li>
</ul>
<p>Nota cosa non c'è: estetica, packaging, reputazione del brand, o quanto è stata gentile con noi la squadra di PR del brand. Queste cose non hanno impatto sulla tua esperienza di cottura. I punteggi sì.</p>

<h2>Il Processo Editoriale: Chi Decide Cosa Finisce nella Recensione</h2>
<p>Scrive una sola persona ogni recensione: il revisore che ha fatto il testing effettivo. Non viene rivisto da nessuno con un interesse finanziario in un particolare risultato. Il processo editoriale esiste per verificare l'accuratezza fattuale — numeri di BTU, specifiche di peso, prezzi — non per addolcire il linguaggio o eliminare le critiche che potrebbero irritare i produttori.</p>

<h2>Cosa Non Troverai Mai su Questo Sito</h2>
<p>Non troverai mai una recensione sponsorizzata non divulgata. Non troverai mai una partnership di brand in cui veniamo pagati per scrivere contenuti positivi. Non troverai mai punteggi sistematicamente alti perché siamo preoccupati di perdere accesso ai media con i brand. Non troverai mai una sezione "Come Acquistare" strutturata in modo da generare commissioni di affiliazione massime indipendentemente da ciò che è il prodotto migliore per il lettore.</p>
<p>Se questo approccio significa che alcuni brand non ci invieranno più prodotti in anteprima — bene. Non volevamo quei prodotti comunque. Li compriamo già da soli.</p>`,
    },
    es: {
      title: 'Entre Bastidores: Cómo Reseñamos Cada Producto',
      excerpt: 'Compramos nuestros propios productos, los probamos durante meses, y publicamos puntuaciones que incomodan a algunas marcas. Así es exactamente cómo funciona el proceso — porque mereces saber quién te está dando de comer.',
      content: `<h2>Por Qué Debería Importarte Cómo Probamos</h2>
<p>Internet está inundado de reseñas de BBQ escritas por personas que nunca han encendido un fuego. Algún "reseñador" desempaqueta una parrilla, saca fotos, cocina una comida, y publica un veredicto de 2.000 palabras al día siguiente. Otros simplemente reescriben la ficha técnica del fabricante, añaden fotos de stock, y le pegan un 9/10 porque la comisión de afiliado es generosa. Lo sé. Lo he visto. Y explica por qué los consumidores siguen comprando equipos mediocres con fantásticas reseñas que luego los decepcionan en el mundo real.</p>
<p>La forma en que hacemos las reseñas en este sitio es diferente, e intencionalmente diferente.</p>

<h2>Regla Número Uno: Compramos Todo</h2>
<p>Cada producto reseñado en este sitio ha sido comprado al precio de venta al público, sin descuentos, sin muestras de prensa, sin acuerdos de colaboración. El Weber Summit S-470 que reseñé costó exactamente lo mismo que te costará a ti. La bolsa de Jealous Devil la cogí de mi Amazon. El Thermapen ONE lo pagué 105$ como cualquier otra persona.</p>
<p>Esto no es porque seamos particularmente virtuosos. Es porque los productos en préstamo, las muestras de prensa y las colaboraciones inevitablemente influyen en el juicio — no siempre de forma consciente, pero siempre en alguna medida. Un reseñador que sabe que el producto debe volver al fabricante tras la reseña no se sentirá lo suficientemente cómodo para desmontarlo, probarlo en condiciones extremas, ni usarlo lo suficiente para encontrar sus defectos. Queremos quedarnos con las cosas el tiempo suficiente para encontrar sus defectos.</p>

<h2>Regla Número Dos: El Período Mínimo de Prueba es Tres Meses</h2>
<p>¿Cuántas reseñas online llegan después de una semana de uso? La mayoría. Y ese es fundamentalmente el problema — una semana no te dice cuán fiable es la tecnología de encendido en el año dos. No te dice cómo se deteriora el sello de cerámica después de 50 ciclos de calor. No te dice si el software Wi-Fi se mantiene estable a través de las actualizaciones de firmware del fabricante.</p>
<p>Mi período mínimo de prueba es tres meses de cocción activa. Para productos de alto uso como parrillas principales, el horizonte temporal es mayor — la reseña del Weber Summit S-470 se basó en siete meses de cocción, más de 80 sesiones de parrilla. La reseña del Kamado Joe Classic III se basó en 14 meses. Estos no son plazos arbitrarios. Es el tiempo que se tarda en ver cómo los productos fallan, se deterioran, o mejoran en manos de un usuario real.</p>

<h2>Cómo Estructuramos las Pruebas: Las Categorías de Puntuación</h2>
<ul>
<li><strong>Calidad de construcción (0-10):</strong> Materiales, acabados, pesos, precisión de tolerancias, resistencia a la corrosión con el tiempo</li>
<li><strong>Rendimiento (0-10):</strong> Distribución del calor, estabilidad de temperatura, capacidad de cocción real en el rango declarado</li>
<li><strong>Valor (0-10):</strong> Rendimiento por euro gastado, frente a competidores a precios similares</li>
<li><strong>Facilidad de uso (0-10):</strong> Curva de aprendizaje, claridad de los controles, facilidad de limpieza y mantenimiento</li>
<li><strong>Puntuación general:</strong> Media ponderada con mayor énfasis en rendimiento y calidad de construcción</li>
</ul>

<h2>Lo que Nunca Encontrarás en Este Sitio</h2>
<p>Nunca encontrarás una reseña patrocinada no divulgada. Nunca encontrarás una colaboración de marca en la que nos paguen para escribir contenido positivo. Nunca encontrarás puntuaciones sistemáticamente altas porque nos preocupa perder acceso de prensa con las marcas.</p>
<p>Si este enfoque significa que algunas marcas ya no nos enviarán productos en primicia — bien. No queríamos esos productos de todas formas. Ya los compramos nosotros mismos.</p>`,
    },
  },
};

// ============================================================================
// Funzione di aggiornamento localizzazione
// ============================================================================

async function updateLocale(contentType, documentId, locale, data) {
  const path = `${contentType}/${documentId}?locale=${locale}`;
  try {
    const result = await apiRequest('PUT', path, { data });
    console.log(`  ✓ ${contentType}/${documentId} [${locale}] aggiornato`);
    return result;
  } catch (err) {
    console.error(`  ✗ ${contentType}/${documentId} [${locale}] ERRORE: ${err.message.slice(0, 200)}`);
    throw err;
  }
}

// ============================================================================
// Runner principale
// ============================================================================

async function main() {
  console.log('=== BBQ Experience i18n Translation — Pitmaster Voice ===');
  console.log(`Avviato: ${new Date().toISOString()}\n`);

  let successCount = 0;
  let errorCount = 0;

  // --- REVIEWS ---
  console.log('--- REVIEWS ---');
  for (const [docId, translations] of Object.entries(reviewTranslations)) {
    for (const locale of ['it', 'es']) {
      const t = translations[locale];
      const payload = {
        title: t.title,
        excerpt: t.excerpt,
        verdict: t.verdict,
        pros: t.pros,
        cons: t.cons,
        editorial_content: t.editorial_content,
      };
      try {
        await updateLocale('reviews', docId, locale, payload);
        successCount++;
      } catch {
        errorCount++;
      }
      await sleep(400);
    }
  }

  // --- RECIPES ---
  console.log('\n--- RECIPES ---');
  for (const [docId, translations] of Object.entries(recipeTranslations)) {
    for (const locale of ['it', 'es']) {
      const t = translations[locale];
      const payload = {
        title: t.title,
        excerpt: t.excerpt,
        editorial_intro: t.editorial_intro,
        ingredients: t.ingredients,
        instructions: t.instructions,
      };
      try {
        await updateLocale('recipes', docId, locale, payload);
        successCount++;
      } catch {
        errorCount++;
      }
      await sleep(400);
    }
  }

  // --- TUTORIALS ---
  console.log('\n--- TUTORIALS ---');
  for (const [docId, translations] of Object.entries(tutorialTranslations)) {
    for (const locale of ['it', 'es']) {
      const t = translations[locale];
      const payload = {
        title: t.title,
        excerpt: t.excerpt,
        content: t.content,
      };
      try {
        await updateLocale('tutorials', docId, locale, payload);
        successCount++;
      } catch {
        errorCount++;
      }
      await sleep(400);
    }
  }

  // --- BLOG POSTS ---
  console.log('\n--- BLOG POSTS ---');
  for (const [docId, translations] of Object.entries(blogTranslations)) {
    for (const locale of ['it', 'es']) {
      const t = translations[locale];
      const payload = {
        title: t.title,
        excerpt: t.excerpt,
        content: t.content,
      };
      try {
        await updateLocale('blog-posts', docId, locale, payload);
        successCount++;
      } catch {
        errorCount++;
      }
      await sleep(400);
    }
  }

  console.log(`\n=== COMPLETATO ===`);
  console.log(`Successi: ${successCount}`);
  console.log(`Errori: ${errorCount}`);
  console.log(`Totale aggiornamenti: ${successCount + errorCount}`);
}

main().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
