import { useMemo, useState } from 'react'
import { Crosshair, ChevronDown, LocateFixed, Loader2 } from 'lucide-react'
import { COUNTIES } from '@/lib/counties'

interface MapQuickNavProps {
  onJumpTo: (lat: number, lng: number, zoom?: number) => void
  onLocateMe: (lat: number, lng: number) => void
}

/**
 * Floating "quick-nav" bar on the map page. Gives users two fast ways to
 * move around:
 *   1. Country → County → (optional) Subcounty dropdowns that fly the
 *      map to the chosen admin area.
 *   2. "Locate me" button that asks the browser for the user's GPS and
 *      drops a marker + flies to it.
 *
 * Mobile-first, compact, and stays clear of the sticky header / map legend.
 */
export function MapQuickNav({ onJumpTo, onLocateMe }: MapQuickNavProps) {
  const [county, setCounty] = useState<string>('')
  const [subcounty, setSubcounty] = useState<string>('')
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const selectedCounty = useMemo(
    () => COUNTIES.find((c) => c.name === county) ?? null,
    [county],
  )

  function handleCountyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value
    setCounty(name)
    setSubcounty('')
    if (!name) return
    const c = COUNTIES.find((x) => x.name === name)
    if (c?.center) onJumpTo(c.center[0], c.center[1], 11)
  }

  function handleSubcountyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const name = e.target.value
    setSubcounty(name)
    if (!name || !selectedCounty) return
    const s = selectedCounty.subcounties.find((x) => x.name === name)
    if (s?.center) onJumpTo(s.center[0], s.center[1], 14)
  }

  function handleLocate() {
    setLocateError(null)
    if (!('geolocation' in navigator)) {
      setLocateError('Geolocation not supported on this device')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onLocateMe(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setLocating(false)
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Permission denied. Enable location in your browser settings.'
            : 'Could not get your location. Try again.',
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }

  return (
    <div
      className="px-3 py-2 flex flex-wrap items-center gap-2 bg-card/80 backdrop-blur-md border-b border-border"
      role="toolbar"
      aria-label="Map navigation"
    >
      {/* County dropdown */}
      <div className="relative flex-1 min-w-[140px] max-w-[200px]">
        <select
          value={county}
          onChange={handleCountyChange}
          className="w-full appearance-none bg-input border border-border rounded-full pl-3 pr-7 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer hover:border-muted"
          aria-label="Jump to county"
        >
          <option value="">County…</option>
          {COUNTIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>

      {/* Subcounty dropdown — shown only when a county with subcounties is picked */}
      {selectedCounty && selectedCounty.subcounties.length > 0 && (
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <select
            value={subcounty}
            onChange={handleSubcountyChange}
            className="w-full appearance-none bg-input border border-border rounded-full pl-3 pr-7 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer hover:border-muted"
            aria-label="Jump to subcounty"
          >
            <option value="">Subcounty…</option>
            {selectedCounty.subcounties.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      )}

      {/* Locate-me button */}
      <button
        onClick={handleLocate}
        disabled={locating}
        title="Share my location"
        aria-label="Share my location and center the map on me"
        className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-red-600/90 hover:bg-red-500 disabled:opacity-60 disabled:cursor-wait rounded-full px-3 py-1.5 transition-colors shadow-sm ml-auto"
      >
        {locating ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <LocateFixed size={13} />
        )}
        <span className="hidden sm:inline">{locating ? 'Locating…' : 'Locate me'}</span>
      </button>

      {locateError && (
        <p className="w-full text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
          <Crosshair size={10} /> {locateError}
        </p>
      )}
    </div>
  )
}
