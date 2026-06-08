import { useCallback, useEffect, useRef, useState } from 'react'
import { VisuallyHidden } from '../ui/VisuallyHidden'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  X, ChevronLeft, ChevronRight, User, UserX, Flame, Car,
  Shield, CloudRain, CheckCircle2, AlertTriangle, ShieldAlert,
  HelpCircle, MapPin, Crosshair, Play, Send, AlertCircle,
  Megaphone, Waves, Cross, Swords, Info, HeartPulse, Leaf,
  Skull, HeartCrack,
} from 'lucide-react'
import type { IncidentType, IncidentStatus } from '@/types/incident'
import { INCIDENT_LABELS, STATUS_LABELS } from '@/types/incident'
import { submitReport, type ReportPayload } from '@/lib/reportApi'
import { publishIncidentEvent } from '@/lib/incidentBus'
import { COUNTIES } from '@/lib/counties'
import { parseLocationInput } from '@/lib/parseLocation'

// ─── Constants ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6
const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219]
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

const INCIDENT_TYPES: { value: IncidentType; Icon: React.ElementType; label: string; color: string }[] = [
  { value: 'fire',          Icon: Flame,      label: INCIDENT_LABELS.fire,          color: '#ef4444' },
  { value: 'accident',      Icon: Car,        label: INCIDENT_LABELS.accident,      color: '#f97316' },
  { value: 'police',        Icon: Shield,     label: INCIDENT_LABELS.police,        color: '#3b82f6' },
  { value: 'weather',       Icon: CloudRain,  label: INCIDENT_LABELS.weather,       color: '#06b6d4' },
  { value: 'protest',       Icon: Megaphone,  label: INCIDENT_LABELS.protest,       color: '#eab308' },
  { value: 'flood',         Icon: Waves,      label: INCIDENT_LABELS.flood,         color: '#0ea5e9' },
  { value: 'medical',       Icon: Cross,      label: INCIDENT_LABELS.medical,       color: '#ec4899' },
  { value: 'military',      Icon: Swords,     label: INCIDENT_LABELS.military,      color: '#84cc16' },
  { value: 'info',          Icon: Info,       label: INCIDENT_LABELS.info,          color: '#a1a1aa' },
  { value: 'health',        Icon: HeartPulse, label: INCIDENT_LABELS.health,        color: '#14b8a6' },
  { value: 'environmental', Icon: Leaf,       label: INCIDENT_LABELS.environmental, color: '#22c55e' },
  { value: 'homicide',      Icon: Skull,      label: INCIDENT_LABELS.homicide,      color: '#7f1d1d' },
  { value: 'femicide',      Icon: HeartCrack, label: INCIDENT_LABELS.femicide,      color: '#be185d' },
]

const STATUSES: { value: IncidentStatus; Icon: React.ElementType; label: string; color: string }[] = [
  { value: 'unsafe',           Icon: AlertTriangle, label: STATUS_LABELS.unsafe,           color: '#ef4444' },
  { value: 'all_clear',        Icon: CheckCircle2,  label: STATUS_LABELS.all_clear,        color: '#22c55e' },
  { value: 'police_operating', Icon: Shield,        label: STATUS_LABELS.police_operating, color: '#3b82f6' },
  { value: 'police_aggressive',Icon: ShieldAlert,   label: STATUS_LABELS.police_aggressive,color: '#a855f7' },
  { value: 'unknown',          Icon: HelpCircle,    label: STATUS_LABELS.unknown,          color: '#71717a' },
]

const TITLE_MAX = 200
const TITLE_MIN = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Kenya: allow +254XXXXXXXXX or 07XXXXXXXX / 01XXXXXXXX. Accept 8-15 digits generally.
const PHONE_RE = /^[+\d][\d\s\-()]{7,20}$/

function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim())
}
function isValidPhone(s: string): boolean {
  return PHONE_RE.test(s.trim())
}

// ─── Types ────────────────────────────────────────────────────────────────


interface FormState {
  isAnonymous: boolean
  reporterName: string
  reporterPhone: string
  reporterEmail: string
  incidentType: IncidentType | null
  status: IncidentStatus
  county: string | null
  subcounty: string | null
  lat: number | null
  lng: number | null
  title: string
  incidentTime: string // ISO string
  description: string
  videoUrl: string
}

