'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Heart,
  Trash2,
  GitCompare,
  Search,
  PackageOpen,
  ArrowUpDown,
  LayoutGrid,
  List,
  Car,
  DollarSign,
  Gauge,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { Auction } from '@/lib/types'
import { VehicleCard } from '@/components/shared/vehicle-card'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { formatCurrency, formatOdometer, formatSaleDate } from '@/lib/format'
import { useAppStore } from '@/lib/store'

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
}

// ─── Sort Options ────────────────────────────────────────────────────────────

const sortOptions = [
  { value: 'value_desc', label: 'Est. Value (Highest)' },
  { value: 'value_asc', label: 'Est. Value (Lowest)' },
  { value: 'year_desc', label: 'Year (Newest)' },
  { value: 'year_asc', label: 'Year (Oldest)' },
  { value: 'added_asc', label: 'Recently Added' },
]

// ─── Watchlist Tab ──────────────────────────────────────────────────────────

export function WatchlistTab() {
  const { watchlist, clearWatchlist, toggleCompare, isInCompare } = useAppStore()
  const [vehicles, setVehicles] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('added_asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedVehicle, setSelectedVehicle] = useState<Auction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = viewMode === 'grid' ? 12 : 20

  // Fetch vehicle details for all watchlisted IDs
  const fetchVehicles = useCallback(async () => {
    if (watchlist.length === 0) {
      setVehicles([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const results = await Promise.all(
        watchlist.map((id) =>
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
  }, [watchlist])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // ── Summary Statistics (calculated from fetched vehicles) ─────────────────
  const summaryStats = useMemo(() => {
    const vals = vehicles.map((v) => v.estimatedRetailValue ?? 0).filter((v) => v > 0)
    const odoms = vehicles.map((v) => v.odometer ?? 0).filter((o) => o > 0)
    const count = vehicles.length
    const totalValue = vals.reduce((a, b) => a + b, 0)
    const avgValue = vals.length > 0 ? totalValue / vals.length : 0
    const avgOdometer = odoms.length > 0 ? odoms.reduce((a, b) => a + b, 0) / odoms.length : 0
    const minValue = vals.length > 0 ? Math.min(...vals) : 0
    const maxValue = vals.length > 0 ? Math.max(...vals) : 0
    return { count, totalValue, avgValue, avgOdometer, minValue, maxValue }
  }, [vehicles])

  // Sort vehicles client-side
  const sortedVehicles = [...vehicles].sort((a, b) => {
    switch (sortBy) {
      case 'value_desc':
        return (b.estimatedRetailValue ?? 0) - (a.estimatedRetailValue ?? 0)
      case 'value_asc':
        return (a.estimatedRetailValue ?? 0) - (b.estimatedRetailValue ?? 0)
      case 'year_desc':
        return (b.year ?? 0) - (a.year ?? 0)
      case 'year_asc':
        return (a.year ?? 0) - (b.year ?? 0)
      case 'added_asc':
      default:
        return watchlist.indexOf(a.id) - watchlist.indexOf(b.id)
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedVehicles.length / pageSize)
  const paginatedVehicles = sortedVehicles.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  const handleVehicleClick = (v: Auction) => {
    setSelectedVehicle(v)
    setDetailOpen(true)
  }

  const handleRemoveAll = () => {
    clearWatchlist()
    toast.success('Watchlist cleared', {
      description: 'All vehicles removed from your watchlist.',
    })
  }

  const handleToggleCompare = (id: number, make: string, model: string) => {
    if (isInCompare(id)) {
      toggleCompare(id)
      toast.info('Removed from compare', {
        description: `${make} ${model} removed from comparison.`,
      })
    } else {
      toggleCompare(id)
      toast.success('Added to compare', {
        description: `${make} ${model} added to comparison.`,
      })
    }
  }

  // List view row
  const renderListRow = (auction: Auction) => (
    <TableRow
      key={auction.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleVehicleClick(auction)}
    >
      <TableCell className="font-mono text-xs">{auction.lotNumber}</TableCell>
      <TableCell>{auction.year ?? '—'}</TableCell>
      <TableCell className="font-medium">{auction.make ?? '—'}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {auction.modelGroup || auction.modelDetail || '—'}
      </TableCell>
      <TableCell className="hidden md:table-cell text-emerald-700 dark:text-emerald-400 font-medium">
        {formatCurrency(auction.estimatedRetailValue)}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground">
        {formatOdometer(auction.odometer)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {formatSaleDate(auction.saleDate)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation()
              handleToggleCompare(auction.id, auction.make || '', auction.modelGroup || auction.modelDetail || '')
            }}
            aria-label={`Compare ${auction.make}`}
          >
            <GitCompare className={`size-3.5 ${isInCompare(auction.id) ? 'text-primary' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-rose-500 hover:text-rose-600"
            onClick={(e) => {
              e.stopPropagation()
              useAppStore.getState().toggleWatchlist(auction.id)
              toast.info('Removed from watchlist', {
                description: `${auction.make} ${auction.modelGroup || auction.modelDetail || ''} removed.`,
              })
            }}
            aria-label={`Remove ${auction.make} from watchlist`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Watchlist</h2>
            {watchlist.length > 0 && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {watchlist.length} vehicle{watchlist.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Your saved vehicles for quick access and comparison.
          </p>
        </div>

        {watchlist.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30">
                <Trash2 className="mr-1.5 size-3.5" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear entire watchlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all {watchlist.length} vehicle{watchlist.length !== 1 ? 's' : ''} from your watchlist. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveAll} className="bg-rose-600 hover:bg-rose-700">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Summary Stats Bar */}
      {watchlist.length > 0 && (
        loading ? (
          /* Skeleton placeholder while loading */
          <div className="summary-bar rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Real stats */
          <div className="summary-bar rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Total Vehicles */}
              <div className="watchlist-stat flex items-center gap-2.5 rounded-lg px-2 py-1">
                <Car className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-0.5">Vehicles</p>
                  <p className="text-sm font-semibold tabular-nums leading-none">{summaryStats.count}</p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8" />
              <Separator orientation="horizontal" className="block sm:hidden w-full h-px" />

              {/* Total Est. Value */}
              <div className="watchlist-stat flex items-center gap-2.5 rounded-lg px-2 py-1">
                <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-0.5">Total Est. Value</p>
                  <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 leading-none">
                    {formatCurrency(summaryStats.totalValue)}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8" />
              <Separator orientation="horizontal" className="block sm:hidden w-full h-px" />

              {/* Average Value */}
              <div className="watchlist-stat flex items-center gap-2.5 rounded-lg px-2 py-1">
                <TrendingUp className="size-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-0.5">Avg Value</p>
                  <p className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400 leading-none">
                    {formatCurrency(summaryStats.avgValue)}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8" />
              <Separator orientation="horizontal" className="block sm:hidden w-full h-px" />

              {/* Avg Odometer */}
              <div className="watchlist-stat flex items-center gap-2.5 rounded-lg px-2 py-1">
                <Gauge className="size-4 text-teal-600 dark:text-teal-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-0.5">Avg Odometer</p>
                  <p className="text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-400 leading-none">
                    {formatOdometer(summaryStats.avgOdometer)}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8" />
              <Separator orientation="horizontal" className="block sm:hidden w-full h-px" />

              {/* Value Range */}
              <div className="watchlist-stat flex items-center gap-2.5 rounded-lg px-2 py-1">
                <div className="flex size-4 items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">↔</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-0.5">Value Range</p>
                  <p className="text-sm font-semibold tabular-nums leading-none">
                    {formatCurrency(summaryStats.minValue)} – {formatCurrency(summaryStats.maxValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Controls Bar */}
      {watchlist.length > 3 && (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <ArrowUpDown className="mr-2 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7"
              onClick={() => { setViewMode('grid'); setPage(1) }}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7"
              onClick={() => { setViewMode('list'); setPage(1) }}
              aria-label="List view"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )
      ) : watchlist.length === 0 ? (
        <motion.div
          {...fadeIn}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-20"
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30">
            <Heart className="size-8 text-rose-400" />
          </div>
          <h3 className="text-base font-semibold">Your watchlist is empty</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Click the heart icon on any vehicle card to add it to your watchlist for quick access.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => useAppStore.getState().setActiveTab('search')}
          >
            <Search className="mr-1.5 size-3.5" />
            Browse Vehicles
          </Button>
        </motion.div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="mb-3 size-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              Some watchlisted vehicles could not be loaded
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              They may have been removed from the database
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <motion.div
            {...staggerContainer}
            animate
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {paginatedVehicles.map((auction) => (
              <motion.div key={auction.id} {...fadeIn}>
                <div className="relative">
                  <div className="cursor-pointer" onClick={() => handleVehicleClick(auction)}>
                    <VehicleCard auction={auction} />
                  </div>
                  {/* Compare button overlay */}
                  <div className="absolute right-3 top-3 z-10">
                    <div
                      role="checkbox"
                      aria-checked={isInCompare(auction.id)}
                      aria-label={`Compare ${auction.make} ${auction.modelGroup}`}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleCompare(auction.id, auction.make || '', auction.modelGroup || auction.modelDetail || '')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleCompare(auction.id, auction.make || '', auction.modelGroup || auction.modelDetail || '')
                        }
                      }}
                      className={`flex size-8 cursor-pointer items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur-sm transition-colors ${
                        isInCompare(auction.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      }`}
                    >
                      <GitCompare className="size-3.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <PaginationControls
              pagination={{
                page,
                pageSize,
                total: sortedVehicles.length,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
              }}
              page={page}
              onPageChange={setPage}
              label="Watchlist"
            />
          )}
        </>
      ) : (
        /* List View */
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead className="hidden sm:table-cell">Model</TableHead>
                    <TableHead className="hidden md:table-cell">Est. Value</TableHead>
                    <TableHead className="hidden lg:table-cell">Odometer</TableHead>
                    <TableHead className="hidden md:table-cell">Sale Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVehicles.map(renderListRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <PaginationControls
              pagination={{
                page,
                pageSize,
                total: sortedVehicles.length,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
              }}
              page={page}
              onPageChange={setPage}
              label="Watchlist"
            />
          )}
        </>
      )}

      <VehicleDetailSheet
        vehicle={selectedVehicle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
