import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Map,
  Newspaper,
  BarChart2,
  Activity,
  ArrowRight,
  Shield,
  Radio,
  Wifi,
  Database,
  GitBranch,
  Eye,
  ChevronDown,
  Flame,
  Car,
  CloudRain,
} from 'lucide-react'

// ─── Animated counter ─────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.ceil(value / 60)
    const interval = setInterval(() => {
      start += step
      if (start >= value) {
        setCount(value)
        clearInterval(interval)
      } else {
        setCount(start)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [inView, value])

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

// ─── Section fade-in ──────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Map,
    title: 'Live Security Map',
    status: 'live' as const,
    color: 'red',
    description:
      'Full-screen real-time map of security incidents across all 47 counties. Clustered markers, severity levels, and auto-refresh every 30 seconds.',
    tags: ['Fire', 'Accidents', 'Police', 'Weather'],
  },
  {
    icon: Newspaper,
    title: 'Media Monitor',
    status: 'soon' as const,
    color: 'amber',
    description:
      'Automatically ingest articles from 40+ Kenyan outlets via RSS feeds and web scraping. Build a central database for analysis and trend detection.',
    tags: ['RSS Feeds', 'Web Scraping', 'NLP', '40+ outlets'],
  },
  {
    icon: BarChart2,
    title: 'Bias Comparator',
    status: 'soon' as const,
    color: 'blue',
    description:
      'See how different media outlets cover the same story. AI-powered bias scoring and side-by-side comparisons using Kenya-specific NLP models.',
    tags: ['Bias Scoring', 'Article Clustering', 'HuggingFace', 'Ground News-style'],
  },
  {
    icon: Activity,
    title: 'Social Pulse',
    status: 'soon' as const,
    color: 'purple',
    description:
      'Track public conversations on X, Facebook, and Instagram. Sentiment analysis on trending topics and real-time social signal monitoring.',
    tags: ['Sentiment', 'X / Twitter', 'Facebook', 'Trending'],
  },
]

const STEPS = [
  {
    n: '01',
    icon: Database,
    title: 'Data Collection',
    body: 'Automated scrapers and RSS parsers ingest data from security feeds, news outlets, and social platforms around the clock.',
  },
  {
    n: '02',
    icon: GitBranch,
    title: 'Analysis Pipeline',
    body: 'NLP models classify bias, cluster related stories, detect sentiment, and score severity — all running on Kenya-specific training data.',
  },
  {
    n: '03',
    icon: Eye,
    title: 'Intelligence Layer',
    body: 'You get a unified view: live map, media comparator, and social pulse — so you always see the full picture, not just one angle.',
  },
]

const INCIDENT_TYPES = [
  { icon: Flame, label: 'Fire', color: '#ef4444' },
  { icon: Car, label: 'Accident', color: '#f97316' },
  { icon: Shield, label: 'Police', color: '#3b82f6' },
  { icon: CloudRain, label: 'Weather', color: '#06b6d4' },
]

const colorMap = {
  red: { bg: 'bg-red-950/40', border: 'border-red-900/50', icon: 'text-red-400', tag: 'bg-red-950/60 text-red-400 border-red-900/50' },
  amber: { bg: 'bg-amber-950/30', border: 'border-amber-900/40', icon: 'text-amber-400', tag: 'bg-amber-950/50 text-amber-400 border-amber-900/40' },
  blue: { bg: 'bg-blue-950/30', border: 'border-blue-900/40', icon: 'text-blue-400', tag: 'bg-blue-950/50 text-blue-400 border-blue-900/40' },
  purple: { bg: 'bg-purple-950/30', border: 'border-purple-900/40', icon: 'text-purple-400', tag: 'bg-purple-950/50 text-purple-400 border-purple-900/40' },
}

// ─── LandingPage ──────────────────────────────────────────────────────────

