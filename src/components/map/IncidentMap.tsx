import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, MapPin, RefreshCw, WifiOff, Crosshair } from 'lucide-react'
import type { Incident } from '@/types/incident'
import { IncidentMarker } from './IncidentMarker'
import { LiveIndicator } from './LiveIndicator'
import { PingLayer } from './PingLayer'
import { MapController } from './MapController'
import { MapLegend } from './MapLegend'

const NAIROBI: [number, number] = [-1.286389, 36.817223]

interface IncidentMapProps {
  incidents: Incident[]
  allIncidents: Incident[]
  mapTarget: [number, number] | null
  newIncidentIds: Set<string>
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onIncidentClick?: (incident: Incident) => void
  isPickingLocation?: boolean
  onLocationPicked?: (lat: number, lng: number) => void
}

function LocationPickerLayer({
  onLocationPicked,
}: {
  onLocationPicked: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onLocationPicked(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function buildClusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  return L.divIcon({
    html: `<div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:${size}px;
      height:${size}px;
      background:rgba(230,57,70,0.75);
      border:2px solid rgba(255,100,100,0.85);
      border-radius:50%;
      color:#fff;
      font-weight:700;
      font-size:${size > 40 ? 13 : 12}px;
      font-family:Inter,sans-serif;
      box-shadow:0 4px 14px rgba(0,0,0,0.55);
      backdrop-filter:blur(4px);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function IncidentMap({
  incidents,
  allIncidents,
  mapTarget,
  newIncidentIds,
  isLoading = false,
  isError = false,
  onRetry,
  onIncidentClick,
  isPickingLocation = false,
  onLocationPicked,
}: IncidentMapProps) {
  const isDoneEmpty = !isLoading && !isError && allIncidents.length === 0

  return (
    <div className="absolute inset-0">
      {/* LIVE badge — overlaid above the map */}
      <LiveIndicator />

      {/* Map legend */}
      <MapLegend />

      {/* Pick-location strip */}
      <AnimatePresence>
        {isPickingLocation && (
          <motion.div
            key="pick-strip"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[700] pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm text-white text-sm font-semibold rounded-full px-4 py-2 shadow-lg">
              <Crosshair size={14} />
              Tap map to pick location
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty / Error overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {(isError || isDoneEmpty) && (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[700] pointer-events-auto"
          >
            <div className="flex items-start gap-3 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl px-5 py-4 shadow-2xl max-w-xs">
              {/* Icon */}
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isError ? 'bg-red-950/60 border border-red-900/50' : 'bg-muted/40 border border-border'
              }`}>
                {isError
                  ? <WifiOff size={15} className="text-red-400" />
                  : <MapPin size={15} className="text-muted-foreground" />
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  {isError ? 'Incidents not loaded' : 'No incidents found'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {isError
                    ? 'Could not reach the data source. Check your connection or GraphQL endpoint.'
                    : 'No active incidents to display. The map will auto-refresh every 30 seconds.'}
                </p>

                {isError && onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                  >
                    <RefreshCw size={11} />
                    Retry now
                  </button>
                )}
              </div>

              {/* Warning icon for error */}
              {isError && (
                <AlertTriangle size={13} className="text-red-500/60 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={NAIROBI}
        zoom={12}
        minZoom={5}
        maxZoom={19}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Dark-friendly CartoDB tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <MarkerClusterGroup
          chunkedLoading
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          iconCreateFunction={(cluster: any) => buildClusterIcon(cluster.getChildCount() as number)}
          maxClusterRadius={60}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          removeOutsideVisibleBounds
          animate
        >
          {incidents.map((incident) => (
            <IncidentMarker
              key={incident.id}
              incident={incident}
              onClick={onIncidentClick ?? (() => undefined)}
            />
          ))}
        </MarkerClusterGroup>

        {/* Ripple animation for newly detected incidents */}
        <PingLayer incidents={allIncidents} newIncidentIds={newIncidentIds} />

        {/* Programmatic pan/zoom from sidebar clicks */}
        <MapController target={mapTarget} />

        {/* Location picker for report modal */}
        {isPickingLocation && onLocationPicked && (
          <LocationPickerLayer onLocationPicked={onLocationPicked} />
        )}
      </MapContainer>
    </div>
  )
}
