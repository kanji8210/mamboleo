import { Flame, Car, Shield, CloudRain, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FilterOption, IncidentType } from '@/types/incident'

interface FilterBarProps {
  active: FilterOption
  onChange: (f: FilterOption) => void
  counts: Record<FilterOption, number>
}

interface FilterDef {
  value: FilterOption
  label: string
  icon: React.ReactNode
  color: string
}

const FILTERS: FilterDef[] = [
  { value: 'all', label: 'All', icon: <LayoutGrid size={12} />, color: '#94a3b8' },
  { value: 'fire' as IncidentType, label: 'Fire', icon: <Flame size={12} />, color: '#ef4444' },
  { value: 'accident' as IncidentType, label: 'Accident', icon: <Car size={12} />, color: '#f97316' },
  { value: 'police' as IncidentType, label: 'Police', icon: <Shield size={12} />, color: '#3b82f6' },
  { value: 'weather' as IncidentType, label: 'Weather', icon: <CloudRain size={12} />, color: '#06b6d4' },
]

export function FilterBar({ active, onChange, counts }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border bg-background/30">
      {FILTERS.map((f) => {
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
              isActive ? 'shadow-sm' : 'border-border text-muted-foreground hover:text-foreground hover:border-white/20',
            )}
            style={
              isActive
                ? {
                    borderColor: `${f.color}66`,
                    backgroundColor: `${f.color}18`,
                    color: f.color,
                  }
                : undefined
            }
            aria-pressed={isActive}
          >
            <span style={isActive ? { color: f.color } : undefined}>{f.icon}</span>
            {f.label}
            <span
              className="rounded-full px-1.5 py-0 text-[9px] font-bold bg-white/8 tabular-nums"
              style={isActive ? { color: f.color } : undefined}
            >
              {counts[f.value] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
