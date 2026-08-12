'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Clock, X, Loader2, Eye, Gauge } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Auction } from '@/lib/types'
import { formatCurrency, formatOdometer, getPlaceholderGradient, getVehicleInitials, getVehicleLabel } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'

/* ------------------------------------------------------------------ */
/*  Damage severity color mapping                                       */
/* ------------------------------------------------------------------ */

function getDamageBadgeClasses(damage: string | null | undefined): string {
  if (!damage) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
  const upper = damage.toUpperCase()
  if (upper === 'MINOR' || upper === 'REAR' || upper === 'NORMAL WEAR') {
    return 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
  }
  if (upper === 'FRONT END' || upper === 'REAR END' || upper === 'SIDE') {
    return 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
  }
  if (upper === 'ALL OVER' || upper === 'BURN' || upper === 'FLOOD' || upper === 'VANDALISM') {
    return 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
  }
  return 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
}
/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
}
/* ------------------------------------------------------------------ */
/*  Mini Vehicle Card (enhanced)                                         */
/* ------------------------------------------------------------------ */

function MiniVehicleCard({
  auction,
  index,
  onClick,
}: {
  auction: Auction
  index: number
  onClick: () => void
}) {
  const gradient = getPlaceholderGradient(auction.make)
  const initials = getVehicleInitials(auction.make, auction.modelGroup || auction.modelDetail)
  const label = getVehicleLabel(auction)
  const damageClasses = getDamageBadgeClasses(auction.damageDescription)

  return (
    <motion.div
      variants={itemVariants}
      className="shrink-0"
    >
      <Card
        className="group w-44 cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5"
        onClick={onClick}
      >
        {/* Gradient placeholder with initials */}
        <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-600 dark:to-gray-800">
          <div className={"absolute inset-0 flex items-center justify-center bg-gradient-to-br " + gradient + " "} />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {auction.year && (
            <Badge className="absolute bottom-1.5 left-1.5 border-0 bg-black/60 text-white text-[9px] font-bold backdrop-blur-sm hover:bg-black/60 px-1.5 py-0">
              {auction.year}
            </Badge>
          )}
          <Badge className="absolute right-1.5 top-1.5 border-0 bg-black/60 text-white text-[8px] font-medium backdrop-blur-sm hover:bg-black/60 px-1.5 py-0">
            #{auction.lotNumber}
          </Badge>
        </div>

        <CardContent className="space-y-2 p-3">
          <p className="text-xs font-semibold leading-tight truncate" title={label}>
            {label}
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Gauge className="size-2.5" />
              {formatOdometer(auction.odometer)}
            </span>
          </div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {auction.estimatedRetailValue
              ? formatCurrency(auction.estimatedRetailValue)
              : '—'}
          </p>
          {auction.damageDescription ? (
            <Badge
              variant="outline"
              className={"text-[9px] font-medium " + damageClasses + " truncate max-w-full block text-center px-1.5 py-0"}
            >
              {auction.damageDescription}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-[9px] font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0 text-center block"
            >
              Clean Title
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                     */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="shrink-0 w-44">
          <Skeleton className="h-24 w-44 rounded-t-lg" />
          <div className="space-y-1.5 p-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
/* ------------------------------------------------------------------ */
/*  Empty state illustration                                             */
/* ------------------------------------------------------------------ */

function EmptyRecentlyViewed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 bg-muted/20 py-10 px-6 text-center"
    >
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20">
        <Eye className="size-6 text-emerald-500/60 dark:text-emerald-400/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No recently viewed vehicles</p>
      <p className="mt-1 text-xs text-muted-foreground/60 max-w-[240px]">
        Click on any vehicle card or table row to start browsing your history here.
      </p>
    </motion.div>
  )
}
/* ------------------------------------------------------------------ */
/*  Main export: RecentlyViewedSection                                  */
/* ------------------------------------------------------------------ */

export function RecentlyViewedSection() {
  const recentlyViewed = useAppStore((s) => s.recentlyViewed)
  const clearRecentlyViewed = useAppStore((s) => s.clearRecentlyViewed)
  const [vehicles, setVehicles] = useState<Auction[]>([])
  const [loading, setLoading] = useState(false)
  const [detailVehicle, setDetailVehicle] = useState<Auction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchVehicles = useCallback(async () => {
    if (recentlyViewed.length === 0) {
      setVehicles([])
      return
    }
    setLoading(true)
    try {
      const ids = recentlyViewed.join(',')
      const res = await fetch(`/api/auctions/batch?ids=${ids}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          const fetched = json.data as Auction[]
          const ordered = recentlyViewed
            .map((id) => fetched.find((v: Auction) => v.id === id))
            .filter(Boolean) as Auction[]
          setVehicles(ordered)
        } else {
          const results = await Promise.allSettled(
            recentlyViewed.map(async (id) => {
              const r = await fetch(`/api/auctions/${id}`)
              if (!r.ok) return null
              const j = await r.json()
              return j.success ? (j.data as Auction) : null
            }),
          )
          setVehicles(
            results
              .map((r) => (r.status === 'fulfilled' ? r.value : null))
              .filter(Boolean) as Auction[],
          )
        }
      } else {
        const results = await Promise.allSettled(
          recentlyViewed.map(async (id) => {
            const r = await fetch(`/api/auctions/${id}`)
            if (!r.ok) return null
            const j = await r.json()
            return j.success ? (j.data as Auction) : null
          }),
        )
        setVehicles(
          results
            .map((r) => (r.status === 'fulfilled' ? r.value : null))
            .filter(Boolean) as Auction[],
        )
      }
    } catch {
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [recentlyViewed])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  const handleClear = () => {
    clearRecentlyViewed()
    setVehicles([])
    setDetailOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/30">
            <Clock className="size-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Recently Viewed</h3>
            <div className="mt-0.5 h-[2px] w-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
          </div>
          {recentlyViewed.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {recentlyViewed.length}
            </Badge>
          )}
        </div>
        {recentlyViewed.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {loading && <SkeletonRow />}

      {!loading && vehicles.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex gap-3 overflow-x-auto scrollbar-none pb-1"
        >
          {vehicles.map((vehicle, i) => (
            <MiniVehicleCard
              key={vehicle.id}
              auction={vehicle}
              index={i}
              onClick={() => {
                setDetailVehicle(vehicle)
                setDetailOpen(true)
              }}
            />
          ))}
        </motion.div>
      )}

      {!loading && vehicles.length === 0 && <EmptyRecentlyViewed />}

      {!loading && recentlyViewed.length > 0 && vehicles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          <Loader2 className="inline size-3 animate-spin mr-1" />
          Loading vehicles…
        </p>
      )}

      <VehicleDetailSheet
        vehicle={detailVehicle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
