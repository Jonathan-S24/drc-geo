import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

/**
 * Inlines the built stylesheet into index.html. The sheet is small (~9 KB over
 * the wire) but it is render-blocking, and one extra round-trip in front of
 * first paint is the single biggest cost left on the critical path. Runs as a
 * `post` transformIndexHtml so the HTML is final before vite-plugin-pwa hashes
 * it for the precache manifest.
 */
function inlineCriticalCss(): Plugin {
  return {
    name: 'drcgeo-inline-css',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html
        return html.replace(
          /<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"[^>]*>/g,
          (tag, file: string) => {
            const asset = ctx.bundle?.[file]
            if (!asset || asset.type !== 'asset') return tag
            return `<style>${String(asset.source)}</style>`
          },
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    inlineCriticalCss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html', 'icons/*.png'],
      // public/manifest.webmanifest is hand-authored and linked from index.html —
      // it is the source of truth (display_override, shortcuts, screenshots).
      manifest: false,
      workbox: {
        // Precache the shell + every data file so the app is fully usable offline
        // after the first visit. Data is ~1.3MB total, safe to precache.
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,json,geojson,ogg}'],
        // Store/manifest screenshots are fetched by the OS install dialog, never
        // by the app. Precaching them would put ~10 MB in every user's cache.
        globIgnores: ['**/screenshots/**', '**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        // SPA path routes (/province/x, /territoire/y) must resolve to the shell offline.
        navigateFallbackDenylist: [/^\/data\//, /^\/icons\//, /^\/screenshots\//, /^\/privacy/, /^\/offline\.html$/],
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
            handler: 'CacheFirst',
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
