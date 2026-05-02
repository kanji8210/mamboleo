---
entry_id: "ctx-20260502-143722124226-eb8ef06f"
title: "Landing-page Nairobi mini-map preview with recent incidents"
category: "feature"
tags: ["landing", "leaflet", "preview", "map", "nairobi", "incidents", "cta"]
files: ["src/components/landing/LiveMapPreview.tsx", "src/components/landing/LiveDataSection.tsx", "src/lib/weatherAlerts.ts"]
commits: []
status: "active"
importance: "medium"
created_at: "2026-05-02T14:37:22Z"
updated_at: "2026-05-02T14:37:22Z"
summary: "Added a non-interactive Nairobi-centred Leaflet preview map under the Live Data section on the landing page. Renders up to 80 recent (<48h) incidents as colour-coded CircleMarkers with hover tooltips; the entire map is a click-through to the full /map route via a floating CTA pill."
retrieval_hints: "landing live data nairobi mini map preview leaflet circlemarker cta full map click through"
---

## What
New component LiveMapPreview.tsx (CartoDB dark tiles, zoom 10, controls disabled, severity-sized markers) wired into LiveDataSection.tsx as a full-width row beneath the breakdown grid. Filters incidents by recency and validity (drops zero/NaN coords). Also fixed pre-existing TS build error in weatherAlerts.ts by adding the now-required lifecycle/lastUpdateAt/updateCount fields.

## Why
Users browsing the landing page had no spatial context before clicking through; a glanceable Nairobi map increases CTA conversion and showcases live data without forcing a route change.

## Impact
Landing page now visualises live incident geography. Build size: vendor-map +334KB (lazy-loaded). No new deps. Build passes cleanly.
