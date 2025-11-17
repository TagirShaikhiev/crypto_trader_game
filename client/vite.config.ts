import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Контроллер
        host: resolve(__dirname, 'host.html'),  // Игра
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173
  }
});