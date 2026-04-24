import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNowStrict } from 'date-fns'
import {
  ArrowRight,
  AlertTriangle,
  CloudRain,
  Flame,
  Car,
  Shield,
  Activity,
  MapPin,
  Clock,
  Megaphone,
  Waves,
  Cross,
  Swords,
  Info,
  HeartPulse,
  Leaf,
} from 'lucide-react'

import { useIncidents } from '@/hooks/useIncidents'
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts'
import { useAdvisories } from '@/hooks/useAdvisories'
import type { Incident, IncidentType } from '@/types/incident'
import { INCIDENT_COLORS, INCIDENT_LABELS } from '@/types/incident'

// Icons per incident type.
const TYPE_ICONS: Record<IncidentType, typeof Flame> = {
  fire: Flame,
  accident: Car,
  police: Shield,
  weather: CloudRain,
  protest: Megaphone,
  flood: Waves,
  medical: Cross,
  military: Swords,
  info: Info,
  health: HeartPulse,
  environmental: Leaf,
}

// Count incidents within the last N hours.
function recentCount(list: Incident[], hours: number): number {
  const cutoff = Date.now() - hours * 3600_000
  return list.filter((i) => new Date(i.date).getTime() >= cutoff).length
}

// Count unique counties with at least one incident (fallback = location_name).
function uniqueLocationCount(list: Incident[]): number {
  const names = new Set<string>()
  for (const i of list) {
    // @ts-expect-error — locationName is present on the GraphQL payload
    const name: string | undefined = i.incidentFields.locationName
    if (name) names.add(name.toLowerCase())
  }
  return names.size
}

export function LiveDataSection() {
  const { allIncidents, isLoading, isFetching, refetch } = useIncidents({ filter: 'all' })
  const { data: weatherAlerts = [] } = useWeatherAlerts()
  const { data: advisories = [] } = useAdvisories()

  // Merged stream for stats (same logic as MapPage).
  const merged = useMemo<Incident[]>(
    () => [...weatherAlerts, ...allIncidents],
    [weatherAlerts, allIncidents],
  )

  // Per-type breakdown.
  const breakdown = useMemo(() => {
    const counts: Record<IncidentType, number> = {
      fire: 0, accident: 0, police: 0, weather: 0,
      protest: 0, flood: 0, medical: 0,
      military: 0, info: 0, health: 0, environmental: 0,
    }
    for (const i of merged) {
      const t = i.incidentFields.type as IncidentType
      if (t in counts) counts[t]++
    }
    return counts
  }, [merged])

  const last24h   = useMemo(() => recentCount(merged, 24), [merged])
  const locations = useMemo(() => uniqueLocationCount(merged), [merged])
  const maxCount  = Math.max(1, ...Object.values(breakdown))

  // Latest 5 — newest first.
  const latest = useMemo<Incident[]>(
    () =>
      [...merged]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [merged],
  )

  return (
    <section
      id="live-data"
      className="relative border-y border-border bg-card/30 py-20 px-4 sm:px-6 overflow-hidden"
    >
      {/* Ambient glow */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-red-600/5 blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-red-400 uppercase font-mono mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live Data
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
              What's happening{' '}
              <span className="text-red-500">right now</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm sm:text-base">
              Incidents, weather alerts, and embassy advisories streaming in real
              time — updated every 30 seconds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Activity size={12} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Syncing…' : 'Refresh'}
            </button>
            <Link
              to="/map"
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              Open map <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* ── Headline stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          <StatCard
            label="Active Incidents"
            value={isLoading ? null : merged.length}
            sub={`${last24h} in last 24h`}
            icon={<AlertTriangle size={16} />}
            accent="text-red-400 border-red-900/50 bg-red-950/30"
          />
          <StatCard
            label="Counties Affected"
            value={isLoading ? null : locations}
            sub="with active reports"
            icon={<MapPin size={16} />}
            accent="text-orange-400 border-orange-900/50 bg-orange-950/20"
          />
          <StatCard
            label="Weather Alerts"
            value={weatherAlerts.length}
            sub="Open-Meteo · KMD"
            icon={<CloudRain size={16} />}
            accent="text-cyan-400 border-cyan-900/50 bg-cyan-950/20"
          />
          <StatCard
            label="Travel Advisories"
            value={advisories.length}
            sub={advisories.length > 0 ? advisories[0].source : 'None active'}
            icon={<Shield size={16} />}
            accent="text-amber-400 border-amber-900/50 bg-amber-950/20"
          />
        </div>

        {/* ── Breakdown + Latest activity ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Incident type breakdown */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-background/60 p-6">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              <Activity size={14} className="text-red-400" />
              By Type
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Distribution across all active events.
            </p>

            <div className="space-y-3">
              {(Object.keys(breakdown) as IncidentType[]).map((t) => {
                const Icon  = TYPE_ICONS[t]
                const count = breakdown[t]
                const pct   = Math.round((count / maxCount) * 100)
                const color = INCIDENT_COLORS[t]
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Icon size={12} style={{ color }} />
                        {INCIDENT_LABELS[t]}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-card overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Latest incidents ticker */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-background/60 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock size={14} className="text-red-400" />
                Latest Activity
              </h3>
              <Link
                to="/map"
                className="text-[11px] font-semibold text-red-400 hover:text-red-300"
              >
                See all →
              </Link>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : latest.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-border">
                {latest.map((inc) => {
                  const t = inc.incidentFields.type as IncidentType
                  const Icon = TYPE_ICONS[t] ?? AlertTriangle
                  const color = INCIDENT_COLORS[t] ?? '#94a3b8'
                  const ago = safeTimeAgo(inc.date)
                  // @ts-expect-error — locationName present via GraphQL
                  const loc: string | undefined = inc.incidentFields.locationName
                  return (
                    <li key={inc.id}>
                      <Link
                        to="/map"
                        className="flex items-start gap-3 px-6 py-3 hover:bg-card/60 transition-colors"
                      >
                        <span
                          className="shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border"
                          style={{
                            backgroundColor: `${color}1a`,
                            borderColor: `${color}44`,
                          }}
                        >
                          <Icon size={14} style={{ color }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {inc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span
                              className="font-semibold uppercase tracking-wide"
                              style={{ color }}
                            >
                              {INCIDENT_LABELS[t] ?? t}
                            </span>
                            {loc && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="flex items-center gap-0.5">
                                  <MapPin size={10} />
                                  {loc}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{ago}</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | null
  sub: string
  icon: React.ReactNode
  accent: string
}

function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase font-mono">
          {label}
        </span>
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accent}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-foreground leading-none mb-1">
        {value === null ? (
          <span className="inline-block w-16 h-8 bg-card animate-pulse rounded" />
        ) : (
          value.toLocaleString()
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-muted-foreground">
        No activity yet. The feed is live — new events will appear here automatically.
      </p>
    </div>
  )
}

// Safely format time-ago. Returns "just now" for invalid / future dates.
function safeTimeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!t || t > Date.now() + 60_000) return 'just now'
  try {
    return `${formatDistanceToNowStrict(t)} ago`
  } catch {
    return 'just now'
  }
}
