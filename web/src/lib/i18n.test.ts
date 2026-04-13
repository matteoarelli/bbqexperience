import { describe, it, expect } from 'vitest';
import {
  getLocaleFromPath,
  getLocalizedPath,
  getTranslation,
  locales,
  defaultLocale,
} from './i18n';

describe('getLocaleFromPath', () => {
  it('estrae en da /en/', () => {
    expect(getLocaleFromPath('/en/')).toBe('en');
  });

  it('estrae it da /it/recensioni/', () => {
    expect(getLocaleFromPath('/it/recensioni/')).toBe('it');
  });

  it('estrae es da /es/recetas/slug/', () => {
    expect(getLocaleFromPath('/es/recetas/slug/')).toBe('es');
  });

  it('ritorna defaultLocale per path senza locale', () => {
    expect(getLocaleFromPath('/unknown/')).toBe(defaultLocale);
  });

  it('ritorna defaultLocale per path vuoto', () => {
    expect(getLocaleFromPath('/')).toBe(defaultLocale);
  });
});

describe('getLocalizedPath', () => {
  it('traduce /en/reviews/ in /it/recensioni/', () => {
    expect(getLocalizedPath('/en/reviews/', 'it')).toBe('/it/recensioni/');
  });

  it('traduce /it/ricette/ in /es/recetas/', () => {
    expect(getLocalizedPath('/it/ricette/', 'es')).toBe('/es/recetas/');
  });

  it('traduce /en/tutorials/ in /it/guide/', () => {
    expect(getLocalizedPath('/en/tutorials/', 'it')).toBe('/it/guide/');
  });

  it('preserva slug di contenuto dopo il segmento di route', () => {
    expect(getLocalizedPath('/en/reviews/weber-kettle/', 'it')).toBe('/it/recensioni/weber-kettle/');
  });

  it('gestisce homepage senza segmento di route', () => {
    expect(getLocalizedPath('/en/', 'es')).toBe('/es/');
  });

  it('traduce sotto-segmento category in /en/reviews/category/grills/', () => {
    expect(getLocalizedPath('/en/reviews/category/grills/', 'it')).toBe('/it/recensioni/categoria/grills/');
  });

  it('traduce sotto-segmento difficulty in /en/recipes/difficulty/easy/', () => {
    expect(getLocalizedPath('/en/recipes/difficulty/easy/', 'es')).toBe('/es/recetas/dificultad/easy/');
  });

  it('non confonde slug dinamico contenente parole tradotte (es. "category-of-burgers")', () => {
    expect(getLocalizedPath('/en/recipes/category-of-burgers/', 'it')).toBe('/it/ricette/category-of-burgers/');
  });
});

describe('getTranslation', () => {
  const translations = {
    nav: { home: 'Home', reviews: 'Reviews' },
    common: { loading: 'Loading...' },
  };

  it('risolve dot notation semplice', () => {
    expect(getTranslation(translations, 'nav.home')).toBe('Home');
  });

  it('risolve chiave annidata', () => {
    expect(getTranslation(translations, 'common.loading')).toBe('Loading...');
  });

  it('ritorna la chiave stessa se non trovata', () => {
    expect(getTranslation(translations, 'nonexistent.key')).toBe('nonexistent.key');
  });
});
