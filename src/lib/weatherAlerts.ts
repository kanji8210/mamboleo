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

async function fetchOne(source: WeatherSource): Promise<Incident | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${source.latitude}&longitude=${source.longitude}` +
    '&current=weather_code,precipitation,wind_gusts_10m,temperature_2m' +
    '&timezone=auto'

  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as OpenMeteoResponse
  const current = data.current
  if (!current) return null

  const code = current.weather_code
  const base = WMO_ALERTS[code]

  // Escalate to "high" if gusts > 60 km/h regardless of weather code.
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

  // Synthetic stable ID so React keys and the "new incident" detector behave.
  const id = `weather-openmeteo-${source.name.toLowerCase()}`

  // Link to the Open-Meteo forecast page for this exact coordinate so users
  // can read the full official hourly forecast in context.
  const sourceUrl =
    `https://open-meteo.com/en/docs#latitude=${source.latitude}` +
    `&longitude=${source.longitude}&current=weather_code,temperature_2m,precipitation,wind_gusts_10m`

  return {
    id,
    title,
    date: current.time,
    excerpt,
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
      sourceUrl,
      sourceName: 'Open-Meteo forecast',
    },
  }
}

export async function fetchOfficialWeatherAlerts(
  sources: WeatherSource[] = KENYA_WEATHER_SOURCES,
): Promise<Incident[]> {
  const results = await Promise.allSettled(sources.map(fetchOne))
  const alerts: Incident[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) alerts.push(r.value)
  }
  return alerts
}
