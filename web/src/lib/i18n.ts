// Utilita per internazionalizzazione — BBQ Experience
import type { TranslationKey } from '@i18n/types';
export const defaultLocale = 'en' as const;
export const locales = ['en', 'it', 'es'] as const;
export type Locale = typeof locales[number];

// Mappa dei nomi localizzati delle lingue (per il language switcher)
export const localeNames: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
  es: 'Espanol',
};

// Mappa delle route localizzate (slug tradotti per SEO)
export const localizedRoutes: Record<string, Record<Locale, string>> = {
  reviews: { en: 'reviews', it: 'recensioni', es: 'resenas' },
  recipes: { en: 'recipes', it: 'ricette', es: 'recetas' },
  tutorials: { en: 'tutorials', it: 'guide', es: 'tutoriales' },
  blog: { en: 'blog', it: 'blog', es: 'blog' },
  about: { en: 'about', it: 'chi-siamo', es: 'sobre-nosotros' },
  compare: { en: 'compare', it: 'confronta', es: 'comparar' },
  privacy: { en: 'privacy', it: 'privacy', es: 'privacy' },
  terms: { en: 'terms', it: 'terms', es: 'terms' },
  contact: { en: 'contact', it: 'contatti', es: 'contacto' },
  bookmarks: { en: 'bookmarks', it: 'preferiti', es: 'favoritos' },
  newsletter: { en: 'newsletter', it: 'newsletter', es: 'newsletter' },
  // Sotto-segmenti (es. /reviews/category/<cat>/, /recipes/difficulty/<level>/)
  category: { en: 'category', it: 'categoria', es: 'categoria' },
  difficulty: { en: 'difficulty', it: 'difficolta', es: 'dificultad' },
};

/**
 * Estrae la locale corrente dall'URL path
 */
export function getLocaleFromPath(path: string): Locale {
  const segment = path.split('/').filter(Boolean)[0];
  if (locales.includes(segment as Locale)) {
    return segment as Locale;
  }
  return defaultLocale;
}

/**
 * Mappa inversa: dato un segmento localizzato, trova la route key corrispondente.
 * Es. "recensioni" -> "reviews", "guide" -> "tutorials"
 */
function findRouteKey(segment: string, sourceLocale: Locale): string | null {
  for (const [key, translations] of Object.entries(localizedRoutes)) {
    if (translations[sourceLocale] === segment) {
      return key;
    }
  }
  return null;
}

/**
 * Genera un path localizzato per la stessa pagina in un'altra lingua.
 * Traduce anche i segmenti di route (es. "recensioni" -> "reviews").
 */
export function getLocalizedPath(currentPath: string, targetLocale: Locale): string {
  const segments = currentPath.split('/').filter(Boolean);
  const currentLocale = segments[0] as Locale;

  if (locales.includes(currentLocale)) {
    segments[0] = targetLocale;

    // Traduci il segmento di route principale (indice 1) e gli eventuali
    // sotto-segmenti tassonomici (es. category, difficulty) all'indice 2.
    // I segmenti dinamici (slug, valori param) vengono lasciati invariati.
    for (let i = 1; i < segments.length; i++) {
      const routeKey = findRouteKey(segments[i], currentLocale);
      if (routeKey && localizedRoutes[routeKey]?.[targetLocale]) {
        segments[i] = localizedRoutes[routeKey][targetLocale];
      }
    }
  } else {
    segments.unshift(targetLocale);
  }

  return '/' + segments.join('/') + '/';
}

/**
 * Carica le traduzioni per una locale e restituisce l'oggetto traduzioni
 */
export async function loadTranslations(locale: Locale): Promise<Record<string, any>> {
  const translations = await import(`../i18n/${locale}.json`);
  return translations.default;
}

/**
 * Accede a un valore di traduzione tramite dot notation (e.g., "nav.home")
 */
export function getTranslation(translations: Record<string, any>, key: TranslationKey): string {
  const keys = key.split('.');
  let value: any = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return typeof value === 'string' ? value : key;
}
