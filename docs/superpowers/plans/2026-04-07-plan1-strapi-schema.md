# Plan 1: Strapi Schema — New Content Types & Modifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new Strapi content types (Brand, Partnership, KeywordTracker, ContentQueue) and modify 2 existing ones (Product, EditorialCalendar) to support AI agents, SEO tracking, and partnership pipeline.

**Architecture:** Each content type gets its own API directory under `cms/src/api/` with schema.json, route, controller, and service — standard Strapi 5 factory pattern. TypeScript types updated in `web/src/lib/types.ts`. ContentType union extended in the same file.

**Tech Stack:** Strapi 5.41.1, PostgreSQL 16, TypeScript

**Dependencies:** None — this plan is the dependency for Plans 2-4.

---

### Task 1: Create `Brand` Content Type

**Files:**
- Create: `cms/src/api/brand/content-types/brand/schema.json`
- Create: `cms/src/api/brand/routes/brand.ts`
- Create: `cms/src/api/brand/controllers/brand.ts`
- Create: `cms/src/api/brand/services/brand.ts`

- [ ] **Step 1: Create schema.json**

```bash
mkdir -p cms/src/api/brand/content-types/brand
mkdir -p cms/src/api/brand/routes
mkdir -p cms/src/api/brand/controllers
mkdir -p cms/src/api/brand/services
```

Write `cms/src/api/brand/content-types/brand/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "brands",
  "info": {
    "singularName": "brand",
    "pluralName": "brands",
    "displayName": "Brand",
    "description": "Brand BBQ per pipeline partnership e affiliate"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "website": {
      "type": "string"
    },
    "contact_email": {
      "type": "string"
    },
    "category": {
      "type": "enumeration",
      "enum": ["grill_manufacturer", "accessory_brand", "thermometer", "fuel", "sauce_rub", "other"],
      "default": "other"
    },
    "partnership_status": {
      "type": "enumeration",
      "enum": ["to_contact", "contacted", "negotiating", "active", "declined", "expired"],
      "default": "to_contact"
    },
    "affiliate_program_url": {
      "type": "string"
    },
    "commission_rate": {
      "type": "decimal"
    },
    "notes": {
      "type": "richtext"
    }
  }
}
```

- [ ] **Step 2: Create route, controller, service**

Write `cms/src/api/brand/routes/brand.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::brand.brand');
```

Write `cms/src/api/brand/controllers/brand.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::brand.brand');
```

Write `cms/src/api/brand/services/brand.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::brand.brand');
```

- [ ] **Step 3: Verify by restarting Strapi**

```bash
cd cms && npm run build
```

Expected: Build completes without errors. Brand content type appears in Strapi admin panel.

- [ ] **Step 4: Commit**

```bash
git add cms/src/api/brand/
git commit -m "feat(cms): add Brand content type for partnership pipeline"
```

---

### Task 2: Create `Partnership` Content Type

**Files:**
- Create: `cms/src/api/partnership/content-types/partnership/schema.json`
- Create: `cms/src/api/partnership/routes/partnership.ts`
- Create: `cms/src/api/partnership/controllers/partnership.ts`
- Create: `cms/src/api/partnership/services/partnership.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p cms/src/api/partnership/content-types/partnership
mkdir -p cms/src/api/partnership/routes
mkdir -p cms/src/api/partnership/controllers
mkdir -p cms/src/api/partnership/services
```

- [ ] **Step 2: Write schema.json**

Write `cms/src/api/partnership/content-types/partnership/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "partnerships",
  "info": {
    "singularName": "partnership",
    "pluralName": "partnerships",
    "displayName": "Partnership",
    "description": "Tracking outreach e accordi con brand BBQ"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "brand": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::brand.brand"
    },
    "status": {
      "type": "enumeration",
      "enum": ["outreach", "follow_up_1", "follow_up_2", "negotiating", "agreement", "product_received", "review_published", "completed", "declined"],
      "default": "outreach",
      "required": true
    },
    "contact_date": {
      "type": "date",
      "required": true
    },
    "last_follow_up": {
      "type": "date"
    },
    "products_received": {
      "type": "json"
    },
    "agreement_terms": {
      "type": "richtext"
    },
    "email_draft": {
      "type": "richtext"
    },
    "notes": {
      "type": "richtext"
    }
  }
}
```

- [ ] **Step 3: Write route, controller, service**

Write `cms/src/api/partnership/routes/partnership.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::partnership.partnership');
```

