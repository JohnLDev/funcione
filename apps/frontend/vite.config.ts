import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cloudflare } from "@cloudflare/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  envDir: monorepoRoot,
  plugins: [react(), tailwindcss(), VitePWA({
    includeAssets: [
      'icons/funcione-milex-app-icon-48.png',
      'icons/funcione-milex-app-icon-180.png',
      'icons/funcione-milex-app-icon-1024.png',
      'icons/funcione-milex-app-icon.png',
    ],
    injectRegister: null,
    manifest: false,
    registerType: 'prompt',
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      navigateFallback: '/',
      navigateFallbackDenylist: [
        /^\/api\//,
        /^\/documentation/,
        /^\/healthz/,
      ],
    },
  }), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});