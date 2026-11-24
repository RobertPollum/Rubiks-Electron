// Vite config for the Electron renderer build. Electron Forge's Vite plugin
// supplies the Electron-specific defaults; add overrides here.
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 1000 // three.js alone is ~600 kB
    }
});
