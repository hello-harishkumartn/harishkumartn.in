import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// BASE_PATH lets the same build work on a custom domain ("/") or on
// GitHub Pages project URLs ("/repo-name/"). See README.md.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      // Two pages: the 3D home page and the lightweight /social/ feed page.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        social: fileURLToPath(new URL('./social/index.html', import.meta.url)),
      },
    },
  },
});
