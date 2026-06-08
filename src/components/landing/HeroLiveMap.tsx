import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Flame } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'

import { useIncidents } from '@/hooks/useIncidents'
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts'
import type { Incident, IncidentType } from '@/types/incident'
import { INCIDENT_COLORS, INCIDENT_LABELS } from '@/types/incident'
import { LiveMapPreview } from './LiveMapPreview'

/** Hero panel: Nairobi mini-map on the left + tappable incident list on the right. */
export function HeroLiveMap() {
  const { allIncidents, isLoading } = useIncidents({ filter: 'all' })
  const { data: weatherAlerts = [] } = useWeatherAlerts()

  const merged = useMemo<Incident[]>(
    () => [...weatherAlerts, ...allIncidents],
    [weatherAlerts, allIncidents],
  )

  // Newest 8 — newest first.
  const latest = useMemo<Incident[]>(
    () =>
      [...merged]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [merged],
  )

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Map ─ takes 2 of 3 columns on desktop ─────────────────────── */}
      <div className="lg:col-span-2">
        <LiveMapPreview incidents={merged} withinHours={48} />
      </div>

      {/* ── Live incident list (button-style rows) ────────────────────── */}
      <aside className="rounded-2xl border border-border bg-background/60 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock size={14} className="text-red-400" />
            Recent incidents
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {merged.length} active
          </span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <p className="text-xs text-muted-foreground">
              No incidents yet — the feed is live and will populate here automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border flex-1 overflow-y-auto max-h-[400px]">
            {latest.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} />
            ))}
          </ul>
        )}

        <Link
          to="/map"
          className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-border bg-card/40 hover:bg-card text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
        >
          View all on the map <ArrowRight size={12} />
        </Link>
      </aside>
    </div>
  )
}

// ─── Single incident row (button) ─────────────────────────────────────────

function IncidentRow({ incident }: { incident: Incident }) {
  const t = (incident.incidentFields.type as IncidentType) ?? 'info'
  const color = INCIDENT_COLORS[t] ?? '#94a3b8'
  const label = INCIDENT_LABELS[t] ?? t
  const ago   = safeTimeAgo(incident.date)
  // @ts-expect-error — locationName comes through GraphQL but isn't in the strict type
  const loc: string | undefined = incident.incidentFields.locationName

  return (
    <li>
      <div className="px-5 py-3 hover:bg-card/70 transition-colors group">
        <div className="flex items-center gap-3">
          <span
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: `${color}1a`,
              borderColor: `${color}44`,
            }}
          >
            <Flame size={12} style={{ color }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground line-clamp-1 group-hover:text-red-300 transition-colors">
              {incident.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
              <span
                className="font-semibold uppercase tracking-wider"
                style={{ color }}
              >
                {label}
              </span>
              {loc && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{loc}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono">{ago}</span>
            </div>
          </div>
          <motion.span
            className="text-muted-foreground/40 group-hover:text-red-400 transition-colors"
            aria-hidden="true"
          >
            <ArrowRight size={12} />
          </motion.span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to={`/incident/${encodeURIComponent(incident.id)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 bg-red-950/30 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-950/50 hover:text-red-200 transition-colors"
          >
            View full report
          </Link>
          <Link
            to={`/map?lat=${encodeURIComponent(String(incident.incidentFields.latitude))}&lng=${encodeURIComponent(String(incident.incidentFields.longitude))}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            View on map
          </Link>
        </div>
      </div>
    </li>
  )
}

// Safely format relative time. Returns "just now" for invalid / future dates.
function safeTimeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!t || t > Date.now() + 60_000) return 'just now'
  try {
    return `${formatDistanceToNowStrict(t)} ago`
  } catch {
    return 'just now'
  }
}
