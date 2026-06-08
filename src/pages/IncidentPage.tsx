import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

import { useIncidents } from '@/hooks/useIncidents'
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts'
import type { Incident } from '@/types/incident'
import { INCIDENT_COLORS, INCIDENT_LABELS, INCIDENT_BG, STATUS_LABELS, STATUS_COLORS, STATUS_BG, SEVERITY_BG, SEVERITY_COLORS } from '@/types/incident'
import { fetchIncidentCommunity, corroborateIncident, hasCorroborated, markCorroborated, unmarkCorroborated, type IncidentCommunityEntry } from '@/lib/reportApi'
import { stripHtml } from '@/lib/utils'
import { IncidentMarker } from '@/components/map/IncidentMarker'
import { MapController } from '@/components/map/MapController'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function safeAgo(value: string): string {
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true })
  } catch {
    return 'recently'
  }
}

function buildDescription(incident: Incident): string {
  const parts = [stripHtml(incident.content || incident.excerpt)]
  const sourceName = incident.incidentFields.sourceName
  const sourceUrl = incident.incidentFields.sourceUrl
  if (sourceName) parts.push(`Source: ${sourceName}${sourceUrl ? ` (${sourceUrl})` : ''}`)
  return parts.filter(Boolean).join('\n\n')
}

function getLocationLabel(incident: Incident): string {
  const fields = incident.incidentFields as Incident['incidentFields'] & { locationName?: string | null }
  return fields.locationName ?? 'Mapped point'
}