export function LandingPage() {
  // Spacer for header (14px) + ticker (7px top-14 = 56px, ticker = 28px)
  return (
    <div className="min-h-dvh bg-background">

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-dvh flex flex-col items-center justify-center pt-28 pb-20 px-4 overflow-hidden dot-grid">

        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/6 blur-[120px]" />
        </div>

        {/* Label chip */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 border border-red-900/60 bg-red-950/30 rounded-full px-3.5 py-1.5 mb-8"
        >
          <Wifi size={11} className="text-red-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-red-400 uppercase font-mono">
            Live · Kenya Intelligence Platform
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] tracking-tight max-w-4xl mb-6"
        >
          See Kenya.{' '}
          <span className="text-red-500 text-glow-red">Clearly.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10"
        >
          Real-time security mapping, media bias analysis, and social intelligence —
          all in one platform built for Kenya.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16"
        >
          <Link
            to="/map"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all glow-red hover:scale-[1.02] active:scale-[0.98]"
          >
            <Map size={16} />
            Open Live Map
            <ArrowRight size={14} />
          </Link>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 border border-border bg-card/60 hover:bg-card text-foreground font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:border-border/80"
          >
            Learn More
            <ChevronDown size={14} />
          </button>
        </motion.div>

        {/* ── Incident type pills ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-16"
        >
          {INCIDENT_TYPES.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: `${color}44`,
                backgroundColor: `${color}12`,
                color,
              }}
            >
              <Icon size={11} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Radio size={11} />
            Auto-refresh 30s
          </div>
        </motion.div>

        {/* ── Map preview card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-5xl"
        >
          <Link to="/map" className="block group relative rounded-2xl overflow-hidden border border-border hover:border-red-900/50 transition-all shadow-2xl">
            {/* Map mock */}
            <div className="relative h-[340px] sm:h-[420px] bg-[#131519] flex items-center justify-center">
              {/* Dot grid overlay */}
              <div className="absolute inset-0 dot-grid opacity-40" />
              {/* Kenya silhouette placeholder */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-red-500/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-red-500/50 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-red-600 animate-pulse" />
                    </div>
                  </div>
                  {/* Floating incident dots */}
                  {[
                    { x: '-60px', y: '-30px', color: '#ef4444' },
                    { x: '50px', y: '-50px', color: '#f97316' },
                    { x: '70px', y: '30px', color: '#3b82f6' },
                    { x: '-40px', y: '50px', color: '#06b6d4' },
                  ].map((dot, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full"
                      style={{ backgroundColor: dot.color, left: `calc(50% + ${dot.x})`, top: `calc(50% + ${dot.y})`, transform: 'translate(-50%,-50%)' }}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground/60 text-sm font-mono tracking-widest">NAIROBI · LIVE</p>
              </div>
              {/* Hover CTA overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
                  <Map size={14} />
                  Open Full Map
                </div>
              </div>
            </div>
            {/* Card footer */}
            <div className="bg-card px-5 py-3 flex items-center justify-between border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE DATA · Kenya
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono">Click to explore →</span>
            </div>
          </Link>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Counties Tracked', value: 47, suffix: '' },
            { label: 'Incident Types', value: 4, suffix: '' },
            { label: 'Refresh Rate', value: 30, suffix: 's' },
            { label: 'Uptime', value: 99, suffix: '%' },
          ].map(({ label, value, suffix }) => (
            <FadeIn key={label} className="flex flex-col items-center text-center gap-1">
              <span className="text-3xl font-black text-foreground font-mono">
                <AnimatedNumber value={value} suffix={suffix} />
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                {label}
              </span>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">

        {/* Section header */}
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-[0.22em] text-red-400 uppercase font-mono mb-3 block">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-4">
            One platform. Every angle.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From live security incidents to media bias detection — Mamboleo gives you the full picture of what's happening in Kenya.
          </p>
        </FadeIn>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, status, color, description, tags }, i) => {
            const c = colorMap[color as keyof typeof colorMap]
            return (
              <FadeIn key={title} delay={i * 0.08}>
                <div
                  className={`feature-card relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${c.bg} ${c.border}`}
                >
                  {/* Status badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
                      <Icon size={18} className={c.icon} />
                    </div>
                    {status === 'live' ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-red-400 font-mono border border-red-900/60 bg-red-950/40 rounded-full px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60 font-mono border border-border rounded-full px-2.5 py-1">
                        COMING SOON
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${c.tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* CTA link */}
                  {status === 'live' && (
                    <Link
                      to="/map"
                      className={`mt-5 flex items-center gap-1.5 text-sm font-semibold ${c.icon} hover:underline`}
                    >
                      Open Map <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </FadeIn>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-card/30 border-y border-border py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">

          <FadeIn className="text-center mb-14">
            <span className="text-[11px] font-bold tracking-[0.22em] text-muted-foreground/60 uppercase font-mono mb-3 block">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">
              From raw data to clear intelligence
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-gradient-to-r from-border via-red-900/40 to-border" />

            {STEPS.map(({ n, icon: Icon, title, body }, i) => (
              <FadeIn key={n} delay={i * 0.12}>
                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card/50 hover:bg-card/80 transition-colors">
                  {/* Step number */}
                  <div className="w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center mb-5 relative z-10">
                    <Icon size={20} className="text-red-400" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-[0.25em] text-muted-foreground/40 font-mono mb-2">
                    STEP {n}
                  </span>
                  <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <FadeIn>
          <div className="relative rounded-2xl border border-red-900/40 bg-red-950/20 overflow-hidden p-10 sm:p-16 text-center">
            {/* Glow blob */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-red-600/10 blur-[80px]" />
            </div>

            <div className="relative z-10">
              <span className="text-[11px] font-bold tracking-[0.22em] text-red-400 uppercase font-mono mb-4 block">
                Intelligence in your hands
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-foreground mb-4 leading-tight">
                Stop guessing.<br />Start knowing.
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Open the live map now and see what's happening across Kenya in real-time.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/map"
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-all glow-red hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Map size={16} />
                  Open Live Map
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

    </div>
  )
}
