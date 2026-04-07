/**
 * Seed script — Popola i brand BBQ iniziali per la pipeline partnership.
 * Eseguire una sola volta: node scripts/seed-brands.mjs
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://cms.bbq-experience.com';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const BRANDS = [
  { name: 'Weber', website: 'https://www.weber.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Traeger', website: 'https://www.traeger.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Camp Chef', website: 'https://www.campchef.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Pit Boss', website: 'https://pitboss-grills.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'ThermoWorks', website: 'https://www.thermoworks.com', category: 'thermometer', affiliate_program_url: 'https://www.thermoworks.com/affiliate', commission_rate: 8.0, contact_email: '' },
  { name: 'Meater', website: 'https://www.meater.com', category: 'thermometer', affiliate_program_url: 'https://www.meater.com/pages/affiliate', commission_rate: 10.0, contact_email: '' },
  { name: "Oklahoma Joe's", website: 'https://www.oklahomajoes.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Napoleon', website: 'https://www.napoleon.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Kamado Joe', website: 'https://www.kamadojoe.com', category: 'grill_manufacturer', contact_email: '' },
  { name: 'Big Green Egg', website: 'https://biggreenegg.com', category: 'grill_manufacturer', contact_email: '' },
];

async function createBrand(brand) {
  const resp = await fetch(`${STRAPI_URL}/api/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ data: { ...brand, partnership_status: 'to_contact' } }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    console.error(`Errore per ${brand.name}: ${resp.status} — ${error}`);
    return;
  }

  const data = await resp.json();
  console.log(`Creato: ${brand.name} (${data.data?.documentId})`);
}

async function main() {
  if (!API_TOKEN) {
    console.error('STRAPI_API_TOKEN non configurato');
    process.exit(1);
  }

  console.log(`Seeding ${BRANDS.length} brand su ${STRAPI_URL}...`);
  for (const brand of BRANDS) {
    await createBrand(brand);
  }
  console.log('Done!');
}

main();
