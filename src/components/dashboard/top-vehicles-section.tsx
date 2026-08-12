'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Heart,
  GitCompareArrows,
  Calendar,
  Gauge,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { Auction } from '@/lib/types'
import {
  formatCurrency,
  formatOdometer,
  formatSaleDate,
  getPlaceholderGradient,
  getVehicleInitials,
  getVehicleLabel,
  getLocationLabel,
} from '@/lib/format'
import { getAuctionImageUrl } from '@/lib/images'
import { useAppStore } from '@/lib/store'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
}

/* ------------------------------------------------------------------ */
/*  Damage severity color mapping                                       */
/* ------------------------------------------------------------------ */
function getDamageBadgeClasses(damage: string | null | undefined): string {
  if (!damage) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
  const upper = damage.toUpperCase()
  if (upper === 'MINOR' || upper === 'REAR' || upper === 'NORMAL WEAR') {
    return 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
  }
  if (upper === 'FRONT END' || upper === 'REAR END' || upper === 'SIDE') {
    return 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
  }
  if (upper === 'ALL OVER' || upper === 'BURN' || upper === 'FLOOD' || upper === 'VANDALISM') {
    return 'border-rose-400 bg-rose-50 text-rose-700 shadow-sm dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
  }
  return 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
}

/* ------------------------------------------------------------------ */
/*  Skeleton state                                                     */
/* ------------------------------------------------------------------ */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video bg-muted">
            <Skeleton className="h-full w-full" />
          </div>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Separator />
            <div className="flex items-end justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Error state                                                        */
/* ------------------------------------------------------------------ */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Failed to load top vehicles
        </p>
        <p className="mb-4 text-xs text-muted-foreground/70">
          Something went wrong while fetching the data.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Vehicle rank badge with glow for #1                                 */
