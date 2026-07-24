import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DRC.Geo — Référence géographique de la RDC',
        short_name: 'DRC.Geo',
        description:
          'Carte interactive de la République démocratique du Congo : 26 provinces, 145 territoires, 44 villes.',
        lang: 'fr',
        theme_color: '#0d4f5c',
        background_color: '#0d4f5c',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the shell + every data file so the app is fully usable offline
        // after the first visit. Data is ~1.3MB total, safe to precache.
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,json,geojson,ogg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        // SPA path routes (/province/x, /territoire/y) must resolve to the shell offline.
        navigateFallbackDenylist: [/^\/data\//, /^\/icons\//],
        runtimeCaching: [
          {
            // Data files: precached in prod, but also runtime-cached so the app works
            // offline in dev and immediately on first prod visit before precache settles.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'drc-data',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Place photos (Wikimedia): cache-on-view, stale-while-revalidate, LRU-capped.
            urlPattern: ({ url }) => url.hostname === 'upload.wikimedia.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'drc-place-images',
              expiration: {
                // ~150MB budget ≈ 500 photos at ~300KB; LRU-evicted by Workbox.
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Esri satellite tiles (only used by the older basemap, if present).
            urlPattern: ({ url }) => url.hostname.endsWith('arcgisonline.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'drc-map-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Enable the SW in `vite dev` so we can test offline behavior without a build.
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
