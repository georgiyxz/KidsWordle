import { defineConfig } from 'vite';

// base: './' keeps every asset path relative so the build drops cleanly into a
// Funbrain CDN sub-path inside an iframe. No SSR, no hydration, single folder out.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
  },
});