Write `cms/src/api/partnership/controllers/partnership.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::partnership.partnership');
```

Write `cms/src/api/partnership/services/partnership.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::partnership.partnership');
```

- [ ] **Step 4: Commit**

```bash
git add cms/src/api/partnership/
git commit -m "feat(cms): add Partnership content type for outreach tracking"
```

---

### Task 3: Create `KeywordTracker` Content Type

**Files:**
- Create: `cms/src/api/keyword-tracker/content-types/keyword-tracker/schema.json`
- Create: `cms/src/api/keyword-tracker/routes/keyword-tracker.ts`
- Create: `cms/src/api/keyword-tracker/controllers/keyword-tracker.ts`
- Create: `cms/src/api/keyword-tracker/services/keyword-tracker.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p cms/src/api/keyword-tracker/content-types/keyword-tracker
mkdir -p cms/src/api/keyword-tracker/routes
mkdir -p cms/src/api/keyword-tracker/controllers
mkdir -p cms/src/api/keyword-tracker/services
```

- [ ] **Step 2: Write schema.json**

Write `cms/src/api/keyword-tracker/content-types/keyword-tracker/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "keyword_trackers",
  "info": {
    "singularName": "keyword-tracker",
    "pluralName": "keyword-trackers",
    "displayName": "Keyword Tracker",
    "description": "Monitoraggio posizione keyword per SEO"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "keyword": {
      "type": "string",
      "required": true
    },
    "locale": {
      "type": "enumeration",
      "enum": ["en", "it", "es"],
      "default": "en",
      "required": true
    },
    "cluster": {
      "type": "enumeration",
      "enum": ["smoking", "grills", "thermometers", "brisket", "sauces", "uncategorized"],
      "default": "uncategorized"
    },
    "position": {
      "type": "decimal"
    },
    "impressions": {
      "type": "integer",
      "default": 0
    },
    "clicks": {
      "type": "integer",
      "default": 0
    },
    "ctr": {
      "type": "decimal"
    },
    "last_checked": {
      "type": "datetime"
    },
    "trend": {
      "type": "enumeration",
      "enum": ["rising", "stable", "falling"],
      "default": "stable"
    },
    "is_low_hanging": {
      "type": "boolean",
      "default": false
    }
  }
}
```

- [ ] **Step 3: Write route, controller, service**

Write `cms/src/api/keyword-tracker/routes/keyword-tracker.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::keyword-tracker.keyword-tracker');
```

Write `cms/src/api/keyword-tracker/controllers/keyword-tracker.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::keyword-tracker.keyword-tracker');
```

Write `cms/src/api/keyword-tracker/services/keyword-tracker.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::keyword-tracker.keyword-tracker');
```

- [ ] **Step 4: Commit**

```bash
git add cms/src/api/keyword-tracker/
git commit -m "feat(cms): add KeywordTracker content type for SEO monitoring"
```

---

### Task 4: Create `ContentQueue` Content Type

**Files:**
- Create: `cms/src/api/content-queue/content-types/content-queue/schema.json`
- Create: `cms/src/api/content-queue/routes/content-queue.ts`
- Create: `cms/src/api/content-queue/controllers/content-queue.ts`
- Create: `cms/src/api/content-queue/services/content-queue.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p cms/src/api/content-queue/content-types/content-queue
mkdir -p cms/src/api/content-queue/routes
mkdir -p cms/src/api/content-queue/controllers
mkdir -p cms/src/api/content-queue/services
```

- [ ] **Step 2: Write schema.json**

Write `cms/src/api/content-queue/content-types/content-queue/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "content_queues",
  "info": {
    "singularName": "content-queue",
    "pluralName": "content-queues",
    "displayName": "Content Queue",
    "description": "Coda articoli generati da AI per pubblicazione automatica"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "content_type": {
      "type": "enumeration",
      "enum": ["blog", "tutorial", "recipe", "review", "comparison"],
      "required": true
    },
    "body_en": {
      "type": "richtext"
    },
    "body_it": {
      "type": "richtext"
    },
    "body_es": {
      "type": "richtext"
    },
    "status": {
      "type": "enumeration",
      "enum": ["idea", "research", "ready", "generating", "published", "failed"],
      "default": "idea",
      "required": true
    },
    "scheduled_date": {
      "type": "date"
    },
    "cluster": {
      "type": "enumeration",
      "enum": ["smoking", "grills", "thermometers", "brisket", "sauces", "uncategorized"],
      "default": "uncategorized"
    },
    "target_keyword": {
      "type": "string"
    },
    "search_volume": {
      "type": "integer"
    },
    "difficulty": {
      "type": "enumeration",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "priority": {
      "type": "integer",
      "default": 5
    },
    "ai_generated": {
      "type": "boolean",
      "default": true
    },
    "published_content_id": {
      "type": "string"
    },
    "generation_log": {
      "type": "text"
    }
  }
}
```

