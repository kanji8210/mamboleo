import { memo } from 'react'
import { TrendingUp, Hash, Users, Building2, MapPin, Smile, Meh, Frown } from 'lucide-react'
import type { TrendsResult } from '@/lib/mediaApi'

function EntityList({
  icon: Icon,
  title,
  rows,
}: {
  icon: typeof Users
  title: string
  rows: { name: string; count: number }[]
}) {
  if (!rows.length) return null
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </h4>
      <ul className="space-y-1">
        {rows.slice(0, 6).map((r) => (
          <li key={r.name} className="flex justify-between gap-2 text-sm">
            <span className="truncate text-slate-200">{r.name}</span>
            <span className="shrink-0 text-xs text-slate-500">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const TrendsSidebar = memo(function TrendsSidebar({
  trends,
}: {
  trends: TrendsResult | undefined
}) {
  if (!trends) {
    return (
      <aside className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg border border-white/10 bg-slate-900/60" />
        <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-slate-900/60" />
      </aside>
    )
  }

  const total = trends.total || 1
  const sent = trends.by_sentiment

  return (
    <aside className="space-y-5">
      {/* Total */}
      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
        <div className="text-xs uppercase tracking-wider text-slate-400">
          Articles · last {trends.window}
        </div>
        <div className="mt-1 text-3xl font-bold text-white">
          {trends.total.toLocaleString()}
        </div>
      </section>

      {/* Sentiment */}
      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Sentiment mix</h3>
        <div className="space-y-2">
          {[
            { key: 'positive', count: sent.positive, icon: Smile, color: 'bg-emerald-500', label: 'Positive' },
            { key: 'neutral',  count: sent.neutral,  icon: Meh,   color: 'bg-slate-500',   label: 'Neutral'  },
            { key: 'negative', count: sent.negative, icon: Frown, color: 'bg-rose-500',    label: 'Negative' },
          ].map((row) => {
            const pct = (row.count / total) * 100
            const Icon = row.icon
            return (
              <div key={row.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {row.label}
                  </span>
                  <span className="text-slate-500">
                    {row.count.toLocaleString()} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full ${row.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trending topics */}
      {trends.by_topic.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <TrendingUp className="h-4 w-4 text-amber-400" aria-hidden />
            Trending topics
          </h3>
          <ul className="space-y-2">
            {trends.by_topic.slice(0, 8).map((t) => {
              const pct = (t.count / (trends.by_topic[0]?.count || 1)) * 100
              return (
                <li key={t.name}>
                  <div className="mb-0.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-slate-200 capitalize">
                      <Hash className="h-3 w-3 text-slate-500" aria-hidden />
                      {t.name}
                    </span>
                    <span className="text-xs text-slate-500">{t.count}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Entities */}
      <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Most mentioned</h3>
        <EntityList icon={Users}      title="Persons"       rows={trends.top_entities.persons} />
        <EntityList icon={Building2}  title="Organisations" rows={trends.top_entities.orgs} />
        <EntityList icon={MapPin}     title="Places"        rows={trends.top_entities.places} />
      </section>
    </aside>
  )
})