export function IncidentPage() {
  const { id = '' } = useParams()
  const { allIncidents: allUserIncidents = [], isLoading } = useIncidents({ filter: 'all' })
  const { data: weatherAlerts = [] } = useWeatherAlerts()

  const incidents = useMemo(() => [...weatherAlerts, ...allUserIncidents], [weatherAlerts, allUserIncidents])
  const incident = useMemo(() => incidents.find((entry) => entry.id === id) ?? null, [incidents, id])

  const [community, setCommunity] = useState<IncidentCommunityEntry[]>([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communityError, setCommunityError] = useState<string | null>(null)
  const [confirmComment, setConfirmComment] = useState('')
  const [confirmOnSite, setConfirmOnSite] = useState(false)
  const [confirmAtIncidentTime, setConfirmAtIncidentTime] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localCount, setLocalCount] = useState<number | null>(null)

  const isConfirmed = incident ? hasCorroborated(incident.id) : false
  const count = localCount ?? (incident?.incidentFields.corroborationCount ?? 0)

  const loadCommunity = useCallback(async () => {
    if (!incident) return
    setCommunityLoading(true)
    setCommunityError(null)
    try {
      const data = await fetchIncidentCommunity(incident.id)
      setCommunity(data.entries)
      setLocalCount(data.count)
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'Could not load community confirmations')
    } finally {
      setCommunityLoading(false)
    }
  }, [incident])

  useEffect(() => {
    if (!incident) return
    void loadCommunity()
  }, [incident, loadCommunity])

  const handleCorroborate = useCallback(async () => {
    if (!incident || submitting) return
    setSubmitting(true)
    try {
      const result = await corroborateIncident(incident.id, {
        comment: confirmComment.trim() || undefined,
        onSite: confirmOnSite,
        atIncidentTime: confirmAtIncidentTime,
      })
      setLocalCount(result.count)
      if (result.confirmed) {
        markCorroborated(incident.id)
        setConfirmComment('')
        setConfirmOnSite(false)
        setConfirmAtIncidentTime(false)
      } else {
        unmarkCorroborated(incident.id)
      }
      await loadCommunity()
    } catch (err) {
      setCommunityError(err instanceof Error ? err.message : 'Could not update confirmation')
    } finally {
      setSubmitting(false)
    }
  }, [incident, submitting, confirmComment, confirmOnSite, confirmAtIncidentTime, loadCommunity])

  useEffect(() => {
    if (incident) {
      void recordView(incident.id)
    }
  }, [incident])

  const markerCenter = incident ? [incident.incidentFields.latitude, incident.incidentFields.longitude] as [number, number] : null

  if (isLoading && !incident) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading incident…</p>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Incident not found</h1>
          <p className="text-muted-foreground mb-6">The incident may have been removed or the link is incorrect.</p>
          <Link to="/map" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
            <ArrowLeft size={14} /> Back to map
          </Link>
        </div>
      </div>
    )
  }

  const type = incident.incidentFields.type
  const color = INCIDENT_COLORS[type]
  const typeBg = INCIDENT_BG[type]
  const sevColor = SEVERITY_COLORS[incident.incidentFields.severity]
  const sevBg = SEVERITY_BG[incident.incidentFields.severity]
  const statColor = STATUS_COLORS[incident.incidentFields.status]
  const statBg = STATUS_BG[incident.incidentFields.status]
  const excerptText = stripHtml(incident.excerpt).trim()
  const bodyText = stripHtml(incident.content).trim()

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/map" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Back to map
          </Link>
          <Link to={`/map?incident=${encodeURIComponent(incident.id)}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">
            Open in map drawer <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <article className="space-y-6">
            <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-2xl shadow-black/20">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: typeBg, color, borderColor: `${color}44` }}>
                  {INCIDENT_LABELS[type]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold capitalize" style={{ background: sevBg, color: sevColor, borderColor: `${sevColor}44` }}>
                  Severity {incident.incidentFields.severity}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: statBg, color: statColor, borderColor: `${statColor}44` }}>
                  {STATUS_LABELS[incident.incidentFields.status]}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">{incident.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock size={14} />{safeAgo(incident.date)}</span>
                <span>·</span>
                <span>{incident.date}</span>
                {incident.incidentFields.incidentTime && (
                  <>
                    <span>·</span>
                    <span>Reported time: {incident.incidentFields.incidentTime}</span>
                  </>
                )}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Reported by: {incident.incidentFields.isAnonymous ? 'Anonymous' : (incident.incidentFields.reporterName ?? 'Anonymous')}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoCard label="Confirmations" value={count.toString()} icon={<Users size={14} />} />
                <InfoCard label="Source" value={incident.incidentFields.sourceName ?? 'User report'} icon={<ShieldCheck size={14} />} />
                <InfoCard label="Location" value={getLocationLabel(incident)} icon={<MapPin size={14} />} />
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/70 p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Collected report</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Excerpt</h3>
                  <p className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                    {excerptText || 'No excerpt provided.'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Body</h3>
                  <p className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {bodyText || 'No body provided.'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Full report summary</h3>
                  <p className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {buildDescription(incident)}
                  </p>
                </div>
                {incident.incidentFields.sourceUrl && (
                  <a href={incident.incidentFields.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">
                    Open source <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/70 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Confirm this report</h2>
                  <p className="text-sm text-muted-foreground">Add a note if you were on site or witnessed this around the reported time.</p>
                </div>
                <button
                  onClick={handleCorroborate}
                  disabled={submitting}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting…' : isConfirmed ? 'Unconfirm' : 'Confirm this report'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-start gap-2 rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  <input type="checkbox" checked={confirmOnSite} onChange={(event) => setConfirmOnSite(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border bg-input" />
                  <span>I am at or near the incident location.</span>
                </label>
                <label className="flex items-start gap-2 rounded-2xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
                  <input type="checkbox" checked={confirmAtIncidentTime} onChange={(event) => setConfirmAtIncidentTime(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border bg-input" />
                  <span>I witnessed this around the reported time.</span>
                </label>
              </div>

              <textarea
                value={confirmComment}
                onChange={(event) => setConfirmComment(event.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Add a short message or extra detail"
                className="mt-3 w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60 resize-none"
              />

              {communityError && <p className="mt-3 text-sm text-amber-400">{communityError}</p>}
            </section>
          </article>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-2xl shadow-black/20">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Incident location</h2>
              </div>
              <div className="h-[360px]">
                <MapContainer
                  center={[incident.incidentFields.latitude, incident.incidentFields.longitude]}
                  zoom={14}
                  minZoom={3}
                  maxZoom={19}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl
                  attributionControl={false}
                >
                  <TileLayer
                    url={TILE_URL}
                    subdomains="abcd"
                    maxZoom={19}
                    keepBuffer={4}
                    updateWhenIdle
                    updateWhenZooming={false}
                    crossOrigin
                    errorTileUrl="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                  />
                  <IncidentMarker incident={incident} onClick={() => undefined} />
                  {markerCenter && <MapController target={markerCenter} incidents={[incident]} />}
                </MapContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/70 p-5">
              <h2 className="text-lg font-bold text-foreground mb-3">Community notes</h2>
              {communityLoading ? (
                <p className="text-sm text-muted-foreground">Loading community confirmations…</p>
              ) : community.length === 0 ? (
                <p className="text-sm text-muted-foreground">No community confirmations yet.</p>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {community.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border bg-background/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span>{safeAgo(entry.createdAt)}</span>
                        {entry.onSite && <span className="rounded-full border border-sky-900/50 bg-sky-950/40 px-2 py-0.5 text-sky-300">On site</span>}
                        {entry.atIncidentTime && <span className="rounded-full border border-violet-900/50 bg-violet-950/40 px-2 py-0.5 text-violet-300">At reported time</span>}
                      </div>
                      {entry.comment ? <p className="text-sm text-muted-foreground leading-relaxed">{entry.comment}</p> : <p className="text-sm text-muted-foreground">Confirmed without extra message.</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

async function recordView(id: string): Promise<void> {
  try {
    const { recordIncidentView } = await import('@/lib/reportApi')
    void recordIncidentView(id)
  } catch {
    // no-op
  }
}