- [ ] **Step 3: Write route, controller, service**

Write `cms/src/api/content-queue/routes/content-queue.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::content-queue.content-queue');
```

Write `cms/src/api/content-queue/controllers/content-queue.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::content-queue.content-queue');
```

Write `cms/src/api/content-queue/services/content-queue.ts`:
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::content-queue.content-queue');
```

- [ ] **Step 4: Commit**

```bash
git add cms/src/api/content-queue/
git commit -m "feat(cms): add ContentQueue content type for AI publishing pipeline"
```

---

### Task 5: Modify `Product` Content Type

**Files:**
- Modify: `cms/src/api/product/content-types/product/schema.json`

- [ ] **Step 1: Add new fields to Product schema**

Open `cms/src/api/product/content-types/product/schema.json` and add these attributes after `affiliate_url`:

```json
"affiliate_links": {
  "type": "json"
},
"partnership_status": {
  "type": "enumeration",
  "enum": ["none", "contacted", "active", "expired"],
  "default": "none"
},
"brand_relation": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::brand.brand"
}
```

The `affiliate_links` JSON field stores an array of objects:
```json
[
  { "retailer": "Amazon", "url": "https://...", "commission_rate": 3.5 },
  { "retailer": "ThermoWorks Direct", "url": "https://...", "commission_rate": 8.0 }
]
```

Note: `brand_relation` is separate from the existing `brand` string field to avoid breaking existing content. The string field keeps backward compatibility with existing 25 products.

- [ ] **Step 2: Commit**

```bash
git add cms/src/api/product/content-types/product/schema.json
git commit -m "feat(cms): add affiliate_links, partnership_status, brand_relation to Product"
```

---

### Task 6: Modify `EditorialCalendar` Content Type

**Files:**
- Modify: `cms/src/api/editorial-calendar/content-types/editorial-calendar/schema.json`

- [ ] **Step 1: Add new fields to EditorialCalendar schema**

Open `cms/src/api/editorial-calendar/content-types/editorial-calendar/schema.json` and add these attributes after `notes`:

```json
"cluster": {
  "type": "enumeration",
  "enum": ["smoking", "grills", "thermometers", "brisket", "sauces", "uncategorized"],
  "default": "uncategorized"
},
"search_volume": {
  "type": "integer"
},
"keyword_difficulty": {
  "type": "enumeration",
  "enum": ["low", "medium", "high"],
  "default": "medium"
},
"ai_generated": {
  "type": "boolean",
  "default": false
},
"source_agent": {
  "type": "string"
}
```

- [ ] **Step 2: Commit**

```bash
git add cms/src/api/editorial-calendar/content-types/editorial-calendar/schema.json
git commit -m "feat(cms): add cluster, search_volume, ai_generated fields to EditorialCalendar"
```

---

### Task 7: Update TypeScript Types in Frontend

**Files:**
- Modify: `web/src/lib/types.ts`

- [ ] **Step 1: Add new types and extend ContentType union**

Add to the `ContentType` union in `web/src/lib/types.ts`:

```typescript
export type ContentType =
  | 'reviews'
  | 'recipes'
  | 'tutorials'
  | 'blog-posts'
  | 'products'
  | 'instagram-posts'
  | 'brands'
  | 'partnerships'
  | 'keyword-trackers'
  | 'content-queues';
```

Add these interfaces after the existing types (before the end of file):

```typescript
/** Link affiliato con retailer e commission rate */
export interface AffiliateLink {
  retailer: string;
  url: string;
  commission_rate: number;
}

/** Brand BBQ per pipeline partnership */
export interface StrapiBrand {
  name: string;
  website: string | null;
  contact_email: string | null;
  category: 'grill_manufacturer' | 'accessory_brand' | 'thermometer' | 'fuel' | 'sauce_rub' | 'other' | null;
  partnership_status: 'to_contact' | 'contacted' | 'negotiating' | 'active' | 'declined' | 'expired';
  affiliate_program_url: string | null;
  commission_rate: number | null;
  notes: string | null;
}

