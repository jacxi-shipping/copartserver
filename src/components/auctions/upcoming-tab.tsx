'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarClock,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  X,
  GitCompare,
} from 'lucide-react'
import { ColumnToggle, type ColumnOption } from '@/components/shared/column-toggle'
import { SortableHeader, toggleClientSort, applyClientSort } from '@/components/shared/sortable-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import type { Auction, PaginationInfo } from '@/lib/types'
import { VehicleCard } from '@/components/shared/vehicle-card'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { BulkActionsBar, BulkCheckbox } from '@/components/shared/bulk-actions-bar'
import { formatCurrency, formatOdometer, formatSaleDate } from '@/lib/format'
import { CountdownTimer } from '@/components/shared/countdown-timer'
import { useAppStore } from '@/lib/store'

// ─── Sort Options ────────────────────────────────────────────────────────────

const sortOptions = [
  { value: 'saleDate_asc', label: 'Sale Date (Earliest)' },
  { value: 'saleDate_desc', label: 'Sale Date (Latest)' },
  { value: 'year_desc', label: 'Year (Newest)' },
  { value: 'year_asc', label: 'Year (Oldest)' },
  { value: 'price_desc', label: 'Est. Value (Highest)' },
  { value: 'price_asc', label: 'Est. Value (Lowest)' },
  { value: 'odometer_asc', label: 'Odometer (Lowest)' },
  { value: 'odometer_desc', label: 'Odometer (Highest)' },
  { value: 'lotNumber_asc', label: 'Lot # (Ascending)' },
  { value: 'lotNumber_desc', label: 'Lot # (Descending)' },
]

// ─── Column Options ───────────────────────────────────────────────────────

