import { memo } from 'react'
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import type { MediaArticle } from '@/lib/mediaApi'

// ─── Visual helpers ───────────────────────────────────────────────────────

const TIER_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Official',      color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  2: { label: 'Mainstream',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  3: { label: 'Digital',       color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  4: { label: 'Regional',      color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  5: { label: 'International', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
}

const SENTIMENT_META = {
  positive: { icon: TrendingUp,   color: 'text-emerald-400', label: 'Positive' },
  neutral:  { icon: Minus,        color: 'text-slate-400',   label: 'Neutral'  },
  negative: { icon: TrendingDown, color: 'text-rose-400',    label: 'Negative' },
} as const

// Map bias score (-100..100) to a bar fill position (0..100%).
function biasPct(score: number): number {
  return Math.max(0, Math.min(100, (score + 100) / 2))
}

function biasLabel(score: number): string {
  if (score <= -40) return 'Strong left'
  if (score <= -15) return 'Leans left'
  if (score <   15) return 'Center'
  if (score <   40) return 'Leans right'
  return 'Strong right'
}

// ─── Component ────────────────────────────────────────────────────────────

export const ArticleCard = memo(function ArticleCard({
  article,
}: {
  article: MediaArticle
}) {
  const tier = TIER_LABEL[article.tier] ?? TIER_LABEL[3]
  const sentiment = SENTIMENT_META[article.sentiment]
  const SentimentIcon = sentiment.icon
  const when = article.publishedAt || article.date

  return (
    <article className="group rounded-lg border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-slate-900/80">
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 ${tier.color}`}>
          {tier.label}
        </span>
        <span className="font-medium text-slate-300">{article.source}</span>
        {when && (
          <span className="text-slate-500">
            · {formatDistanceToNowStrict(new Date(when), { addSuffix: true })}
          </span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 ${sentiment.color}`}>
          <SentimentIcon className="h-3.5 w-3.5" aria-hidden />
          {sentiment.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-slate-100 group-hover:text-white">
        {article.articleUrl ? (
          <a
            href={article.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5"
          >
            {article.title}
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </a>
        ) : (
          article.title
        )}
      </h3>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-400">
          {article.excerpt}
        </p>
      )}

      {/* Topics */}
      {article.topics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {article.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Bias bar */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="w-16 text-right">Left</span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" aria-hidden />
          <div
            className="absolute top-0 h-full w-1.5 rounded-full bg-slate-200"
            style={{ left: `calc(${biasPct(article.biasScore)}% - 3px)` }}
            aria-label={`Bias: ${biasLabel(article.biasScore)}`}
          />
        </div>
        <span className="w-16">Right</span>
        <span className="ml-2 font-medium text-slate-400">
          {biasLabel(article.biasScore)}
        </span>
      </div>
    </article>
  )
})
