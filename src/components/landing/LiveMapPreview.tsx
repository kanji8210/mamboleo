import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Maximize2 } from 'lucide-react'

import type { Incident, IncidentType } from '@/types/incident'
import { INCIDENT_COLORS, INCIDENT_LABELS } from '@/types/incident'

/** Nairobi CBD — centre of the preview view. */
const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219]
const NAIROBI_ZOOM = 10

/** Severity → marker radius (px). */
const SEVERITY_RADIUS: Record<string, number> = {
  high: 9,
  medium: 7,
  low: 5,
}

interface LiveMapPreviewProps {
  incidents: Incident[]
  /** When provided, only incidents newer than this many hours are shown. */
  withinHours?: number
  /** Maximum markers to render — keeps the preview snappy. */
  maxMarkers?: number
}

/**
 * Compact preview map centred on Nairobi, used on the landing page to
 * give a glanceable sense of recent incident activity. Non-interactive
 * by design (no drag, no scroll-zoom) — clicking anywhere routes the
 * user to the full map.
 */
export function LiveMapPreview({
  incidents,
  withinHours = 48,
  maxMarkers = 80,
}: LiveMapPreviewProps) {
  const recent = useMemo(() => {
    const cutoff = Date.now() - withinHours * 3_600_000
    return [...incidents]
      .filter((i) => {
        const lat = Number(i.incidentFields.latitude)
        const lng = Number(i.incidentFields.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
        if (lat === 0 && lng === 0) return false
        return new Date(i.date).getTime() >= cutoff
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, maxMarkers)
  }, [incidents, withinHours, maxMarkers])

  return (
    <div className="relative rounded-2xl border border-border bg-background/60 overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-red-400" />
          <h3 className="text-sm font-bold text-foreground">Nairobi &amp; surrounding area</h3>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
            last {withinHours}h
          </span>
        </div>
        <Link
          to="/map"
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
        >
          View full map <ArrowRight size={12} />
        </Link>
      </div>

      {/* Map */}
      <div className="relative h-[320px] sm:h-[400px]">
        <MapContainer
          center={NAIROBI_CENTER}
          zoom={NAIROBI_ZOOM}
          minZoom={6}
          maxZoom={13}
          style={{ height: '100%', width: '100%', background: '#0f0f12' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
            keepBuffer={4}
            updateWhenIdle
            updateWhenZooming={false}
            crossOrigin
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          />

          {recent.map((inc) => {
            const lat = Number(inc.incidentFields.latitude)
            const lng = Number(inc.incidentFields.longitude)
            const t = inc.incidentFields.type as IncidentType
            const color = INCIDENT_COLORS[t] ?? '#94a3b8'
            const radius = SEVERITY_RADIUS[inc.incidentFields.severity] ?? 6
            return (
              <CircleMarker
                key={inc.id}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 1.5,
                  opacity: 0.9,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                  <span className="text-xs font-semibold">
                    {INCIDENT_LABELS[t] ?? t}
                  </span>{' '}
                  · {inc.title.slice(0, 70)}
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* Click-through overlay → full map */}
        <Link
          to="/map"
          aria-label="Open the full incident map"
          className="absolute inset-0 group focus:outline-none"
        >
          {/* Subtle gradient floor so the CTA is readable on busy basemaps */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none"
          />

          {/* Floating CTA — bottom-centre */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 group-hover:bg-red-500 text-white text-sm font-semibold rounded-full px-5 py-2.5 shadow-lg transition-colors"
          >
            <Maximize2 size={14} />
            Explore full map
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </motion.div>

          {/* Activity pill — top-left */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-card/85 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-[11px] font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-foreground tabular-nums">{recent.length}</span>
            <span className="text-muted-foreground">recent</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
