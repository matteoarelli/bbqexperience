// Utilita per internazionalizzazione — BBQ Experience
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
 * Genera un path localizzato per la stessa pagina in un'altra lingua
 */
export function getLocalizedPath(currentPath: string, targetLocale: Locale): string {
  const segments = currentPath.split('/').filter(Boolean);
  const currentLocale = segments[0] as Locale;

  if (locales.includes(currentLocale)) {
    segments[0] = targetLocale;
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
export function getTranslation(translations: Record<string, any>, key: string): string {
  const keys = key.split('.');
  let value: any = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return typeof value === 'string' ? value : key;
}
