import { CircleMarker, Popup } from 'react-leaflet'
import { motion } from 'framer-motion'
import { Calendar, Flame, Car, Shield, CloudRain } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Incident, IncidentType } from '@/types/incident'
import {
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INCIDENT_BG,
  SEVERITY_COLORS,
  SEVERITY_BG,
} from '@/types/incident'
import { stripHtml } from '@/lib/utils'

interface IncidentMarkerProps {
  incident: Incident
}

// Icon map for each incident type
const TYPE_ICONS: Record<IncidentType, React.ReactNode> = {
  fire: <Flame size={11} />,
  accident: <Car size={11} />,
  police: <Shield size={11} />,
  weather: <CloudRain size={11} />,
}

export function IncidentMarker({ incident }: IncidentMarkerProps) {
  const { type, latitude, longitude, severity } = incident.incidentFields
  const color = INCIDENT_COLORS[type]
  const typeBg = INCIDENT_BG[type]
  const sevColor = SEVERITY_COLORS[severity]
  const sevBg = SEVERITY_BG[severity]

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={9}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.82,
        weight: 2,
        opacity: 1,
      }}
    >
      <Popup minWidth={240} maxWidth={300}>
        {/* Framer Motion animates on popup mount */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {/* Type + Severity badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: typeBg,
                color,
                border: `1px solid ${color}55`,
              }}
            >
              {TYPE_ICONS[type]}
              {INCIDENT_LABELS[type]}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: sevBg,
                color: sevColor,
                border: `1px solid ${sevColor}55`,
                textTransform: 'capitalize',
              }}
            >
              {severity}
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.4,
            }}
          >
            {incident.title}
          </h3>

          {/* Timestamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              marginBottom: '8px',
              color: '#64748b',
              fontSize: '11px',
            }}
          >
            <Calendar size={11} />
            <span>
              {formatDistanceToNow(new Date(incident.date), { addSuffix: true })}
            </span>
          </div>

          {/* Description */}
          {incident.excerpt && (
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#94a3b8',
                lineHeight: 1.55,
                maxHeight: '60px',
                overflow: 'hidden',
              }}
            >
              {stripHtml(incident.excerpt)}
            </p>
          )}
        </motion.div>
      </Popup>
    </CircleMarker>
  )
}