const defaultForm = (): FormState => ({
  isAnonymous: true,
  reporterName: '',
  reporterPhone: '',
  reporterEmail: '',
  incidentType: null,
  status: 'unsafe',
  county: null,
  subcounty: null,
  lat: null,
  lng: null,
  title: '',
  incidentTime: new Date().toISOString().slice(0, 16),
  description: '',
  videoUrl: '',
})

// ─── Location picker (inner map component) ───────────────────────────────

function LocationPicker({
  onPick,
  picked,
}: {
  onPick: (lat: number, lng: number) => void
  picked: [number, number] | null
}) {
  const divIconRef = useRef<L.DivIcon>(
    L.divIcon({
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 8px rgba(239,68,68,.6)"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  )

  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
  })

  return picked ? <Marker position={picked} icon={divIconRef.current} /> : null
}

// Fly the embedded map whenever the picked position changes (from GPS,
// paste, or subcounty selection) so users see the pin move into view.
function FlyToPicked({ picked }: { picked: [number, number] | null }) {
  const map = useMap()
  const prevRef = useRef<string | null>(null)
  useEffect(() => {
    if (!picked) return
    const key = `${picked[0]},${picked[1]}`
    if (prevRef.current === key) return
    prevRef.current = key
    map.flyTo(picked, Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 })
  }, [picked, map])
  return null
}

// ─── Step components ──────────────────────────────────────────────────────

