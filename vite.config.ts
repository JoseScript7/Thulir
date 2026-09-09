import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Thulir',
        short_name: 'Thulir',
        description: 'Every Drop Tracked. Every Sprout Restored.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return (
                url.pathname.startsWith('/structures') ||
                url.pathname.startsWith('/workorders') ||
                url.pathname.startsWith('/summary')
              );
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'thulir-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
