import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3002
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
