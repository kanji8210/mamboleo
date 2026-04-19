---
entry_id: "ctx-20260419-142646267519-e81e1cd2"
title: "Full Mamboleo frontend — React + TypeScript + PWA"
category: "feature"
tags: ["react", "typescript", "vite", "leaflet", "pwa", "tanstack-query", "framer-motion", "tailwind", "shadcn", "graphql", "wordpress", "map", "offline", "sidebar"]
files: ["src/App.tsx", "src/main.tsx", "src/index.css", "src/vite-env.d.ts", "src/types/incident.ts", "src/lib/graphql.ts", "src/lib/utils.ts", "src/hooks/useIncidents.ts", "src/components/map/IncidentMap.tsx", "src/components/map/IncidentMarker.tsx", "src/components/map/LiveIndicator.tsx", "src/components/map/PingLayer.tsx", "src/components/map/MapController.tsx", "src/components/sidebar/Sidebar.tsx", "src/components/sidebar/FilterBar.tsx", "src/components/sidebar/IncidentListItem.tsx", "src/components/ui/badge.tsx", "src/components/ui/button.tsx", "src/components/ui/skeleton.tsx", "vite.config.ts", "tailwind.config.ts", "postcss.config.js", "tsconfig.app.json", "tsconfig.node.json", "tsconfig.json", "index.html", "package.json", ".env", ".env.example", "public/favicon.svg"]
commits: ["HEAD"]
status: "active"
importance: "high"
created_at: "2026-04-19T14:26:46Z"
updated_at: "2026-04-19T14:26:58Z"
summary: "Built the complete Mamboleo frontend from scratch: Vite 7 + React 18 + TypeScript, dark command-center UI inspired by ground.news, full-screen Leaflet map for Kenya incident data, collapsible sidebar, PWA offline support, Framer Motion animations, TanStack Query real-time refresh."
retrieval_hints: "incident map kenya nairobi leaflet react-leaflet cluster marker sidebar filter PWA offline graphql wordpress wpgraphql tanstack query framer motion live indicator ping animation dark theme ground.news command center sonner toast serialize-javascript vulnerability override vite7 CartoDB tiles"
---

## What
32 files created. Full-screen Leaflet map centered on Nairobi with CircleMarker per incident (red=fire, orange=accident, blue=police, cyan=weather). MarkerClusterGroup with custom red cluster bubbles. Click popup with Framer Motion entrance animation. TanStack Query fetches WPGraphQL endpoint every 30s. New-incident detection triggers Sonner toasts + CSS ripple ping rings (PingLayer). Collapsible Framer Motion sidebar (Sidebar.tsx) with FilterBar chips (All/Fire/Accident/Police/Weather). Clicking list item pans map. Pulsing LiveIndicator badge. PWA via vite-plugin-pwa v1 with Workbox: NetworkFirst for /graphql, CacheFirst for assets+fonts+map tiles. Dark CartoDB tile layer. Code split: vendor-react, vendor-map, vendor-motion, vendor-query chunks.

## Why
Initial project scaffold — new plugin repository with no prior source files.

## Impact
0 TypeScript errors, 0 security vulnerabilities after serialize-javascript pinned to ^7.0.5 via package.json overrides. Clean production build: largest chunk 333KB (vendor-map, gzip 103KB). PWA service worker generated with 7 precached entries.

## Notes
VITE_GRAPHQL_ENDPOINT must be set in .env before running. WordPress requires WPGraphQL plugin + custom post type incident with ACF fields: type, latitude, longitude, severity. Dark theme uses CSS custom properties (hsl-based). Tile layer: CartoDB dark_all (not OSM) for better dark contrast.
