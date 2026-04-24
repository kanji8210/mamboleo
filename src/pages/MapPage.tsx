import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Plus, Home, Newspaper, Radio } from 'lucide-react'

import { IncidentMap } from '@/components/map/IncidentMap'
import { LiveIndicator } from '@/components/map/LiveIndicator'
import { MapQuickNav } from '@/components/map/MapQuickNav'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { IncidentPanel } from '@/components/incident/IncidentPanel'
import { ReportModal } from '@/components/report/ReportModal'
import { useIncidents } from '@/hooks/useIncidents'
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts'
import { useAdvisories } from '@/hooks/useAdvisories'
import { AdvisoryBanner } from '@/components/advisory/AdvisoryBanner'
import { recordIncidentView } from '@/lib/reportApi'
import type { Incident, FilterOption } from '@/types/incident'

export function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set())
  const [mapTarget, setMapTarget] = useState<[number, number] | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Fetch user-submitted incidents from WPGraphQL
  const {
    allIncidents: allUserIncidents = [],
    isLoading = false,
    isError = false,
    refetch = () => {},
  } = useIncidents({
    filter,
    onNewIncidents: (ids) => {
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

  // Fetch official weather warnings from Open-Meteo and merge them in.
  const { data: weatherAlerts = [] } = useWeatherAlerts()

  // Fetch embassy / government travel advisories (UK FCDO, US State Dept,
  // France MAE, Canada Global Affairs, Australia Smartraveller). Shown in
  // a collapsible banner above the map — not merged into the incident
  // stream because they have no lat/long.
  const { data: advisories = [] } = useAdvisories()

  // Merge user reports + official alerts into a single stream.
  // Official alerts come first so they take precedence when IDs collide.
  const allIncidents: Incident[] = [...weatherAlerts, ...allUserIncidents]
  const incidents: Incident[] =
    filter === 'all'
      ? allIncidents
      : allIncidents.filter((i) => i.incidentFields.type === filter)

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
          <div className="flex items-center gap-3 min-w-0">
            {/* Brand → home */}
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 group" title="Back to home">
              <div className="w-6 h-6 rounded-md bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                <Radio size={12} className="text-red-400" />
              </div>
              <span className="hidden sm:inline text-[13px] font-black tracking-[0.15em] text-foreground font-mono group-hover:text-red-400 transition-colors">
                MAMBOLEO
              </span>
            </Link>
            <span className="text-sm font-bold text-foreground whitespace-nowrap">
              {allIncidents.length} Incidents
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Quick nav to leave map view */}
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-full px-2.5 py-1.5 transition-colors"
              title="Home"
            >
              <Home size={13} /> Home
            </Link>
            <Link
              to="/media"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-full px-2.5 py-1.5 transition-colors"
              title="Media Monitor"
            >
              <Newspaper size={13} /> Media
            </Link>
            {/* Mobile — icon-only */}
            <Link
              to="/"
              className="sm:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              title="Home"
            >
              <Home size={16} />
            </Link>
            <Link
              to="/media"
              className="sm:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              title="Media Monitor"
            >
              <Newspaper size={16} />
            </Link>
            <button
              className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-full px-3 py-1.5 shadow transition-colors"
              onClick={() => setIsReportOpen(true)}
            >
              <Plus size={14} /> <span className="hidden xs:inline sm:inline">Add Report</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 pb-2 gap-2">
          <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Mamboleo Command Center</span>
          <div className="flex items-center gap-2">
            {/* Inline LIVE icon */}
            <span className="inline-block align-middle"><LiveIndicator /></span>
          </div>
        </div>
        {/* Embassy travel advisories — auto-loaded, collapsible */}
        <AdvisoryBanner advisories={advisories} />

        {/* Quick-nav: county jump + locate-me */}
        <MapQuickNav
          onJumpTo={(lat, lng) => setMapTarget([lat, lng])}
          onLocateMe={(lat, lng) => {
            setUserLocation([lat, lng])
            setMapTarget([lat, lng])
          }}
        />
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
          filter={filter}
          onFilterChange={setFilter}
          userLocation={userLocation}
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
