// ─── Cross-tab incident bus ──────────────────────────────────────────────
//
// When a user submits a report in one tab, every other open Mamboleo tab
// should refresh its incident list immediately (rather than waiting for
// the next 30-second poll). We use BroadcastChannel where supported and
// fall back to the `storage` event for older browsers.
//
// The bus is intentionally payload-light — consumers re-fetch from the
// server so we never rely on cross-tab state being in sync.

export type IncidentBusEvent =
  | { type: 'new-report'; title: string; incidentType: string }

const CHANNEL_NAME = 'mamboleo-incidents'
const STORAGE_KEY = '__mamboleo_incident_event'

type Listener = (ev: IncidentBusEvent) => void
const listeners = new Set<Listener>()

let channel: BroadcastChannel | null = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', (e) => {
    const data = e.data as IncidentBusEvent | undefined
    if (data && typeof data === 'object' && 'type' in data) {
      listeners.forEach((l) => l(data))
    }
  })
}

// Storage-event fallback (Safari/older browsers). Also used alongside
// BroadcastChannel — harmless because listeners key by event identity.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const data = JSON.parse(e.newValue) as IncidentBusEvent
      listeners.forEach((l) => l(data))
    } catch {
      /* ignore */
    }
  })
}

export function publishIncidentEvent(ev: IncidentBusEvent): void {
  try {
    channel?.postMessage(ev)
  } catch {
    /* ignore */
  }
  try {
    // Writing the key fires a `storage` event in *other* tabs only.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ev, _t: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function subscribeIncidentEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
