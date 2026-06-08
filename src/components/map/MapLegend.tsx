import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { INCIDENT_COLORS, INCIDENT_LABELS, type FilterOption, type Incident, type IncidentType } from '@/types/incident'

const TYPE_ORDER: IncidentType[] = [
  'fire',
  'accident',
  'police',
  'weather',
  'protest',
  'flood',
  'medical',
  'military',
  'info',
  'health',
  'environmental',
  'homicide',
  'femicide',
]

const SEV_ITEMS = [
  { label: 'High',   size: 20, pulse: true  },
  { label: 'Medium', size: 14, pulse: false },
  { label: 'Low',    size: 10, pulse: false },
]

// SVG paths per type (matching IncidentMarker)
const TYPE_SVG: Record<IncidentType, { d: string; stroke: boolean }> = {
  fire:     { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z', stroke: false },
  accident: { d: 'm21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z', stroke: false },
  police:   { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', stroke: false },
  weather:  { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v6M8 14v6M12 16v6', stroke: true },
  protest:  { d: 'M3 11l18-5v12L3 14v-3z M11.6 16.8a3 3 0 1 1-5.8-1.6', stroke: true },
  flood:    { d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', stroke: true },
  medical:  { d: 'M11 2h2a1 1 0 0 1 1 1v7h7a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-7v7a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-7H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h7V3a1 1 0 0 1 1-1z', stroke: false },
  military: { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 2v20', stroke: true },
  info:     { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01', stroke: true },
  health:   { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27', stroke: true },
  environmental: { d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.5c1 1.5.5 7-2.9 10.4A7 7 0 0 1 11 20z M2 21c0-3 1.85-5.36 5.08-6', stroke: true },
  homicide: { d: 'M9 18a4 4 0 0 1-2-1.4 8 8 0 1 1 10 0A4 4 0 0 1 15 18a3 3 0 0 1-3 3 3 3 0 0 1-3-3z M9 13v.01 M15 13v.01 M10 19l1.5 2 .5-1 .5 1 1.5-2', stroke: true },
  femicide: { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z M12 5l-2 5h4l-2 5', stroke: true },
}

interface MapLegendProps {
  incidents?: Incident[]
  filter?: FilterOption
  onFilterChange?: (f: FilterOption) => void
}

export function MapLegend({ incidents = [], filter = 'all', onFilterChange }: MapLegendProps) {
  const [open, setOpen] = useState(true)

  const typeCounts = useMemo(() => {
    const counts: Record<IncidentType, number> = {
      fire: 0,
      accident: 0,
      police: 0,
      weather: 0,
      protest: 0,
      flood: 0,
      medical: 0,
      military: 0,
      info: 0,
      health: 0,
      environmental: 0,
      homicide: 0,
      femicide: 0,
    }

    for (const incident of incidents) {
      counts[incident.incidentFields.type] += 1
    }

    return counts
  }, [incidents])

  const visibleTypes = useMemo(() => {
    const present = TYPE_ORDER.filter((type) => typeCounts[type] > 0)
    return present.length > 0 ? present : TYPE_ORDER
  }, [typeCounts])

  // The legend doubles as a quick filter: tap a type to show only that
  // category; tap the active one again to reset to "all".
  const handleTypeClick = (type: IncidentType) => {
    if (!onFilterChange) return
    onFilterChange(filter === type ? 'all' : type)
  }

  return (
    <div className="fixed md:absolute bottom-20 md:bottom-6 right-2 md:right-3 z-[700] pointer-events-auto max-w-[90vw] md:max-w-xs">
      <div className="bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl overflow-hidden">

        {/* Toggle header */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-accent/30 transition-colors"
          aria-label="Toggle legend"
        >
          <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase font-mono">
            Legend
          </span>
          {open ? <ChevronDown size={11} className="text-muted-foreground ml-auto" /> : <ChevronUp size={11} className="text-muted-foreground ml-auto" />}
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="legend-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-h-[58vh] overflow-y-auto px-3 pb-3 pr-2 flex flex-col gap-3">

                {/* Incident types — clickable filters */}
                <div className="flex flex-col gap-1">
                  {onFilterChange && (
                    <button
                      onClick={() => onFilterChange('all')}
                      className={[
                        'flex items-center gap-2 px-1.5 py-1 rounded-md transition-colors text-left',
                        filter === 'all'
                          ? 'bg-white/10 text-foreground'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                      ].join(' ')}
                      aria-pressed={filter === 'all'}
                    >
                      <div className="w-6 h-6 rounded-full border border-white/20 bg-gradient-to-br from-white/20 to-white/5 flex-shrink-0" />
                      <span className="text-[11px] font-medium">All incidents</span>
                      {filter === 'all' && <Check size={11} className="ml-auto text-muted-foreground" />}
                    </button>
                  )}
                  {visibleTypes.map((type) => {
                    const label = INCIDENT_LABELS[type]
                    const color = INCIDENT_COLORS[type]
                    const { d, stroke } = TYPE_SVG[type]
                    const svg = stroke
                      ? `<path d="${d}"/>`
                      : `<path d="${d}" fill="white"/>`
                    const isActive = filter === type
                    const isDimmed = onFilterChange && filter !== 'all' && !isActive
                    const rowClass = [
                      'flex items-center gap-2 px-1.5 py-1 rounded-md transition-all text-left',
                      onFilterChange
                        ? isActive
                          ? 'bg-white/10 text-foreground'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        : '',
                      isDimmed ? 'opacity-40' : '',
                    ].join(' ')

                    const rowContent = (
                      <>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center border border-white/20 flex-shrink-0"
                          style={{ background: color }}
                          dangerouslySetInnerHTML={{
                            __html: stroke
                              ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">${svg}</svg>`
                              : `<svg viewBox="0 0 24 24" width="12" height="12">${svg}</svg>`,
                          }}
                        />
                        <span className="text-[11px]">{label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{typeCounts[type]}</span>
                        {isActive && <Check size={11} className="text-muted-foreground" />}
                      </>
                    )

                    return onFilterChange ? (
                      <button
                        key={type}
                        onClick={() => handleTypeClick(type)}
                        aria-pressed={isActive}
                        className={rowClass}
                      >
                        {rowContent}
                      </button>
                    ) : (
                      <div key={type} className={rowClass}>
                        {rowContent}
                      </div>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className="border-t border-border/60" />

                {/* Severity sizes */}
                <div className="flex flex-col gap-1.5">
                  {SEV_ITEMS.map(({ label, size, pulse }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 relative">
                        <div
                          className="rounded-full bg-muted/50 border border-border/60"
                          style={{ width: size, height: size }}
                        />
                        {pulse && (
                          <div
                            className="absolute rounded-full border border-muted-foreground/40 animate-ping"
                            style={{ width: size + 8, height: size + 8 }}
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{label} severity</span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-border/60" />

                {/* Unverified */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-white/50 bg-muted/40 flex-shrink-0" />
                  <span className="text-[11px] text-muted-foreground">User report</span>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
