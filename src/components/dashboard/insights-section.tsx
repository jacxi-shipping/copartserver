'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
}

interface ChartItem { name: string; count: number }

// ─── Fuel Type Color Map ─────────────────────────────────────────────────

const FUEL_COLORS: Record<string, string> = {
  GAS: '#10b981',
  GASOLINE: '#10b981',
  DIESEL: '#f59e0b',
  ELECTRIC: '#06b6d4',
  HYBRID: '#8b5cf6',
}

function getFuelColor(name: string): string {
  const upper = name.toUpperCase()
  for (const [key, color] of Object.entries(FUEL_COLORS)) {
    if (upper.includes(key)) return color
  }
  return '#6b7280'
}

// ─── 1. Damage Distribution – Horizontal bars (rose) ─────────────────────

function DamageBars({ data }: { data: ChartItem[] }) {
  const items = useMemo(() => data.slice(0, 8), [data])
  const maxVal = useMemo(() => Math.max(...items.map((d) => d.count), 1), [items])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Damage Distribution</CardTitle>
        <CardDescription className="text-xs">Top 8 damage types by count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[180px] flex-col justify-center gap-2 px-1 overflow-y-auto rounded-md shadow-inner">
          {items.map((item, i) => {
            const pct = (item.count / maxVal) * 100
            return (
              <motion.div
                key={item.name}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <span className="w-24 shrink-0 truncate text-right text-[11px] font-medium text-muted-foreground">
                  {item.name.length > 18 ? item.name.slice(0, 18) + '…' : item.name}
                </span>
                <div className="relative h-4 w-full overflow-hidden rounded-sm bg-muted/50">
                  <motion.div
                    className="absolute inset-y-0 left-0"
                    style={{
                      background: 'linear-gradient(90deg, #fb7185, #e11d48)',
                      borderRadius: '0 4px 4px 0',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0 dark:opacity-100 opacity-0"
                    style={{
                      background: 'linear-gradient(90deg, #fda4af, #fb7185)',
                      borderRadius: '0 4px 4px 0',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[11px] tabular-nums font-medium">
                  {item.count}
                </span>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 2. Fuel Type Breakdown – Donut chart ────────────────────────────────

function FuelDonut({ data }: { data: ChartItem[] }) {
  const items = useMemo(() => data.slice(0, 6), [data])
  const total = useMemo(() => items.reduce((s, i) => s + i.count, 0), [items])

  const gradient = useMemo(() => {
    if (total === 0) return 'conic-gradient(#e5e7eb 0% 100%)'
    let cumulative = 0
    const segments = items.map((item) => {
      const start = cumulative
      cumulative += (item.count / total) * 100
      const color = getFuelColor(item.name)
      return `${color} ${start}% ${cumulative}%`
    })
    return `conic-gradient(${segments.join(', ')})`
  }, [items, total])

  const topItem = items[0]
  const topPct = total > 0 && topItem ? ((topItem.count / total) * 100).toFixed(1) : '0.0'
  const topLabel = topItem?.name ?? '—'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Fuel Type Breakdown</CardTitle>
        <CardDescription className="text-xs">Distribution of fuel types</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div
              className="mx-auto size-32 rounded-full md:size-36"
              style={{
                background: gradient,
                WebkitMask:
                  'radial-gradient(farthest-side, transparent 65%, #000 66%)',
                mask: 'radial-gradient(farthest-side, transparent 65%, #000 66%)',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold tabular-nums leading-none">{topPct}%</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[60px]">{topLabel}</span>
            </div>
          </motion.div>
          {/* Legend */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
              {items.map((item) => {
                const pct = ((item.count / total) * 100).toFixed(1)
                const clr = getFuelColor(item.name)
                return (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: clr }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{pct}%</span>
                    <span className="text-muted-foreground">({item.count.toLocaleString()})</span>
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

// ─── 3. Drive Type Distribution – Vertical bars (teal) ───────────────────

const TEAL = '#14b8a6'
const TEAL_DARK = '#2dd4bf'
const CYAN = '#06b6d4'
const CYAN_DARK = '#22d3ee'

function DriveBars({ data }: { data: ChartItem[] }) {
  const items = useMemo(() => data.slice(0, 5), [data])
  const maxVal = useMemo(() => Math.max(...items.map((d) => d.count), 1), [items])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Drive Type Distribution</CardTitle>
        <CardDescription className="text-xs">Top 5 drive types by count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[180px] flex-col justify-end gap-1 px-1 rounded-md shadow-inner">
          <div className="relative flex h-[120px] items-end gap-[2px]">
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
                <motion.div
                  key={item.name}
                  className="group relative flex flex-1 flex-col items-center justify-end min-w-0"
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: 'easeOut' }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 top-0 rounded-t-sm"
                    style={{ background: `linear-gradient(to top, ${TEAL}, ${CYAN})` }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 top-0 rounded-t-sm dark:opacity-100 opacity-0"
                    style={{ background: `linear-gradient(to top, ${TEAL_DARK}, ${CYAN_DARK})` }}
                  />
                  <span className="relative z-10 mb-1 text-[9px] font-bold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 tabular-nums drop-shadow-sm">
                    {item.count}
                  </span>
                </motion.div>
              )
            })}
          </div>
          <div className="flex gap-[2px]">
            {items.map((item) => (
              <div key={item.name} className="flex-1 min-w-0 text-center text-[10px] tabular-nums text-muted-foreground truncate">
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Insights Section ───────────────────────────────────────────────

export function InsightsSection() {
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
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {['Damage Distribution', 'Fuel Type Breakdown', 'Drive Type Distribution'].map((t) => (
          <Card key={t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[180px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Analytics Insights</h3>
        <p className="text-sm text-muted-foreground">Damage, fuel, and drive type breakdowns.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div {...fadeIn}>
          <DamageBars data={data.damageTypes ?? []} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <FuelDonut data={data.fuelTypes ?? []} />
        </motion.div>
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <DriveBars data={data.driveTypes ?? []} />
        </motion.div>
      </div>
    </div>
  )
}
