// ─── Incident domain types ────────────────────────────────────────────────

export type IncidentType = 'fire' | 'accident' | 'police' | 'weather' | 'military_ops' | 'civil_unrest'
export type SeverityLevel = 'low' | 'medium' | 'high'
export type FilterOption = 'all' | IncidentType
export type IncidentStatus = 'all_clear' | 'unsafe' | 'police_operating' | 'police_aggressive' | 'unknown'

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
  military_ops: '#64748b', // slate
  civil_unrest: '#be123c', // rose
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  fire: 'Fire',
  accident: 'Accident',
  police: 'Police',
  weather: 'Weather',
  military_ops: 'Military Ops',
  civil_unrest: 'Civil Unrest',
}

export const INCIDENT_BG: Record<IncidentType, string> = {
  fire: 'rgba(239,68,68,0.14)',
  accident: 'rgba(249,115,22,0.14)',
  police: 'rgba(59,130,246,0.14)',
  weather: 'rgba(6,182,212,0.14)',
  military_ops: 'rgba(100,116,139,0.14)',
  civil_unrest: 'rgba(190,18,60,0.14)',
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
