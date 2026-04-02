import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://bbqexperience.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', it: 'it', es: 'es' },
      },
    }),
    svelte(),
  ],
  image: {
    domains: ['localhost', 'cms.bbqexperience.com'],
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'it', 'es'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
