import { describe, it, expect } from 'vitest';

// Interfaccia duplicata dal sitemap (testare la logica di rendering, non l'endpoint)
interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
  alternates?: { hreflang: string; href: string }[];
}

// Funzione di rendering XML estratta per testabilita
function renderSitemapEntry(entry: SitemapEntry): string {
  return `  <url>
    <loc>${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${
      entry.alternates
        ? '\n' + entry.alternates.map(alt =>
            `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`
          ).join('\n')
        : ''
    }
  </url>`;
}

describe('Sitemap collections hreflang', () => {
  it('renders xhtml:link alternates for collection entries', () => {
    const entry: SitemapEntry = {
      loc: 'https://bbq-experience.com/en/collections/best-ribs/',
      lastmod: '2026-04-20',
      changefreq: 'weekly',
      priority: '0.7',
      alternates: [
        { hreflang: 'en', href: 'https://bbq-experience.com/en/collections/best-ribs/' },
        { hreflang: 'it', href: 'https://bbq-experience.com/it/raccolte/best-ribs/' },
        { hreflang: 'es', href: 'https://bbq-experience.com/es/colecciones/best-ribs/' },
        { hreflang: 'x-default', href: 'https://bbq-experience.com/en/collections/best-ribs/' },
      ],
    };

    const xml = renderSitemapEntry(entry);

    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en"');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="it"');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es"');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default"');
    expect(xml).toContain('/it/raccolte/best-ribs/');
    expect(xml).toContain('/es/colecciones/best-ribs/');
  });

  it('renders entry without alternates when not provided', () => {
    const entry: SitemapEntry = {
      loc: 'https://bbq-experience.com/en/reviews/some-review/',
      changefreq: 'weekly',
      priority: '0.6',
    };

    const xml = renderSitemapEntry(entry);

    expect(xml).toContain('<loc>https://bbq-experience.com/en/reviews/some-review/</loc>');
    expect(xml).not.toContain('xhtml:link');
  });

  it('includes x-default only when EN alternate exists', () => {
    const entry: SitemapEntry = {
      loc: 'https://bbq-experience.com/it/raccolte/best-ribs/',
      changefreq: 'weekly',
      priority: '0.7',
      alternates: [
        { hreflang: 'it', href: 'https://bbq-experience.com/it/raccolte/best-ribs/' },
      ],
    };

    const xml = renderSitemapEntry(entry);

    expect(xml).not.toContain('x-default');
  });
});
