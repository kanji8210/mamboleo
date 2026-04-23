import { useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, ExternalLink, Play, Users, Eye, Phone,
  AlertTriangle, CheckCircle2, Shield, ShieldAlert, HelpCircle,
  Flame, Car, CloudRain, Clock, BadgeCheck, BadgeX,
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
  const canCorroborate = incident && !alreadyDone && !corroborated

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
          {/* Backdrop (mobile) */}
          <motion.div
            key="panel-backdrop"
            className="fixed inset-0 z-[750] bg-black/40 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key={`panel-${incident.id}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onAnimationStart={() => onIncidentChange(null, incident)}
            className="fixed right-0 top-0 bottom-0 z-[760] w-full sm:w-[390px] bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            <PanelContent
              incident={incident}
              onClose={onClose}
              effectiveCount={effectiveCount}
              isConfirmed={alreadyDone || corroborated}
              corroborating={corroborating}
              onCorroborate={handleCorroborate}
            />
          </motion.div>
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
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: typeBg, border: `1px solid ${typeColor}44` }}
          >
            <TypeIcon size={14} style={{ color: typeColor }} />
          </div>
          <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase font-mono">
            Incident Detail
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Title + badges ─────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Type */}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
              style={{ color: typeColor, background: typeBg, borderColor: `${typeColor}44` }}
            >
              <TypeIcon size={10} />
              {INCIDENT_LABELS[type]}
            </span>
            {/* Severity */}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border capitalize"
              style={{ color: sevColor, background: sevBg, borderColor: `${sevColor}44` }}
            >
              {severity}
            </span>
            {/* Verified / Unverified */}
            {isVerified
              ? <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-green-400 bg-green-950/30 border border-green-900/40">
                  <BadgeCheck size={10} /> Verified
                </span>
              : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 bg-amber-950/30 border border-amber-900/40">
                  <BadgeX size={10} /> User Report
                </span>
            }
          </div>

          <h2 className="text-base font-bold text-foreground leading-snug mb-1.5">
            {incident.title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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

          {/* Reporter */}
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Reported by: {isAnonymous ? 'Anonymous' : (reporterName ?? 'Anonymous')}
          </p>
        </div>

        {/* ── Status banner ──────────────────────────────────────────── */}
        <div className="mx-4 mb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
            style={{ background: statBg, borderColor: `${statColor}44` }}
          >
            <StatusIcon size={15} style={{ color: statColor, flexShrink: 0 }} />
            <span className="text-sm font-bold" style={{ color: statColor }}>
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>

        {/* ── Description ────────────────────────────────────────────── */}
        {incident.excerpt && (
          <div className="px-4 mb-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {stripHtml(incident.excerpt)}
            </p>
          </div>
        )}

        <div className="border-t border-border/60 mx-4 mb-3" />

        {/* ── Location ───────────────────────────────────────────────── */}
        <div className="px-4 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} className="flex-shrink-0 text-muted-foreground/60" />
              <span className="font-mono">
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
              Google Maps
            </a>
          </div>
        </div>

        <div className="border-t border-border/60 mx-4 mb-3" />

        {/* ── Video link ─────────────────────────────────────────────── */}
        {videoUrl && (
          <>
            <div className="px-4 mb-3">
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
            </div>
            <div className="border-t border-border/60 mx-4 mb-3" />
          </>
        )}

        {/* ── Corroboration ──────────────────────────────────────────── */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/50 uppercase font-mono mb-2">
            Corroboration
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users size={13} />
              <span>
                <span className="font-bold text-foreground">{effectiveCount}</span>
                {effectiveCount === 1 ? ' person confirmed' : ' people confirmed'}
              </span>
            </div>
            <button
              onClick={onCorroborate}
              disabled={corroborating}
              aria-pressed={isConfirmed}
              className={[
                'flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 border transition-all disabled:opacity-50',
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
        </div>

        <div className="border-t border-border/60 mx-4 mb-3" />

        {/* ── What to do ─────────────────────────────────────────────── */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/50 uppercase font-mono mb-2">
            What to do
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {guidance.action}
          </p>
          <div className="flex flex-col gap-1.5">
            {guidance.contacts.map(({ label, number }) => (
              <a
                key={label}
                href={`tel:${number}`}
                className="flex items-center gap-2 text-sm text-foreground hover:text-red-400 transition-colors"
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
        </div>

        {/* ── Disclaimer ─────────────────────────────────────────────── */}
        <div className="mx-4 mb-4">
          <div className="flex items-start gap-2 bg-muted/20 border border-border/50 rounded-xl px-3 py-2.5">
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
