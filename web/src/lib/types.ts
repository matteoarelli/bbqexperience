// Tipi TypeScript per tutti i content type di Strapi — BBQ Experience
import type { Locale } from './i18n';

// ─── Tipo unione per i content type Strapi ───────────────────────────────────
export type ContentType =
  | 'reviews'
  | 'recipes'
  | 'tutorials'
  | 'blog-posts'
  | 'products'
  | 'instagram-posts';

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

/** Prodotto BBQ: griglie, affumicatori, accessori */
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
