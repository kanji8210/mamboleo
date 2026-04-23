import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { INCIDENT_COLORS, INCIDENT_LABELS } from '@/types/incident'

const TYPE_ITEMS = [
  { type: 'fire',     label: INCIDENT_LABELS.fire,     color: INCIDENT_COLORS.fire },
  { type: 'accident', label: INCIDENT_LABELS.accident, color: INCIDENT_COLORS.accident },
  { type: 'police',   label: INCIDENT_LABELS.police,   color: INCIDENT_COLORS.police },
  { type: 'weather',  label: INCIDENT_LABELS.weather,  color: INCIDENT_COLORS.weather },
] as const

const SEV_ITEMS = [
  { label: 'High',   size: 20, pulse: true  },
  { label: 'Medium', size: 14, pulse: false },
  { label: 'Low',    size: 10, pulse: false },
]

// SVG paths per type (matching IncidentMarker)
const TYPE_SVG: Record<string, { d: string; stroke: boolean }> = {
  fire:     { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z', stroke: false },
  accident: { d: 'm21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z', stroke: false },
  police:   { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', stroke: false },
  weather:  { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v6M8 14v6M12 16v6', stroke: true },
}

export function MapLegend() {
  const [open, setOpen] = useState(true)

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
              <div className="px-3 pb-3 flex flex-col gap-3">

                {/* Incident types */}
                <div className="flex flex-col gap-1.5">
                  {TYPE_ITEMS.map(({ type, label, color }) => {
                    const { d, stroke } = TYPE_SVG[type]
                    const svg = stroke
                      ? `<path d="${d}"/>`
                      : `<path d="${d}" fill="white"/>`
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center border border-white/20 flex-shrink-0"
                          style={{ background: color }}
                          dangerouslySetInnerHTML={{
                            __html: stroke
                              ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">${svg}</svg>`
                              : `<svg viewBox="0 0 24 24" width="12" height="12">${svg}</svg>`,
                          }}
                        />
                        <span className="text-[11px] text-muted-foreground">{label}</span>
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
