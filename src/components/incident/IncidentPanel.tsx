import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, ExternalLink, Play, Users, Eye, Phone,
  AlertTriangle, CheckCircle2, Shield, ShieldAlert, HelpCircle,
  Flame, Car, CloudRain, Clock, BadgeCheck, BadgeX,
  Megaphone, Waves, Cross, Swords, Info, HeartPulse, Leaf,
} from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import type { Incident, IncidentType, IncidentStatus } from '@/types/incident'
import {
  INCIDENT_COLORS, INCIDENT_LABELS, INCIDENT_BG,
  SEVERITY_COLORS, SEVERITY_BG,
  STATUS_LABELS, STATUS_COLORS, STATUS_BG,
} from '@/types/incident'
import { corroborateIncident, hasCorroborated, markCorroborated, unmarkCorroborated } from '@/lib/reportApi'
import { stripHtml } from '@/lib/utils'

// ─── Contextual guidance per type ────────────────────────────────────────

const GUIDANCE: Record<IncidentType, {
  action: string
  contacts: { label: string; number: string }[]
  link?: string
}> = {
  fire: {
    action: 'Evacuate immediately. Do not use elevators. Stay low if smoke is present. Keep doors closed to slow fire spread.',
    contacts: [{ label: 'Kenya Fire Brigade', number: '999' }],
  },
  accident: {
    action: 'Avoid the area. If you witness injuries, call emergency services. Do not move injured persons unless in immediate danger.',
    contacts: [
      { label: 'Emergency', number: '999' },
      { label: 'NTSA Hotline', number: '0800 723 225' },
    ],
    link: 'https://www.ntsa.go.ke',
  },
  police: {
    action: 'Follow all official instructions. Do not obstruct operations. Stay calm and keep a safe distance.',
    contacts: [{ label: 'NPS Emergency', number: '999' }],
  },
  weather: {
    action: 'Seek shelter immediately. Avoid flooded roads — 15cm of water can sweep a person off their feet. Avoid low-lying areas.',
    contacts: [{ label: 'Emergency', number: '999' }],
    link: 'https://www.meteo.go.ke',
  },
  protest: {
    action: 'Avoid the area. Do not film police at close range. Keep identification and water handy. Leave via back streets if caught in the crowd.',
    contacts: [
      { label: 'Police Emergency', number: '999' },
      { label: 'IPOA Hotline', number: '0800 906 606' },
    ],
  },
  flood: {
    action: 'Move to higher ground immediately. Avoid walking or driving through flood water — 15cm can sweep a person off their feet, 60cm can float a car. Do not touch downed power lines.',
    contacts: [
      { label: 'Emergency', number: '999' },
      { label: 'Red Cross Kenya', number: '1199' },
    ],
    link: 'https://www.meteo.go.ke',
  },
  medical: {
    action: 'Seek urgent medical care if symptomatic. Drink only treated or boiled water. Wash hands with soap. Report unusual symptoms to the nearest health facility.',
    contacts: [
      { label: 'Emergency', number: '999' },
      { label: 'Ministry of Health', number: '0729 471 414' },
    ],
    link: 'https://www.health.go.ke',
  },
  military: {
    action: 'Avoid the area. Do not photograph security installations or personnel. Follow KDF / police directions without delay. Keep ID accessible.',
    contacts: [
      { label: 'Emergency', number: '999' },
      { label: 'KDF Hotline', number: '0722 205 642' },
    ],
    link: 'https://www.mod.go.ke',
  },
  info: {
    action: 'Informational bulletin. Verify with official channels before acting. Share only from trusted sources to avoid spreading unverified claims.',
    contacts: [{ label: 'Emergency', number: '999' }],
  },
  health: {
    action: 'Follow Ministry of Health guidance. Seek care early if symptomatic. Maintain hand hygiene and avoid sharing utensils or drinks.',
    contacts: [
      { label: 'MoH Hotline', number: '719' },
      { label: 'Ministry of Health', number: '0729 471 414' },
    ],
    link: 'https://www.health.go.ke',
  },
  environmental: {
    action: 'Avoid affected area if air or water quality is poor. Cover nose and mouth near smoke or dust. Report pollution events to NEMA.',
    contacts: [
      { label: 'NEMA Hotline', number: '0800 221 777' },
      { label: 'Emergency', number: '999' },
    ],
    link: 'https://www.nema.go.ke',
  },
}

// ─── Icon maps ────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<IncidentStatus, React.ElementType> = {
  all_clear: CheckCircle2,
  unsafe: AlertTriangle,
  police_operating: Shield,
  police_aggressive: ShieldAlert,
  unknown: HelpCircle,
}

