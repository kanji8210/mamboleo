import { Link } from 'react-router-dom'
import { Radio, Github, Twitter, Map, Newspaper, BarChart2, Shield } from 'lucide-react'

const PLATFORM_LINKS = [
  { label: 'Live Map', to: '/map', icon: Map },
  { label: 'Media Monitor', to: '#', icon: Newspaper, soon: true },
  { label: 'Bias Comparator', to: '#', icon: BarChart2, soon: true },
  { label: 'Incident Reports', to: '#', icon: Shield, soon: true },
]

const RESOURCE_LINKS = [
  { label: 'Documentation', to: '#' },
  { label: 'API Reference', to: '#' },
  { label: 'Data Sources', to: '#' },
  { label: 'Methodology', to: '#' },
]

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-0">
      {/* ── Main footer grid ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand column */}
        <div className="lg:col-span-1">
          <Link to="/" className="flex items-center gap-2.5 mb-4 group">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-600/40 flex items-center justify-center">
              <Radio size={13} className="text-red-400" />
            </div>
            <span className="text-[15px] font-black tracking-[0.2em] text-foreground font-mono group-hover:text-red-400 transition-colors">
              MAMBOLEO
            </span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Kenya's intelligence platform for real-time security awareness and media analysis.
          </p>
          {/* Social links */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/kanji8210/mamboleo"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent transition-all"
              aria-label="GitHub"
            >
              <Github size={15} />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent transition-all"
              aria-label="X / Twitter"
            >
              <Twitter size={15} />
            </a>
          </div>
        </div>

        {/* Platform links */}
        <div>
          <h4 className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase font-mono mb-4">
            Platform
          </h4>
          <ul className="flex flex-col gap-2.5">
            {PLATFORM_LINKS.map(({ label, to, icon: Icon, soon }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  onClick={soon ? (e) => e.preventDefault() : undefined}
                >
                  <Icon size={13} className="text-muted-foreground/50 group-hover:text-red-400 transition-colors" />
                  {label}
                  {soon && (
                    <span className="text-[9px] font-bold tracking-wide text-red-500/70 border border-red-900/50 rounded-full px-1.5 py-0 font-mono">
                      SOON
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase font-mono mb-4">
            Resources
          </h4>
          <ul className="flex flex-col gap-2.5">
            {RESOURCE_LINKS.map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Live stats */}
        <div>
          <h4 className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase font-mono mb-4">
            Coverage
          </h4>
          <ul className="flex flex-col gap-3">
            {[
              { label: 'Counties tracked', value: '47' },
              { label: 'Incident types', value: '4' },
              { label: 'Data refresh', value: '30s' },
              { label: 'Offline capable', value: 'PWA' },
            ].map(({ label, value }) => (
              <li key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-bold text-foreground font-mono">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            © {new Date().getFullYear()} MAMBOLEO · Kenya Intelligence Platform
          </p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
