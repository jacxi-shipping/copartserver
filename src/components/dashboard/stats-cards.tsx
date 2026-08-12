'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Database, CalendarClock, Calendar, Car, TrendingUp, TrendingDown, Info, RefreshCw, MapPin, Warehouse, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { Stats, ImportJob } from '@/lib/types'
import { AnimatedCounter } from '@/components/shared/animated-counter'
import { RecentImportsTable } from '@/components/dashboard/recent-imports'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ChartsSection } from '@/components/dashboard/charts-section'
import { InsightsSection } from '@/components/dashboard/insights-section'
import { GreetingBanner } from '@/components/dashboard/greeting-banner'
import { TopVehiclesSection } from '@/components/dashboard/top-vehicles-section'
import { RecentlyViewedSection } from '@/components/dashboard/recently-viewed-section'
import { LiveClock } from '@/components/shared/live-clock'
import { AuctionTimeline } from '@/components/shared/auction-timeline'
import { getRelativeTime } from '@/lib/format'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

interface StatCardConfig {
  label: string
  valueKey: 'totalAuctions' | 'upcomingAuctions' | 'todayAuctions' | 'uniqueMakes'
  icon: typeof Database
  gradient: string
  iconBg: string
  iconColor: string
  valueColor: string
  trend: { value: number; direction: 'up' | 'down' }
}

const statCards: StatCardConfig[] = [
  {
    label: 'Total Lots',
    valueKey: 'totalAuctions',
    icon: Database,
    gradient: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/60 dark:to-emerald-800/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-700 dark:text-emerald-400',
    trend: { value: 12.5, direction: 'up' },
  },
  {
    label: 'Upcoming Lots',
    valueKey: 'upcomingAuctions',
    icon: CalendarClock,
    gradient: 'from-amber-400 to-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-700 dark:text-amber-400',
    trend: { value: 8.2, direction: 'up' },
  },
  {
    label: "Today's Lots",
    valueKey: 'todayAuctions',
    icon: Calendar,
    gradient: 'from-teal-400 to-teal-600',
    iconBg: 'bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/60 dark:to-teal-800/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    valueColor: 'text-teal-700 dark:text-teal-400',
    trend: { value: 3.1, direction: 'down' },
  },
  {
    label: 'Unique Makes',
    valueKey: 'uniqueMakes',
    icon: Car,
    gradient: 'from-rose-400 to-rose-600',
    iconBg: 'bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/60 dark:to-rose-800/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    valueColor: 'text-rose-700 dark:text-rose-400',
    trend: { value: 5.7, direction: 'up' },
  },
]

export function StatsCards({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, i) => {
        const value = stats?.[card.valueKey] ?? 0
        return (
          <motion.div key={card.label} {...fadeIn} transition={{ delay: i * 0.05 }}>
            <Card className="tilt-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              {/* Shimmer border effect on hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${card.gradient} p-[1.5px]`}>
                  <div className="h-full w-full rounded-[7px] bg-card" />
                </div>
              </div>
              {/* Gradient accent bar at top */}
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradient}`} />
              <CardContent className="relative p-5 pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </p>
                    {loading ? (
                      <Skeleton className="h-9 w-24" />
                    ) : (
                      <AnimatedCounter value={value} className={`text-3xl font-bold tracking-tight tabular-nums ${card.valueColor}`} />
                    )}
                    {/* Trend indicator */}
                    {!loading && (
                      <div className="flex items-center gap-1">
                        {card.trend.direction === 'up' ? (
                          <TrendingUp className="size-3.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="size-3.5 text-rose-500" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            card.trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {card.trend.value}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs last month</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg} shadow-sm`}>
                    <card.icon className={`size-5.5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Enhanced Platform Info Card (Task 2-a / 2-b)                          */
/* ------------------------------------------------------------------ */

function MiniStatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-muted/60">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

function PlatformInfoCard({ stats, loading, onRefresh, lastRefreshRef, isSpinning }: {
  stats: Stats | null
  loading: boolean
  onRefresh: () => void
  lastRefreshRef: React.RefObject<number>
  isSpinning: boolean
}) {
  const maxStates = Math.max(stats?.uniqueStates ?? 0, 50)
  const maxYards = Math.max(stats?.uniqueYards ?? 0, 20)
  const maxMakes = Math.max(stats?.uniqueMakes ?? 0, 30)

  const [relativeTime, setRelativeTime] = useState('just now')

  // Update relative time every 10 seconds
  useEffect(() => {
    const update = () => {
      if (lastRefreshRef.current) {
        setRelativeTime(getRelativeTime(lastRefreshRef.current))
      }
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [lastRefreshRef])

  const infoRows = [
    { icon: Clock, label: 'Last Import', value: stats?.lastImport ? new Date(stats.lastImport).toLocaleDateString() : 'N/A', barColor: '', barValue: 0, barMax: 1, loading: false },
    { icon: RefreshCw, label: 'Last Update', value: stats?.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString() : 'N/A', barColor: '', barValue: 0, barMax: 1, loading: false },
    { icon: Car, label: 'Unique Makes', value: loading ? null : (stats?.uniqueMakes ?? 0).toLocaleString(), barColor: 'bg-gradient-to-r from-rose-400 to-rose-500', barValue: stats?.uniqueMakes ?? 0, barMax: maxMakes, loading },
    { icon: MapPin, label: 'Unique States', value: loading ? null : (stats?.uniqueStates ?? 0).toLocaleString(), barColor: 'bg-gradient-to-r from-amber-400 to-amber-500', barValue: stats?.uniqueStates ?? 0, barMax: maxStates, loading },
    { icon: Warehouse, label: 'Active Yards', value: loading ? null : (stats?.uniqueYards ?? 0).toLocaleString(), barColor: 'bg-gradient-to-r from-emerald-400 to-teal-500', barValue: stats?.uniqueYards ?? 0, barMax: maxYards, loading },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="pb-3 pl-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30">
                <Info className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Platform Info</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={onRefresh}
              aria-label="Refresh stats"
            >
              <RefreshCw className={`size-3.5 transition-transform duration-500 ${isSpinning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <CardDescription className="text-[11px]">Live platform metrics</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 pl-5">
          {infoRows.map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <Separator className="opacity-30" />}
              <div className="group/info flex items-center justify-between gap-3 py-3 rounded-md px-2 -mx-2 transition-colors duration-150 hover:bg-muted/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <row.icon className="size-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {row.barValue > 0 && !row.loading && (
                    <MiniStatBar value={row.barValue} max={row.barMax} color={row.barColor} />
                  )}
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {row.loading ? <Skeleton className="inline-block h-4 w-8" /> : row.value}
                  </span>
                </div>
              </div>
            </React.Fragment>
          ))}
          {/* Last refreshed indicator */}
          <Separator className="opacity-30" />
          <div className="flex items-center gap-1.5 py-2 px-2 -mx-2">
            <RefreshCw className={`size-3 text-muted-foreground/50 ${isSpinning ? 'animate-spin' : ''}`} />
            <span className="text-[11px] text-muted-foreground/70">Last refreshed: {relativeTime}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Viewport-triggered section reveal wrapper                          */