/** Tracking outreach e accordi con brand */
export interface StrapiPartnership {
  brand: (StrapiBrand & StrapiEntity) | null;
  status: 'outreach' | 'follow_up_1' | 'follow_up_2' | 'negotiating' | 'agreement' | 'product_received' | 'review_published' | 'completed' | 'declined';
  contact_date: string;
  last_follow_up: string | null;
  products_received: Array<{ name: string; date: string }> | null;
  agreement_terms: string | null;
  email_draft: string | null;
  notes: string | null;
}

/** Keyword SEO monitorata */
export interface StrapiKeywordTracker {
  keyword: string;
  locale: 'en' | 'it' | 'es';
  cluster: 'smoking' | 'grills' | 'thermometers' | 'brisket' | 'sauces' | 'uncategorized';
  position: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  last_checked: string | null;
  trend: 'rising' | 'stable' | 'falling';
  is_low_hanging: boolean;
}

/** Articolo in coda per pubblicazione AI */
export interface StrapiContentQueue {
  title: string;
  content_type: 'blog' | 'tutorial' | 'recipe' | 'review' | 'comparison';
  body_en: string | null;
  body_it: string | null;
  body_es: string | null;
  status: 'idea' | 'research' | 'ready' | 'generating' | 'published' | 'failed';
  scheduled_date: string | null;
  cluster: 'smoking' | 'grills' | 'thermometers' | 'brisket' | 'sauces' | 'uncategorized';
  target_keyword: string | null;
  search_volume: number | null;
  difficulty: 'low' | 'medium' | 'high' | null;
  priority: number;
  ai_generated: boolean;
  published_content_id: string | null;
  generation_log: string | null;
}
```

Also update `StrapiProduct` to include new fields:

```typescript
export interface StrapiProduct {
  name: string;
  slug: string;
  brand: string | null;
  category: 'grill' | 'smoker' | 'accessory' | 'fuel' | 'thermometer' | 'other' | null;
  price_range: 'budget' | 'mid-range' | 'premium' | 'luxury' | null;
  description: string | null;
  specifications: Record<string, unknown> | null;
  images: StrapiMedia[] | null;
  affiliate_url: string | null;
  affiliate_links: AffiliateLink[] | null;
  partnership_status: 'none' | 'contacted' | 'active' | 'expired' | null;
  brand_relation: (StrapiBrand & StrapiEntity) | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx astro check 2>&1 | head -20
```

Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat(web): add TypeScript types for Brand, Partnership, KeywordTracker, ContentQueue"
```

---

### Task 8: Build and Deploy CMS

- [ ] **Step 1: Build CMS locally to verify**

```bash
cd cms && npm run build
```

Expected: Build succeeds. All 12 content types (8 existing + 4 new) registered.

- [ ] **Step 2: Push to trigger deploy**

```bash
git push origin main
```

- [ ] **Step 3: Verify deploy on server**

```bash
ssh -i "C:/Users/Matteo/Desktop/Progetti/Hetzner Server/hetzner_production" -o StrictHostKeyChecking=no root@204.168.153.43 'tail -20 /opt/webhooks/logs/bbqexperience.log'
```

- [ ] **Step 4: Verify new content types in Strapi admin**

Open https://cms.bbq-experience.com/admin and verify:
- Brand, Partnership, Keyword Tracker, Content Queue appear in sidebar
- Product has new fields (affiliate_links, partnership_status, brand_relation)
- Editorial Calendar has new fields (cluster, search_volume, keyword_difficulty, ai_generated, source_agent)

- [ ] **Step 5: Configure API permissions**

In Strapi admin → Settings → Users & Permissions → Roles → Public:
- Enable `find` and `findOne` for: Brand, Partnership, Keyword Tracker, Content Queue
- Keep `create`, `update`, `delete` disabled for public (only API token access)

In Strapi admin → Settings → API Tokens:
- Verify existing full-access token still works with new content types

---

### Summary

After completing this plan:
- 4 new Strapi content types: Brand, Partnership, KeywordTracker, ContentQueue
- 2 modified content types: Product (affiliate_links, partnership_status, brand_relation), EditorialCalendar (cluster, search_volume, keyword_difficulty, ai_generated, source_agent)
- TypeScript types updated in frontend
- Total content types: 12 (8 existing + 4 new)
- Ready for Plan 2 (AI Agents) to start reading/writing these content types via REST API