/* ------------------------------------------------------------------ */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="absolute left-2 top-2 border-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-[10px] font-bold text-white shadow-md hover:from-amber-400 hover:to-yellow-500 pulse-glow-amber">
        🥇 #1
      </Badge>
    )
  }
  if (rank === 2) {
    return (
      <Badge className="absolute left-2 top-2 border-0 bg-gradient-to-r from-gray-300 to-gray-400 text-[10px] font-bold text-white shadow-md hover:from-gray-300 hover:to-gray-400">
        🥈 #2
      </Badge>
    )
  }
  if (rank === 3) {
    return (
      <Badge className="absolute left-2 top-2 border-0 bg-gradient-to-r from-amber-600 to-amber-700 text-[10px] font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700">
        🥉 #3
      </Badge>
    )
  }
  return (
    <Badge className="absolute left-2 top-2 border-0 bg-black/70 text-[10px] font-medium text-white hover:bg-black/70">
      #{rank}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Value gradient bar at bottom of card                                */
/* ------------------------------------------------------------------ */
function ValueBar({ value, maxValue }: { value: number; maxValue: number }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Individual top vehicle card (enhanced)                              */
/* ------------------------------------------------------------------ */
function TopVehicleCard({ auction, rank, maxValue }: { auction: Auction; rank: number; maxValue: number }) {
  const gradient = getPlaceholderGradient(auction.make)
  const initials = getVehicleInitials(auction.make, auction.modelGroup || auction.modelDetail)
  const label = getVehicleLabel(auction)
  const location = getLocationLabel(auction)

  const { toggleWatchlist, isInWatchlist, toggleCompare, isInCompare } = useAppStore()
  const isFav = isInWatchlist(auction.id)
  const isComp = isInCompare(auction.id)

  // Spring animation state for heart button
  const [heartScale, setHeartScale] = useState(1)

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHeartScale(1.3)
    setTimeout(() => setHeartScale(1), 200)
    toggleWatchlist(auction.id)
    toast[isFav ? 'info' : 'success'](isFav ? 'Removed from watchlist' : 'Added to watchlist', {
      description: label,
    })
  }

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isComp && isInCompare(auction.id) === false) {
      toggleCompare(auction.id)
      toast.success('Added to compare', { description: label })
    } else {
      toggleCompare(auction.id)
      toast.info('Removed from compare', { description: label })
    }
  }

  const damageClasses = getDamageBadgeClasses(auction.damageDescription)

  return (
    <motion.div {...fadeIn} transition={{ delay: (rank - 1) * 0.05 }}>
      <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* Image / Placeholder */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {getAuctionImageUrl(auction.lotNumber, auction.imageThumbnail, auction.imageUrl) ? (
            <img
              src={getAuctionImageUrl(auction.lotNumber, auction.imageThumbnail, auction.imageUrl)!}
              alt={label}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-600 dark:to-gray-800">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div
                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient}`}
              >
                <span className="text-3xl font-bold text-white/90 tracking-wider">{initials}</span>
              </div>
            </div>
          )}

          {/* Rank badge with glow for #1 */}
          <RankBadge rank={rank} />

          {/* Year badge */}
          {auction.year && (
            <Badge className="absolute bottom-2 left-2 border-0 bg-black/60 text-white text-xs font-bold backdrop-blur-sm hover:bg-black/60">
              {auction.year}
            </Badge>
          )}

          {/* Lot badge */}
          <Badge className="absolute right-2 top-2 border-0 bg-black/70 text-white text-[10px] hover:bg-black/70">
            Lot #{auction.lotNumber}
          </Badge>

          {/* Favorite button with spring animation */}
          <motion.button
            animate={{ scale: heartScale }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={handleToggleWatchlist}
            className="absolute right-2 bottom-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110"
            aria-label={isFav ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Heart
              className={`size-4 transition-all ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
            />
          </motion.button>
        </div>

        <CardContent className="space-y-3 p-4">
          {/* Vehicle Name */}
          <div>
            <p className="text-sm font-semibold leading-tight">{label}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {/* Sale Date */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-3 shrink-0" />
              <span className="truncate">{formatSaleDate(auction.saleDate)}</span>
            </div>

            {/* Odometer */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="size-3 shrink-0" />
              <span>{formatOdometer(auction.odometer)}</span>
            </div>

            {/* Color-coded damage badge */}
            <div className="col-span-2 flex flex-wrap items-center gap-1.5">
              {auction.damageDescription ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium ${damageClasses}`}
                >
                  {auction.damageDescription}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  Clean Title
                </Badge>
              )}
              {auction.fuelType && (
                <Badge variant="outline" className="text-[10px]">
                  {auction.fuelType}
                </Badge>
              )}
              {auction.saleStatus && (
                <Badge variant="outline" className="text-[10px]">
                  {auction.saleStatus}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Price Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Est. Retail Value
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {auction.estimatedRetailValue
                  ? formatCurrency(auction.estimatedRetailValue)
                  : '—'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {auction.highBid != null && auction.highBid > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    High Bid
                  </p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(auction.highBid)}
                  </p>
                </div>
              )}
              {auction.buyItNowPrice != null && auction.buyItNowPrice > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Buy Now
                  </p>
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(auction.buyItNowPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Value gradient bar */}
          {auction.estimatedRetailValue != null && auction.estimatedRetailValue > 0 && (
            <ValueBar value={auction.estimatedRetailValue} maxValue={maxValue} />
          )}

          {/* Compare button */}
          <Button
            variant={isComp ? 'default' : 'outline'}
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={handleToggleCompare}
          >
            <GitCompareArrows className="size-3.5" />
            {isComp ? 'In Compare List' : 'Add to Compare'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export: TopVehiclesSection                                    */
/* ------------------------------------------------------------------ */
export function TopVehiclesSection() {
  const [vehicles, setVehicles] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const maxValue = useMemo(() => {
    return Math.max(...vehicles.map((v) => v.estimatedRetailValue ?? 0), 1)
  }, [vehicles])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/auctions/top-value')
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setVehicles(json.data ?? [])
        } else {
          setError(true)
        }
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4">
      {/* Section Header with gradient accent */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30">
            <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              Top Vehicles by Value
            </h3>
            <div className="mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400" />
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The 6 highest estimated retail value vehicles currently in inventory.
        </p>
      </div>

      {/* Loading */}
      {loading && <SkeletonGrid />}

      {/* Error */}
      {!loading && error && <ErrorState onRetry={fetchData} />}

      {/* Empty */}
      {!loading && !error && vehicles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No vehicles found</p>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Grid */}
      {!loading && !error && vehicles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v, i) => (
            <TopVehicleCard key={v.id} auction={v} rank={i + 1} maxValue={maxValue} />
          ))}
        </div>
      )}
    </div>
  )
}
