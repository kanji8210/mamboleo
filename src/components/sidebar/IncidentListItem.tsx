import { motion } from 'framer-motion'
import { MapPin, ChevronRight } from 'lucide-react'
import type { Incident, IncidentType } from '@/types/incident'
import {
  INCIDENT_COLORS,
  INCIDENT_LABELS,
  INCIDENT_BG,
  SEVERITY_COLORS,
  SEVERITY_BG,
} from '@/types/incident'
import { timeAgo } from '@/lib/utils'

interface IncidentListItemProps {
  incident: Incident
  isNew: boolean
  onClick: () => void
}

export function IncidentListItem({ incident, isNew, onClick }: IncidentListItemProps) {
  const { type, severity, lifecycle, updateCount } = incident.incidentFields
  const color = INCIDENT_COLORS[type as IncidentType]
  const typeBg = INCIDENT_BG[type as IncidentType]
  const sevColor = SEVERITY_COLORS[severity]
  const sevBg = SEVERITY_BG[severity]
  const isDeveloping = lifecycle === 'developing'
  const isResolved = lifecycle === 'resolved'

  return (
    <motion.button
      layout
      initial={isNew ? { opacity: 0, x: -10 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-border/60 hover:bg-accent/50 active:bg-accent transition-colors duration-100 group relative ${
        isDeveloping ? 'bg-orange-500/5' : ''
      } ${isResolved ? 'opacity-60' : ''}`}
    >
      {/* Developing indicator strip (overrides New strip if both) */}
      {isDeveloping && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 animate-pulse" />
      )}
      {/* New indicator strip */}
      {isNew && !isDeveloping && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="flex items-start gap-2.5">
        {/* Color dot */}
        <div
          className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
        />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-[13px] font-semibold text-foreground leading-snug truncate pr-2">
            {incident.title}
          </p>

          {/* Type + Severity row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {isDeveloping && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase text-orange-300 bg-orange-500/15 border border-orange-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Developing
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300 bg-sky-500/15">
                Resolved
              </span>
            )}
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ color, backgroundColor: typeBg }}
            >
              {INCIDENT_LABELS[type as IncidentType]}
            </span>
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold capitalize"
              style={{ color: sevColor, backgroundColor: sevBg }}
            >
              {severity}
            </span>
            {updateCount > 0 && (
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{updateCount} update{updateCount === 1 ? '' : 's'}
              </span>
            )}
            {isNew && (
              <span className="text-[9px] font-extrabold tracking-widest text-red-400 uppercase animate-pulse">
                NEW
              </span>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
            <MapPin size={10} />
            <span>{timeAgo(incident.date)}</span>
          </div>
        </div>

        <ChevronRight
          size={14}
          className="text-muted-foreground/30 group-hover:text-muted-foreground mt-1 flex-shrink-0 transition-colors"
        />
      </div>
    </motion.button>
  )
}
