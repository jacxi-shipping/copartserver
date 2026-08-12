'use client'

import React, { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  BarChart3, DollarSign, Gavel, Wrench, TrendingUp,
  MapPin, Building2, Warehouse, Car,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { formatCurrency, formatOdometer } from '@/lib/format'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarketOverview {
  priceDistribution: { label: string; count: number }[]
  avgRetailValue: number
  avgHighBid: number
  avgRepairCost: number
  totalEstimatedValue: number
  profitMargin: number
  damageTypeDistribution: { name: string; count: number }[]
  totalLots: number
}

interface MakeData {
  make: string
  count: number
  avgRetailValue: number
  avgHighBid: number
  avgOdometer: number
  avgRepairCost: number
  avgYear: number
}

interface MakeAnalysis {
  makes: MakeData[]
  overall: {
    avgRetailValue: number
    avgHighBid: number
    avgOdometer: number
    avgRepairCost: number
    avgYear: number
  }
}

interface StateData {
  state: string
  count: number
  avgRetailValue: number
  avgHighBid: number
  topMake: string
  totalValue: number
}

interface LocationAnalysis {
  states: StateData[]
  cities: { city: string; count: number }[]
  yards: { yard: string; count: number }[]
}

// ─── Animation Variants ────────────────────────────────────────────────────

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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

// ─── Stagger Animation for Bars ─────────────────────────────────────────────

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerItemUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

// ─── Warm color palette for damage chart ────────────────────────────────────

const warmColors = [
  'bg-amber-500', 'bg-orange-500', 'bg-rose-500', 'bg-red-500',
  'bg-amber-400', 'bg-orange-400', 'bg-rose-400', 'bg-red-400',
  'bg-amber-600', 'bg-orange-600',
]

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-5">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Market Overview Stat Cards ─────────────────────────────────────────────

function MarketStatCard({
  icon: Icon, label, value, subtitle, gradient,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  subtitle: string
  gradient: string
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Price Distribution Chart (Horizontal Bars) ─────────────────────────────

function PriceDistributionChart({ data }: { data: { label: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Price Distribution</CardTitle>
        <CardDescription>Vehicle lots by estimated retail value range</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.map((item, i) => {
            const pct = (item.count / maxCount) * 100
            return (
              <motion.div key={item.label} className="flex items-center gap-3" variants={staggerItem}>
                <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground text-right tabular-nums">
                  {item.label}
                </span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/50">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-right text-foreground">
                  {item.count}
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}

// ─── Damage Type Breakdown (Vertical Bars) ──────────────────────────────────

function DamageBreakdownChart({ data }: { data: { name: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  // Truncate long damage names
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + '...' : s

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Damage Type Breakdown</CardTitle>
        <CardDescription>Top 10 damage descriptions by frequency</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div
          className="flex items-end gap-2"
          style={{ height: 200 }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.map((item, i) => {
            const pct = (item.count / maxCount) * 100
            const color = warmColors[i % warmColors.length]
            return (
              <motion.div
                key={item.name}
                className="flex flex-1 flex-col items-center gap-1.5"
                variants={staggerItemUp}
              >
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {item.count}
                </span>
                <div className="relative w-full overflow-hidden rounded-t-md">
                  <motion.div
                    className={`mx-auto w-full max-w-8 rounded-t-md ${color}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{ minHeight: 4 }}
                  />
                </div>
                <span
                  className="w-full text-center text-[9px] leading-tight text-muted-foreground"
                  title={item.name}
                >
                  {truncate(item.name, 10)}
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}

// ─── Make Analysis Table ────────────────────────────────────────────────────

function MakeAnalysisTable({ makes, overall }: { makes: MakeData[]; overall: MakeAnalysis['overall'] }) {
  const maxAvgValue = Math.max(...makes.map((m) => m.avgRetailValue), 1)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Make Analysis</CardTitle>
        <CardDescription>Top 15 makes by lot count with performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs">Make</TableHead>
                <TableHead className="text-xs">Count</TableHead>
                <TableHead className="text-xs">Avg Value</TableHead>
                <TableHead className="text-xs">Avg Bid</TableHead>
                <TableHead className="text-xs">Avg Odometer</TableHead>
                <TableHead className="text-xs">Avg Year</TableHead>
                <TableHead className="text-xs pr-4">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {makes.map((m) => {
                const margin = m.avgRetailValue > 0
                  ? ((1 - m.avgHighBid / m.avgRetailValue) * 100)
                  : 0
                const isHighest = m.avgRetailValue === maxAvgValue && maxAvgValue > 0
                return (
                  <TableRow
                    key={m.make}
                    className={isHighest ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''}
                  >
                    <TableCell className="pl-4 font-medium">
                      <div className="flex items-center gap-2">
                        {isHighest && (
                          <TrendingUp className="size-3.5 text-emerald-500" />
                        )}
                        <span className={isHighest ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}>
                          {m.make}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{m.count}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(m.avgRetailValue)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(m.avgHighBid)}</TableCell>
                    <TableCell className="tabular-nums">{formatOdometer(m.avgOdometer)}</TableCell>
                    <TableCell className="tabular-nums">{m.avgYear || '—'}</TableCell>
                    <TableCell className="pr-4 tabular-nums">
                      <Badge
                        variant={margin > 50 ? 'default' : 'secondary'}
                        className={margin > 50
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : ''}
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* Market Average Row */}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell className="pl-4 text-muted-foreground">Market Avg</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">—</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(overall.avgRetailValue)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(overall.avgHighBid)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{formatOdometer(overall.avgOdometer)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{overall.avgYear || '—'}</TableCell>
                <TableCell className="pr-4">
                  <Badge variant="outline">—</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Location Insights ──────────────────────────────────────────────────────

function StatePerformanceTable({ states }: { states: StateData[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="size-4 text-emerald-500" />
          State Performance
        </CardTitle>
        <CardDescription>Top 15 states by lot count</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs">State</TableHead>
                <TableHead className="text-xs">Lots</TableHead>
                <TableHead className="text-xs">Avg Value</TableHead>
                <TableHead className="text-xs">Avg Bid</TableHead>
                <TableHead className="text-xs pr-4">Top Make</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {states.map((s) => (
                <TableRow key={s.state}>
                  <TableCell className="pl-4 font-medium">{s.state}</TableCell>
                  <TableCell className="tabular-nums">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {s.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(s.avgRetailValue)}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(s.avgHighBid)}</TableCell>
                  <TableCell className="pr-4">{s.topMake}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function TopCitiesList({ cities }: { cities: { city: string; count: number }[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="size-4 text-amber-500" />
          Top Cities
        </CardTitle>
        <CardDescription>Top 10 cities by lot count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cities.map((c, i) => (
            <div
              key={c.city}
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{c.city}</span>
              </div>
              <Badge variant="secondary" className="tabular-nums text-xs">
                {c.count}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function YardDistribution({ yards }: { yards: { yard: string; count: number }[] }) {
  const maxCount = Math.max(...yards.map((y) => y.count), 1)
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Warehouse className="size-4 text-teal-500" />
          Yard Distribution
        </CardTitle>
        <CardDescription>Top 15 yards by lot count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {yards.map((y, i) => {
            const pct = (y.count / maxCount) * 100
            return (
              <motion.div
                key={y.yard}
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              >
                <span className="w-28 shrink-0 truncate text-xs font-medium text-muted-foreground" title={y.yard}>
                  {y.yard}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-teal-500 to-emerald-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">{y.count}</span>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Profit Margin Circular Indicator ───────────────────────────────────────

function ProfitMarginCircle({ margin }: { margin: number }) {
  const clampedMargin = Math.max(0, Math.min(100, margin))
  // conic-gradient: filled portion + remaining
  const gradient = `conic-gradient(from 0deg, #10b981 0% ${clampedMargin}%, rgba(0,0,0,0.08) ${clampedMargin}% 100%)`

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-500" />
          Profit Margin Analysis
        </CardTitle>
        <CardDescription>Average potential buyer profit margin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
          {/* Circular indicator */}
          <div className="relative flex shrink-0 items-center justify-center">
            <div
              className="size-36 rounded-full"
              style={{ background: gradient }}
            />
            <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-card">
              <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {margin.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">margin</span>
            </div>
          </div>
          {/* Formula explanation */}
          <div className="flex-1 space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Formula</p>
              <code className="block text-xs leading-relaxed text-foreground/80">
                ((Retail Value - High Bid) / Retail Value) × 100
              </code>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>This represents the <span className="font-medium text-foreground">average discount</span> buyers get relative to the estimated retail value.</p>
              <p>Higher margins indicate greater potential savings at auction.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2 rounded-full ${margin > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xs text-muted-foreground">
                {margin > 60 ? 'Excellent buyer opportunity' : margin > 40 ? 'Good buyer opportunity' : 'Moderate discounts'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Analytics Tab ─────────────────────────────────────────────────────

export function AnalyticsTab() {
  const [market, setMarket] = useState<MarketOverview | null>(null)
  const [makeData, setMakeData] = useState<MakeAnalysis | null>(null)
  const [locationData, setLocationData] = useState<LocationAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const [marketRes, makeRes, locationRes] = await Promise.all([
          fetch('/api/analytics/market-overview'),
          fetch('/api/analytics/make-analysis'),
          fetch('/api/analytics/location-analysis'),
        ])
        if (cancelled) return
        const [marketJson, makeJson, locationJson] = await Promise.all([
          marketRes.json(),
          makeRes.json(),
          locationRes.json(),
        ])
        if (!cancelled) {
          if (marketJson.success) setMarket(marketJson.data)
          if (makeJson.success) setMakeData(makeJson.data)
          if (locationJson.success) setLocationData(locationJson.data)
        }
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionReveal index={0}>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Market Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive insights into vehicle auction market trends, pricing, and performance metrics
            </p>
          </div>
        </div>
      </SectionReveal>

      <GradientSeparator />

      {/* Market Overview Stat Cards */}
      <SectionReveal index={1}>
        {loading || !market ? (
          <StatCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MarketStatCard
              icon={DollarSign}
              label="Total Market Value"
              value={formatCurrency(market.totalEstimatedValue)}
              subtitle={`${market.totalLots} total lots`}
              gradient="from-emerald-500 to-emerald-700"
            />
            <MarketStatCard
              icon={Car}
              label="Avg Lot Price"
              value={formatCurrency(market.avgRetailValue)}
              subtitle="Estimated retail value"
              gradient="from-teal-500 to-teal-700"
            />
            <MarketStatCard
              icon={Gavel}
              label="Avg Bid Price"
              value={formatCurrency(market.avgHighBid)}
              subtitle="Current high bids"
              gradient="from-amber-500 to-amber-700"
            />
            <MarketStatCard
              icon={Wrench}
              label="Avg Repair Cost"
              value={formatCurrency(market.avgRepairCost)}
              subtitle="Estimated repairs"
              gradient="from-rose-500 to-rose-700"
            />
          </div>
        )}
      </SectionReveal>

      <GradientSeparator />

      {/* Price Distribution + Damage Breakdown */}
      <SectionReveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading || !market ? <ChartSkeleton /> : <PriceDistributionChart data={market.priceDistribution} />}
          {loading || !market ? <ChartSkeleton /> : <DamageBreakdownChart data={market.damageTypeDistribution} />}
        </div>
      </SectionReveal>

      <GradientSeparator />

      {/* Make Analysis Table */}
      <SectionReveal index={3}>
        {loading || !makeData ? <TableSkeleton /> : <MakeAnalysisTable makes={makeData.makes} overall={makeData.overall} />}
      </SectionReveal>

      <GradientSeparator />

      {/* Profit Margin */}
      <SectionReveal index={4}>
        {loading || !market ? <ChartSkeleton /> : <ProfitMarginCircle margin={market.profitMargin} />}
      </SectionReveal>

      <GradientSeparator />

      {/* Location Insights */}
      <SectionReveal index={5}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading || !locationData ? <TableSkeleton /> : <StatePerformanceTable states={locationData.states} />}
          {loading || !locationData ? <ChartSkeleton /> : <TopCitiesList cities={locationData.cities} />}
        </div>
      </SectionReveal>

      <GradientSeparator />

      {/* Yard Distribution */}
      <SectionReveal index={6}>
        {loading || !locationData ? <ChartSkeleton /> : <YardDistribution yards={locationData.yards} />}
      </SectionReveal>
    </div>
  )
}
