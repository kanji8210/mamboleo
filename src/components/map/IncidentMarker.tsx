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
  // Protest — megaphone
  protest: {
    d: 'M3 11l18-5v12L3 14v-3z M11.6 16.8a3 3 0 1 1-5.8-1.6',
    stroke: true,
  },
  // Flood — waves
  flood: {
    d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
    stroke: true,
  },
  // Medical — plus / cross
  medical: {
    d: 'M11 2h2a1 1 0 0 1 1 1v7h7a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-7v7a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-7H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h7V3a1 1 0 0 1 1-1z',
    stroke: false,
  },
  // Military — shield-half
  military: {
    d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 2v20',
    stroke: true,
  },
  // Info — circled i
  info: {
    d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
    stroke: true,
  },
  // Public health — heart pulse
  health: {
    d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27',
    stroke: true,
  },
  // Environmental — leaf
  environmental: {
    d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.5c1 1.5.5 7-2.9 10.4A7 7 0 0 1 11 20z M2 21c0-3 1.85-5.36 5.08-6',
    stroke: true,
  },
  // Homicide — skull
  homicide: {
    d: 'M9 18a4 4 0 0 1-2-1.4 8 8 0 1 1 10 0A4 4 0 0 1 15 18a3 3 0 0 1-3 3 3 3 0 0 1-3-3z M9 13v.01 M15 13v.01 M10 19l1.5 2 .5-1 .5 1 1.5-2',
    stroke: true,
  },
  // Femicide — heart-crack (broken heart, GBV awareness)
  femicide: {
    d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z M12 5l-2 5h4l-2 5',
    stroke: true,
  },
}

// â”€â”€â”€ Pin size by severity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SEVERITY_SIZE: Record<SeverityLevel, { pin: number; icon: number }> = {
  low:    { pin: 28, icon: 12 },
  medium: { pin: 36, icon: 16 },
  high:   { pin: 44, icon: 20 },
}

// Minimal HTML escape for title text injected into divIcon HTML
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPinIcon(
  type: IncidentType,
  severity: SeverityLevel,
  color: string,
  isVerified: boolean,
  title: string,
): L.DivIcon {
  const { pin, icon } = SEVERITY_SIZE[severity] ?? SEVERITY_SIZE.medium
  const { d, stroke } = PIN_PATHS[type] ?? PIN_PATHS.accident

  const svg = stroke
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${icon}" height="${icon}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${icon}" height="${icon}" fill="white"><path d="${d}"/></svg>`

  const classes = [
    'incident-pin',
    severity === 'high' ? 'incident-pin--pulse' : '',
    !isVerified ? 'incident-pin--unverified' : '',
  ].filter(Boolean).join(' ')

  const safeTitle = escapeHtml(title || '').trim()
  const labelHtml = safeTitle
    ? `<span class="incident-pin__label" title="${safeTitle}">${safeTitle}</span>`
    : ''

  // Wrap pin + label in a flex row. Anchor stays on the pin centre so the
  // marker geometry is unchanged; the label flows to the right and
  // truncates via CSS. The wrapper itself has no background — minimalist.
  return L.divIcon({
    html: `<div class="incident-pin-wrap">
      <div class="${classes}" style="width:${pin}px;height:${pin}px;background:${color};color:${color};flex:0 0 auto;">${svg}</div>
      ${labelHtml}
    </div>`,
    className: 'incident-pin-icon',
    iconSize: [pin, pin],
    iconAnchor: [pin / 2, pin / 2],
  })
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function IncidentMarker({ incident, onClick }: IncidentMarkerProps) {
  const { type, latitude, longitude, severity, isVerified } = incident.incidentFields
  const color = INCIDENT_COLORS[type]
  const title = incident.title ?? ''

  const icon = useMemo(
    () => buildPinIcon(type, severity, color, isVerified, title),
    [type, severity, color, isVerified, title],
  )

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      eventHandlers={{ click: () => onClick(incident) }}
    />
  )
}
