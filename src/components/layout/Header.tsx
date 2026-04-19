import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Map, Radio, ChevronRight, Newspaper, BarChart2, Wifi } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/map', label: 'Live Map' },
  { to: '#features', label: 'Features', anchor: true },
  { to: '#about', label: 'About', anchor: true },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isMapPage = location.pathname === '/map'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname])

  function handleAnchor(id: string) {
    setMenuOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120)
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // On map page use translucent overlay header (not sticky bar)
  if (isMapPage) return null

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[2000] transition-all duration-300 ${
          scrolled
            ? 'bg-card/95 backdrop-blur-xl border-b border-border shadow-2xl'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* ── Brand ─────────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            {/* Logo mark */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                <Radio size={13} className="text-red-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <span className="text-[15px] font-black tracking-[0.2em] text-foreground font-mono group-hover:text-red-400 transition-colors">
              MAMBOLEO
            </span>
          </Link>

          {/* ── Desktop nav ───────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.anchor ? (
                <button
                  key={link.label}
                  onClick={() => handleAnchor(link.to.replace('#', ''))}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                >
                  {link.label}
                </button>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-sm transition-colors rounded-md hover:bg-accent ${
                      isActive
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
            )}
          </nav>

          {/* ── Right actions ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* LIVE chip */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-red-400 font-mono border border-red-900/60 bg-red-950/30 rounded-full px-2.5 py-1">
              <Wifi size={9} className="animate-pulse" />
              LIVE
            </div>

            {/* Open Map CTA */}
            <Link
              to="/map"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <Map size={13} />
              <span className="hidden sm:inline">Open Map</span>
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1990] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              key="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="fixed top-14 left-0 right-0 z-[1995] bg-card/98 backdrop-blur-xl border-b border-border shadow-2xl md:hidden"
            >
              <div className="p-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) =>
                  link.anchor ? (
                    <button
                      key={link.label}
                      onClick={() => handleAnchor(link.to.replace('#', ''))}
                      className="flex items-center justify-between px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors text-left"
                    >
                      {link.label}
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.exact}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-3 text-sm rounded-lg transition-colors ${
                          isActive
                            ? 'text-foreground bg-accent font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`
                      }
                    >
                      {link.label}
                      <ChevronRight size={14} />
                    </NavLink>
                  )
                )}
                <div className="mt-2 pt-2 border-t border-border">
                  <Link
                    to="/map"
                    className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                  >
                    <Map size={14} />
                    Open Live Map
                  </Link>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* ── Ticker: coming features strip ───────────────────────────────── */}
      {!scrolled && location.pathname === '/' && (
        <div className="fixed top-14 left-0 right-0 z-[1999] bg-red-950/70 border-b border-red-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 h-7 flex items-center gap-3 overflow-hidden">
            <span className="text-[9px] font-extrabold tracking-widest text-red-400 uppercase font-mono flex-shrink-0">
              COMING SOON
            </span>
            <div className="flex items-center gap-4 text-[11px] text-red-300/80 overflow-hidden">
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <Newspaper size={10} /> Media Monitor — track 40+ Kenyan outlets
              </span>
              <span className="text-red-700">·</span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <BarChart2 size={10} /> Bias Comparator — see every side of every story
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
