import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Menu, MapPin, RefreshCw, Wifi, WifiOff, ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { IncidentMap } from '@/components/map/IncidentMap'
import { LiveIndicator } from '@/components/map/LiveIndicator'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { IncidentPanel } from '@/components/incident/IncidentPanel'
import { ReportModal } from '@/components/report/ReportModal'
import { useIncidents } from '@/hooks/useIncidents'
import { recordIncidentView } from '@/lib/reportApi'
import type { Incident, FilterOption } from '@/types/incident'

export function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set())
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Fetch incidents data
  const {
    incidents = [],
    allIncidents = [],
    isLoading = false,
    isError = false,
    refetch = () => {},
  } = useIncidents({
    filter,
    onNewIncidents: (ids) => {
      // Highlight freshly-appeared incidents (ping animation) for ~12s.
      setNewIncidentIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      setTimeout(() => {
        setNewIncidentIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      }, 12_000)
    },
  });

  // Opening an incident = (1) select it to show the panel, (2) pan the map
  // to it, (3) fire-and-forget a view record on the server.
  const handleIncidentClick = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
    setMapTarget([incident.incidentFields.latitude, incident.incidentFields.longitude])
    void recordIncidentView(incident.id)
  }, [])

  // LiveIndicator import (assume it's default or named)
  // import { LiveIndicator } from '@/components/map/LiveIndicator';

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-[900] w-full bg-card/95 backdrop-blur-md border-b border-border flex flex-col gap-0 md:gap-2">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {allIncidents.length} Incidents
            </span>
          </div>
          <button
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-full px-3 py-1.5 shadow transition-colors"
            onClick={() => setIsReportOpen(true)}
          >
            <Plus size={14} /> Add Report
          </button>
        </div>
        <div className="flex items-center justify-between px-3 pb-2 gap-2">
          <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Mamboleo Command Center</span>
          <div className="flex items-center gap-2">
            {/* Inline LIVE icon */}
            <span className="inline-block align-middle"><LiveIndicator /></span>
          </div>
        </div>
      </div>

      {/* Map and overlays */}
      <div className="relative flex-1">
        <IncidentMap
          incidents={incidents}
          allIncidents={allIncidents}
          mapTarget={mapTarget}
          newIncidentIds={newIncidentIds}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          onIncidentClick={handleIncidentClick}
          isPickingLocation={isReportOpen}
          onLocationPicked={(lat, lng) => setMapTarget([lat, lng])}
        />
      </div>

      {/* Sidebar (slide-in) */}
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

      {/* Incident panel (slide-in) */}
      <IncidentPanel
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />

      {/* Report modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmitSuccess={() => {
          setIsReportOpen(false)
          // Refresh the incident list immediately so the user sees their
          // newly-submitted report appear on the map without waiting for
          // the next 30s polling tick.
          void refetch()
        }}
      />

      {/* Toast notifications */}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
