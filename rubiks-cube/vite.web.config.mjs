// Vite config for the website build (no Electron).
//   npm run dev:web     local dev server
//   npm run build:web   static site in dist-web/
import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // relative asset paths, so the site works from any folder (e.g. GitHub Pages)
    build: {
        outDir: 'dist-web',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000 // three.js alone is ~600 kB
    }
});
