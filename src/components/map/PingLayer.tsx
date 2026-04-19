import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Incident } from '@/types/incident'
import { INCIDENT_COLORS } from '@/types/incident'

interface PingLayerProps {
  incidents: Incident[]
  newIncidentIds: Set<string>
}

/**
 * Renders growing-fading ripple rings at new-incident positions.
 * Uses L.divIcon so the animation lives entirely in CSS (no React re-renders).
 */
export function PingLayer({ incidents, newIncidentIds }: PingLayerProps) {
  const map = useMap()
  const activeMarkers = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (newIncidentIds.size === 0) return

    newIncidentIds.forEach((id) => {
      if (activeMarkers.current.has(id)) return

      const incident = incidents.find((i) => i.id === id)
      if (!incident) return

      const color = INCIDENT_COLORS[incident.incidentFields.type]

      const icon = L.divIcon({
        html: `<div class="ping-ring" style="border-color:${color};"></div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker(
        [incident.incidentFields.latitude, incident.incidentFields.longitude],
        { icon, interactive: false, zIndexOffset: -100 },
      ).addTo(map)

      activeMarkers.current.set(id, marker)

      // Remove after animation completes
      setTimeout(() => {
        marker.remove()
        activeMarkers.current.delete(id)
      }, 2100)
    })
  }, [incidents, map, newIncidentIds])

  // Cleanup on unmount
  useEffect(() => {
    const markers = activeMarkers.current
    return () => {
      markers.forEach((m) => m.remove())
      markers.clear()
    }
  }, [])

  return null
}
