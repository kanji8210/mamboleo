import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Incident, IncidentType, SeverityLevel } from '@/types/incident'
import { INCIDENT_COLORS } from '@/types/incident'

interface IncidentMarkerProps {
  incident: Incident
  onClick: (incident: Incident) => void
}

// â”€â”€â”€ Inline SVG paths per incident type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PIN_PATHS: Record<IncidentType, { d: string; stroke: boolean }> = {
  fire: {
    d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    stroke: false,
  },
  accident: {
    d: 'm21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z',
    stroke: false,
  },
  police: {
    d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    stroke: false,
  },
  weather: {
    d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v6M8 14v6M12 16v6',
    stroke: true,
  },
}

// â”€â”€â”€ Pin size by severity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SEVERITY_SIZE: Record<SeverityLevel, { pin: number; icon: number }> = {
  low:    { pin: 28, icon: 12 },
  medium: { pin: 36, icon: 16 },
  high:   { pin: 44, icon: 20 },
}

function buildPinIcon(
  type: IncidentType,
  severity: SeverityLevel,
  color: string,
  isVerified: boolean,
): L.DivIcon {
  const { pin, icon } = SEVERITY_SIZE[severity]
  const { d, stroke } = PIN_PATHS[type]

  const svg = stroke
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${icon}" height="${icon}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${icon}" height="${icon}" fill="white"><path d="${d}"/></svg>`

  const classes = [
    'incident-pin',
    severity === 'high' ? 'incident-pin--pulse' : '',
    !isVerified ? 'incident-pin--unverified' : '',
  ].filter(Boolean).join(' ')

  return L.divIcon({
    html: `<div class="${classes}" style="width:${pin}px;height:${pin}px;background:${color};color:${color};">${svg}</div>`,
    className: '',
    iconSize: [pin, pin],
    iconAnchor: [pin / 2, pin / 2],
  })
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function IncidentMarker({ incident, onClick }: IncidentMarkerProps) {
  const { type, latitude, longitude, severity, isVerified } = incident.incidentFields
  const color = INCIDENT_COLORS[type]

  const icon = useMemo(
    () => buildPinIcon(type, severity, color, isVerified),
    [type, severity, color, isVerified],
  )

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      eventHandlers={{ click: () => onClick(incident) }}
    />
  )
}
