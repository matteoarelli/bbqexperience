/**
 * Seed script — Popola la ContentQueue con i primi 7 articoli da generare.
 * Copertura: 1-2 articoli per cluster per la prima settimana.
 * Eseguire una sola volta: node scripts/seed-content-queue.mjs
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://cms.bbq-experience.com';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const INITIAL_QUEUE = [
  {
    title: 'Best Woods for Smoking: Hickory vs Mesquite vs Cherry vs Apple',
    content_type: 'tutorial',
    cluster: 'smoking',
    target_keyword: 'best wood for smoking meat',
    difficulty: 'low',
    priority: 1,
  },
  {
    title: 'Best BBQ Grills Under $500 in 2026',
    content_type: 'blog',
    cluster: 'grills',
    target_keyword: 'best bbq grill under 500',
    difficulty: 'medium',
    priority: 2,
  },
  {
    title: 'Instant-Read vs Leave-In Probe vs Wireless: Which Thermometer Do You Need?',
    content_type: 'blog',
    cluster: 'thermometers',
    target_keyword: 'instant read vs probe thermometer',
    difficulty: 'low',
    priority: 3,
  },
  {
    title: 'Texas-Style Smoked Brisket: The Authentic Method',
    content_type: 'recipe',
    cluster: 'brisket',
    target_keyword: 'texas style brisket recipe',
    difficulty: 'medium',
    priority: 4,
  },
  {
    title: 'Regional BBQ Sauce Styles: Carolina, Kansas City, Texas, and Alabama',
    content_type: 'tutorial',
    cluster: 'sauces',
    target_keyword: 'bbq sauce styles by region',
    difficulty: 'low',
    priority: 5,
  },
  {
    title: 'Cold Smoking vs Hot Smoking: Complete Guide',
    content_type: 'tutorial',
    cluster: 'smoking',
    target_keyword: 'cold smoking vs hot smoking',
    difficulty: 'low',
    priority: 6,
  },
  {
    title: 'Charcoal vs Gas vs Pellet Grill: The Definitive Comparison',
    content_type: 'blog',
    cluster: 'grills',
    target_keyword: 'charcoal vs gas vs pellet grill',
    difficulty: 'medium',
    priority: 7,
  },
];

async function createQueueItem(item) {
  const today = new Date();
  const scheduled = new Date(today);
  scheduled.setDate(today.getDate() + item.priority);

  const resp = await fetch(`${STRAPI_URL}/api/content-queues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        ...item,
        status: 'ready',
        ai_generated: true,
        scheduled_date: scheduled.toISOString().split('T')[0],
      },
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    console.error(`Errore per "${item.title}": ${resp.status} — ${error}`);
    return;
  }

  console.log(`Creato: ${item.title} (scheduled: ${scheduled.toISOString().split('T')[0]})`);
}

async function main() {
  if (!API_TOKEN) {
    console.error('STRAPI_API_TOKEN non configurato');
    process.exit(1);
  }

  console.log(`Seeding ${INITIAL_QUEUE.length} items in ContentQueue...`);
  for (const item of INITIAL_QUEUE) {
    await createQueueItem(item);
  }
  console.log('Done!');
}

main();