function StepIdentity({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose how you want to submit this report.</p>
      <div className="grid grid-cols-2 gap-3">
        <ToggleCard
          selected={form.isAnonymous}
          onClick={() => onChange({ isAnonymous: true })}
          Icon={UserX}
          label="Anonymous"
          description="Your name is hidden"
        />
        <ToggleCard
          selected={!form.isAnonymous}
          onClick={() => onChange({ isAnonymous: false })}
          Icon={User}
          label="Named"
          description="Your name is shown"
        />
      </div>

      <AnimatePresence initial={false}>
        {!form.isAnonymous && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Your name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full name or alias"
                  value={form.reporterName}
                  onChange={e => onChange({ reporterName: e.target.value })}
                  maxLength={80}
                  autoComplete="name"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={form.reporterPhone}
                  onChange={e => onChange({ reporterPhone: e.target.value })}
                  maxLength={32}
                  autoComplete="tel"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={form.reporterEmail}
                  onChange={e => onChange({ reporterEmail: e.target.value })}
                  maxLength={120}
                  autoComplete="email"
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60 leading-snug">
                Contact details are kept private and used only by moderators to verify the report.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepWhat({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-widest text-muted-foreground/60 uppercase font-mono mb-2">Incident type</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INCIDENT_TYPES.map(({ value, Icon, label, color }) => (
            <button
              key={value}
              onClick={() => onChange({ incidentType: value })}
              className={[
                'flex flex-col items-center gap-1.5 rounded-xl p-3 border text-xs font-semibold transition-all',
                form.incidentType === value
                  ? 'border-transparent text-background'
                  : 'border-border text-muted-foreground hover:border-muted hover:text-foreground',
              ].join(' ')}
              style={form.incidentType === value ? { background: color, borderColor: color } : {}}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold tracking-widest text-muted-foreground/60 uppercase font-mono mb-2">Current status</p>
        <div className="flex flex-col gap-2">
          {STATUSES.map(({ value, Icon, label, color }) => (
            <button
              key={value}
              onClick={() => onChange({ status: value })}
              className={[
                'flex items-center gap-3 rounded-xl px-4 py-2.5 border text-sm font-semibold transition-all text-left',
                form.status === value
                  ? 'text-background border-transparent'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted',
              ].join(' ')}
              style={form.status === value ? { background: color, borderColor: color } : {}}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepWhere({
  form,
  onChange,
}: {
  form: FormState
  onChange: (p: Partial<FormState>) => void
}) {
  const [locating, setLocating] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteSource, setPasteSource] = useState<string | null>(null)
  const picked: [number, number] | null =
    form.lat !== null && form.lng !== null ? [form.lat, form.lng] : null

  function useGPS() {
    setLocating(true)
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError('Location access is not available in this browser. Please pin on the map manually.')
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission was denied. Please allow location access for more precise reporting, or tap the map.')
        } else {
          setGpsError('Could not get precise location. Try again or tap the map manually.')
        }
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function handlePasteChange(raw: string) {
    setPasteInput(raw)
    setPasteError(null)
    setPasteSource(null)
    if (!raw.trim()) return
    const parsed = parseLocationInput(raw)
    if (!parsed) {
      setPasteError('Could not read coordinates. Paste e.g. "-1.2921, 36.8219" or a Google Maps link.')
      return
    }
    onChange({ lat: parsed.lat, lng: parsed.lng })
    setPasteSource(
      parsed.source === 'google-maps'
        ? 'from Google Maps link'
        : parsed.source === 'geo-uri'
          ? 'from geo: URI'
          : 'from coordinates',
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pin the location. For more precise reporting, allow location access when prompted, or tap the map/paste coordinates.
      </p>

      {/* Smart paste input — accepts "lat, lng" or a Google Maps URL */}
      <div>
        <label htmlFor="loc-paste" className="sr-only">Paste coordinates or Google Maps link</label>
        <div className="relative">
          <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="loc-paste"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="Paste coords or Google Maps link"
            value={pasteInput}
            onChange={e => handlePasteChange(e.target.value)}
            className="w-full bg-input border border-border rounded-xl pl-9 pr-3 py-2.5 text-[16px] sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        {pasteError && (
          <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle size={11} /> {pasteError}
          </p>
        )}
        {pasteSource && !pasteError && (
          <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={11} /> Pinned {pasteSource}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={useGPS}
          disabled={locating}
          className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          <Crosshair size={14} />
          {locating ? 'Getting location…' : 'Use my GPS'}
        </button>
        {gpsError && (
          <p className="text-xs text-amber-400 flex items-center gap-1"><AlertCircle size={11} />{gpsError}</p>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
        <MapContainer
          key="report-map"
          center={picked ?? NAIROBI_CENTER}
          zoom={picked ? 14 : 11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          attributionControl={false}
        >
          <TileLayer
            url={TILE_URL}
            subdomains="abcd"
            keepBuffer={4}
            updateWhenIdle
            updateWhenZooming={false}
            crossOrigin
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          />
          <FlyToPicked picked={picked} />
          <LocationPicker
            onPick={(lat, lng) => onChange({ lat, lng })}
            picked={picked}
          />
        </MapContainer>
      </div>
      {picked && (
        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
          <MapPin size={10} /> {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
        </p>
      )}
    </div>
  )
}

function StepDetails({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  const titleLen = form.title.length
  // Find selected county object
  const selectedCounty = COUNTIES.find(c => c.name === form.county)
  const subcounties = selectedCounty ? selectedCounty.subcounties : []
  return (
    <div className="space-y-4">
      {/* County selection */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">County</label>
        <select
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
          value={form.county || ''}
          onChange={e => {
            const county = e.target.value || null
            onChange({ county, subcounty: null })
          }}
        >
          <option value="">Select county…</option>
          {COUNTIES.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      {/* Subcounty selection */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subcounty</label>
        <select
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
          value={form.subcounty || ''}
          onChange={e => {
            const subcounty = e.target.value || null
            // Center map if subcounty has center
            if (selectedCounty) {
              const sub = selectedCounty.subcounties.find(s => s.name === subcounty)
              if (sub && sub.center) {
                onChange({ subcounty, lat: sub.center[0], lng: sub.center[1] })
                return
              }
            }
            onChange({ subcounty })
          }}
          disabled={!form.county}
        >
          <option value="">Select subcounty…</option>
          {subcounties.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      {/* Title */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Fire at Kenyatta Market, Kibra"
          value={form.title}
          onChange={e => onChange({ title: e.target.value })}
          maxLength={TITLE_MAX}
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
        <div className="flex justify-between mt-1">
          {titleLen < TITLE_MIN && titleLen > 0 && (
            <p className="text-xs text-amber-400">At least {TITLE_MIN} characters</p>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">{titleLen}/{TITLE_MAX}</span>
        </div>
      </div>
      {/* When did this happen */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          When did this happen?
        </label>
        <input
          type="datetime-local"
          value={form.incidentTime}
          onChange={e => onChange({ incidentTime: e.target.value })}
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>
      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Description <span className="text-muted-foreground/50 text-[10px]">(optional)</span>
        </label>
        <textarea
          placeholder="e.g. Large fire broke out at Kenyatta Market stalls. Heavy smoke visible, emergency services on site."
          value={form.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={4}
          maxLength={2000}
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
        />
      </div>
    </div>
  )
}

function StepMedia({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-900/30 rounded-xl px-3 py-2.5">
        <Play size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-snug">
          For uncensored hosting, upload your video to{' '}
          <a href="https://rumble.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">
            Rumble
          </a>{' '}
          first, then paste the link here.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Video URL <span className="text-muted-foreground/50 text-[10px]">(optional)</span>
        </label>
        <input
          type="url"
          placeholder="https://rumble.com/..."
          value={form.videoUrl}
          onChange={e => onChange({ videoUrl: e.target.value })}
          autoComplete="url"
          className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>
    </div>
  )
}

function StepReview({ form }: { form: FormState }) {
  const typeInfo = INCIDENT_TYPES.find(t => t.value === form.incidentType)
  const statusInfo = STATUSES.find(s => s.value === form.status)

  return (
    <div className="space-y-4">
      <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2.5 text-sm">
        <Row label="Identity" value={form.isAnonymous ? 'Anonymous' : (form.reporterName || '—')} />
        {!form.isAnonymous && form.reporterPhone && <Row label="Phone" value={form.reporterPhone} />}
        {!form.isAnonymous && form.reporterEmail && <Row label="Email" value={form.reporterEmail} />}
        {typeInfo && <Row label="Type" value={typeInfo.label} />}
        {statusInfo && <Row label="Status" value={statusInfo.label} />}
        <Row
          label="Location"
          value={
            form.lat !== null && form.lng !== null
              ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`
              : '—'
          }
        />
        <Row label="Title" value={form.title || '—'} />
        <Row label="Time" value={form.incidentTime ? form.incidentTime.replace('T', ' ') : '—'} />
        {form.description && <Row label="Description" value={form.description} />}
        {form.videoUrl && <Row label="Video" value={form.videoUrl} />}
      </div>

      <div className="flex items-start gap-2 bg-muted/10 border border-border/60 rounded-xl px-3 py-2.5">
        <AlertCircle size={12} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground/60 leading-snug">
          Your IP address is logged for abuse prevention. Submissions are rate-limited to 1 report per 10 minutes.
          False reports may result in a ban.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground/60 w-20 flex-shrink-0 text-xs">{label}</span>
      <span className="text-foreground text-xs break-all">{value}</span>
    </div>
  )
}

// ─── Toggle card ─────────────────────────────────────────────────────────

function ToggleCard({
  selected, onClick, Icon, label, description,
}: {
  selected: boolean
  onClick: () => void
  Icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl p-4 border text-sm font-semibold transition-all',
        selected
          ? 'bg-red-600/20 border-red-500/60 text-red-400'
          : 'bg-muted/10 border-border text-muted-foreground hover:text-foreground hover:border-muted',
      ].join(' ')}
    >
      <Icon size={20} />
      <span>{label}</span>
      <span className="text-[10px] font-normal text-muted-foreground/60">{description}</span>
    </button>
  )
}

// ─── Step meta ────────────────────────────────────────────────────────────

const STEP_TITLES = ['Identity', 'What', 'Where', 'Details', 'Media', 'Review']

function canAdvance(step: number, form: FormState): boolean {
  switch (step) {
    case 1:
      if (form.isAnonymous) return true
      return (
        form.reporterName.trim().length > 0 &&
        isValidPhone(form.reporterPhone) &&
        isValidEmail(form.reporterEmail)
      )
    case 2: return form.incidentType !== null
    case 3: return form.lat !== null && form.lng !== null
    case 4: return form.title.trim().length >= TITLE_MIN
    case 5: return true
    case 6: return true
    default: return false
  }
}

// ─── Main modal ───────────────────────────────────────────────────────────

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitSuccess: () => void
}

export function ReportModal({ isOpen, onClose, onSubmitSuccess }: ReportModalProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onChange = useCallback((partial: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...partial }))
  }, [])

  function reset() {
    setStep(1)
    setForm(defaultForm())
    setSubmitError(null)
    setDone(false)
    setSubmitting(false)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setTimeout(reset, 400)
    }
  }

  async function handleSubmit() {
    if (!form.incidentType || form.lat === null || form.lng === null) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: ReportPayload = {
        title: form.title.trim(),
        type: form.incidentType,
        status: form.status,
        latitude: form.lat,
        longitude: form.lng,
        incidentTime: form.incidentTime,
        description: form.description.trim() || undefined,
        videoUrl: form.videoUrl.trim() || undefined,
        isAnonymous: form.isAnonymous,
        reporterName: form.isAnonymous ? undefined : form.reporterName.trim() || undefined,
        reporterPhone: form.isAnonymous ? undefined : form.reporterPhone.trim() || undefined,
        reporterEmail: form.isAnonymous ? undefined : form.reporterEmail.trim() || undefined,
      }
      await submitReport(payload)
      setDone(true)
      // Tell every other open Mamboleo tab/window to refresh immediately
      // instead of waiting for the next 30-second poll tick.
      publishIncidentEvent({
        type: 'new-report',
        title: form.title || INCIDENT_LABELS[form.incidentType],
        incidentType: form.incidentType,
      })
      onSubmitSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = step === TOTAL_STEPS
  const ok = canAdvance(step, form)

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-4 top-[50%] translate-y-[-50%] z-[810] mx-auto max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden focus:outline-none sm:inset-x-auto sm:left-[50%] sm:translate-x-[-50%] sm:w-full"
          aria-labelledby="report-modal-title"
        >
          {/* Keep an always-mounted Dialog.Title to satisfy Radix a11y checks. */}
          <VisuallyHidden>
            <Dialog.Title id="report-modal-title">Report Incident</Dialog.Title>
          </VisuallyHidden>

          {/* Header */}
          {!done && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Report Incident</h2>
              <Dialog.Close className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={15} />
              </Dialog.Close>
            </div>
          )}

          {/* Progress dots */}
          {!done && (
            <div className="flex items-center justify-center gap-1.5 py-3 border-b border-border/50 px-5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <button
                  key={i}
                  onClick={() => i + 1 < step && setStep(i + 1)}
                  className={[
                    'rounded-full transition-all duration-200',
                    i + 1 === step
                      ? 'w-5 h-2 bg-red-500'
                      : i + 1 < step
                        ? 'w-2 h-2 bg-red-400/60 hover:bg-red-400/80 cursor-pointer'
                        : 'w-2 h-2 bg-muted/40 cursor-default',
                  ].join(' ')}
                  aria-label={`Step ${i + 1}: ${STEP_TITLES[i]}`}
                />
              ))}
              <span className="ml-2 text-[10px] text-muted-foreground/50 font-mono">
                {step}/{TOTAL_STEPS} {STEP_TITLES[step - 1]}
              </span>
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-green-950/40 border border-green-900/50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <p className="text-base font-bold text-foreground">Report submitted</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Thank you. Your report is now live on the map, marked as unconfirmed until verified by moderators or other users.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  {step === 1 && <StepIdentity form={form} onChange={onChange} />}
                  {step === 2 && <StepWhat form={form} onChange={onChange} />}
                  {step === 3 && <StepWhere form={form} onChange={onChange} />}
                  {step === 4 && <StepDetails form={form} onChange={onChange} />}
                  {step === 5 && <StepMedia form={form} onChange={onChange} />}
                  {step === 6 && <StepReview form={form} />}
                </motion.div>
              </AnimatePresence>
            )}

            {submitError && (
              <div className="mt-4 flex items-start gap-2 bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2.5">
                <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{submitError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!done && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
              {step > 1 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={15} /> Back
                </button>
              ) : (
                <div />
              )}

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
                >
                  {submitting
                    ? <span className="animate-pulse">Submitting…</span>
                    : <><Send size={13} /> Submit report</>
                  }
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!ok}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
                >
                  Next <ChevronRight size={15} />
                </button>
              )}
            </div>
          )}

          {done && (
            <div className="flex justify-center px-5 py-4 border-t border-border">
              <Dialog.Close className="bg-muted/30 hover:bg-muted/50 text-sm font-semibold text-foreground rounded-xl px-6 py-2.5 transition-colors">
                Close
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
