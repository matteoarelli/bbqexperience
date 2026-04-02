/**
 * Script per popolare Strapi con post Instagram di esempio.
 * Uso: node scripts/seed-instagram.mjs [STRAPI_URL]
 * Default STRAPI_URL: http://localhost:1337
 */

const STRAPI_URL = process.argv[2] || 'http://localhost:1337';
const API_TOKEN = '60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9';

const posts = [
  {
    instagram_id: 'bbqexp_seed_001',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=1',
    permalink: 'https://instagram.com/p/CxBBQ001',
    caption: 'Low and slow brisket perfection. 14 hours at 225F and the bark is absolutely incredible. This is what weekends are made for! #BBQ #Brisket #LowAndSlow #SmokeMeat',
    timestamp: '2026-03-28T10:30:00.000Z',
    curated: true,
  },
  {
    instagram_id: 'bbqexp_seed_002',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=2',
    permalink: 'https://instagram.com/p/CxBBQ002',
    caption: 'Just unboxed the new Weber Summit Kamado E6. First impressions? Build quality is outstanding. Full review coming soon on bbq-experience.com! #WeberSummit #BBQReview #Kamado',
    timestamp: '2026-03-25T14:15:00.000Z',
    curated: true,
  },
  {
    instagram_id: 'bbqexp_seed_003',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=3',
    permalink: 'https://instagram.com/p/CxBBQ003',
    caption: 'Smoked salmon with maple glaze — our latest recipe is live! Perfect for a weekend brunch. Link in bio for the full recipe with step-by-step photos. #SmokedSalmon #BBQRecipe #GrillMaster',
    timestamp: '2026-03-22T08:00:00.000Z',
    curated: true,
  },
  {
    instagram_id: 'bbqexp_seed_004',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=4',
    permalink: 'https://instagram.com/p/CxBBQ004',
    caption: 'Temperature control is everything. Our guide to using wireless thermometers for perfect results every time. Check out the new tutorial! #BBQTips #MeatThermometer #GrillingTips',
    timestamp: '2026-03-19T16:45:00.000Z',
    curated: true,
  },
  {
    instagram_id: 'bbqexp_seed_005',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=5',
    permalink: 'https://instagram.com/p/CxBBQ005',
    caption: 'Side by side: charcoal vs pellet grill. Same cut, same rub, very different results. Which team are you on? Full comparison review on the site! #CharcoalVsPellet #BBQComparison #GrillLife',
    timestamp: '2026-03-16T12:00:00.000Z',
    curated: true,
  },
  {
    instagram_id: 'bbqexp_seed_006',
    media_type: 'IMAGE',
    media_url: 'https://picsum.photos/800/800?random=6',
    permalink: 'https://instagram.com/p/CxBBQ006',
    caption: 'Pulled pork perfection! 12 hours on the smoker with our signature Carolina vinegar sauce. This is what 74K+ followers come here for. Recipe dropping tomorrow! #PulledPork #BBQCommunity #Smoking',
    timestamp: '2026-03-13T18:30:00.000Z',
    curated: true,
  },
];

async function seedPosts() {
  console.log(`Seeding ${posts.length} Instagram posts to ${STRAPI_URL}...`);

  for (const post of posts) {
    try {
      // Crea il post come bozza
      const createRes = await fetch(`${STRAPI_URL}/api/instagram-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ data: post }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`Errore creazione ${post.instagram_id}: ${createRes.status} — ${err}`);
        continue;
      }

      const created = await createRes.json();
      const documentId = created.data?.documentId;
      console.log(`Creato: ${post.instagram_id} (documentId: ${documentId})`);

      // Pubblica il post
      if (documentId) {
        const publishRes = await fetch(`${STRAPI_URL}/api/instagram-posts/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({ data: { ...post }, status: 'published' }),
        });

        if (publishRes.ok) {
          console.log(`Pubblicato: ${post.instagram_id}`);
        } else {
          const err = await publishRes.text();
          console.error(`Errore pubblicazione ${post.instagram_id}: ${publishRes.status} — ${err}`);
        }
      }
    } catch (e) {
      console.error(`Errore per ${post.instagram_id}:`, e);
    }
  }

  console.log('Seed completato!');
}

seedPosts();
