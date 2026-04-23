import { motion } from 'framer-motion'

/**
 * Pulsing red "LIVE" indicator overlaid on the top-left of the map.
 * Uses Framer Motion for the continuous scale animation.
 */
export function LiveIndicator() {
  return (
    <span className="flex items-center gap-2">
      {/* Outer ring pulse */}
      <span className="relative flex items-center justify-center w-3 h-3">
        <motion.span
          className="absolute w-3 h-3 rounded-full bg-red-500"
          animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="w-2 h-2 rounded-full bg-red-500 relative z-10" />
      </span>
      <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase font-mono">
        Live
      </span>
    </span>
  )
}
