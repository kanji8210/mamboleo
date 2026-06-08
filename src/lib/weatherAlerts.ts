// ─── Official weather alerts (Open-Meteo) ────────────────────────────────
//
// Open-Meteo is a free, no-key weather API that wraps several national
// weather services (DWD, MeteoFrance, NWS, etc.). For Kenya we use their
// global forecast endpoint: no national-level warning feed is reliably
// published by KMD over HTTP, so we derive "warnings" ourselves from the
// WMO weather code, precipitation intensity and wind gusts per location.
//
// These appear on the Mamboleo map as synthetic incidents of type
// "weather", flagged as official / verified, with reporter = "Open-Meteo".
// They are *not* persisted to WordPress; they live in memory only.

import type { Incident, SeverityLevel, IncidentStatus } from '@/types/incident'

export interface WeatherSource {
  name: string
  latitude: number
  longitude: number
}

// Major Kenyan cities — easily extendable via the sidebar later.
export const KENYA_WEATHER_SOURCES: WeatherSource[] = [
  { name: 'Nairobi',   latitude: -1.2921, longitude: 36.8219 },
  { name: 'Mombasa',   latitude: -4.0435, longitude: 39.6682 },
  { name: 'Kisumu',    latitude: -0.0917, longitude: 34.7680 },
  { name: 'Nakuru',    latitude: -0.3031, longitude: 36.0800 },
  { name: 'Eldoret',   latitude:  0.5143, longitude: 35.2698 },
  { name: 'Nyeri',     latitude: -0.4201, longitude: 36.9476 },
  { name: 'Garissa',   latitude: -0.4536, longitude: 39.6401 },
  { name: 'Lodwar',    latitude:  3.1191, longitude: 35.5979 },
  { name: 'Malindi',   latitude: -3.2175, longitude: 40.1169 },
  { name: 'Kakamega',  latitude:  0.2827, longitude: 34.7519 },
]

// WMO 4677 weather codes → human label + base severity.
// Only "alert-worthy" codes are listed; anything else is skipped.
// https://open-meteo.com/en/docs → see `weather_code` table.
const WMO_ALERTS: Record<number, { label: string; severity: SeverityLevel; status: IncidentStatus }> = {
  // Thunderstorms
  95: { label: 'Thunderstorm',                  severity: 'high',   status: 'unsafe' },
  96: { label: 'Thunderstorm with slight hail', severity: 'high',   status: 'unsafe' },
  99: { label: 'Thunderstorm with heavy hail',  severity: 'high',   status: 'unsafe' },

  // Heavy rain
  65: { label: 'Heavy rain',                    severity: 'high',   status: 'unsafe' },
  67: { label: 'Heavy freezing rain',           severity: 'high',   status: 'unsafe' },
  82: { label: 'Violent rain showers',          severity: 'high',   status: 'unsafe' },

  // Moderate rain
  63: { label: 'Moderate rain',                 severity: 'medium', status: 'unsafe' },
  81: { label: 'Moderate rain showers',         severity: 'medium', status: 'unsafe' },

  // Fog (reduced visibility)
  45: { label: 'Fog',                           severity: 'medium', status: 'unsafe' },
  48: { label: 'Depositing rime fog',           severity: 'medium', status: 'unsafe' },
}

interface OpenMeteoResponse {
  current?: {
    time: string
    weather_code: number
    precipitation: number
    wind_gusts_10m: number
    temperature_2m: number
  }
}

// Open-Meteo multi-location response — when latitude/longitude are
// comma-separated lists the API returns an array of per-location results.
type OpenMeteoMultiResponse = OpenMeteoResponse[] | OpenMeteoResponse

function buildAlert(source: WeatherSource, current: NonNullable<OpenMeteoResponse['current']>): Incident | null {
  const code = current.weather_code
  const base = WMO_ALERTS[code]
  const gusty = current.wind_gusts_10m >= 60

  if (!base && !gusty) return null

  const label = base?.label ?? 'High wind gusts'
  const severity: SeverityLevel = gusty ? 'high' : base!.severity
  const status: IncidentStatus = base?.status ?? 'unsafe'

  const gustNote = gusty ? `, wind gusts ${Math.round(current.wind_gusts_10m)} km/h` : ''
  const title = `${label} — ${source.name}`
  const excerpt =
    `Official forecast from Open-Meteo reports ${label.toLowerCase()} at ${source.name} ` +
    `(temp ${Math.round(current.temperature_2m)}°C, ` +
    `precip ${current.precipitation.toFixed(1)} mm${gustNote}).`

  const id = `weather-openmeteo-${source.name.toLowerCase()}`
  const sourceUrl =
    `https://open-meteo.com/en/docs#latitude=${source.latitude}` +
    `&longitude=${source.longitude}&current=weather_code,temperature_2m,precipitation,wind_gusts_10m`

  return {
    id,
    title,
    date: current.time,
    excerpt,
    content: excerpt,
    incidentFields: {
      type: 'weather',
      latitude: source.latitude,
      longitude: source.longitude,
      severity,
      status,
      incidentTime: current.time,
      videoUrl: null,
      reporterName: 'Open-Meteo',
      isAnonymous: false,
      isVerified: true,
      corroborationCount: 0,
      lifecycle: 'active',
      lastUpdateAt: current.time,
      updateCount: 0,
      sourceUrl,
      sourceName: 'Open-Meteo forecast',
    },
  }
}

// In-memory cache so transient 429/5xx errors don't wipe the weather layer.
let lastAlerts: Incident[] = []

export async function fetchOfficialWeatherAlerts(
  sources: WeatherSource[] = KENYA_WEATHER_SOURCES,
): Promise<Incident[]> {
  if (sources.length === 0) return []

  // Batch all coordinates into ONE request — Open-Meteo accepts comma-
  // separated latitude/longitude lists and returns an array of current
  // readings in the same order. This cuts 10 calls → 1 and avoids 429s.
  const lats = sources.map((s) => s.latitude).join(',')
  const lngs = sources.map((s) => s.longitude).join(',')
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lats}&longitude=${lngs}` +
    '&current=weather_code,precipitation,wind_gusts_10m,temperature_2m' +
    '&timezone=auto'

  try {
    // Abort if the request hangs longer than 8s — under network blocks
    // or DNS failures fetch() will otherwise wait until the browser's
    // default timeout (often 90s+) and the user sees scary "CORS"
    // errors in the console (a connection failure with no response is
    // reported as a CORS error since no Access-Control-Allow-Origin
    // header was received). The weather layer is non-critical, so we
    // fail fast and just keep the previous alerts visible.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      // Keep showing the previous alerts on transient errors.
      return lastAlerts
    }
    const data = (await res.json()) as OpenMeteoMultiResponse
    const arr = Array.isArray(data) ? data : [data]

    const alerts: Incident[] = []
    for (let i = 0; i < sources.length && i < arr.length; i++) {
      const current = arr[i]?.current
      if (!current) continue
      const alert = buildAlert(sources[i], current)
      if (alert) alerts.push(alert)
    }
    lastAlerts = alerts
    return alerts
  } catch (err) {
    // Network failure / abort / CORS — degrade silently, the rest of
    // the app does not depend on the weather layer.
    // We only log non-abort errors in dev: timeouts are expected on
    // flaky connections and clutter the console with no actionable info.
    const isAbort = err instanceof DOMException && err.name === 'AbortError'
    if (import.meta.env.DEV && !isAbort) {
      // eslint-disable-next-line no-console
      console.warn('[weatherAlerts] Open-Meteo unreachable — skipping weather layer', err)
    }
    return lastAlerts
  }
}
