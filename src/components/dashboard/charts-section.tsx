'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const EMERALD = '#10b981'
const TEAL = '#14b8a6'
const CYAN = '#06b6d4'
const AMBER = '#f59e0b'
const EMERALD_DARK = '#34d399'
const TEAL_DARK = '#2dd4bf'
const CYAN_DARK = '#22d3ee'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
}

interface ChartItem { name: string; count: number }

/* ------------------------------------------------------------------ */
/*  Shared: Tooltip                                                    */
/* ------------------------------------------------------------------ */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton / Error cards                                             */
/* ------------------------------------------------------------------ */
function SkeletonCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] md:h-[250px] items-center justify-center">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] md:h-[250px] flex-col items-center justify-center text-center">
          <AlertCircle className="mb-2 size-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Failed to load chart data</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  1. Top Makes – Horizontal bar chart with gradient fills            */
/* ------------------------------------------------------------------ */
function MakesBar({ data }: { data: ChartItem[] }) {
  const { setSearchQuery, setActiveTab, addActivity } = useAppStore()

  const handleBarClick = useCallback(
    (name: string, count: number) => {
      setSearchQuery(name)
      setActiveTab('search')
      addActivity({
        type: 'search',
        icon: 'search',
        label: 'Chart click search',
        description: `Searched for make "${name}" (${count.toLocaleString()} lots)`,
      })
    },
    [setSearchQuery, setActiveTab, addActivity]
  )
  const items = useMemo(() => data.slice(0, 8), [data])
  const maxVal = useMemo(() => Math.max(...items.map((d) => d.count), 1), [items])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Top Makes</CardTitle>
        <CardDescription className="text-xs">Top 8 makes by lot count</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Inner shadow on chart area */}
        <div className="flex h-[200px] md:h-[250px] flex-col justify-center gap-2.5 px-1 rounded-md shadow-inner">
          {items.map((item, i) => {
            const pct = (item.count / maxVal) * 100
            return (
              <motion.div
                key={item.name}
                className="group/bar flex cursor-pointer items-center gap-2"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ filter: 'brightness(1.15)', scale: 1.02 }}
                onClick={() => handleBarClick(item.name, item.count)}
              >
                <span className="w-16 shrink-0 truncate text-right text-[11px] font-medium text-muted-foreground">
                  {item.name}
                </span>
                <Tooltip text={`${item.name}: ${item.count.toLocaleString()} lots — Click to search`}>
                  <div className="relative h-5 w-full overflow-hidden rounded-sm bg-muted/50">
                    {/* Gradient fill with rounded right cap */}
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{
                        background: `linear-gradient(90deg, ${EMERALD}, ${TEAL})`,
                        borderRadius: '0 4px 4px 0',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                    />
                    {/* Dark mode gradient via opacity layer */}
                    <motion.div
                      className="absolute inset-y-0 left-0 dark:opacity-100 opacity-0"
                      style={{
                        background: `linear-gradient(90deg, ${EMERALD_DARK}, ${TEAL_DARK})`,
                        borderRadius: '0 4px 4px 0',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                    />
                  </div>
                </Tooltip>
                <span className="w-8 shrink-0 text-right text-[11px] tabular-nums font-medium">
                  {item.count}
                </span>
                <Search className="ml-1 size-3 text-muted-foreground/0 transition-all duration-150 group-hover/bar:text-muted-foreground/60" />
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  2. Lots by State – Horizontal bar chart with gradient fills     */
/* ------------------------------------------------------------------ */
function StatesBar({ data }: { data: ChartItem[] }) {
  const { setSearchQuery, setActiveTab, addActivity } = useAppStore()

  const handleBarClick = useCallback(
    (name: string, count: number) => {
      setSearchQuery(name)
      setActiveTab('search')
      addActivity({
        type: 'search',
        icon: 'search',
        label: 'Chart click search',
        description: `Searched for state "${name}" (${count.toLocaleString()} lots)`,
      })
    },
    [setSearchQuery, setActiveTab, addActivity]
  )

  const items = useMemo(() => data.slice(0, 8), [data])
  const maxVal = useMemo(() => Math.max(...items.map((d) => d.count), 1), [items])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Lots by State</CardTitle>
        <CardDescription className="text-xs">Top 8 states by lot count</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Inner shadow on chart area */}
        <div className="flex h-[200px] md:h-[250px] flex-col justify-center gap-2.5 px-1 rounded-md shadow-inner">
          {items.map((item, i) => {
            const pct = (item.count / maxVal) * 100
            return (
              <motion.div
                key={item.name}
                className="group/bar flex cursor-pointer items-center gap-2"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ filter: 'brightness(1.15)', scale: 1.02 }}
                onClick={() => handleBarClick(item.name, item.count)}
              >
                <span className="w-10 shrink-0 text-right text-[11px] font-medium text-muted-foreground">
                  {item.name}
                </span>
                <Tooltip text={`${item.name}: ${item.count.toLocaleString()} lots — Click to search`}>
                  <div className="relative h-5 w-full overflow-hidden rounded-sm bg-muted/50">
                    {/* Gradient fill with rounded right cap */}
                    <motion.div
                      className="absolute inset-y-0 left-0"
                      style={{
                        background: `linear-gradient(90deg, ${TEAL}, ${CYAN})`,
                        borderRadius: '0 4px 4px 0',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                    />
                    {/* Dark mode gradient */}
                    <motion.div
                      className="absolute inset-y-0 left-0 dark:opacity-100 opacity-0"
                      style={{
                        background: `linear-gradient(90deg, ${TEAL_DARK}, ${CYAN_DARK})`,
                        borderRadius: '0 4px 4px 0',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                    />
                  </div>
                </Tooltip>
                <span className="w-8 shrink-0 text-right text-[11px] tabular-nums font-medium">
                  {item.count}
                </span>
                <Search className="ml-1 size-3 text-muted-foreground/0 transition-all duration-150 group-hover/bar:text-muted-foreground/60" />
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  3. Vehicle Type Distribution – CSS conic-gradient donut (thicker)  */
/* ------------------------------------------------------------------ */
function VehiclePie({ data }: { data: ChartItem[] }) {
  const total = useMemo(() => data.reduce((s, i) => s + i.count, 0), [data])

  // Build conic-gradient stops
  const gradient = useMemo(() => {
    if (total === 0) return 'conic-gradient(#e5e7eb 0% 100%)'
    let cumulative = 0
    const segments = data.map((item) => {
      const start = cumulative
      cumulative += (item.count / total) * 100
      const color = item.name === 'V' ? EMERALD : AMBER
      return `${color} ${start}% ${cumulative}%`
    })
    return `conic-gradient(${segments.join(', ')})`
  }, [data, total])

  const vehiclePct = total > 0 ? ((data.find((d) => d.name === 'V')?.count ?? 0) / total * 100).toFixed(1) : '0.0'

  // 35% ring thickness
  const ringThickness = '35%'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Vehicle Type Distribution</CardTitle>
        <CardDescription className="text-xs">Vehicle vs Truck/Other</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] md:h-[250px] flex-col items-center justify-center gap-3">
          {/* Donut ring - thicker at 35% */}
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div
              className="mx-auto size-36 md:size-44 rounded-full"
              style={{
                background: gradient,
                WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThickness}), #000 calc(100% - ${ringThickness} - 1px))`,
                mask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThickness}), #000 calc(100% - ${ringThickness} - 1px))`,
              }}
            />
            {/* Center percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold tabular-nums leading-none">{vehiclePct}%</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Vehicle</span>
            </div>
          </motion.div>
          {/* Legend */}
          {total > 0 && (
            <div className="flex max-w-full flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
              {data.map((item) => {
                const pct = ((item.count / total) * 100).toFixed(1)
                const label = item.name === 'V' ? 'Vehicle' : item.name || 'Other'
                const clr = item.name === 'V' ? EMERALD : AMBER
                return (
                  <div key={item.name} className="flex min-w-0 items-center gap-1.5">
                    <div className="size-2 rounded-sm" style={{ backgroundColor: clr }} />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{item.count.toLocaleString()}</span>
                    <span className="text-muted-foreground">({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  4. Year Distribution – Area / bar chart with gradient & count label */
/* ------------------------------------------------------------------ */
function YearArea({ data }: { data: ChartItem[] }) {
  const { setSearchQuery, setActiveTab, addActivity } = useAppStore()

  const handleBarClick = useCallback(
    (name: string, count: number) => {
      setSearchQuery(name)
      setActiveTab('search')
      addActivity({
        type: 'search',
        icon: 'search',
        label: 'Chart click search',
        description: `Searched for year "${name}" (${count.toLocaleString()} lots)`,
      })
    },
    [setSearchQuery, setActiveTab, addActivity]
  )

  const items = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
    return sorted.map((i) => ({
      ...i,
      label: i.name.length >= 2 ? i.name.slice(-2) : i.name,
    }))
  }, [data])

  const maxVal = useMemo(() => Math.max(...items.map((d) => d.count), 1), [items])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Year Distribution</CardTitle>
        <CardDescription className="text-xs">Lots by vehicle year</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Inner shadow on chart area */}
        <div className="flex h-[200px] md:h-[250px] flex-col justify-end gap-1 px-1 rounded-md shadow-inner">
          {/* Bars area */}
          <div className="relative flex h-[140px] md:h-[190px] items-end gap-[2px]">
            {/* Background grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac) => (
              <div
                key={frac}
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-muted-foreground/15"
                style={{ bottom: `${frac * 100}%` }}
              />
            ))}
            {items.map((item, i) => {
              const pct = (item.count / maxVal) * 100
              return (
                <Tooltip key={item.name} text={`Year ${item.name}: ${item.count.toLocaleString()} lots — Click to search`}>
                  <motion.div
                    className="group relative flex cursor-pointer flex-1 flex-col items-center justify-end min-w-0"
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.45, delay: i * 0.03, ease: 'easeOut' }}
                    whileHover={{ filter: 'brightness(1.15)', scale: 1.03 }}
                    onClick={() => handleBarClick(item.name, item.count)}
                  >
                    {/* Gradient fill: emerald → cyan (light) / emerald-light → cyan-light (dark) */}
                    <div
                      className="absolute inset-x-0 bottom-0 top-0 rounded-t-sm"
                      style={{
                        background: `linear-gradient(to top, ${EMERALD}, ${CYAN})`,
                      }}
                    />
                    {/* Dark mode gradient overlay */}
                    <div
                      className="absolute inset-x-0 bottom-0 top-0 rounded-t-sm dark:opacity-100 opacity-0"
                      style={{
                        background: `linear-gradient(to top, ${EMERALD_DARK}, ${CYAN_DARK})`,
                      }}
                    />
                    {/* Count label on hover (shows instead of arrow) */}
                    <span className="relative z-10 mb-1 text-[9px] font-bold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 tabular-nums drop-shadow-sm">
                      {item.count}
                    </span>
                  </motion.div>
                </Tooltip>
              )
            })}
          </div>
          {/* Year labels */}
          <div className="flex gap-[2px]">
            {items.map((item) => (
              <div key={item.name} className="flex-1 min-w-0 text-center text-[10px] tabular-nums text-muted-foreground truncate">
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export function ChartsSection() {
  const [data, setData] = useState<Record<string, ChartItem[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/stats/charts')
        if (r.ok) {
          const j = await r.json()
          setData(j.data)
        } else setError(true)
      } catch { setError(true) }
      finally { setLoading(false) }
    })()
  }, [])

  const titles = ['Top Makes', 'Lots by State', 'Vehicle Type Distribution', 'Year Distribution']

  if (loading) return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {titles.map((t) => <SkeletonCard key={t} title={t} />)}
    </div>
  )

  if (error || !data) return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {titles.map((t) => <ErrorCard key={t} title={t} />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Data Insights</h3>
        <p className="text-sm text-muted-foreground">Visual breakdown of your lot inventory.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div {...fadeIn}><MakesBar data={data.makes ?? []} /></motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}><StatesBar data={data.states ?? []} /></motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}><VehiclePie data={data.vehicleTypes ?? []} /></motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}><YearArea data={data.years ?? []} /></motion.div>
      </div>
    </div>
  )
}
