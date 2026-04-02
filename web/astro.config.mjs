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
