// Utilita SEO testabili — logica estratta da SEOHead.astro per unit testing
// Le stesse funzioni vengono usate nel componente Astro in produzione

/**
 * Genera il contenuto del meta tag robots.
 * Pagine filtrate usano noindex per evitare contenuto duplicato negli indici.
 */
export function getRobotsContent(noindex: boolean): string {
  return noindex ? 'noindex, follow' : 'index, follow';
}

/**
 * Genera l'URL canonico completo per una pagina.
 * Se canonicalQuery e presente, viene aggiunto come query string.
 */
export function getCanonicalUrl(siteUrl: string, canonicalPath: string, canonicalQuery?: string): string {
  const base = `${siteUrl}${canonicalPath}`;
  return canonicalQuery ? `${base}?${canonicalQuery}` : base;
}
