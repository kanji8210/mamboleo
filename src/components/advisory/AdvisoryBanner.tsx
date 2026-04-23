import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ChevronDown, ExternalLink, X } from 'lucide-react'

import type { Advisory } from '@/lib/advisories'

// Flag emoji per embassy source. Keeps the banner scannable at a glance.
const SOURCE_FLAGS: Record<string, string> = {
  'UK FCDO': '🇬🇧',
  'US State Dept': '🇺🇸',
  'France MAE': '🇫🇷',
  'Canada Global Affairs': '🇨🇦',
  'Australia Smartraveller': '🇦🇺',
}

interface AdvisoryBannerProps {
  advisories: Advisory[]
}

export function AdvisoryBanner({ advisories }: AdvisoryBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || advisories.length === 0) return null

  const count = advisories.length

  return (
    <div className="w-full border-b border-amber-500/30 bg-amber-950/60 backdrop-blur-md">
      {/* Collapsed header — always visible. Two sibling buttons so the
          dismiss action is not nested inside the toggle. */}
      <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-900/40 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <AlertTriangle
            size={16}
            className="text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-amber-100 uppercase tracking-wide">
            Travel Advisories
          </span>
          <span className="text-xs font-bold bg-amber-500/20 text-amber-200 rounded-full px-2 py-0.5">
            {count}
          </span>
          <span className="flex-1 truncate text-xs text-amber-200/80">
            {advisories
              .slice(0, 3)
              .map((a) => SOURCE_FLAGS[a.source] ?? '🏛')
              .join(' ')}{' '}
            <span className="hidden sm:inline">
              {advisories[0].title}
            </span>
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-amber-300 shrink-0"
            aria-hidden="true"
          >
            <ChevronDown size={16} />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-800/60 text-amber-300 shrink-0"
          aria-label="Dismiss advisories"
        >
          <X size={14} />
        </button>
      </div>

      {/* Expanded list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="advisory-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-amber-500/10 max-h-72 overflow-y-auto">
              {advisories.map((a) => (
                <li key={a.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span
                      className="text-base leading-none pt-0.5"
                      aria-hidden="true"
                    >
                      {SOURCE_FLAGS[a.source] ?? '🏛'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          {a.source}
                        </span>
                        <span className="text-[10px] text-amber-200/60">
                          {new Date(a.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-amber-50 leading-snug">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-xs text-amber-100/70 mt-1 line-clamp-2">
                          {a.excerpt}
                        </p>
                      )}
                      {a.articleUrl && (
                        <a
                          href={a.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
                        >
                          Read full advisory
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