const columnOptions: ColumnOption[] = [
  { key: 'lot', label: 'Lot #', defaultVisible: true },
  { key: 'vehicle', label: 'Vehicle', defaultVisible: true },
  { key: 'body', label: 'Body', defaultVisible: true },
  { key: 'saleDate', label: 'Sale Date', defaultVisible: true },
  { key: 'timeLeft', label: 'Time Left', defaultVisible: true },
  { key: 'value', label: 'Est. Value', defaultVisible: true },
  { key: 'odometer', label: 'Odometer', defaultVisible: true },
  { key: 'fuel', label: 'Fuel', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
]

const defaultVisibleColumns = columnOptions.filter(c => c.defaultVisible).map(c => c.key)

// ─── Facet Types ─────────────────────────────────────────────────────────────

interface FacetValue {
  value: string
  count: number
}

interface FacetsData {
  makes: FacetValue[]
  bodyStyles: FacetValue[]
  fuelTypes: FacetValue[]
}

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

// ─── Auction List Component ──────────────────────────────────────────────────

interface AuctionListTabProps {
  endpoint?: string
  title?: string
  description?: string
  emptyMessage?: string
  paginationLabel?: string
}

export function UpcomingTab({
  endpoint = '/api/auctions/upcoming',
  title = 'Upcoming Lots',
  description = 'Browse lots scheduled for upcoming sale dates.',
  emptyMessage = 'No upcoming lots found',
  paginationLabel = 'Upcoming',
}: AuctionListTabProps) {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [filterState, setFilterState] = useState('')
  const [filterMake, setFilterMake] = useState('')
  const [filterBodyStyle, setFilterBodyStyle] = useState('')
  const [filterFuelType, setFilterFuelType] = useState('')
  const [sortBy, setSortBy] = useState('saleDate_asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [facets, setFacets] = useState<FacetsData | null>(null)
  const [facetsLoading, setFacetsLoading] = useState(true)

  // Client-side sort
  const [clientSort, setClientSort] = useState('')

  // Compare store
  const { toggleCompare, isInCompare, addActivity } = useAppStore()

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<string[]>(defaultVisibleColumns)
  const toggleCol = useCallback((key: string) => {
    setVisibleCols((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    )
  }, [])
  const resetCols = useCallback(() => {
    setVisibleCols(defaultVisibleColumns)
  }, [])

  // Vehicle detail sheet
  const [selectedVehicle, setSelectedVehicle] = useState<Auction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterMake) count++
    if (filterBodyStyle) count++
    if (filterFuelType) count++
    if (filterState) count++
    return count
  }, [filterMake, filterBodyStyle, filterFuelType, filterState])

  const clearFilters = () => {
    setFilterMake('')
    setFilterBodyStyle('')
    setFilterFuelType('')
    setFilterState('')
  }

  const handleVehicleClick = (v: Auction) => {
    setSelectedVehicle(v)
    setDetailOpen(true)
    addActivity({
      type: 'vehicle_view',
      icon: 'eye',
      label: `Viewed ${v.year ?? ''} ${v.make ?? ''} ${v.modelGroup || v.modelDetail || ''}`.trim(),
      description: `Lot #${v.lotNumber}`,
    })
  }

  // Client-side sort for list view
  const sortedAuctions = useMemo(() => {
    if (viewMode !== 'list' || !clientSort) return auctions
    const sortGetter = (a: Auction, field: string): string | number | null | undefined => {
      switch (field) {
        case 'lotNumber': return a.lotNumber
        case 'make': return a.make ?? ''
        case 'year': return a.year ?? 0
        case 'odometer': return a.odometer
        case 'estimatedRetailValue': return a.estimatedRetailValue
        case 'saleDate': return a.saleDate ?? ''
        case 'bodyStyle': return a.bodyStyle ?? ''
        case 'fuelType': return a.fuelType ?? ''
        default: return a.lotNumber
      }
    }
    return applyClientSort(auctions, clientSort, sortGetter)
  }, [auctions, clientSort, viewMode])

  const handleClientSortToggle = useCallback((field: string) => {
    setClientSort((prev) => toggleClientSort(prev, field))
  }, [])

  // Fetch facets
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFacetsLoading(true)
      fetch('/api/search/facets')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.success && data.data) {
            setFacets({
              makes: data.data.makes ?? [],
              bodyStyles: data.data.bodyStyles ?? [],
              fuelTypes: data.data.fuelTypes ?? [],
            })
          }
          })
        .catch(() => setFacets(null))
        .finally(() => setFacetsLoading(false))
    }, 0)
    return () => clearTimeout(timeout)
  }, [])

  const fetchAuctions = useCallback(
    async (p: number = 1) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(p))
        params.set('pageSize', String(viewMode === 'grid' ? '12' : '20'))
        params.set('sort', sortBy)
        if (filterState) params.set('locationState', filterState)
        if (filterMake) params.set('make', filterMake)
        if (filterBodyStyle) params.set('bodyStyle', filterBodyStyle)
        if (filterFuelType) params.set('fuelType', filterFuelType)

        const res = await fetch(`${endpoint}?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setAuctions(data.data ?? [])
          setPagination(data.pagination ?? null)
          setPage(p)
        }
      } catch {
        setAuctions([])
      } finally {
        setLoading(false)
      }
    },
    [endpoint, filterState, filterMake, filterBodyStyle, filterFuelType, sortBy, viewMode]
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchAuctions()
    }, 0)
    return () => clearTimeout(timeout)
  }, [fetchAuctions])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge className="border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          {loading ? (
            <Skeleton className="inline-block h-4 w-8" />
          ) : (
            <>
              {pagination?.total ?? auctions.length} lot
              {(pagination?.total ?? auctions.length) !== 1 ? 's' : ''}
            </>
          )}
        </Badge>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-48">
          <Select
            value={filterMake || '__all__'}
            onValueChange={(v) => setFilterMake(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={facetsLoading ? 'Loading...' : 'All Makes'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Makes</SelectItem>
              {(facets?.makes ?? []).map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.value}
                  <span className="ml-1.5 text-muted-foreground">({f.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-48">
          <Select
            value={filterBodyStyle || '__all__'}
            onValueChange={(v) => setFilterBodyStyle(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={facetsLoading ? 'Loading...' : 'All Body Styles'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Body Styles</SelectItem>
              {(facets?.bodyStyles ?? []).map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.value}
                  <span className="ml-1.5 text-muted-foreground">({f.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-44">
          <Select
            value={filterFuelType || '__all__'}
            onValueChange={(v) => setFilterFuelType(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={facetsLoading ? 'Loading...' : 'All Fuel Types'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Fuel Types</SelectItem>
              {(facets?.fuelTypes ?? []).map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.value}
                  <span className="ml-1.5 text-muted-foreground">({f.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-36">
          <Input
            placeholder="State (e.g. CA)"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAuctions(1)}
            className="h-9 text-sm"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px]">
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

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="mr-1 size-3" />
            Clear ({activeFilterCount})
          </Button>
        )}

        {viewMode === 'list' && (
          <ColumnToggle
            columns={columnOptions}
            visibleColumns={visibleCols}
            onToggle={toggleCol}
            onReset={resetCols}
          />
        )}

        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar currentIds={auctions.map((a) => a.id)} totalAvailable={pagination?.total} />

      {/* Results */}
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        )
      ) : auctions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="mb-3 size-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {emptyMessage}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {activeFilterCount > 0
                ? 'Try adjusting your filters'
                : 'Check back later for new listings'}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                <X className="mr-1 size-3" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <motion.div
            {...staggerContainer}
            animate
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {auctions.map((auction) => (
              <motion.div key={auction.id} {...fadeIn}>
                <div className="relative">
                  {/* Bulk select checkbox */}
                  <div className="absolute left-3 top-3 z-10">
                    <BulkCheckbox id={auction.id} />
                  </div>
                  {/* Compare button */}
                  <div className="absolute right-3 top-3 z-10">
                    <div
                      role="checkbox"
                      aria-checked={isInCompare(auction.id)}
                      aria-label={`Compare ${auction.make} ${auction.modelGroup}`}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        const label = `${auction.year ?? ''} ${auction.make ?? ''} ${auction.modelGroup || auction.modelDetail || ''}`.trim()
                        toggleCompare(auction.id, label)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          const label = `${auction.year ?? ''} ${auction.make ?? ''} ${auction.modelGroup || auction.modelDetail || ''}`.trim()
                          toggleCompare(auction.id, label)
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
                  <div className="cursor-pointer" onClick={() => handleVehicleClick(auction)}>
                    <div className="relative">
                      <VehicleCard auction={auction} />
                      <div className="absolute bottom-2 right-2 z-10">
                        <CountdownTimer saleDate={auction.saleDate} saleTime={auction.saleTime} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {pagination && (
            <PaginationControls
              pagination={pagination}
              page={page}
              onPageChange={fetchAuctions}
              label={paginationLabel}
            />
          )}
        </>
      ) : (
        /* List View */
        <>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleCols.includes('actions') && <TableHead className="w-10" />}
                      {visibleCols.includes('lot') && <SortableHeader label="Lot #" field="lotNumber" currentSort={clientSort} onSort={handleClientSortToggle} />}
                      {visibleCols.includes('vehicle') && <SortableHeader label="Vehicle" field="make" currentSort={clientSort} onSort={handleClientSortToggle} />}
                      {visibleCols.includes('body') && <SortableHeader label="Body" field="bodyStyle" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden md:table-cell" />}
                      {visibleCols.includes('saleDate') && <SortableHeader label="Sale Date" field="saleDate" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden lg:table-cell" />}
                      {visibleCols.includes('timeLeft') && <TableHead className="hidden md:table-cell">Time Left</TableHead>}
                      {visibleCols.includes('value') && <SortableHeader label="Est. Value" field="estimatedRetailValue" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden md:table-cell" />}
                      {visibleCols.includes('odometer') && <SortableHeader label="Odometer" field="odometer" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden lg:table-cell" />}
                      {visibleCols.includes('fuel') && <TableHead className="hidden sm:table-cell">Fuel</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAuctions.map((auction) => {
                      const checked = isInCompare(auction.id)
                      return (
                        <TableRow
                          key={auction.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleVehicleClick(auction)}
                        >
                          {visibleCols.includes('actions') && (
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleCompare(auction.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Compare ${auction.make} ${auction.modelGroup}`}
                              />
                            </TableCell>
                          )}
                          {visibleCols.includes('lot') && (
                            <TableCell className="font-mono text-xs">{auction.lotNumber}</TableCell>
                          )}
                          {visibleCols.includes('vehicle') && (
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{auction.make ?? '—'} {auction.modelGroup || auction.modelDetail || ''}</span>
                                <span className="text-xs text-muted-foreground">{auction.year ?? '—'}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleCols.includes('body') && (
                            <TableCell className="hidden md:table-cell">{auction.bodyStyle ?? '—'}</TableCell>
                          )}
                          {visibleCols.includes('saleDate') && (
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {formatSaleDate(auction.saleDate)}
                            </TableCell>
                          )}
                          {visibleCols.includes('timeLeft') && (
                            <TableCell className="hidden md:table-cell">
                              <CountdownTimer saleDate={auction.saleDate} saleTime={auction.saleTime} />
                            </TableCell>
                          )}
                          {visibleCols.includes('value') && (
                            <TableCell className="hidden md:table-cell font-medium text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(auction.estimatedRetailValue)}
                            </TableCell>
                          )}
                          {visibleCols.includes('odometer') && (
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {formatOdometer(auction.odometer)}
                            </TableCell>
                          )}
                          {visibleCols.includes('fuel') && (
                            <TableCell className="hidden sm:table-cell">{auction.fuelType ?? '—'}</TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {pagination && (
            <PaginationControls
              pagination={pagination}
              page={page}
              onPageChange={fetchAuctions}
              label={paginationLabel}
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
