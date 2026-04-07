# Plan 4: SEO Cluster Setup — Pillar Pages Structure & Google Search Console

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the URL structure and page templates for the 5 SEO pillar clusters, seed the initial Brand entries for partnership outreach, configure Google Search Console API access, and set up the `state/` directory on the server for agent state files.

**Architecture:** Pillar pages are Astro pages that fetch satellite articles from Strapi filtered by cluster tag. The cluster tag lives in the `EditorialCalendar.cluster` field. Google Search Console data feeds into the `keyword_scout` agent via a service account.

**Tech Stack:** Astro 6, Strapi REST API, Google Search Console API

**Dependencies:** Plan 1 (Strapi Schema), Plan 3 (PillarNav and FaqSection components).

---

### Task 1: Seed Initial Brand Entries for Partnership Pipeline

**Files:**
- Create: `scripts/seed-brands.mjs`

- [ ] **Step 1: Write brand seed script**

Write `scripts/seed-brands.mjs`:
```javascript
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
```

- [ ] **Step 2: Run the seed script**

```bash
cd scripts && STRAPI_API_TOKEN="<token>" node seed-brands.mjs
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-brands.mjs
git commit -m "feat(scripts): add brand seed script for partnership pipeline"
```

---

### Task 2: Seed Initial ContentQueue for First Week

**Files:**
- Create: `scripts/seed-content-queue.mjs`

- [ ] **Step 1: Write content queue seed script**

Write `scripts/seed-content-queue.mjs`:
```javascript
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
```

- [ ] **Step 2: Run the seed script**

```bash
cd scripts && STRAPI_API_TOKEN="<token>" node seed-content-queue.mjs
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-content-queue.mjs
git commit -m "feat(scripts): add initial ContentQueue seed for first week of AI content"
```

---

### Task 3: Create `state/` Directory on Server

- [ ] **Step 1: Create state directory structure**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'mkdir -p /opt/services/bbqexperience/state && chown -R root:root /opt/services/bbqexperience/state'
```

- [ ] **Step 2: Create .gitkeep for state directory in repo**

```bash
mkdir -p state
touch state/.gitkeep
echo "state/*" >> .gitignore
echo "!state/.gitkeep" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add state/.gitkeep .gitignore
git commit -m "feat: add state/ directory for agent state files"
```

---

### Task 4: Configure Google Search Console API Access

- [ ] **Step 1: Create GSC setup documentation**

Write `docs/gsc-setup.md`:
```markdown
# Google Search Console API Setup

## Prerequisiti
1. Proprieta bbq-experience.com verificata in Google Search Console
2. Google Cloud project con Search Console API abilitata
3. Service account con accesso alla proprieta GSC

## Setup

### 1. Crea progetto Google Cloud
- Vai su https://console.cloud.google.com
- Crea progetto "BBQ Experience"
- Abilita "Google Search Console API"

### 2. Crea Service Account
- IAM & Admin → Service Accounts → Create
- Nome: bbq-experience-gsc
- Scarica JSON key → salva come `/opt/services/bbqexperience/gsc-credentials.json`

### 3. Aggiungi Service Account a GSC
- Search Console → Impostazioni → Utenti e autorizzazioni
- Aggiungi utente: [email del service account]
- Permesso: Completo

### 4. Environment variables
```bash
# Aggiungi a /opt/services/bbqexperience/.env
GSC_CREDENTIALS_PATH=/opt/services/bbqexperience/gsc-credentials.json
GSC_SITE_URL=https://bbq-experience.com
```

### 5. Test
```bash
cd /opt/services/bbqexperience/app
python3 -c "
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os, json

creds = service_account.Credentials.from_service_account_file(
    os.environ['GSC_CREDENTIALS_PATH'],
    scopes=['https://www.googleapis.com/auth/webmasters.readonly']
)
service = build('searchconsole', 'v1', credentials=creds)
response = service.searchanalytics().query(
    siteUrl=os.environ['GSC_SITE_URL'],
    body={'startDate': '2026-04-01', 'endDate': '2026-04-07', 'dimensions': ['query'], 'rowLimit': 5}
).execute()
for row in response.get('rows', []):
    print(f'{row[\"keys\"][0]}: pos={row[\"position\"]:.1f}, imp={row[\"impressions\"]}, clicks={row[\"clicks\"]}')
"
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/gsc-setup.md
git commit -m "docs: add Google Search Console API setup guide"
```

---

### Task 5: Deploy Agents to Server

- [ ] **Step 1: Push all changes**

```bash
git push origin main
```

- [ ] **Step 2: Verify deploy**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'tail -20 /opt/webhooks/logs/bbqexperience.log'
```

- [ ] **Step 3: Install Python dependencies on server**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'pip3 install python-telegram-bot==21.7 httpx feedparser beautifulsoup4'
```

- [ ] **Step 4: Test keyword_scout on server**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'cd /opt/services/bbqexperience/app && source /opt/services/bbqexperience/.env && python3 scripts/agents/keyword_scout.py'
```

- [ ] **Step 5: Test competitor_monitor on server**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'cd /opt/services/bbqexperience/app && source /opt/services/bbqexperience/.env && python3 scripts/agents/competitor_monitor.py'
```

- [ ] **Step 6: Setup cron jobs on server**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'cat >> /etc/cron.d/bbqexperience-agents << "CRON"
# BBQ Experience AI Agents
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
STRAPI_URL=https://cms.bbq-experience.com
STRAPI_API_TOKEN=60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9
TELEGRAM_BOT_TOKEN=SET_ME
TELEGRAM_CHAT_ID=SET_ME

0 5 * * 1 root cd /opt/services/bbqexperience/app && python3 scripts/agents/keyword_scout.py >> /opt/webhooks/logs/keyword-scout.log 2>&1
0 9,15 * * * root cd /opt/services/bbqexperience/app && python3 scripts/agents/seo_optimizer.py >> /opt/webhooks/logs/seo-optimizer.log 2>&1
0 */12 * * * root cd /opt/services/bbqexperience/app && python3 scripts/agents/competitor_monitor.py >> /opt/webhooks/logs/competitor-monitor.log 2>&1
0 8 * * 1 root cd /opt/services/bbqexperience/app && python3 scripts/agents/partnership_outreach.py >> /opt/webhooks/logs/partnership-outreach.log 2>&1
CRON'
```

- [ ] **Step 7: Setup and start Telegram bot**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'cp /opt/services/bbqexperience/app/scripts/agents/bbqexperience-telegram.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable bbqexperience-telegram && systemctl start bbqexperience-telegram && systemctl status bbqexperience-telegram'
```

- [ ] **Step 8: Verify Telegram bot responds**

Send `/stats` al bot Telegram di BBQ Experience. Deve rispondere con il report.

---

### Summary

After completing this plan:
- 10 initial Brand entries seeded for partnership outreach
- 7 initial ContentQueue entries seeded for first week of AI generation
- `state/` directory created on server for agent state files
- Google Search Console API setup documented
- All agents deployed to server with cron configuration
- Telegram bot running as systemd daemon
- System ready for autonomous operation
