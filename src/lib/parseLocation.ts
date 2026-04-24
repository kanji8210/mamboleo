// ─── Location input parsers ──────────────────────────────────────────────
//
// Users copy coordinates from many sources — plain `lat, lng` pairs,
// Google Maps share links (google.com/maps?q=…, goo.gl/maps/…), Plus Codes,
// etc. We accept the common formats and return a normalised lat/lng.

export interface ParsedLocation {
  lat: number
  lng: number
  source: 'pair' | 'google-maps' | 'plus-code' | 'geo-uri'
}

const DEC_NUM = /-?\d+\.?\d*/

/**
 * Parse a user-supplied coordinate string. Accepts:
 *   "-1.2921, 36.8219"
 *   "-1.2921 36.8219"
 *   "lat: -1.29, lng: 36.82"
 *   "https://www.google.com/maps/@-1.2921,36.8219,15z"
 *   "https://www.google.com/maps/place/…/@-1.29,36.82,13z/…"
 *   "https://www.google.com/maps?q=-1.2921,36.8219"
 *   "https://maps.google.com/?ll=-1.29,36.82"
 *   "https://goo.gl/maps/xxx"            → cannot resolve without a fetch; rejected
 *   "geo:-1.2921,36.8219"
 *
 * Returns null if nothing parseable was found or the result is clearly
 * out of range for lat (-90..90) or lng (-180..180).
 */
export function parseLocationInput(raw: string): ParsedLocation | null {
  const input = raw.trim()
  if (!input) return null

  // ── geo: URI (RFC 5870) ────────────────────────────────────────────
  if (input.toLowerCase().startsWith('geo:')) {
    const m = input.slice(4).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
    if (m) return finalize(m[1], m[2], 'geo-uri')
  }

  // ── Google Maps URL ────────────────────────────────────────────────
  if (/google\.[^/]+\/maps/i.test(input) || /maps\.google\./i.test(input)) {
    // 1. `@lat,lng,zoom` part — the most reliable marker for the map
    //    centre in modern GMaps URLs.
    const at = input.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (at) return finalize(at[1], at[2], 'google-maps')

    // 2. `?q=lat,lng` or `?ll=lat,lng`
    const qm = input.match(/[?&](?:q|ll|query|destination)=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qm) return finalize(qm[1], qm[2], 'google-maps')

    // 3. `!3dLAT!4dLNG` — used by "place" URLs
    const dd = input.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
    if (dd) return finalize(dd[1], dd[2], 'google-maps')

    // Can't parse short links (goo.gl, maps.app.goo.gl) without a fetch.
    return null
  }

  // ── Bare "lat, lng" or "lat lng" pair ──────────────────────────────
  const pair = input.match(new RegExp(`(${DEC_NUM.source})[^\\d\\-]+?(${DEC_NUM.source})`))
  if (pair) return finalize(pair[1], pair[2], 'pair')

  return null
}

function finalize(latStr: string, lngStr: string, source: ParsedLocation['source']): ParsedLocation | null {
  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null
  return { lat, lng, source }
}