/* ------------------------------------------------------------------ */

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

function SectionReveal({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={index}
      variants={sectionReveal}
    >
      {children}
    </motion.div>
  )
}

/** Subtle gradient separator between sections */
function GradientSeparator() {
  return (
    <div className="relative h-px w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Tab                                                       */
/* ------------------------------------------------------------------ */

export function DashboardTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [imports, setImports] = useState<ImportJob[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingImports, setLoadingImports] = useState(true)
  const [chartKey, setChartKey] = useState(0)
  const lastRefreshRef = useRef(Date.now())
  const [isSpinning, setIsSpinning] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const json = await res.json()
        setStats(json.data ?? json)
      }
    } catch { /* use defaults */ } finally { setLoadingStats(false) }
  }, [])

  const doRefresh = useCallback(async () => {
    setIsSpinning(true)
    await fetchStats()
    lastRefreshRef.current = Date.now()
    // Re-trigger charts refresh by incrementing key
    setChartKey((k) => k + 1)
    setTimeout(() => setIsSpinning(false), 1000)
  }, [fetchStats])

  useEffect(() => {
    const fetchImports = async () => {
      try {
        const res = await fetch('/api/import?page=1&pageSize=5')
        if (res.ok) {
          const data = await res.json()
          setImports(data.data ?? data ?? [])
        }
      } catch { /* not available yet */ } finally { setLoadingImports(false) }
    }
    fetchStats()
    fetchImports()
  }, [fetchStats])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(doRefresh, 60000)
    return () => clearInterval(id)
  }, [doRefresh])

  return (
    <div className="space-y-6">
      {/* Section 0: Greeting + Stats Cards */}
      <SectionReveal index={0}>
        <GreetingBanner stats={stats} loading={loadingStats} />
      </SectionReveal>

      <SectionReveal index={1}>
        <AuctionTimeline />
      </SectionReveal>

      <SectionReveal index={2}>
        <StatsCards stats={stats} loading={loadingStats} />
      </SectionReveal>

      <GradientSeparator />

      {/* Section 3: Recent Imports + Quick Actions + Platform Info */}
      <SectionReveal index={3}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentImportsTable imports={imports} loading={loadingImports} />
          </div>
          <div className="space-y-6">
            <QuickActions />
            <PlatformInfoCard
              stats={stats}
              loading={loadingStats}
              onRefresh={doRefresh}
              lastRefreshRef={lastRefreshRef}
              isSpinning={isSpinning}
            />
          </div>
        </div>
      </SectionReveal>

      <GradientSeparator />

      {/* Section 4: Charts */}
      <SectionReveal index={4}>
        <ChartsSection key={chartKey} />
      </SectionReveal>

      <GradientSeparator />

      {/* Section 5: Insights */}
      <SectionReveal index={5}>
        <InsightsSection />
      </SectionReveal>

      <GradientSeparator />

      {/* Section 6: Recently Viewed */}
      <SectionReveal index={6}>
        <RecentlyViewedSection />
      </SectionReveal>

      <GradientSeparator />

      {/* Section 7: Top Vehicles */}
      <SectionReveal index={7}>
        <TopVehiclesSection />
      </SectionReveal>
    </div>
  )
}
