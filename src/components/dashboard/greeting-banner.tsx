'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, Calendar, Heart, Database } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { Stats } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface GreetingBannerProps {
  stats: Stats | null
  loading: boolean
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function GreetingBanner({ stats, loading }: GreetingBannerProps) {
  const { watchlist } = useAppStore()

  const greeting = useMemo(() => getTimeGreeting(), [])
  const dateStr = useMemo(() => getFormattedDate(), [])

  const totalAuctions = stats?.totalAuctions ?? 0
  const upcomingAuctions = stats?.upcomingAuctions ?? 0
  const todayAuctions = stats?.todayAuctions ?? 0
  const watchlistCount = watchlist.length

  const pills = [
    { icon: Database, label: 'Total Lots', value: totalAuctions, color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: CalendarClock, label: 'Upcoming', value: upcomingAuctions, color: 'text-amber-600 dark:text-amber-400' },
    { icon: Calendar, label: 'Today', value: todayAuctions, color: 'text-teal-600 dark:text-teal-400' },
    { icon: Heart, label: 'Watchlist', value: watchlistCount, color: 'text-rose-600 dark:text-rose-400' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Gradient background overlay */}
      <div className="relative px-6 py-6 md:px-8 md:py-8">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 to-transparent dark:from-emerald-500/10" />

        <div className="relative z-10">
          {/* Greeting */}
          <div className="mb-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">{greeting}</span>
              <span className="text-muted-foreground font-light mx-2">—</span>
              <span className="text-foreground/80">Lot Dashboard</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Here&apos;s your lot data overview for {dateStr}
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {pills.map((pill) => (
              <motion.div
                key={pill.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1.5 text-xs backdrop-blur-sm transition-all duration-200 hover:bg-background/80 hover:shadow-sm"
              >
                <pill.icon className={`size-3.5 ${pill.color}`} />
                <span className="text-muted-foreground hidden sm:inline">{pill.label}</span>
                <span className={`font-semibold tabular-nums ${pill.color}`}>
                  {loading ? '—' : pill.value.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
