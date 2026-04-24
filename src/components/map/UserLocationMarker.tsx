import { useMemo } from 'react'
import { Marker, Circle } from 'react-leaflet'
import L from 'leaflet'

interface UserLocationMarkerProps {
  position: [number, number] | null
  accuracy?: number | null
}

/**
 * Blue pulsing dot + translucent accuracy ring for the user's shared
 * location. Purely presentational — the parent owns the position state.
 */
export function UserLocationMarker({ position, accuracy = null }: UserLocationMarkerProps) {
  const icon = useMemo(
    () =>
      L.divIcon({
        html:
          '<div class="user-loc-dot">' +
          '<div class="user-loc-dot__ring"></div>' +
          '<div class="user-loc-dot__core"></div>' +
          '</div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [],
  )

  if (!position) return null

  return (
    <>
      {accuracy && accuracy > 0 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#3b82f6',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
          }}
        />
      )}
      <Marker position={position} icon={icon} keyboard={false} />
    </>
  )
}
