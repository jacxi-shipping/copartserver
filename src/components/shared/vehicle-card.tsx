'use client'

import React, { useState } from 'react'
import { Calendar, Gauge, MapPin, Zap, Heart, Fuel } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import type { Auction } from '@/lib/types'
import {
  formatCurrency,
  formatOdometer,
  formatSaleDate,
  formatSaleTime,
  formatSaleDateTime,
  getPlaceholderGradient,
  getVehicleInitials,
  getVehicleLabel,
  getLocationLabel,
} from '@/lib/format'
import { getAuctionImageUrl } from '@/lib/images'
import { useAppStore } from '@/lib/store'

// ─── Damage Severity Color Mapping ────────────────────────────────────────────

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
  // Default: amber
  return 'border-amber-400 bg-amber-50 text-[10px] font-medium text-amber-700 shadow-sm dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
}

export function VehicleCard({ auction, showLiveBadge }: { auction: Auction; showLiveBadge?: boolean }) {
  const gradient = getPlaceholderGradient(auction.make)
  const initials = getVehicleInitials(auction.make, auction.modelGroup || auction.modelDetail)
  const label = getVehicleLabel(auction)
  const location = getLocationLabel(auction)
  const saleDateTime = formatSaleDateTime(auction)
  const timeOnly = formatSaleTime(auction.saleTime)
  const { toggleWatchlist, isInWatchlist } = useAppStore()
  const isFav = isInWatchlist(auction.id)

  // Spring animation state for heart button
  const [heartScale, setHeartScale] = useState(1)
  const [imageFailed, setImageFailed] = useState(false)

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Trigger spring animation
    setHeartScale(1.3)
    setTimeout(() => setHeartScale(1), 200)
    toggleWatchlist(auction.id, label)
  }

  const damageBadgeClasses = getDamageBadgeClasses(auction.damageDescription)
  const imageSource = getAuctionImageUrl(auction.lotNumber, auction.imageThumbnail, auction.imageUrl)

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Image / Placeholder with shimmer */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {imageSource && !imageFailed ? (
          <img
            src={imageSource}
            alt={label}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-600 dark:to-gray-800">
            {/* Shimmer animation */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient}`}>
              <span className="text-3xl font-bold text-white/90 tracking-wider">
                {initials}
              </span>
            </div>
          </div>
        )}

        {/* Year badge overlaid on gradient */}
        {auction.year && (
          <Badge className="absolute bottom-2 left-2 border-0 bg-black/60 text-white text-xs font-bold backdrop-blur-sm hover:bg-black/60">
            {auction.year}
          </Badge>
        )}

        {/* Lot badge */}
        <Badge className="absolute right-2 top-2 border-0 bg-black/70 text-white text-[10px] hover:bg-black/70">
          Lot #{auction.lotNumber}
        </Badge>

        {/* Live badge */}
        {showLiveBadge && (
          <Badge className="absolute left-2 top-2 gap-1 border-0 bg-emerald-600 text-white text-[10px] hover:bg-emerald-600">
            <Zap className="size-3" />
            LIVE TODAY
          </Badge>
        )}

        {/* Favorite/Heart button with spring animation */}
        <motion.button
          animate={{ scale: heartScale }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          onClick={handleHeartClick}
          className="absolute right-2 bottom-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110"
          aria-label={isFav ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Heart
            className={`size-4 transition-all ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
          />
        </motion.button>
      </div>

      <CardContent className="relative space-y-3 p-4">
        {/* Gradient overlay on card bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/5 to-transparent rounded-b-lg" />

        {/* Vehicle Name */}
        <div>
          <p className="text-sm font-semibold leading-tight">{label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {location}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {/* Sale Date/Time */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span className="truncate">
              {auction.saleDate ? formatSaleDate(auction.saleDate) : 'TBD'}
              {timeOnly ? ` ${timeOnly}` : ''}
            </span>
          </div>

          {/* Odometer with fuel type badge */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Gauge className="size-3 shrink-0" />
            <span>{formatOdometer(auction.odometer)}</span>
            {auction.fuelType && auction.fuelType !== '' && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded border border-muted-foreground/30 bg-muted/50 px-1 py-0.5 text-[9px] font-medium text-muted-foreground/70">
                <Fuel className="size-2.5" />
                {auction.fuelType}
              </span>
            )}
          </div>

          {/* Damage Badge - color coded by severity */}
          <div className="col-span-2 flex items-center gap-1.5">
            {auction.damageDescription ? (
              <Badge
                variant="outline"
                className={`text-[10px] font-medium ${damageBadgeClasses}`}
              >
                {auction.damageDescription}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-[10px] font-medium text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                Clean Title
              </Badge>
            )}
          </div>

          {/* Status badge on wider screens */}
          {auction.saleStatus && (
            <div className="col-span-2 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {auction.saleStatus}
              </Badge>
              {auction.highBid != null && auction.highBid > 0 && (
                <span className="text-xs text-muted-foreground">
                  High Bid: {formatCurrency(auction.highBid)}
                </span>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Price Highlight Section with animated underline */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Est. Retail Value
            </p>
            <div className="relative">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {auction.estimatedRetailValue
                  ? formatCurrency(auction.estimatedRetailValue)
                  : '—'}
              </p>
              {/* Subtle animated underline */}
              {auction.estimatedRetailValue != null && auction.estimatedRetailValue > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </div>
          </div>
          {auction.buyItNowPrice != null && auction.buyItNowPrice > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Buy Now
              </p>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(auction.buyItNowPrice)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
