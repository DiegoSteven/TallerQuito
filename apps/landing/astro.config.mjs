import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// Sitio estático: se publica gratis en Cloudflare Pages (carpeta dist/).
export default defineConfig({
  site: 'https://tecnicentrosanchez.com',
  vite: {
    resolve: {
      alias: {
        '@taller/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      },
    },
  },
});
