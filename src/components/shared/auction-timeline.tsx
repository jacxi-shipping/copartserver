'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarClock, Car, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

interface TimelineEntry {
  date: string
  dayOfWeek: string
  count: number
  totalValue: number
  topMake: string | null
}

export function AuctionTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auctions/timeline')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && data.data) {
          setEntries(data.data)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll, entries])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = 220
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  const todayStr = new Date().toISOString().split('T')[0]

  const formatTimelineDate = (dateStr: string) => {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return dateStr
  }

  const isToday = (dateStr: string) => dateStr === todayStr

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Upcoming Sale Dates</span>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-48 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Upcoming Sale Dates</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {entries.length} dates
        </Badge>
      </div>
      <div className="relative group">
        {/* Left scroll arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-background/90 border shadow-md hover:bg-background transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-emerald pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {entries.map((entry, i) => {
            const today = isToday(entry.date)
            return (
              <motion.button
                key={entry.date}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => console.log('Timeline date clicked:', entry.date, entry)}
                className={`relative shrink-0 w-48 rounded-xl border p-4 text-left transition-all duration-200 bg-card hover:shadow-md ${
                  today
                    ? 'ring-2 ring-emerald-500 shadow-emerald-500/10'
                    : 'hover:border-emerald-500/40'
                }`}
              >
                {/* Today badge */}
                {today && (
                  <Badge className="absolute -top-2.5 right-2 bg-emerald-500 text-white border-0 text-[9px] font-bold px-1.5 py-0">
                    Today
                  </Badge>
                )}

                {/* Date + Day */}
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className={`text-lg font-bold tabular-nums ${today ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {formatTimelineDate(entry.date)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {entry.dayOfWeek}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="space-y-2">
                  {/* Vehicle count pill */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                      <Car className="size-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{entry.count}</span>
                    <span className="text-[10px] text-muted-foreground">vehicles</span>
                  </div>

                  {/* Total value */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/50">
                      <TrendingUp className="size-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {formatCurrency(entry.totalValue)}
                    </span>
                  </div>

                  {/* Top make badge */}
                  {entry.topMake && (
                    <Badge variant="outline" className="text-[10px] font-medium">
                      Top: {entry.topMake}
                    </Badge>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Right scroll arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-background/90 border shadow-md hover:bg-background transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
