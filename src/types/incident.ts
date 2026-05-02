// ─── Incident domain types ────────────────────────────────────────────────

export type IncidentType =
  | 'fire'
  | 'accident'
  | 'police'
  | 'weather'
  | 'protest'
  | 'flood'
  | 'medical'
  | 'military'
  | 'info'
  | 'health'
  | 'environmental'
export type SeverityLevel = 'low' | 'medium' | 'high'
export type FilterOption = 'all' | IncidentType
export type IncidentStatus = 'all_clear' | 'unsafe' | 'police_operating' | 'police_aggressive' | 'unknown'
export type IncidentLifecycle = 'active' | 'developing' | 'resolved' | 'archived'

export interface IncidentFields {
  type: IncidentType
  latitude: number
  longitude: number
  severity: SeverityLevel
  status: IncidentStatus
  incidentTime: string | null
  videoUrl: string | null
  reporterName: string | null
  isAnonymous: boolean
  isVerified: boolean
  corroborationCount: number
  /** Lifecycle stage — 'developing' = admin-pinned breaking story */
  lifecycle: IncidentLifecycle
  /** ISO timestamp of latest activity, used for "X ago" + freshness sort */
  lastUpdateAt: string | null
  /** Number of follow-up updates / corroborations */
  updateCount: number
  /** External URL for more information (official source, article, etc.) */
  sourceUrl?: string | null
  /** Human label for the external source, shown next to the link */
  sourceName?: string | null
}

export interface Incident {
  id: string
  title: string
  date: string
  excerpt: string
  incidentFields: IncidentFields
}

// ─── Raw API shape from WPGraphQL ─────────────────────────────────────────

export interface RawIncident {
  id: string
  title: string
  date: string
  excerpt: string
  incidentFields: {
    type: string
    latitude: string | number
    longitude: string | number
    severity: string
    status: string
    incidentTime: string | null
    videoUrl: string | null
    reporterName: string | null
    isAnonymous: boolean
    isVerified: boolean
    corroborationCount: number
    lifecycle?: string | null
    lastUpdateAt?: string | null
    updateCount?: number | null
  }
}

export interface IncidentsQueryResult {
  incidents: {
    nodes: RawIncident[]
  }
}

// ─── Lookup tables ────────────────────────────────────────────────────────

export const INCIDENT_COLORS: Record<IncidentType, string> = {
  fire: '#ef4444',
  accident: '#f97316',
  police: '#3b82f6',
  weather: '#06b6d4',
  protest: '#eab308',
  flood: '#0ea5e9',
  medical: '#ec4899',
  military: '#84cc16',      // olive / khaki
  info: '#a1a1aa',          // neutral slate
  health: '#14b8a6',        // teal
  environmental: '#22c55e', // green
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  fire: 'Fire',
  accident: 'Accident',
  police: 'Police',
  weather: 'Weather',
  protest: 'Protest',
  flood: 'Flood',
  medical: 'Medical',
  military: 'Military Ops',
  info: 'Info',
  health: 'Public Health',
  environmental: 'Environmental',
}

export const INCIDENT_BG: Record<IncidentType, string> = {
  fire: 'rgba(239,68,68,0.14)',
  accident: 'rgba(249,115,22,0.14)',
  police: 'rgba(59,130,246,0.14)',
  weather: 'rgba(6,182,212,0.14)',
  protest: 'rgba(234,179,8,0.14)',
  flood: 'rgba(14,165,233,0.14)',
  medical: 'rgba(236,72,153,0.14)',
  military: 'rgba(132,204,22,0.14)',
  info: 'rgba(161,161,170,0.14)',
  health: 'rgba(20,184,166,0.14)',
  environmental: 'rgba(34,197,94,0.14)',
}

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f87171',
}

export const SEVERITY_BG: Record<SeverityLevel, string> = {
  low: 'rgba(74,222,128,0.14)',
  medium: 'rgba(250,204,21,0.14)',
  high: 'rgba(248,113,113,0.14)',
}

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  all_clear: 'All Clear',
  unsafe: 'Unsafe',
  police_operating: 'Police Operating',
  police_aggressive: 'Police Aggressive',
  unknown: 'Status Unknown',
}

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  all_clear: '#22c55e',
  unsafe: '#ef4444',
  police_operating: '#3b82f6',
  police_aggressive: '#f97316',
  unknown: '#6b7280',
}

export const STATUS_BG: Record<IncidentStatus, string> = {
  all_clear: 'rgba(34,197,94,0.14)',
  unsafe: 'rgba(239,68,68,0.14)',
  police_operating: 'rgba(59,130,246,0.14)',
  police_aggressive: 'rgba(249,115,22,0.14)',
  unknown: 'rgba(107,114,128,0.14)',
}
