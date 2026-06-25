import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
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
import { decodeWPGraphQLId, fetchIncidentCommunity, corroborateIncident, hasCorroborated, markCorroborated, unmarkCorroborated, type IncidentCommunityEntry } from '@/lib/reportApi'
import { getAdminIncident, getAdminSession, saveAdminIncident, type AdminIncident } from '@/lib/adminApi'
import { stripHtml } from '@/lib/utils'
import { IncidentMarker } from '@/components/map/IncidentMarker'
import { MapController } from '@/components/map/MapController'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const POST_STATUSES = ['pending', 'publish', 'draft'] as const
const INCIDENT_TYPES = ['fire', 'accident', 'police', 'weather', 'protest', 'flood', 'medical', 'military', 'info', 'health', 'environmental', 'homicide', 'femicide'] as const
const SEVERITIES = ['low', 'medium', 'high'] as const
const INCIDENT_SITUATIONS = ['unsafe', 'all_clear', 'police_operating', 'police_aggressive', 'unknown'] as const
const LIFECYCLES = ['active', 'developing', 'resolved', 'archived'] as const
const LOCATION_PRECISIONS = ['exact', 'subcounty', 'county', 'country'] as const

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

function deriveWpRoot(): string {
  const explicitWp = import.meta.env.VITE_WP_URL as string | undefined
  if (explicitWp) return explicitWp.replace(/\/$/, '')

  const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined
  if (endpoint) {
    try {
      const url = new URL(endpoint)
      const path = url.pathname.replace(/\/$/, '')
      const wpPath = path.endsWith('/graphql') ? path.slice(0, -'/graphql'.length) : path
      return `${url.origin}${wpPath}`
    } catch {
      // Fall through to current origin.
    }
  }

  return window.location.origin
}

type RestIncidentPayload = {
  body?: string | null
  excerpt?: string | { rendered?: string | null } | null
  reviewReason?: string | null
  review_reason?: string | null
  content?: { rendered?: string | null } | null
  meta?: {
    review_reason?: string | null
  } | null
}

