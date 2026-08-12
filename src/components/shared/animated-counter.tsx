'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface AnimatedCounterProps {
  value: number | null | undefined
  duration?: number
  className?: string
  /** Text to show before the number (e.g. '$') */
  prefix?: string
  /** Text to show after the number (e.g. '%', 'K') */
  suffix?: string
}

/**
 * Enhanced animated number counter.
 * - Animates from 0 → target value on mount with ease-out curve.
 * - Comma-separated thousands formatting.
 * - Scale-up animation on mount.
 * - Sparkle/glow effect when counting finishes.
 * - Support for prefix/suffix props (e.g. prefix='$', suffix='%').
 * - Displays "—" for null/undefined values.
 */
export function AnimatedCounter({
  value,
  duration = 800,
  className,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const rafRef = useRef<number>(0)
  const [display, setDisplay] = useState(0)
  const isCompleteRef = useRef(false)
  const [sparkleKey, setSparkleKey] = useState(0)

  useEffect(() => {
    if (value == null) {
      isCompleteRef.current = false
      cancelAnimationFrame(rafRef.current)
      return
    }

    isCompleteRef.current = false
    const target = value
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic: deceleration curve
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Mark complete and trigger sparkle via callback (not synchronous effect)
        isCompleteRef.current = true
        setSparkleKey((k) => k + 1)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  if (value == null) {
    return <span className={className}>—</span>
  }

  const formatted = display.toLocaleString()

  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      {/* Scale-up on mount */}
      <motion.span
        className="inline-flex items-center"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {prefix && (
          <span className="mr-0.5 font-inherit">{prefix}</span>
        )}
        <span>{formatted}</span>
        {suffix && (
          <span className="ml-0.5 font-inherit">{suffix}</span>
        )}
      </motion.span>

      {/* Sparkle glow effect when counting finishes */}
      <AnimatePresence>
        {sparkleKey > 0 && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.3, 1.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            key={`sparkle-${sparkleKey}`}
            onAnimationComplete={() => { /* sparkle done */ }}
          >
            <Sparkles className="size-4 text-amber-400/80" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
