import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@huiskamer-show/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  build: {
    target: ['es2020', 'chrome87'],
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Roos-opnames en vraag-afbeeldingen komen ook van de server; zonder deze regels krijgt de
      // browser in ontwikkelmodus de opname niet en valt de show terug op de computerstem.
      '/tts': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/qart': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
