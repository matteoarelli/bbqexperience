import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://bbq-experience.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    svelte(),
  ],
  image: {
    domains: ['localhost', 'cms.bbq-experience.com'],
  },
  build: {
    // Inline TUTTI gli stylesheet scoped emessi per-componente direttamente nell'HTML.
    // Risolve `render-blocking-insight` Lighthouse: il chunk Footer.css (~56 KB minified
    // gzipped, contiene scoped styles di Footer + CookieBanner + MobileMenuPanel + altri)
    // veniva caricato come `<link rel="stylesheet">` render-blocking nell'<head>.
    // Inlinandolo nell'HTML eliminiamo una roundtrip CSS critical e migliora LCP/FCP
    // su mobile throttled. L'HTML cresce ma è gzip-comprimibile e cacheable lato CDN.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'it', 'es'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
