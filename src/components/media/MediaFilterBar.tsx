import { memo } from 'react'

export interface MediaFilters {
  source: string | null
  topic: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  tier: 1 | 2 | 3 | 4 | 5 | null
}

export const EMPTY_FILTERS: MediaFilters = {
  source: null,
  topic: null,
  sentiment: null,
  tier: null,
}

export const MediaFilterBar = memo(function MediaFilterBar({
  filters,
  availableSources,
  availableTopics,
  onChange,
}: {
  filters: MediaFilters
  availableSources: string[]
  availableTopics: string[]
  onChange: (next: MediaFilters) => void
}) {
  const hasAny =
    filters.source || filters.topic || filters.sentiment || filters.tier !== null

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
      <Select
        label="Source"
        value={filters.source}
        options={availableSources}
        onChange={(v) => onChange({ ...filters, source: v })}
      />
      <Select
        label="Topic"
        value={filters.topic}
        options={availableTopics}
        onChange={(v) => onChange({ ...filters, topic: v })}
      />
      <Select
        label="Sentiment"
        value={filters.sentiment}
        options={['positive', 'neutral', 'negative']}
        onChange={(v) => onChange({ ...filters, sentiment: v as MediaFilters['sentiment'] })}
      />
      <Select
        label="Tier"
        value={filters.tier !== null ? `Tier ${filters.tier}` : null}
        options={['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']}
        onChange={(v) =>
          onChange({
            ...filters,
            tier: v ? (Number(v.split(' ')[1]) as MediaFilters['tier']) : null,
          })
        }
      />
      {hasAny && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-auto text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
})

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-slate-500">{label}:</span>
      <select
        className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-slate-200 focus:border-sky-500 focus:outline-none"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
