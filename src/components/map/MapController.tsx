import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Incident } from '@/types/incident'

interface MapControllerProps {
  /** When non-null, the map will animate to this lat/lng at zoom 15. */
  target: [number, number] | null
  /** Full incident list — used to auto-fit on first load. */
  incidents?: Incident[]
}

/**
 * Must be rendered inside <MapContainer>.
 * 1. Watches `target` and flies to it when the user clicks a list item.
 * 2. Once incidents first arrive (empty → non-empty), fits the map to their bounds.
 */
export function MapController({ target, incidents = [] }: MapControllerProps) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  // Auto-fit to incident bounds on first load
  useEffect(() => {
    if (hasFittedRef.current || incidents.length === 0) return

    const validPoints = incidents
      .map((i) => i.incidentFields)
      .filter((f) => f.latitude !== 0 && f.longitude !== 0)

    if (validPoints.length === 0) return

    const bounds = L.latLngBounds(
      validPoints.map((f) => L.latLng(f.latitude, f.longitude)),
    )
    // Pad so markers aren't right at the edge; max zoom prevents over-zooming on 1 incident
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true, duration: 1.0 })
    hasFittedRef.current = true
  }, [incidents, map])

  // Fly to user-selected incident
  useEffect(() => {
    if (!target) return
    map.setView(target, Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.8,
    })
  }, [map, target])

  return null
}
