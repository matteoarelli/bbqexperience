// Tipi TypeScript per tutti i content type di Strapi — BBQ Experience
import type { Locale } from './i18n';

// ─── Tipo unione per i content type Strapi ───────────────────────────────────
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
  | 'content-queues'
  | 'product-categories'
  | 'recipe-collections';

// ─── Media ───────────────────────────────────────────────────────────────────

/** Formato immagine restituito da Strapi (thumbnail, small, medium, large) */
export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
}

/** Oggetto media di Strapi (immagini, video) */
export interface StrapiMedia {
  id: number;
  name: string;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  } | null;
}

// ─── Wrapper risposte API ────────────────────────────────────────────────────

/** Campi base presenti su ogni entita Strapi */
export interface StrapiEntity {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  locale: string;
}

/** Risposta API per singola entita */
export interface StrapiResponse<T> {
  data: T & StrapiEntity;
}

/** Risposta API per collezione con paginazione */
export interface StrapiCollectionResponse<T> {
  data: Array<T & StrapiEntity>;
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// ─── Content Types ───────────────────────────────────────────────────────────

/** Categoria prodotto BBQ (relazione da Strapi) */
export interface StrapiProductCategory {
  name: string;
  slug: string;
  description: string | null;
}

/** Prodotto BBQ: griglie, affumicatori, accessori */
export interface StrapiProduct {
  name: string;
  slug: string;
  product_category: (StrapiProductCategory & StrapiEntity) | null;
  price: number | null;
  description: string | null;
  specifications: Record<string, unknown> | null;
  images: StrapiMedia[] | null;
  affiliate_url: string | null;
  affiliate_links: AffiliateLink[] | null;
  partnership_status: 'none' | 'contacted' | 'active' | 'expired' | null;
  brand_relation: (StrapiBrand & StrapiEntity) | null;
}

/** Raccolta tematica di ricette BBQ */
export interface StrapiRecipeCollection {
  title: string;
  slug: string;
  description: string | null;
  editorial_intro: string | null;
  author_note: string | null;
  hero_image: StrapiMedia | null;
  order: number;
  recipes: (StrapiRecipe & StrapiEntity)[] | null;
  localizations?: { locale: string; publishedAt: string | null; slug: string }[];
}

/** Recensione approfondita con punteggi per categoria */
export interface StrapiReview {
  title: string;
  slug: string;
  excerpt: string | null;
  editorial_content: string | null;
  verdict: string | null;
  score_overall: number;
  score_build_quality: number | null;
  score_performance: number | null;
  score_value: number | null;
  score_ease_of_use: number | null;
  pros: string[] | null;
  cons: string[] | null;
  product: (StrapiProduct & StrapiEntity) | null;
  gallery: StrapiMedia[] | null;
  seo_title: string | null;
  seo_description: string | null;
  published_date: string | null;
}

/** Ingrediente di una ricetta */
export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

/** Singolo passo di una ricetta */
export interface RecipeInstruction {
  step: number;
  text?: string;
  detail?: string;
  title?: string;
  description?: string;
  image?: StrapiMedia;
}

/** Ricetta BBQ con istruzioni passo-passo */
export interface StrapiRecipe {
  title: string;
  slug: string;
  excerpt: string | null;
  editorial_intro: string | null;
  ingredients: RecipeIngredient[] | null;
  instructions: RecipeInstruction[] | null;
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | null;
  meat_type: 'beef' | 'pork' | 'chicken' | 'lamb' | 'fish' | 'vegetarian' | 'mixed' | null;
  technique: 'grilling' | 'smoking' | 'roasting' | 'braising' | 'other' | null;
  cover_image: StrapiMedia | null;
  gallery: StrapiMedia[] | null;
  seo_title: string | null;
  seo_description: string | null;
  published_date: string | null;
}

/** Tutorial/guida su tecniche BBQ, attrezzatura e sicurezza */
export interface StrapiTutorial {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: 'technique' | 'equipment' | 'knowledge' | 'safety' | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  reading_time: number | null;
  cover_image: StrapiMedia | null;
  seo_title: string | null;
  seo_description: string | null;
  published_date: string | null;
}

/** Articolo del blog su novita, eventi e tendenze BBQ */
export interface StrapiBlogPost {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: 'news' | 'events' | 'trends' | 'tips' | 'culture' | null;
  reading_time: number | null;
  cover_image: StrapiMedia | null;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_date: string | null;
}

/** Post Instagram cachato in Strapi (non localizzato) */
export interface StrapiInstagramPost {
  instagram_id: string;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | null;
  timestamp: string | null;
  cached_image: StrapiMedia | null;
  curated: boolean;
}

/** Link affiliato con retailer e commission rate */
export interface AffiliateLink {
  retailer: string;
  url: string;
  commission_rate: number;
}

/** Brand BBQ per pipeline partnership */
export interface StrapiBrand {
  name: string;
  slug: string;
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
  status: 'idea' | 'research' | 'ready' | 'generating' | 'draft_review' | 'published' | 'failed';
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
