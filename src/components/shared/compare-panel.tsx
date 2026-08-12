'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileJson, GitCompare, X, Loader2, Trophy, Settings2, DollarSign, Gauge, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import type { Auction } from '@/lib/types'
import {
  formatCurrency,
  formatOdometer,
  formatSaleDate,
  getPlaceholderGradient,
  getVehicleInitials,
} from '@/lib/format'

// ─── Category Header ──────────────────────────────────────────────────────────

function CategoryHeader({ icon: Icon, label }: { icon: typeof Settings2; label: string }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mt-2 mb-1">
      {Icon && <Icon className="size-3" />}
      {label}
    </div>
  )
}

// ─── Compare Row ─────────────────────────────────────────────────────────────

function CompareRow({
  label,
  values,
  highlightBest,
  index,
}: {
  label: string
  values: (string | null | undefined)[]
  highlightBest?: 'min' | 'max' | null
  index: number
}) {
  // Find the "best" value index (for numeric comparisons)
  let bestIdx = -1
  if (highlightBest && values.length > 1) {
    const nums = values.map((v) => {
      if (!v || v === '—' || v === 'None' || v === 'No' || v === 'Not eligible') return null
      const parsed = parseFloat(v.replace(/[^0-9.-]/g, ''))
      return isNaN(parsed) ? null : parsed
    })
    const validNums = nums
      .map((n, i) => (n !== null ? { n, i } : null))
      .filter(Boolean) as { n: number; i: number }[]
    if (validNums.length > 1) {
      if (highlightBest === 'max') {
        bestIdx = validNums.reduce((a, b) => (a.n > b.n ? a : b)).i
      } else {
        bestIdx = validNums.reduce((a, b) => (a.n < b.n ? a : b)).i
      }
    }
  }

  return (
    <div className={`grid grid-cols-4 gap-2 py-2 text-sm ${index % 2 === 0 ? 'bg-muted/20' : ''}`}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          className={`text-right text-xs font-medium flex items-center justify-end gap-1 ${
            i === bestIdx
              ? 'bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-0.5'
              : ''
          }`}
        >
          {i === bestIdx && (
            <Trophy className="size-3 text-amber-500 shrink-0" />
          )}
          {i === bestIdx && (highlightBest === 'min' || highlightBest === 'max') && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[9px] px-1 py-0 h-4 font-semibold">
              Best
            </Badge>
          )}
          <span className="truncate">{v || '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComparePanel() {
  const { compareList, clearCompare } = useAppStore()
  const [open, setOpen] = useState(false)
  const [vehicles, setVehicles] = useState<Auction[]>([])
  const [loading, setLoading] = useState(false)

  const downloadReport = (format: 'csv' | 'json') => {
    const link = document.createElement('a')
    link.href = `/api/compare/report?ids=${compareList.join(',')}&format=${format}`
    link.download = `lot-comparison.${format}`
    link.click()
  }

  const fetchVehicles = useCallback(async () => {
    if (compareList.length === 0) {
      setVehicles([])
      return
    }
    setLoading(true)
    try {
      const results = await Promise.all(
        compareList.map((id) =>
          fetch(`/api/auctions/${id}`).then((r) => (r.ok ? r.json() : null))
        )
      )
      const data = results
        .filter((r) => r?.success)
        .map((r) => r.data as Auction)
      setVehicles(data)
    } catch {
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [compareList])

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchVehicles()
    }, 0)
    return () => clearTimeout(timeout)
  }, [fetchVehicles])

  if (compareList.length === 0 && vehicles.length === 0) return null

  return (
    <>
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed right-6 bottom-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="pulse-glow-emerald relative flex size-14 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl"
            >
              <GitCompare className="size-5" />
              <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]">
                {compareList.length}
              </Badge>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-4xl p-0">
          {/* Gradient bar at top */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400" />

          <SheetHeader className="px-6 pt-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <GitCompare className="size-5" />
              Compare Lots
              <Badge variant="secondary" className="ml-1">
                {compareList.length}/3
              </Badge>
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Side-by-side comparison across auction events
            </p>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No vehicles to compare.
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-160px)] px-6 pb-6">
              {/* ─── Vehicle Image Headers ─────────────────────────────── */}
              <div className="grid grid-cols-4 gap-2 pb-2">
                <div />
                {vehicles.map((v) => {
                  const gradient = getPlaceholderGradient(v.make)
                  const initials = getVehicleInitials(v.make, v.modelGroup || v.modelDetail)
                  return (
                    <div key={v.id} className="flex flex-col items-center gap-2 text-center">
                      {/* Image placeholder rounded square */}
                      <div className={`size-16 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                        <span className="text-xl font-bold text-white/90 tracking-wider drop-shadow">
                          {initials}
                        </span>
                      </div>
                      <div className="text-sm font-semibold leading-tight">
                        {v.year} {v.make} {v.modelGroup || v.modelDetail}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Lot #{v.lotNumber}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ─── SPECIFICATIONS ────────────────────────────────────── */}
              <CategoryHeader icon={Settings2} label="Specifications" />
              <Separator />

              <div>
                <CompareRow index={0} label="Year" values={vehicles.map((v) => v.year?.toString())} highlightBest="max" />
                <CompareRow index={1} label="Make" values={vehicles.map((v) => v.make)} />
                <CompareRow index={2} label="Model" values={vehicles.map((v) => v.modelGroup || v.modelDetail)} />
                <CompareRow index={3} label="Body Style" values={vehicles.map((v) => v.bodyStyle)} />
                <CompareRow index={4} label="Color" values={vehicles.map((v) => v.color)} />
              </div>

              {/* ─── PRICING ────────────────────────────────────────────── */}
              <CategoryHeader icon={DollarSign} label="Pricing" />
              <Separator />

              <div>
                <CompareRow index={5} label="Est. Value" values={vehicles.map((v) => (v.estimatedRetailValue ? formatCurrency(v.estimatedRetailValue) : null))} highlightBest="max" />
                <CompareRow index={6} label="High Bid" values={vehicles.map((v) => (v.highBid ? formatCurrency(v.highBid) : null))} highlightBest="max" />
                <CompareRow index={7} label="Buy It Now" values={vehicles.map((v) => (v.buyItNowPrice ? formatCurrency(v.buyItNowPrice) : null))} />
                <CompareRow index={8} label="Repair Cost" values={vehicles.map((v) => (v.repairCost ? formatCurrency(v.repairCost) : null))} />
              </div>

              {/* ─── PERFORMANCE ────────────────────────────────────────── */}
              <CategoryHeader icon={Gauge} label="Performance" />
              <Separator />

              <div>
                <CompareRow index={9} label="Odometer" values={vehicles.map((v) => formatOdometer(v.odometer))} highlightBest="min" />
                <CompareRow index={10} label="Fuel Type" values={vehicles.map((v) => v.fuelType)} />
                <CompareRow index={11} label="Transmission" values={vehicles.map((v) => v.transmission)} />
                <CompareRow index={12} label="Drive" values={vehicles.map((v) => v.drive)} />
                <CompareRow index={13} label="Engine" values={vehicles.map((v) => v.engine)} />
                <CompareRow index={14} label="Cylinders" values={vehicles.map((v) => v.cylinders?.toString())} />
              </div>

              {/* ─── SALE INFO ──────────────────────────────────────────── */}
              <CategoryHeader icon={Clock} label="Sale Info" />
              <Separator />

              <div>
                <CompareRow index={15} label="Sale Date" values={vehicles.map((v) => formatSaleDate(v.saleDate))} />
                <CompareRow index={16} label="Sale Status" values={vehicles.map((v) => v.saleStatus)} />
                <CompareRow index={17} label="Location" values={vehicles.map((v) => (v.locationCity && v.locationState ? `${v.locationCity}, ${v.locationState}` : v.locationCity || v.locationState || null))} />
                <CompareRow index={18} label="Damage" values={vehicles.map((v) => v.damageDescription || 'None')} />
                <CompareRow index={19} label="Title Type" values={vehicles.map((v) => v.saleTitleType)} />
                <CompareRow index={20} label="Runs & Drives" values={vehicles.map((v) => v.runsDrives)} />
                <CompareRow index={21} label="Has Keys" values={vehicles.map((v) => (v.hasKeys === true ? 'Yes' : v.hasKeys === false ? 'No' : null))} />
              </div>

              {/* ─── Clear All Button ───────────────────────────────────── */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => downloadReport('csv')}><Download className="mr-2 size-4" />Export CSV</Button>
                <Button variant="outline" onClick={() => downloadReport('json')}><FileJson className="mr-2 size-4" />Export JSON</Button>
                <Button
                  className="bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700"
                  onClick={clearCompare}
                >
                  <X className="mr-2 size-4" />
                  Clear All ({compareList.length})
                </Button>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