type EditFields = Partial<AdminIncident>

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
  const [restBody, setRestBody] = useState('')
  const [restExcerpt, setRestExcerpt] = useState('')
  const [restReviewReason, setRestReviewReason] = useState('')
  const [displayTitle, setDisplayTitle] = useState('')
  const [canEditIncident, setCanEditIncident] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSavedMessage, setEditSavedMessage] = useState('')
  const [editFields, setEditFields] = useState<EditFields>({ title: '', excerpt: '', content: '' })

  function updateEditField<K extends keyof AdminIncident>(field: K, value: AdminIncident[K]) {
    setEditFields((current) => ({ ...current, [field]: value }))
  }

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

  useEffect(() => {
    if (!incident) return
    setDisplayTitle(incident.title)
    setEditFields({
      title: incident.title,
      excerpt: stripHtml(incident.excerpt).trim(),
      content: stripHtml(incident.content).trim(),
      type: incident.incidentFields.type,
      severity: incident.incidentFields.severity,
      incidentStatus: incident.incidentFields.status,
      incidentTime: incident.incidentFields.incidentTime ?? '',
      videoUrl: incident.incidentFields.videoUrl ?? '',
      latitude: incident.incidentFields.latitude,
      longitude: incident.incidentFields.longitude,
      lifecycle: incident.incidentFields.lifecycle,
      isVerified: incident.incidentFields.isVerified,
      reporterName: incident.incidentFields.reporterName ?? '',
    })
  }, [incident])

  useEffect(() => {
    let ignore = false
    setRestBody('')
    setRestExcerpt('')
    setRestReviewReason('')

    async function loadPostFallback() {
      if (!incident) return
      const postId = decodeWPGraphQLId(incident.id)
      const wpRoot = deriveWpRoot()

      try {
        const detailResponse = await fetch(`${wpRoot}/wp-json/mamboleo/v1/incidents/${postId}/detail`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (detailResponse.ok) {
          const payload = (await detailResponse.json()) as RestIncidentPayload
          if (!ignore) {
            const detailExcerpt = typeof payload.excerpt === 'string' ? payload.excerpt : payload.excerpt?.rendered
            setRestBody(stripHtml(payload.body ?? '').trim())
            setRestExcerpt(stripHtml(detailExcerpt ?? '').trim())
            setRestReviewReason(stripHtml(payload.reviewReason ?? payload.review_reason ?? '').trim())
          }
          return
        }

        const response = await fetch(`${wpRoot}/wp-json/wp/v2/incident/${postId}?_fields=content,excerpt,meta`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok || ignore) return
        const payload = (await response.json()) as RestIncidentPayload
        if (ignore) return
        const coreExcerpt = typeof payload.excerpt === 'string' ? payload.excerpt : payload.excerpt?.rendered
        setRestBody(stripHtml(payload.content?.rendered ?? '').trim())
        setRestExcerpt(stripHtml(coreExcerpt ?? '').trim())
        setRestReviewReason(stripHtml(payload.reviewReason ?? payload.review_reason ?? payload.meta?.review_reason ?? '').trim())
      } catch {
        // Best-effort fallback only.
      }
    }

    void loadPostFallback()
    return () => {
      ignore = true
    }
  }, [incident])

  useEffect(() => {
    let ignore = false
    setCanEditIncident(false)
    setEditLoading(false)
    setEditError(null)
    setEditSavedMessage('')

    async function loadEditableIncident() {
      if (!incident) return
      setEditLoading(true)
      try {
        const session = await getAdminSession()
        if (!session.authorized || ignore) return

        const postId = decodeWPGraphQLId(incident.id)
        const editable = await getAdminIncident(postId)
        if (ignore) return

        setCanEditIncident(true)
        setDisplayTitle(editable.title || incident.title)
        setEditFields(editable)
        setRestExcerpt(editable.excerpt ?? '')
        setRestBody(stripHtml(editable.content ?? '').trim())
        setRestReviewReason(editable.reviewReason ?? '')
      } catch {
        if (!ignore) setCanEditIncident(false)
      } finally {
        if (!ignore) setEditLoading(false)
      }
    }

    void loadEditableIncident()
    return () => {
      ignore = true
    }
  }, [incident])

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incident || editSaving) return

    setEditSaving(true)
    setEditError(null)
    setEditSavedMessage('')
    try {
      const postId = decodeWPGraphQLId(incident.id)
      const saved = await saveAdminIncident(postId, {
        ...editFields,
        latitude: Number(editFields.latitude ?? 0),
        longitude: Number(editFields.longitude ?? 0),
      })
      setDisplayTitle(saved.title)
      setEditFields(saved)
      setRestExcerpt(saved.excerpt ?? '')
      setRestBody(stripHtml(saved.content ?? '').trim())
      setRestReviewReason(saved.reviewReason ?? '')
      setEditSavedMessage('Incident updated')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update incident')
    } finally {
      setEditSaving(false)
    }
  }

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

  const type = INCIDENT_TYPES.includes((editFields.type ?? '') as (typeof INCIDENT_TYPES)[number]) ? editFields.type as (typeof INCIDENT_TYPES)[number] : incident.incidentFields.type
  const color = INCIDENT_COLORS[type]
  const typeBg = INCIDENT_BG[type]
  const severity = SEVERITIES.includes((editFields.severity ?? '') as (typeof SEVERITIES)[number]) ? editFields.severity as (typeof SEVERITIES)[number] : incident.incidentFields.severity
  const situation = INCIDENT_SITUATIONS.includes((editFields.incidentStatus ?? '') as (typeof INCIDENT_SITUATIONS)[number]) ? editFields.incidentStatus as (typeof INCIDENT_SITUATIONS)[number] : incident.incidentFields.status
  const sevColor = SEVERITY_COLORS[severity]
  const sevBg = SEVERITY_BG[severity]
  const statColor = STATUS_COLORS[situation]
  const statBg = STATUS_BG[situation]
  const excerptText = (stripHtml(incident.excerpt).trim() || restExcerpt).trim()
  const bodyText = (stripHtml(incident.content).trim() || restBody || excerptText).trim()
  const reviewReasonText = restReviewReason.trim()

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
                  Severity {severity}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: statBg, color: statColor, borderColor: `${statColor}44` }}>
                  {STATUS_LABELS[situation]}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">{displayTitle || incident.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock size={14} />{safeAgo(incident.date)}</span>
                <span>·</span>
                <span>{incident.date}</span>
                {incident.incidentFields.incidentTime && (
                  <>
                    <span>·</span>
                    <span>Reported time: {editFields.incidentTime || incident.incidentFields.incidentTime}</span>
                  </>
                )}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Reported by: {incident.incidentFields.isAnonymous ? 'Anonymous' : (incident.incidentFields.reporterName ?? 'Anonymous')}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoCard label="Confirmations" value={count.toString()} icon={<Users size={14} />} />
                <InfoCard label="Source" value={incident.incidentFields.sourceName ?? 'User report'} icon={<ShieldCheck size={14} />} />
                <InfoCard label="Location" value={editFields.locationName || getLocationLabel(incident)} icon={<MapPin size={14} />} />
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
                  <h3 className="text-sm font-semibold text-foreground mb-2">Review reason</h3>
                  <p className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {reviewReasonText || 'No review reason provided.'}
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

            {(canEditIncident || editLoading) && (
              <section className="rounded-3xl border border-border bg-card/70 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Edit incident</h2>
                    <p className="text-sm text-muted-foreground">Update this incident from the frontend.</p>
                  </div>
                  {editLoading && <span className="text-xs font-semibold text-muted-foreground">Loading editor...</span>}
                </div>

                <form className="space-y-4" onSubmit={handleEditSubmit}>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Title</span>
                    <input
                      aria-label="Incident title"
                      value={editFields.title ?? ''}
                      onChange={(event) => updateEditField('title', event.target.value)}
                      className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60"
                      placeholder="Incident title"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <select aria-label="Post status" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.status ?? 'pending'} onChange={(event) => updateEditField('status', event.target.value)}>{POST_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <select aria-label="Incident type" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.type ?? 'fire'} onChange={(event) => updateEditField('type', event.target.value)}>{INCIDENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <select aria-label="Incident severity" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.severity ?? 'low'} onChange={(event) => updateEditField('severity', event.target.value)}>{SEVERITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <select aria-label="Incident situation" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.incidentStatus ?? 'unsafe'} onChange={(event) => updateEditField('incidentStatus', event.target.value)}>{INCIDENT_SITUATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <select aria-label="Incident lifecycle" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.lifecycle ?? 'active'} onChange={(event) => updateEditField('lifecycle', event.target.value)}>{LIFECYCLES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <input aria-label="Incident time" type="datetime-local" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.incidentTime ?? ''} onChange={(event) => updateEditField('incidentTime', event.target.value)} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input aria-label="Location label" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.locationName ?? ''} onChange={(event) => updateEditField('locationName', event.target.value)} placeholder="Location label" />
                    <input aria-label="Video URL" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.videoUrl ?? ''} onChange={(event) => updateEditField('videoUrl', event.target.value)} placeholder="Video URL" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input aria-label="Latitude" type="number" step="0.000001" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.latitude ?? 0} onChange={(event) => updateEditField('latitude', Number(event.target.value))} />
                    <input aria-label="Longitude" type="number" step="0.000001" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.longitude ?? 0} onChange={(event) => updateEditField('longitude', Number(event.target.value))} />
                    <input aria-label="Country" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.locationCountry ?? 'kenya'} onChange={(event) => updateEditField('locationCountry', event.target.value)} placeholder="Country" />
                    <select aria-label="Location precision" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.locationPrecision ?? 'exact'} onChange={(event) => updateEditField('locationPrecision', event.target.value)}>{LOCATION_PRECISIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <input aria-label="County" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.locationCounty ?? ''} onChange={(event) => updateEditField('locationCounty', event.target.value)} placeholder="County" />
                    <input aria-label="Subcounty" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.locationSubcounty ?? ''} onChange={(event) => updateEditField('locationSubcounty', event.target.value)} placeholder="Subcounty" />
                    <input aria-label="Reporter name" className="min-h-[46px] rounded-2xl border border-input bg-background px-4 text-sm text-foreground" value={editFields.reporterName ?? ''} onChange={(event) => updateEditField('reporterName', event.target.value)} placeholder="Reporter name" />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                      <input type="checkbox" checked={Boolean(editFields.needsReview)} onChange={(event) => updateEditField('needsReview', event.target.checked)} />
                      Needs review
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                      <input type="checkbox" checked={Boolean(editFields.isVerified)} onChange={(event) => updateEditField('isVerified', event.target.checked)} />
                      Verified
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Review reason</span>
                    <textarea
                      aria-label="Review reason"
                      value={editFields.reviewReason ?? ''}
                      onChange={(event) => updateEditField('reviewReason', event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60"
                      placeholder="Review reason"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Excerpt</span>
                    <textarea
                      aria-label="Incident excerpt"
                      value={editFields.excerpt ?? ''}
                      onChange={(event) => updateEditField('excerpt', event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60"
                      placeholder="Short summary shown in lists and previews"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Details</span>
                    <textarea
                      aria-label="Incident details"
                      value={editFields.content ?? ''}
                      onChange={(event) => updateEditField('content', event.target.value)}
                      rows={7}
                      className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/60"
                      placeholder="Full incident details"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={editSaving || editLoading}
                      className="min-h-[46px] rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                    >
                      {editSaving ? 'Saving...' : 'Save incident'}
                    </button>
                    {editSavedMessage && <span className="text-sm font-semibold text-emerald-400">{editSavedMessage}</span>}
                    {editError && <span className="text-sm font-semibold text-amber-400">{editError}</span>}
                  </div>
                </form>
              </section>
            )}

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