import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const wpUrl = process.env.VITE_WP_URL ?? ''
// When VITE_WP_URL is set the app is embedded in WordPress — use relative
// asset paths so chunks resolve from their plugin-directory URL.
// When unset (e.g. Vercel preview) the app is deployed at the site root —
// use absolute paths so SPA sub-routes resolve assets correctly.
const isWordPress = Boolean(wpUrl)
const appPath = isWordPress ? `${wpUrl}/mamboleo/` : '/'

export default defineConfig({
  base: isWordPress ? './' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Mamboleo',
        short_name: 'Mamboleo',
        description: 'Real-time security map for Kenya',
        theme_color: '#0a0b0e',
        background_color: '#0a0b0e',
        display: 'standalone',
        orientation: 'portrait',
        // Scope to the WordPress page only — avoids hijacking the entire WP site
        scope: appPath,
        start_url: appPath,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // GraphQL endpoint — NetworkFirst so fresh data is preferred,
            // but cached responses serve when offline
            urlPattern: /\/graphql(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'graphql-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Static assets (fonts, images, SVGs) — CacheFirst
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Map tiles — CacheFirst for fast offline map rendering and
            // resilience against slow networks. Covers OSM, CartoDB
            // (basemaps.cartocdn.com — used by the dark theme), and
            // OpenStreetMap-France mirrors.
            urlPattern: ({ url }) => (
              /(?:^|\.)tile\.openstreetmap\.org$/.test(url.hostname) ||
              /(?:^|\.)basemaps\.cartocdn\.com$/.test(url.hostname) ||
              /(?:^|\.)tile\.openstreetmap\.fr$/.test(url.hostname)
            ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts — StaleWhileRevalidate
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-map': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
          'vendor-motion': ['framer-motion'],
          'vendor-query': ['@tanstack/react-query', 'graphql-request', 'graphql'],
        },
      },
    },
  },
})
