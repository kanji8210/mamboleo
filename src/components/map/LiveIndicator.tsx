import { motion } from 'framer-motion'

/**
 * Pulsing red "LIVE" indicator overlaid on the top-left of the map.
 * Uses Framer Motion for the continuous scale animation.
 */
export function LiveIndicator() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[700] flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border/60 rounded-full px-3 py-1.5 shadow-xl pointer-events-none select-none">
      {/* Outer ring pulse */}
      <div className="relative flex items-center justify-center w-3 h-3">
        <motion.div
          className="absolute w-3 h-3 rounded-full bg-red-500"
          animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="w-2 h-2 rounded-full bg-red-500 relative z-10" />
      </div>
      <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase font-mono">
        Live
      </span>
    </div>
  )
}
