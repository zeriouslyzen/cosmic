import { defineConfig } from 'vite';
import { cosmicApiPlugin } from './vite-api-plugin.js';

export default defineConfig({
  plugins: [cosmicApiPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});


