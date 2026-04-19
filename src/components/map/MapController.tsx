import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface MapControllerProps {
  /** When non-null, the map will animate to this lat/lng at zoom 15. */
  target: [number, number] | null
}

/**
 * Must be rendered inside <MapContainer>.
 * Watches `target` and calls map.setView() whenever it changes.
 */
export function MapController({ target }: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!target) return
    map.setView(target, Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.8,
    })
  }, [map, target])

  return null
}
