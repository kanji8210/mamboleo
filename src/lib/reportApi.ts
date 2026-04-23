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
//
// These now only cache the last known state for instant UI feedback when the
// panel is re-opened. The server (PHP session) is the source of truth.
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

export function unmarkCorroborated(incidentId: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    const next = stored.filter(id => id !== incidentId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

// ─── Toggle corroboration for an incident ────────────────────────────────
//
// The server uses the PHP session cookie to identify the same browser, so
// calling this endpoint toggles between "confirmed" and "unconfirmed".
// `credentials: 'include'` is required so the PHPSESSID cookie round-trips.
export async function corroborateIncident(
  incidentId: string,
): Promise<{ count: number; confirmed: boolean }> {
  const postId = decodeWPGraphQLId(incidentId)
  const res = await fetch(`${WP_URL}/wp-json/mamboleo/v1/corroborate/${postId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Could not update confirmation')
  }
  return res.json() as Promise<{ count: number; confirmed: boolean }>
}

// ─── Record a view on an incident (fire-and-forget) ──────────────────────
//
// Called every time a user clicks an incident. The server keeps both a raw
// click counter and a session-deduplicated unique viewer count.
export async function recordIncidentView(
  incidentId: string,
): Promise<{ views: number; uniqueViews: number } | null> {
  try {
    const postId = decodeWPGraphQLId(incidentId)
    const res = await fetch(`${WP_URL}/wp-json/mamboleo/v1/view/${postId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    })
    if (!res.ok) return null
    return res.json() as Promise<{ views: number; uniqueViews: number }>
  } catch {
    return null
  }
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
  reporterPhone?: string
  reporterEmail?: string
  isAnonymous: boolean
}

export async function submitReport(data: ReportPayload): Promise<{ success: boolean; id: number; message: string }> {
  const res = await fetch(`${WP_URL}/wp-json/mamboleo/v1/report`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? `Failed to submit report (HTTP ${res.status})`)
  }
  return res.json() as Promise<{ success: boolean; id: number; message: string }>
}
