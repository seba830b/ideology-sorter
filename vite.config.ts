import { defineConfig } from 'vite';

// base is set at build time for GitHub Pages project sites (/<repo>/).
export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
  build: { target: 'es2022', outDir: 'dist' },
});
