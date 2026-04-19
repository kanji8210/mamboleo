// ─── Incident domain types ────────────────────────────────────────────────

export type IncidentType = 'fire' | 'accident' | 'police' | 'weather'
export type SeverityLevel = 'low' | 'medium' | 'high'
export type FilterOption = 'all' | IncidentType

export interface IncidentFields {
  type: IncidentType
  latitude: number
  longitude: number
  severity: SeverityLevel
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
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  fire: 'Fire',
  accident: 'Accident',
  police: 'Police',
  weather: 'Weather',
}

export const INCIDENT_BG: Record<IncidentType, string> = {
  fire: 'rgba(239,68,68,0.14)',
  accident: 'rgba(249,115,22,0.14)',
  police: 'rgba(59,130,246,0.14)',
  weather: 'rgba(6,182,212,0.14)',
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
