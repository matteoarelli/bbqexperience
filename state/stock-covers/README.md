# Stock covers — BBQ Experience

Pool di foto editoriali da cui `scripts/agents/cover_generator.py` pesca
le cover image per articoli nuovi. **Niente AI generation** (vedi
commit del 2026-05-12: SDXL produceva display digitali hallucinati e
loghi scrambled — incompatibile col claim "Honest BBQ reviews. No BS.").

## Struttura

```
state/stock-covers/
├── README.md      ← questo file
├── blog/          ← cover per blog-posts (recensioni light, opinion, comparisons)
├── tutorial/      ← cover per tutorials (how-to, technique deep-dive)
├── recipe/        ← cover per recipes
└── default/       ← fallback se la bucket-specific è vuota
```

## Requisiti file

- **Formato:** `.jpg`, `.jpeg`, `.png`, `.webp`
- **Risoluzione minima:** 1280×853 (verranno center-croppate a 1216×832)
- **Aspect ratio target:** 3:2 (orizzontale). Crop al centro se diverso.
- **Stile:** food/BBQ editoriale, preferibilmente moody/dark con fonti
  di luce calde (brace, fiamma, ambient orange). Evita stock-photo
  generici "smiling family at backyard grill".
- **NO testo nelle foto:** il titolo verrà sovrapposto in basso a sinistra.
  Lascia spazio "negativo" in bottom 30-40% per leggibilità.
- **Licenza:** uso commerciale OK. Opzioni:
  - Foto proprie di Matteo (preferito — autenticità)
  - Unsplash (license non-restrictive)
  - Pexels (free for commercial)
  - Pixabay (free, no attribution required)
  - Brand-supplied (es. press kit Weber/BGE per recensioni specifiche)

## Convenzioni naming

```
blog/dark-brisket-slice-01.jpg
blog/charcoal-grate-closeup-02.jpg
tutorial/probe-thermometer-handshot-01.jpg
recipe/pulled-pork-money-shot-01.jpg
default/smoke-flame-abstract-01.jpg
```

Numerazione `-01`, `-02` ecc. utile per sapere quante varianti ci sono.
Il picker è deterministico per `documentId` (hash modulo N foto) —
stesso articolo → stessa foto sempre (idempotenza re-run).

## Quanti file servono?

Minimo:
- `blog/`: 5+ foto (rotation visiva nei feed)
- `tutorial/`: 3+ foto
- `recipe/`: 5+ foto
- `default/`: 3+ foto

Ideale: 10-15 per ogni bucket, refresh ogni 2-3 mesi per non avere
"déjà vu" nei feed sociali.

## Font per overlay titolo

Drop a TTF file in `state/fonts/` (sibling dir). Il loader cerca in
ordine: `Oswald-Bold.ttf`, `Oswald.ttf`, `Inter-Bold.ttf`, `Inter.ttf`,
poi fallback a PIL default (Liberation Sans).

Oswald-Bold matcha il font heading del sito web (`@fontsource-variable/oswald`).
Scaricalo da [Google Fonts](https://fonts.google.com/specimen/Oswald)
oppure copia da `web/node_modules/@fontsource-variable/oswald/files/`
e rinomina.

## Test locale

```bash
cd ~/bbqexperience
python3 -c "
from scripts.agents.cover_generator import compose_cover, pick_stock_image
from pathlib import Path
p = pick_stock_image('blog', 'test-doc-id')
print(f'Stock: {p}')
if p:
    out = compose_cover(p, 'Best BBQ Grills in 2026: 5 Tested Picks')
    Path('/tmp/test-cover.jpg').write_bytes(out)
    print(f'OK → /tmp/test-cover.jpg ({len(out)} bytes)')
"
```

Apri `/tmp/test-cover.jpg` in un viewer per controllare risultato.

## Quando re-abilitare il cron?

Cron `cover_generator` su Ubuntu .119 è **disabilitato** dal 2026-05-12
(prefix `# DISABLED 2026-05-12 SDXL text artifacts`). Re-abilita dopo
aver popolato almeno 5+ foto per bucket e testato compose_cover()
localmente:

```bash
ssh matteo@192.168.1.119
crontab -e
# Cerca riga 110, togli il prefix "# DISABLED ... -- "
# Salva.
```