const TYPE_ICONS: Record<IncidentType, React.ElementType> = {
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

// ─── Props ────────────────────────────────────────────────────────────────

interface IncidentPanelProps {
  incident: Incident | null
  onClose: () => void
}

// ─── Component ───────────────────────────────────────────────────────────

export function IncidentPanel({ incident, onClose }: IncidentPanelProps) {
  const [localCount, setLocalCount] = useState<number | null>(null)
  const [corroborating, setCorroborating] = useState(false)
  const [corroborated, setCorroborated] = useState(false)

  // Sync state when incident changes
  const effectiveCount = localCount ?? (incident?.incidentFields.corroborationCount ?? 0)
  const alreadyDone = incident ? hasCorroborated(incident.id) : false

  async function handleCorroborate() {
    if (!incident || corroborating) return
    setCorroborating(true)
    try {
      const { count, confirmed } = await corroborateIncident(incident.id)
      setLocalCount(count)
      setCorroborated(confirmed)
      if (confirmed) markCorroborated(incident.id)
      else unmarkCorroborated(incident.id)
    } catch (err) {
      // Rate-limit or network error — surface it briefly to the user.
      const msg = err instanceof Error ? err.message : 'Could not update confirmation'
      toast.error(msg)
    } finally {
      setCorroborating(false)
    }
  }

  // Close on Escape — standard dialog affordance.
  useEffect(() => {
    if (!incident) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [incident, onClose])

  // Reset local state on new incident
  function onIncidentChange(prev: Incident | null, next: Incident | null) {
    if (prev?.id !== next?.id) {
      setLocalCount(null)
      setCorroborated(false)
    }
  }

  return (
    <AnimatePresence onExitComplete={() => onIncidentChange(incident, null)}>
      {incident && (
        <>
          {/* Backdrop: tap anywhere to close (mobile + desktop) */}
          <motion.div
            key="panel-backdrop"
            className="fixed inset-0 z-[750] bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — starts below the app header on ≥sm so there's no overlap */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Incident details"
            key={`panel-${incident.id}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            onAnimationStart={() => onIncidentChange(null, incident)}
            className={[
              'fixed right-0 z-[760] bg-card shadow-2xl flex flex-col overflow-hidden',
              // mobile: full sheet
              'top-0 bottom-0 w-full',
              // desktop: slide-in drawer that sits below the header
              'sm:top-[92px] sm:bottom-3 sm:right-3 sm:w-[380px] sm:rounded-2xl sm:border sm:border-border',
            ].join(' ')}
          >
            <PanelContent
              incident={incident}
              onClose={onClose}
              effectiveCount={effectiveCount}
              isConfirmed={alreadyDone || corroborated}
              corroborating={corroborating}
              onCorroborate={handleCorroborate}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Panel inner content (extracted for clarity) ─────────────────────────

function PanelContent({
  incident,
  onClose,
  effectiveCount,
  isConfirmed,
  corroborating,
  onCorroborate,
}: {
  incident: Incident
  onClose: () => void
  effectiveCount: number
  isConfirmed: boolean
  corroborating: boolean
  onCorroborate: () => void
}) {
  const {
    type, severity, status, latitude, longitude,
    incidentTime, videoUrl, reporterName, isAnonymous,
    isVerified, corroborationCount: _,
    sourceUrl, sourceName,
  } = incident.incidentFields

  const typeColor   = INCIDENT_COLORS[type]
  const typeBg      = INCIDENT_BG[type]
  const sevColor    = SEVERITY_COLORS[severity]
  const sevBg       = SEVERITY_BG[severity]
  const statColor   = STATUS_COLORS[status]
  const statBg      = STATUS_BG[status]
  const TypeIcon    = TYPE_ICONS[type]
  const StatusIcon  = STATUS_ICONS[status]
  const guidance    = GUIDANCE[type]
  const mapsUrl     = `https://maps.google.com?q=${latitude},${longitude}`

  let postDate: string
  try {
    postDate = format(parseISO(incident.date), 'MMM d, HH:mm')
  } catch {
    postDate = incident.date
  }

  const timeAgo = (() => {
    try { return formatDistanceToNow(parseISO(incident.date), { addSuffix: true }) }
    catch { return '' }
  })()

  let incidentTimeFormatted: string | null = null
  if (incidentTime) {
    try { incidentTimeFormatted = format(parseISO(incidentTime), 'MMM d, HH:mm') }
    catch { incidentTimeFormatted = incidentTime }
  }

  return (
    <>
      {/* ── Header (sticky) ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-card/95 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: typeBg, border: `1px solid ${typeColor}44` }}
          >
            <TypeIcon size={14} style={{ color: typeColor }} />
          </div>
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase font-mono truncate">
            Incident Detail
          </span>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-accent/60 hover:bg-accent border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 py-3 space-y-3">

          {/* ── Title + badges ─────────────────────────────────────── */}
          <section>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border"
                style={{ color: typeColor, background: typeBg, borderColor: `${typeColor}44` }}
              >
                <TypeIcon size={10} />
                {INCIDENT_LABELS[type]}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border capitalize"
                style={{ color: sevColor, background: sevBg, borderColor: `${sevColor}44` }}
              >
                {severity}
              </span>
              {isVerified
                ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-green-400 bg-green-950/30 border border-green-900/40">
                    <BadgeCheck size={10} /> Verified
                  </span>
                : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-amber-400 bg-amber-950/30 border border-amber-900/40">
                    <BadgeX size={10} /> User Report
                  </span>
              }
            </div>

            <h2 className="text-[15px] font-bold text-foreground leading-snug mb-1">
              {incident.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock size={10} />{timeAgo}</span>
              <span className="text-border">·</span>
              <span>{postDate}</span>
              {incidentTimeFormatted && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Incident: {incidentTimeFormatted}
                  </span>
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Reported by: {isAnonymous ? 'Anonymous' : (reporterName ?? 'Anonymous')}
            </p>
          </section>

          {/* ── Status banner ──────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 border"
            style={{ background: statBg, borderColor: `${statColor}44` }}
          >
            <StatusIcon size={15} style={{ color: statColor, flexShrink: 0 }} />
            <span className="text-sm font-bold" style={{ color: statColor }}>
              {STATUS_LABELS[status]}
            </span>
          </div>

          {/* ── Description ────────────────────────────────────────── */}
          {incident.excerpt && (
            <section className="rounded-xl bg-muted/20 border border-border/50 px-3 py-2.5">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {stripHtml(incident.excerpt)}
              </p>
            </section>
          )}

          {/* ── Location ───────────────────────────────────────────── */}
          <section className="flex items-center justify-between gap-2 rounded-xl bg-muted/10 border border-border/50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0">
              <MapPin size={12} className="flex-shrink-0 text-muted-foreground/60" />
              <span className="font-mono truncate">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
            >
              <ExternalLink size={10} />
              Maps
            </a>
          </section>

          {/* ── Video link ─────────────────────────────────────────── */}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-all"
            >
              <Play size={14} />
              Watch video evidence
              <ExternalLink size={11} className="ml-auto" />
            </a>
          )}

          {/* ── External source (official feed / article) ──────────── */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-sky-950/30 border border-sky-900/50 rounded-xl px-3 py-2.5 text-sm font-semibold text-sky-300 hover:text-sky-200 hover:bg-sky-950/50 transition-all"
            >
              <ExternalLink size={13} className="flex-shrink-0" />
              <span className="truncate">
                More info{sourceName ? ` · ${sourceName}` : ''}
              </span>
              <ExternalLink size={11} className="ml-auto opacity-60" />
            </a>
          )}

          {/* ── Corroboration (hidden for automatic/official feeds) ── */}
          {!incident.id.startsWith('weather-') && (
            <section className="rounded-xl bg-muted/10 border border-border/50 px-3 py-2.5">
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/50 uppercase font-mono mb-2">
                Corroboration
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                  <Users size={13} className="flex-shrink-0" />
                  <span className="truncate">
                    <span className="font-bold text-foreground">{effectiveCount}</span>
                    {effectiveCount === 1 ? ' person' : ' people'} confirmed
                  </span>
                </div>
                <button
                  onClick={onCorroborate}
                  disabled={corroborating}
                  aria-pressed={isConfirmed}
                  className={[
                    'flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-2 border transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring flex-shrink-0',
                    isConfirmed
                      ? 'text-green-400 bg-green-950/30 border-green-900/40 hover:bg-green-950/50 hover:text-green-300'
                      : 'text-foreground bg-accent/50 border-border hover:bg-accent hover:border-border/80',
                  ].join(' ')}
                >
                  {corroborating ? (
                    <span className="animate-pulse">{isConfirmed ? 'Unconfirming…' : 'Confirming…'}</span>
                  ) : isConfirmed ? (
                    <><BadgeX size={11} /> Unconfirm</>
                  ) : (
                    <><Eye size={11} /> I see this too</>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* ── What to do ─────────────────────────────────────────── */}
          <section className="rounded-xl bg-muted/10 border border-border/50 px-3 py-2.5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/50 uppercase font-mono mb-1.5">
              What to do
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
              {guidance.action}
            </p>
            <div className="flex flex-col gap-1">
              {guidance.contacts.map(({ label, number }) => (
                <a
                  key={label}
                  href={`tel:${number}`}
                  className="flex items-center gap-2 text-[13px] text-foreground hover:text-red-400 transition-colors"
                >
                  <Phone size={12} className="text-muted-foreground/60 flex-shrink-0" />
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground font-mono ml-auto">{number}</span>
                </a>
              ))}
            </div>
            {guidance.link && (
              <a
                href={guidance.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <ExternalLink size={10} />
                Official resource
              </a>
            )}
          </section>

          {/* ── Disclaimer ─────────────────────────────────────────── */}
          <div className="flex items-start gap-2 bg-muted/20 border border-border/50 rounded-xl px-3 py-2">
            <AlertTriangle size={12} className="text-amber-500/70 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground/60 leading-snug">
              Mamboleo aggregates user and official reports. Information may be unverified or change rapidly.
              Always defer to official authorities and emergency services.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
