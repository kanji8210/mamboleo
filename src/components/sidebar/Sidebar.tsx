import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { X, Radio, AlertTriangle, Activity } from 'lucide-react'
import type { Incident, FilterOption } from '@/types/incident'
import { IncidentListItem } from './IncidentListItem'
import { FilterBar } from './FilterBar'

type SeverityFilter = 'all' | 'low' | 'medium' | 'high'
type StatusFilter = 'all' | Incident['incidentFields']['status']
type LifecycleFilter = 'all' | Incident['incidentFields']['lifecycle']

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
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>('all')

  // Counts per type for filter badges
  const counts: Record<FilterOption, number> = {
    all: allIncidents.length,
    fire: allIncidents.filter((i) => i.incidentFields.type === 'fire').length,
    accident: allIncidents.filter((i) => i.incidentFields.type === 'accident').length,
    police: allIncidents.filter((i) => i.incidentFields.type === 'police').length,
    weather: allIncidents.filter((i) => i.incidentFields.type === 'weather').length,
    protest: allIncidents.filter((i) => i.incidentFields.type === 'protest').length,
    flood: allIncidents.filter((i) => i.incidentFields.type === 'flood').length,
    medical: allIncidents.filter((i) => i.incidentFields.type === 'medical').length,
    military: allIncidents.filter((i) => i.incidentFields.type === 'military').length,
    info: allIncidents.filter((i) => i.incidentFields.type === 'info').length,
    health: allIncidents.filter((i) => i.incidentFields.type === 'health').length,
    environmental: allIncidents.filter((i) => i.incidentFields.type === 'environmental').length,
    homicide: allIncidents.filter((i) => i.incidentFields.type === 'homicide').length,
    femicide: allIncidents.filter((i) => i.incidentFields.type === 'femicide').length,
  }

  const filteredIncidents = useMemo(() => {
    const searchText = search.trim().toLowerCase()
    return incidents.filter((incident) => {
      if (severity !== 'all' && incident.incidentFields.severity !== severity) {
        return false
      }
      if (status !== 'all' && incident.incidentFields.status !== status) {
        return false
      }
      if (lifecycle !== 'all' && incident.incidentFields.lifecycle !== lifecycle) {
        return false
      }
      if (!searchText) {
        return true
      }

      const location = ((incident.incidentFields as Incident['incidentFields'] & { locationName?: string | null }).locationName ?? '').toLowerCase()
      return (
        incident.title.toLowerCase().includes(searchText) ||
        incident.excerpt.toLowerCase().includes(searchText) ||
        location.includes(searchText)
      )
    })
  }, [incidents, search, severity, status, lifecycle])

  // Sort: developing (admin-pinned breaking stories) first, then by date desc.
  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      const aDev = a.incidentFields.lifecycle === 'developing' ? 1 : 0
      const bDev = b.incidentFields.lifecycle === 'developing' ? 1 : 0
      if (bDev !== aDev) {
        return bDev - aDev
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [filteredIncidents])

  const developingCount = sortedIncidents.filter(
    (i) => i.incidentFields.lifecycle === 'developing',
  ).length

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
                  <span className="text-foreground font-semibold">{sortedIncidents.length}</span>
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

            {/* Advanced filters */}
            <div className="px-3 py-2.5 border-b border-border/60 bg-background/20 space-y-2.5">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, location, excerpt"
                className="w-full min-h-[40px] rounded-lg border border-input bg-background px-3 text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
                  className="min-h-[36px] rounded-lg border border-input bg-background px-2 text-[11px]"
                  aria-label="Filter by severity"
                >
                  <option value="all">Severity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  className="min-h-[36px] rounded-lg border border-input bg-background px-2 text-[11px]"
                  aria-label="Filter by status"
                >
                  <option value="all">Status</option>
                  <option value="unsafe">Unsafe</option>
                  <option value="all_clear">All Clear</option>
                  <option value="police_operating">Police Operating</option>
                  <option value="police_aggressive">Police Aggressive</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select
                  value={lifecycle}
                  onChange={(event) => setLifecycle(event.target.value as LifecycleFilter)}
                  className="min-h-[36px] rounded-lg border border-input bg-background px-2 text-[11px]"
                  aria-label="Filter by lifecycle"
                >
                  <option value="all">Lifecycle</option>
                  <option value="active">Active</option>
                  <option value="developing">Developing</option>
                  <option value="resolved">Resolved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Incident list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {sortedIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <AlertTriangle size={28} className="opacity-30" />
                  <p className="text-sm">No incidents match these filters</p>
                </div>
              ) : (
                <motion.div layout className="pb-4">
                  {developingCount > 0 && (
                    <div className="px-3 pt-3 pb-1.5 text-[10px] font-extrabold tracking-[0.18em] uppercase text-orange-400 flex items-center gap-1.5">
                      <Radio size={10} className="animate-pulse" />
                      Developing · {developingCount}
                    </div>
                  )}
                  {sortedIncidents.map((incident) => (
                    <div key={incident.id}>
                      <IncidentListItem
                        incident={incident}
                        isNew={newIncidentIds.has(incident.id)}
                        onClick={() => {
                          onIncidentClick(incident)
                          onClose()
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
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
