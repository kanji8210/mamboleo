import { motion, AnimatePresence } from 'framer-motion'
import { X, Radio, AlertTriangle, Activity } from 'lucide-react'
import type { Incident, FilterOption } from '@/types/incident'
import { IncidentListItem } from './IncidentListItem'
import { FilterBar } from './FilterBar'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  incidents: Incident[]
  allIncidents: Incident[]
  filter: FilterOption
  onFilterChange: (f: FilterOption) => void
  newIncidentIds: Set<string>
  onIncidentClick: (incident: Incident) => void
}

export function Sidebar({
  isOpen,
  onClose,
  incidents,
  allIncidents,
  filter,
  onFilterChange,
  newIncidentIds,
  onIncidentClick,
}: SidebarProps) {
  // Counts per type for filter badges
  const counts: Record<FilterOption, number> = {
    all: allIncidents.length,
    fire: allIncidents.filter((i) => i.incidentFields.type === 'fire').length,
    accident: allIncidents.filter((i) => i.incidentFields.type === 'accident').length,
    police: allIncidents.filter((i) => i.incidentFields.type === 'police').length,
    weather: allIncidents.filter((i) => i.incidentFields.type === 'weather').length,
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop (mobile) ────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
            aria-hidden
          />

          {/* ── Sidebar panel ────────────────────────────────────────────── */}
          <motion.aside
            key="panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed left-0 top-0 bottom-0 z-[1500] w-[320px] flex flex-col bg-card border-r border-border shadow-2xl"
            aria-label="Command Center"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/40 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                  <Radio size={13} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-[12px] font-bold tracking-[0.12em] uppercase text-foreground font-mono">
                    Command Center
                  </h2>
                  <p className="text-[10px] text-muted-foreground">Kenya Security Feed</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close sidebar"
              >
                <X size={15} />
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 flex-shrink-0 bg-background/20">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Activity size={11} />
                <span>
                  <span className="text-foreground font-semibold">{incidents.length}</span>
                  {' '}of{' '}
                  <span className="text-foreground font-semibold">{allIncidents.length}</span>
                  {' '}incidents
                </span>
              </div>
              {newIncidentIds.size > 0 && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wide"
                >
                  <AlertTriangle size={10} />
                  {newIncidentIds.size} new
                </motion.span>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex-shrink-0">
              <FilterBar active={filter} onChange={onFilterChange} counts={counts} />
            </div>

            {/* Incident list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <AlertTriangle size={28} className="opacity-30" />
                  <p className="text-sm">No incidents found</p>
                </div>
              ) : (
                <motion.ul layout className="pb-4">
                  {incidents.map((incident) => (
                    <li key={incident.id}>
                      <IncidentListItem
                        incident={incident}
                        isNew={newIncidentIds.has(incident.id)}
                        onClick={() => {
                          onIncidentClick(incident)
                          onClose()
                        }}
                      />
                    </li>
                  ))}
                </motion.ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border/60 flex-shrink-0 bg-background/20">
              <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
                AUTO-REFRESH · 30s · MAMBOLEO v0.1
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
