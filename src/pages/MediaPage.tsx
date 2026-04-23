import { useMemo, useState } from 'react'
import { Loader2, Newspaper, RefreshCw } from 'lucide-react'
import { useMediaFeed, useTrends } from '@/hooks/useMedia'
import { ArticleCard } from '@/components/media/ArticleCard'
import { TrendsSidebar } from '@/components/media/TrendsSidebar'
import {
  MediaFilterBar,
  EMPTY_FILTERS,
  type MediaFilters,
} from '@/components/media/MediaFilterBar'
import type { TrendsResult } from '@/lib/mediaApi'

const WINDOWS: { key: TrendsResult['window']; label: string }[] = [
  { key: '1h',  label: 'Last hour' },
  { key: '24h', label: '24 hours'  },
  { key: '7d',  label: '7 days'    },
  { key: '30d', label: '30 days'   },
]

export function MediaPage() {
  const [window, setWindow] = useState<TrendsResult['window']>('24h')
  const [filters, setFilters] = useState<MediaFilters>(EMPTY_FILTERS)

  const trends = useTrends(window)
  const feed = useMediaFeed(20)

  // Flatten all loaded pages into one list.
  const allArticles = useMemo(
    () => feed.data?.pages.flatMap((p) => p.articles) ?? [],
    [feed.data],
  )

  // Client-side filter (fast for a few hundred items; matches what the user sees).
  const filteredArticles = useMemo(() => {
    return allArticles.filter((a) => {
      if (filters.source && a.source !== filters.source) return false
      if (filters.topic && !a.topics.includes(filters.topic)) return false
      if (filters.sentiment && a.sentiment !== filters.sentiment) return false
      if (filters.tier !== null && a.tier !== filters.tier) return false
      return true
    })
  }, [allArticles, filters])

  const availableSources = useMemo(
    () => Array.from(new Set(allArticles.map((a) => a.source))).sort(),
    [allArticles],
  )
  const availableTopics = useMemo(
    () => Array.from(new Set(allArticles.flatMap((a) => a.topics))).sort(),
    [allArticles],
  )

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <header className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <Newspaper className="h-3.5 w-3.5" aria-hidden />
            Media Monitor
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            40+ Kenyan &amp; international outlets, analysed in real time
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Automated ingestion via RSS feeds and web scraping, enriched with sentiment
            analysis, bias scoring, entity extraction, and topic classification.
          </p>

          {/* Window switcher */}
          <div className="mt-5 flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setWindow(w.key)}
                className={
                  'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                  (window === w.key
                    ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200')
                }
              >
                {w.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                trends.refetch()
                feed.refetch()
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[1fr_320px] md:py-8">
        {/* Feed */}
        <section>
          <MediaFilterBar
            filters={filters}
            availableSources={availableSources}
            availableTopics={availableTopics}
            onChange={setFilters}
          />

          {feed.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg border border-white/10 bg-slate-900/60"
                />
              ))}
            </div>
          ) : feed.isError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              Failed to load articles: {(feed.error as Error).message}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
              No articles match the current filters.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>

              {feed.hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => feed.fetchNextPage()}
                    disabled={feed.isFetchingNextPage}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-slate-900 disabled:opacity-50"
                  >
                    {feed.isFetchingNextPage && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sidebar */}
        <TrendsSidebar trends={trends.data} />
      </div>
    </main>
  )
}
