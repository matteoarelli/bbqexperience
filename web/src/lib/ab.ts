// Libreria A/B testing — assegnazione variante deterministica e rilevamento bot
import { nanoid } from 'nanoid';

// Pattern User-Agent per bot/crawler noti
const BOT_UA_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /ia_archiver/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /petalbot/i, /gptbot/i, /claudebot/i, /twitterbot/i,
];

/** Controlla se lo User-Agent corrisponde a un bot/crawler noto. */
export function isBot(userAgent: string): boolean {
  return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Assegnazione deterministica variante basata su hash FNV-1a di ab_id + postDocumentId.
 * Garantisce che lo stesso utente veda sempre la stessa variante per lo stesso post.
 * Restituisce un indice 0-based: 0 = control, 1 = variant_a, 2 = variant_b, etc.
 */
export function assignVariant(abId: string, postDocId: string, variantCount: number): number {
  let hash = 2166136261;
  const input = `${abId}:${postDocId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % variantCount;
}

/** Genera un nuovo ab_id usando nanoid (21 caratteri, URL-safe). */
export function generateAbId(): string {
  return nanoid();
}

/** Nomi variante per indice. 0=control (titolo originale), 1=a, 2=b, 3=c. */
export const VARIANT_NAMES = ['control', 'a', 'b', 'c'] as const;
export type VariantName = typeof VARIANT_NAMES[number];
