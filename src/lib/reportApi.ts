const WP_URL = import.meta.env.VITE_WP_URL ?? 'http://localhost/wordpress'

// ─── Decode WPGraphQL base64 ID → WordPress post ID ──────────────────────
export function decodeWPGraphQLId(id: string): number {
  try {
    const decoded = atob(id) // "post:688"
    const parts = decoded.split(':')
    return parseInt(parts[1], 10)
  } catch {
    return parseInt(id, 10)
  }
}

// ─── Corroboration localStorage helpers ──────────────────────────────────
const STORAGE_KEY = 'mamboleo_corroborated'

export function hasCorroborated(incidentId: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    return stored.includes(incidentId)
  } catch {
    return false
  }
}

export function markCorroborated(incidentId: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    if (!stored.includes(incidentId)) {
      stored.push(incidentId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    }
  } catch { /* ignore */ }
}

// ─── Corroborate an incident ──────────────────────────────────────────────
export async function corroborateIncident(incidentId: string): Promise<{ count: number }> {
  const postId = decodeWPGraphQLId(incidentId)
  const res = await fetch(`${WP_URL}/wp-json/mamboleo/v1/corroborate/${postId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Could not corroborate')
  }
  return res.json() as Promise<{ count: number }>
}

// ─── Submit a user report ─────────────────────────────────────────────────
export interface ReportPayload {
  type: string
  status: string
  title: string
  latitude: number
  longitude: number
  description?: string
  incidentTime?: string
  videoUrl?: string
  reporterName?: string
  isAnonymous: boolean
}

export async function submitReport(data: ReportPayload): Promise<{ success: boolean; id: number; message: string }> {
  const res = await fetch(`${WP_URL}/wp-json/mamboleo/v1/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Failed to submit report')
  }
  return res.json() as Promise<{ success: boolean; id: number; message: string }>
}
