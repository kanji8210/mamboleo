import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Menu, MapPin, RefreshCw, Wifi, WifiOff, ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { IncidentMap } from '@/components/map/IncidentMap'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { IncidentPanel } from '@/components/incident/IncidentPanel'
import { ReportModal } from '@/components/report/ReportModal'
import { useIncidents } from '@/hooks/useIncidents'
import type { Incident, FilterOption } from '@/types/incident'

export function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set())
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    document.body.classList.add('map-page')
    document.getElementById('root')?.classList.add('map-root')
    return () => {
      document.body.classList.remove('map-page')
      document.getElementById('root')?.classList.remove('map-root')
    }
  }, [])

  const handleNewIncidents = useCallback((ids: string[]) => {
    setNewIncidentIds(new Set(ids))
    setTimeout(() => setNewIncidentIds(new Set()), 4500)
  }, [])

  const { incidents, allIncidents, isLoading, isFetching, isError, refetch } = useIncidents({
    filter,
    onNewIncidents: handleNewIncidents,
  })

  const handleIncidentClick = useCallback((incident: Incident) => {
    setMapTarget([incident.incidentFields.latitude, incident.incidentFields.longitude])
    setSelectedIncident(incident)
  }, [])


  const isFirstLoad = isLoading && allIncidents.length === 0;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">

      {/* ── Full-screen map ──────────────────────────────────────────────── */}
      <IncidentMap
        incidents={incidents}
        allIncidents={allIncidents}
        mapTarget={mapTarget}
        newIncidentIds={newIncidentIds}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onIncidentClick={handleIncidentClick}
      />

      {/* ── Top navigation bar ───────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-[800] pointer-events-none">
        <div className="flex items-start justify-between px-4 pt-4 gap-3">

          {/* Brand + hamburger */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Back to home */}
            <Link
              to="/"
              className="flex items-center justify-center w-9 h-9 bg-card/85 backdrop-blur-md border border-border/70 rounded-xl shadow-xl hover:bg-card/95 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Back to home"
            >
              <ArrowLeft size={15} />
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-xl px-3.5 py-2 shadow-xl hover:bg-card/95 transition-colors"
              aria-label="Open command center"
            >
              <Menu size={15} className="text-foreground" />
              <span className="text-[13px] font-black text-foreground tracking-[0.18em] font-mono">
                MAMBOLEO
              </span>
            </motion.button>
          </div>

          {/* Right status chips + Report button */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {isError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 bg-red-950/90 border border-red-800/70 rounded-lg px-3 py-1.5 text-xs text-red-400 shadow-lg"
                  >
                    <WifiOff size={11} />
                    <span className="font-medium">Connection error</span>
                    <button
                      onClick={() => void refetch()}
                      className="hover:text-red-300 transition-colors ml-1"
                      aria-label="Retry"
                    >
                      <RefreshCw size={11} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {isFetching && (
                <div className="flex items-center gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-lg px-2.5 py-1.5 shadow-lg">
                  {isFirstLoad
                    ? <Loader2 size={11} className="text-blue-400 animate-spin" />
                    : <Wifi size={11} className="text-blue-400 animate-pulse" />
                  }
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {isFirstLoad ? 'FETCHING' : 'SYNCING'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-lg px-2.5 py-1.5 shadow-lg">
                <MapPin size={11} className="text-muted-foreground" />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {allIncidents.length} incidents · Kenya
                </span>
              </div>

              {/* Report incident button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsReportOpen(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl px-3 py-2 shadow-lg transition-colors ml-2"
                aria-label="Report incident"
              >
                <Plus size={14} />
                Report incident
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Incident detail panel ────────────────────────────────────────── */}
      <IncidentPanel
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />



      {/* ── Report modal ─────────────────────────────────────────────────── */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmitSuccess={() => void refetch()}
      />

      {/* ── Collapsible sidebar ──────────────────────────────────────────── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        incidents={incidents}
        allIncidents={allIncidents}
        filter={filter}
        onFilterChange={setFilter}
        newIncidentIds={newIncidentIds}
        onIncidentClick={handleIncidentClick}
      />

      {/* ── Toasts ───────────────────────────────────────────────────────── */}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'hsl(224 16% 9%)',
            border: '1px solid hsl(224 14% 17%)',
            color: 'hsl(210 20% 94%)',
            fontSize: '13px',
          },
        }}
      />
    </div>
  )
}
