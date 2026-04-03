import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(__dirname, 'src/lib'),
      '@i18n': resolve(__dirname, 'src/i18n'),
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
