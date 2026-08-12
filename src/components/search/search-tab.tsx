'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Download,
  Car,
  Tag,
  MapPin,
  Building2,
  Check,
  ChevronsUpDown,
  Bookmark,
  Minus,
  AlignJustify,
  Maximize2,
  Calendar,
  DollarSign,
  Gauge,
} from 'lucide-react'
import { ColumnToggle, type ColumnOption } from '@/components/shared/column-toggle'
import { SortableHeader, toggleClientSort, applyClientSort } from '@/components/shared/sortable-header'
import { SavedSearches } from '@/components/search/saved-searches'
import type { SavedSearch } from '@/lib/store'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Auction, PaginationInfo } from '@/lib/types'
import { formatCurrency, formatOdometer, formatSaleDateTime, getLocationLabel } from '@/lib/format'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import { BulkActionsBar } from '@/components/shared/bulk-actions-bar'
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
  { key: 'location', label: 'Location', defaultVisible: true },
  { key: 'saleDate', label: 'Sale Date', defaultVisible: true },
  { key: 'odometer', label: 'Odometer', defaultVisible: true },
  { key: 'damage', label: 'Damage', defaultVisible: true },
  { key: 'value', label: 'Est. Value', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
]

const defaultVisibleColumns = columnOptions.filter(c => c.defaultVisible).map(c => c.key)

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

// ─── Autocomplete Types ──────────────────────────────────────────────────────

interface AutocompleteData {
  makes: string[]
  models: string[]
  yards: string[]
  cities: string[]
  states: string[]
}

// ─── Facet Types ─────────────────────────────────────────────────────────────

interface MakeFacet {
  value: string
  count: number
}

// ─── Range Filter Component ──────────────────────────────────────────────────

function RangeFilter({
  label,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatValue,
  icon: Icon,
}: {
  label: string
  min: number
  max: number
  step: number
  valueMin: string
  valueMax: string
  onChange: (min: string, max: string) => void
  formatValue: (val: number | null | undefined) => string
  icon: React.ComponentType<{ className?: string }>
}) {
  const numMin = valueMin !== '' ? Number(valueMin) : min
  const numMax = valueMax !== '' ? Number(valueMax) : max
  const pctMin = ((numMin - min) / (max - min)) * 100
  const pctMax = ((numMax - min) / (max - min)) * 100

  const handleMinChange = (val: string) => {
    if (val === '') {
      onChange('', valueMax)
      return
    }
    const parsed = Number(val)
    if (isNaN(parsed)) return
    const clamped = Math.min(Math.max(parsed, min), numMax)
    onChange(String(clamped), valueMax)
  }

  const handleMaxChange = (val: string) => {
    if (val === '') {
      onChange(valueMin, '')
      return
    }
    const parsed = Number(val)
    if (isNaN(parsed)) return
    const clamped = Math.max(Math.min(parsed, max), numMin)
    onChange(valueMin, String(clamped))
  }

  return (
    <div className="col-span-2 space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {/* Selected range display */}
      <div className="flex items-center justify-center gap-1.5 text-sm font-medium tabular-nums">
        <Icon className="size-3.5 text-emerald-500" />
        <span>{formatValue(numMin)}</span>
        <span className="text-muted-foreground">–</span>
        <span>{formatValue(numMax)}</span>
      </div>
      {/* Visual range bar */}
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-500/30"
          style={{ left: `${pctMin}%`, width: `${Math.max(pctMax - pctMin, 0)}%` }}
        />
        <div
          className="absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-emerald-500 bg-background shadow-sm"
          style={{ left: `${pctMin}%` }}
        />
        <div
          className="absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-emerald-500 bg-background shadow-sm"
          style={{ left: `${pctMax}%` }}
        />
      </div>
      {/* Min / Max inputs */}
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={String(min)}
          className="h-8 text-xs"
          value={valueMin}
          onChange={(e) => handleMinChange(e.target.value)}
        />
        <span className="text-xs text-muted-foreground shrink-0">–</span>
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={String(max)}
          className="h-8 text-xs"
          value={valueMax}
          onChange={(e) => handleMaxChange(e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Search Tab Component ────────────────────────────────────────────────────

export function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Auction[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState('saleDate_asc')
  const { searchQuery, clearSearchQuery, toggleCompare, isInCompare, addActivity, saveSearch, savedSearches, toggleBookmark, isBookmarked, bookmarkedIds } = useAppStore()

  // Client-side sort
  const [clientSort, setClientSort] = useState('')

  // Table density
  const [density, setDensity] = useState<'compact' | 'default' | 'spacious'>(() => {
    if (typeof window === 'undefined') return 'default'
    const stored = localStorage.getItem('copart-table-density')
    return (stored === 'compact' || stored === 'default' || stored === 'spacious') ? stored : 'default'
  })
  const handleDensityChange = useCallback((d: 'compact' | 'default' | 'spacious') => {
    setDensity(d)
    localStorage.setItem('copart-table-density', d)
  }, [])

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

  // Autocomplete
  const [acOpen, setAcOpen] = useState(false)
  const [acData, setAcData] = useState<AutocompleteData | null>(null)
  const [acLoading, setAcLoading] = useState(false)
  const acRef = useRef<HTMLDivElement>(null)
  const acTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Advanced filters
  const [selectedMakes, setSelectedMakes] = useState<string[]>([])
  const [filterYearMin, setFilterYearMin] = useState('')
  const [filterYearMax, setFilterYearMax] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterDamage, setFilterDamage] = useState('')
  const [filterFuelType, setFilterFuelType] = useState('')
  const [filterTransmission, setFilterTransmission] = useState('')
  const [filterDrive, setFilterDrive] = useState('')
  const [filterVehicleType, setFilterVehicleType] = useState('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [filterOdometerMin, setFilterOdometerMin] = useState('')
  const [filterOdometerMax, setFilterOdometerMax] = useState('')

  // Make facets data
  const [makeFacets, setMakeFacets] = useState<MakeFacet[]>([])
  const [makeFacetsLoading, setMakeFacetsLoading] = useState(false)
  const [makePopoverOpen, setMakePopoverOpen] = useState(false)

  const hasAdvancedFilters =
    selectedMakes.length > 0 ||
    !!filterYearMin ||
    !!filterYearMax ||
    !!filterState ||
    !!filterPriceMin ||
    !!filterPriceMax ||
    !!filterOdometerMin ||
    !!filterOdometerMax

  // ─── Fetch Make Facets ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setMakeFacetsLoading(true)
    fetch('/api/search/facets')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data?.success && data.data?.makes) {
          setMakeFacets(data.data.makes as MakeFacet[])
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMakeFacetsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ─── Make Toggle ────────────────────────────────────────────────────────

  const toggleMake = useCallback((make: string) => {
    setSelectedMakes((prev) =>
      prev.includes(make)
        ? prev.filter((m) => m !== make)
        : [...prev, make]
    )
  }, [])

  const selectAllMakes = useCallback(() => {
    setSelectedMakes(makeFacets.map((f) => f.value))
  }, [makeFacets])

  const clearAllMakes = useCallback(() => {
    setSelectedMakes([])
  }, [])

  // ─── Format odometer for display ────────────────────────────────────────

  const formatOdometerInput = (val: string) => {
    if (!val) return ''
    const num = val.replace(/[^0-9]/g, '')
    if (!num) return ''
    return Number(num).toLocaleString('en-US')
  }

  const parseOdometerValue = (val: string): number | undefined => {
    if (!val) return undefined
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10)
    return isNaN(num) || num <= 0 ? undefined : num
  }

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedMakes.length > 0) params.set('make', selectedMakes.join(','))
    if (filterYearMin) params.set('yearMin', filterYearMin)
    if (filterYearMax) params.set('yearMax', filterYearMax)
    if (filterState) params.set('locationState', filterState)
    if (filterDamage) params.set('damage', filterDamage)
    if (filterFuelType) params.set('fuelType', filterFuelType)
    if (filterTransmission) params.set('transmission', filterTransmission)
    if (filterDrive) params.set('drive', filterDrive)
    if (filterVehicleType) params.set('vehicleType', filterVehicleType)
    if (filterPriceMin) params.set('priceMin', filterPriceMin)
    if (filterPriceMax) params.set('priceMax', filterPriceMax)
    const odoMin = parseOdometerValue(filterOdometerMin)
    const odoMax = parseOdometerValue(filterOdometerMax)
    if (odoMin != null) params.set('odometerMin', String(odoMin))
    if (odoMax != null) params.set('odometerMax', String(odoMax))
    params.set('upcomingOnly', 'false')
    params.set('includeUnscheduled', 'true')
    params.set('includePast', 'true')
    return `/api/export?${params.toString()}`
  }, [query, selectedMakes, filterYearMin, filterYearMax, filterState, filterDamage, filterFuelType, filterTransmission, filterDrive, filterVehicleType, filterPriceMin, filterPriceMax, filterOdometerMin, filterOdometerMax])

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

  // ─── Autocomplete Logic ──────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (acRef.current && !acRef.current.contains(e.target as Node)) {
        setAcOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAutocomplete = useCallback((q: string) => {
    if (acTimeoutRef.current) clearTimeout(acTimeoutRef.current)
    if (q.length < 2) {
      setAcData(null)
      setAcOpen(false)
      return
    }
    acTimeoutRef.current = setTimeout(async () => {
      setAcLoading(true)
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setAcData({
              makes: (json.data.makes ?? []).slice(0, 5),
              models: (json.data.models ?? []).slice(0, 5),
              yards: (json.data.yards ?? []).slice(0, 5),
              cities: (json.data.cities ?? []).slice(0, 5),
              states: (json.data.states ?? []).slice(0, 5),
            })
            setAcOpen(true)
          }
        }
      } catch {
        // silently ignore
      } finally {
        setAcLoading(false)
      }
    }, 300)
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    fetchAutocomplete(val)
  }

  const handleAcSelect = (text: string) => {
    setQuery(text)
    setAcOpen(false)
    setAcData(null)
    // Trigger search with selected text
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    params.set('q', text)
    params.set('upcomingOnly', 'false')
    params.set('includeUnscheduled', 'true')
    params.set('page', '1')
    params.set('pageSize', '20')
    params.set('sort', sortBy)
    fetch(`/api/search?${params.toString()}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setResults(data.data ?? [])
          setPagination(data.pagination ?? null)
          setPage(1)
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }

  const hasAcResults = acData && (
    (acData.makes.length > 0) ||
    (acData.models.length > 0) ||
    (acData.yards.length > 0) ||
    (acData.cities.length > 0) ||
    (acData.states.length > 0)
  )

  // ─── Search Logic ───────────────────────────────────────────────────────

  const searchAuctions = useCallback(
    async (p: number = 1) => {
      setLoading(true)
      setSearched(true)
      setAcOpen(false)
      try {
        // Use POST for advanced filter support, GET for simple text search
        if (hasAdvancedFilters) {
          const body: Record<string, unknown> = {
            query: query || undefined,
            upcomingOnly: false,
            includeUnscheduled: true,
            page: p,
            pageSize: 20,
            sort: sortBy,
          }
          // Multi-select makes
          if (selectedMakes.length > 0) body.makes = selectedMakes
          // Year range
          if (filterYearMin) body.yearMin = parseInt(filterYearMin, 10)
          if (filterYearMax) body.yearMax = parseInt(filterYearMax, 10)
          // State
          if (filterState) body.states = [filterState]
          // Price range
          if (filterPriceMin) body.priceMin = parseFloat(filterPriceMin)
          if (filterPriceMax) body.priceMax = parseFloat(filterPriceMax)
          // Odometer range
          const odoMin = parseOdometerValue(filterOdometerMin)
          const odoMax = parseOdometerValue(filterOdometerMax)
          if (odoMin != null) body.odometerMin = odoMin
          if (odoMax != null) body.odometerMax = odoMax

          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const data = await res.json()
            let filtered = data.data ?? []
            // Client-side filter for fields POST doesn't support
            if (filterDamage) {
              const d = filterDamage.toLowerCase()
              filtered = filtered.filter(
                (a: Auction) =>
                  a.damageDescription?.toLowerCase().includes(d)
              )
            }
            if (filterFuelType) {
              const f = filterFuelType.toUpperCase()
              filtered = filtered.filter(
                (a: Auction) => a.fuelType?.toUpperCase() === f
              )
            }
            if (filterTransmission) {
              const t = filterTransmission.toUpperCase()
              filtered = filtered.filter(
                (a: Auction) => a.transmission?.toUpperCase() === t
              )
            }
            if (filterDrive) {
              const dr = filterDrive.toUpperCase()
              filtered = filtered.filter(
                (a: Auction) => a.drive?.toUpperCase() === dr
              )
            }
            if (filterVehicleType) {
              const v = filterVehicleType.toUpperCase()
              filtered = filtered.filter(
                (a: Auction) => a.vehicleType?.toUpperCase() === v
              )
            }
            setResults(filtered)
            setPagination(data.pagination ?? null)
            setPage(p)
          }
        } else {
          // Simple text search via GET
          const params = new URLSearchParams()
          if (query) params.set('q', query)
          params.set('upcomingOnly', 'false')
          params.set('includeUnscheduled', 'true')
          params.set('page', String(p))
          params.set('pageSize', '20')
          params.set('sort', sortBy)

          const res = await fetch(`/api/search?${params.toString()}`)
          if (res.ok) {
            const data = await res.json()
            setResults(data.data ?? [])
            setPagination(data.pagination ?? null)
            setPage(p)
          }
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [query, sortBy, hasAdvancedFilters, selectedMakes, filterYearMin, filterYearMax, filterState, filterDamage, filterFuelType, filterTransmission, filterDrive, filterVehicleType, filterPriceMin, filterPriceMax, filterOdometerMin, filterOdometerMax]
  )

  const clearFilters = () => {
    setSelectedMakes([])
    setFilterYearMin('')
    setFilterYearMax('')
    setFilterState('')
    setFilterDamage('')
    setFilterFuelType('')
    setFilterTransmission('')
    setFilterDrive('')
    setFilterVehicleType('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setFilterOdometerMin('')
    setFilterOdometerMax('')
  }

  // Read initial query from store (set by header quick search)
  useEffect(() => {
    if (searchQuery) {
      setQuery(searchQuery)
      clearSearchQuery()
      // Trigger search after setting query
      const timer = setTimeout(() => {
        setLoading(true)
        setSearched(true)
        const params = new URLSearchParams()
        params.set('q', searchQuery)
        params.set('upcomingOnly', 'false')
        params.set('includeUnscheduled', 'true')
        params.set('page', '1')
        params.set('pageSize', '20')
        params.set('sort', sortBy)
        fetch(`/api/search?${params.toString()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setResults(data.data ?? [])
              setPagination(data.pagination ?? null)
              setPage(1)
            }
          })
          .catch(() => setResults([]))
          .finally(() => setLoading(false))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [])

  const FilterRow = ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>
    const s = status.toLowerCase()
    if (s.includes('pure sale') || s.includes('run')) {
      return (
        <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {status}
        </Badge>
      )
    }
    if (s.includes('sold') || s.includes('high bid')) {
      return (
        <Badge variant="secondary">{status}</Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const handleSaveSearch = useCallback(() => {
    const filters: Record<string, unknown> = {}
    if (selectedMakes.length > 0) filters.makes = selectedMakes
    if (filterYearMin) filters.yearMin = parseInt(filterYearMin, 10)
    if (filterYearMax) filters.yearMax = parseInt(filterYearMax, 10)
    if (filterState) filters.states = [filterState]
    if (filterDamage) filters.damage = filterDamage
    if (filterFuelType) filters.fuelType = filterFuelType
    if (filterTransmission) filters.transmission = filterTransmission
    if (filterDrive) filters.drive = filterDrive
    if (filterVehicleType) filters.vehicleType = filterVehicleType
    if (filterPriceMin) filters.priceMin = parseFloat(filterPriceMin)
    if (filterPriceMax) filters.priceMax = parseFloat(filterPriceMax)
    saveSearch(query, filters)
  }, [query, selectedMakes, filterYearMin, filterYearMax, filterState, filterDamage, filterFuelType, filterTransmission, filterDrive, filterVehicleType, filterPriceMin, filterPriceMax, saveSearch])

  // ─── Summary stats for results ────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (results.length === 0) return null
    const values = results.map((r) => r.estimatedRetailValue).filter((v): v is number => v != null && v > 0)
    if (values.length === 0) return null
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    return { avg, min, max, count: values.length }
  }, [results])

  // ─── Client-side sorted results ──────────────────────────────────
  const sortedResults = useMemo(() => {
    if (!clientSort) return results
    const sortGetter = (a: Auction, field: string): string | number | null | undefined => {
      switch (field) {
        case 'lotNumber': return a.lotNumber
        case 'make': return a.make ?? ''
        case 'year': return a.year ?? 0
        case 'odometer': return a.odometer
        case 'estimatedRetailValue': return a.estimatedRetailValue
        case 'saleDate': return a.saleDate ?? ''
        default: return a.lotNumber
      }
    }
    return applyClientSort(results, clientSort, sortGetter)
  }, [results, clientSort])

  const densityClass = density === 'compact' ? 'table-compact' : density === 'spacious' ? 'table-spacious' : ''

  const handleClientSortToggle = useCallback((field: string) => {
    setClientSort((prev) => toggleClientSort(prev, field))
  }, [])

  // Count all active filters (including client-side filters)
  const totalActiveFilters = useMemo(() => {
    let count = 0
    if (selectedMakes.length > 0) count++
    if (filterYearMin) count++
    if (filterYearMax) count++
    if (filterState) count++
    if (filterDamage) count++
    if (filterFuelType) count++
    if (filterTransmission) count++
    if (filterDrive) count++
    if (filterVehicleType) count++
    if (filterPriceMin) count++
    if (filterPriceMax) count++
    if (filterOdometerMin) count++
    if (filterOdometerMax) count++
    return count
  }, [selectedMakes, filterYearMin, filterYearMax, filterState, filterDamage, filterFuelType, filterTransmission, filterDrive, filterVehicleType, filterPriceMin, filterPriceMax, filterOdometerMin, filterOdometerMax])

  const clearAllFilters = useCallback(() => {
    clearFilters()
    setFilterOdometerMin('')
    setFilterOdometerMax('')
  }, [clearFilters])

  const handleRestoreSearch = useCallback((search: SavedSearch) => {
    setQuery(search.query)
    // Restore filters
    const f = search.filters
    if (f.makes && Array.isArray(f.makes)) {
      setSelectedMakes(f.makes as string[])
    } else {
      setSelectedMakes([])
    }
    setFilterYearMin(f.yearMin ? String(f.yearMin) : '')
    setFilterYearMax(f.yearMax ? String(f.yearMax) : '')
    setFilterState(f.states && Array.isArray(f.states) ? (f.states as string[])[0] || '' : '')
    setFilterDamage((f.damage as string) || '')
    setFilterFuelType((f.fuelType as string) || '')
    setFilterTransmission((f.transmission as string) || '')
    setFilterDrive((f.drive as string) || '')
    setFilterVehicleType((f.vehicleType as string) || '')
    setFilterPriceMin(f.priceMin ? String(f.priceMin) : '')
    setFilterPriceMax(f.priceMax ? String(f.priceMax) : '')
    // Trigger search after restoring
    setTimeout(() => searchAuctions(1), 0)
  }, [searchAuctions])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Search Vehicles</h2>
        <p className="text-sm text-muted-foreground">
          Find vehicles across all lot data.
        </p>
      </div>

      {/* Saved Searches */}
      <SavedSearches onRestore={handleRestoreSearch} />

      {/* Search Bar + Sort */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1" ref={acRef}>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by make, model, VIN, lot number..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => { if (hasAcResults) setAcOpen(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAcOpen(false); searchAuctions(1) } }}
            className="pl-9"
          />

          {/* Autocomplete Dropdown */}
          {acOpen && (acLoading || hasAcResults) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-popover shadow-lg">
              {acLoading && !hasAcResults ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching...
                </div>
              ) : (
                <div className="p-2">
                  {acData?.makes.length ? (
                    <AcCategory label="Makes" icon={<Car className="size-3.5" />}>
                      {acData.makes.map((m) => (
                        <AcItem key={m} onClick={() => handleAcSelect(m)}>{m}</AcItem>
                      ))}
                    </AcCategory>
                  ) : null}
                  {acData?.models.length ? (
                    <AcCategory label="Models" icon={<Tag className="size-3.5" />}>
                      {acData.models.map((m) => (
                        <AcItem key={m} onClick={() => handleAcSelect(m)}>{m}</AcItem>
                      ))}
                    </AcCategory>
                  ) : null}
                  {acData?.yards.length ? (
                    <AcCategory label="Yards" icon={<Building2 className="size-3.5" />}>
                      {acData.yards.map((y) => (
                        <AcItem key={y} onClick={() => handleAcSelect(y)}>{y}</AcItem>
                      ))}
                    </AcCategory>
                  ) : null}
                  {acData?.cities.length ? (
                    <AcCategory label="Cities" icon={<MapPin className="size-3.5" />}>
                      {acData.cities.map((c) => (
                        <AcItem key={c} onClick={() => handleAcSelect(c)}>{c}</AcItem>
                      ))}
                    </AcCategory>
                  ) : null}
                  {acData?.states.length ? (
                    <AcCategory label="States" icon={<MapPin className="size-3.5" />}>
                      {acData.states.map((s) => (
                        <AcItem key={s} onClick={() => handleAcSelect(s)}>{s}</AcItem>
                      ))}
                    </AcCategory>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={handleSaveSearch}
          disabled={!query && !hasAdvancedFilters}
          title="Save this search"
        >
          <Bookmark className="size-4" />
        </Button>
        <Select value={sortBy} onValueChange={setSortBy}>
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
        <ColumnToggle
          columns={columnOptions}
          visibleColumns={visibleCols}
          onToggle={toggleCol}
          onReset={resetCols}
        />
        {/* Density Toggle */}
        <div className="flex items-center rounded-md border p-0.5">
          <Button
            variant={density === 'compact' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => handleDensityChange('compact')}
            aria-label="Compact view"
            title="Compact"
          >
            <Minus className="size-3" />
          </Button>
          <Button
            variant={density === 'default' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => handleDensityChange('default')}
            aria-label="Default density"
            title="Default"
          >
            <AlignJustify className="size-3" />
          </Button>
          <Button
            variant={density === 'spacious' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => handleDensityChange('spacious')}
            aria-label="Spacious view"
            title="Spacious"
          >
            <Maximize2 className="size-3" />
          </Button>
        </div>
        <Button onClick={() => searchAuctions(1)} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Search className="mr-2 size-4" />
          )}
          Search
        </Button>
        <Button variant="outline" asChild>
          <a href={exportUrl} download>
            <Download className="mr-2 size-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`${exportUrl}&format=json`} download>
            <Download className="mr-2 size-4" />
            <span className="hidden sm:inline">JSON</span>
          </a>
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <SlidersHorizontal className="size-4" />
            Advanced Filters
            {hasAdvancedFilters && (
              <Badge variant="outline" className="ml-1 border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                Active
              </Badge>
            )}
            {filtersOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <motion.div
            {...fadeIn}
            className="mt-2 rounded-lg border bg-card p-4"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {/* ── Multi-Select Make Filter ── */}
              <FilterRow label="Make">
                <Popover open={makePopoverOpen} onOpenChange={setMakePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={makePopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {selectedMakes.length === 0
                          ? 'Select Makes...'
                          : `${selectedMakes.length} selected`
                        }
                      </span>
                      {selectedMakes.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-[10px]">
                          {selectedMakes.length}
                        </Badge>
                      )}
                      <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {makeFacets.length} makes available
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={selectAllMakes}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={clearAllMakes}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {makeFacetsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : makeFacets.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No makes found
                        </div>
                      ) : (
                        makeFacets.map((facet) => (
                          <label
                            key={facet.value}
                            className="make-checkbox-item flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm"
                          >
                            <Checkbox
                              checked={selectedMakes.includes(facet.value)}
                              onCheckedChange={() => toggleMake(facet.value)}
                            />
                            <span className="flex-1 truncate">{facet.value}</span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {facet.count.toLocaleString()}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedMakes.length > 0 && (
                      <div className="border-t px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => setMakePopoverOpen(false)}
                        >
                          <Check className="mr-1 size-3" />
                          Apply ({selectedMakes.length} selected)
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </FilterRow>

              {/* ── Year Range ── */}
              <RangeFilter
                label="Year Range"
                min={1990}
                max={2026}
                step={1}
                valueMin={filterYearMin}
                valueMax={filterYearMax}
                onChange={(min, max) => { setFilterYearMin(min); setFilterYearMax(max) }}
                formatValue={(v) => String(v)}
                icon={Calendar}
              />

              <FilterRow label="State">
                <Input
                  placeholder="e.g. CA"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                />
              </FilterRow>

              <FilterRow label="Vehicle Type">
                <Input
                  placeholder="e.g. V, S"
                  value={filterVehicleType}
                  onChange={(e) => setFilterVehicleType(e.target.value)}
                />
              </FilterRow>

              <FilterRow label="Damage">
                <Input
                  placeholder="e.g. FRONT END"
                  value={filterDamage}
                  onChange={(e) => setFilterDamage(e.target.value)}
                />
              </FilterRow>

              <FilterRow label="Fuel Type">
                <Select value={filterFuelType || '__none__'} onValueChange={(v) => setFilterFuelType(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    <SelectItem value="GAS">Gas</SelectItem>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                    <SelectItem value="ELECTRIC">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </FilterRow>

              <FilterRow label="Transmission">
                <Select value={filterTransmission || '__none__'} onValueChange={(v) => setFilterTransmission(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </FilterRow>

              <FilterRow label="Drive">
                <Input
                  placeholder="e.g. FWD"
                  value={filterDrive}
                  onChange={(e) => setFilterDrive(e.target.value)}
                />
              </FilterRow>

              {/* ── Price Range ── */}
              <RangeFilter
                label="Price Range"
                min={0}
                max={200000}
                step={1000}
                valueMin={filterPriceMin}
                valueMax={filterPriceMax}
                onChange={(min, max) => { setFilterPriceMin(min); setFilterPriceMax(max) }}
                formatValue={formatCurrency}
                icon={DollarSign}
              />

              {/* ── Odometer Range ── */}
              <RangeFilter
                label="Odometer Range"
                min={0}
                max={300000}
                step={1000}
                valueMin={filterOdometerMin}
                valueMax={filterOdometerMax}
                onChange={(min, max) => { setFilterOdometerMin(min); setFilterOdometerMax(max) }}
                formatValue={formatOdometer}
                icon={Gauge}
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 size-3" />
                Clear
              </Button>
              <Button size="sm" onClick={() => searchAuctions(1)}>
                <Filter className="mr-1 size-3" />
                Apply
              </Button>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Summary Bar */}
      {!loading && searched && results.length > 0 && (
        <div className="summary-bar flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-2 text-xs">
          <span className="font-medium text-muted-foreground">
            Showing <span className="text-foreground tabular-nums">{results.length}</span>{' '}
            of <span className="text-foreground tabular-nums">{pagination?.total?.toLocaleString() ?? results.length}</span> vehicles
          </span>
          <span className="hidden text-muted-foreground/40 sm:inline">·</span>
          {summaryStats && (
            <>
              <span className="text-muted-foreground">
                Avg: <span className="font-medium text-foreground tabular-nums">{formatCurrency(Math.round(summaryStats.avg))}</span>
              </span>
              <span className="hidden text-muted-foreground/40 sm:inline">·</span>
              <span className="text-muted-foreground">
                Min: <span className="font-medium text-foreground tabular-nums">{formatCurrency(summaryStats.min)}</span>
                <span className="mx-1.5 text-muted-foreground/40">—</span>
                Max: <span className="font-medium text-foreground tabular-nums">{formatCurrency(summaryStats.max)}</span>
              </span>
            </>
          )}
          {totalActiveFilters > 0 && (
            <>
              <span className="hidden text-muted-foreground/40 sm:inline">·</span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-muted-foreground/20 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {totalActiveFilters} filter{totalActiveFilters !== 1 ? 's' : ''} active
                <X className="size-3" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {searched && results.length > 0 && (
        <BulkActionsBar currentIds={results.map((a) => a.id)} totalAvailable={pagination?.total} />
      )}

      {/* Results Table */}
      {searched && pagination && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
            {pagination.total.toLocaleString()} result{pagination.total !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
          </Badge>
          {hasAdvancedFilters && (
            <span className="text-xs text-muted-foreground">(filtered)</span>
          )}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-3 size-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                Enter a search query to find vehicles
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try searching for a make like &quot;TOYOTA&quot; or a specific model
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-3 size-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                No results found
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[500px]">
                <Table className={densityClass}>
                  <TableHeader>
                    <TableRow>
                      {visibleCols.includes('actions') && <TableHead className="w-10" />}
                      <TableHead className="w-9" />
                      {visibleCols.includes('lot') && <SortableHeader label="Lot #" field="lotNumber" currentSort={clientSort} onSort={handleClientSortToggle} />}
                      {visibleCols.includes('vehicle') && <SortableHeader label="Vehicle" field="make" currentSort={clientSort} onSort={handleClientSortToggle} />}
                      {visibleCols.includes('location') && <TableHead className="hidden lg:table-cell">Location</TableHead>}
                      {visibleCols.includes('saleDate') && <SortableHeader label="Sale Date" field="saleDate" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden md:table-cell" />}
                      {visibleCols.includes('odometer') && <SortableHeader label="Odometer" field="odometer" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden lg:table-cell" />}
                      {visibleCols.includes('damage') && <TableHead className="hidden lg:table-cell">Damage</TableHead>}
                      {visibleCols.includes('value') && <SortableHeader label="Est. Value" field="estimatedRetailValue" currentSort={clientSort} onSort={handleClientSortToggle} className="hidden md:table-cell" />}
                      {visibleCols.includes('status') && <TableHead className="hidden sm:table-cell">Status</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((auction) => {
                      const bookmarked = bookmarkedIds.includes(auction.id)
                      return (
                      <TableRow
                        key={auction.id}
                        className={`cursor-pointer hover:bg-muted/50 ${bookmarked ? 'border-l-2 border-l-amber-400' : ''}`}
                        onClick={() => handleVehicleClick(auction)}
                      >
                        {/* Bookmark column */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBookmark(auction.id, `${auction.year ?? ''} ${auction.make ?? ''} ${auction.modelGroup || auction.modelDetail || ''}`.trim())
                            }}
                            className={`flex size-7 items-center justify-center rounded-md transition-colors duration-150 ${
                              bookmarked
                                ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                                : 'text-muted-foreground/40 hover:text-amber-500 hover:bg-muted/50'
                            }`}
                            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                          >
                            <Bookmark className={`size-3.5 ${bookmarked ? 'fill-amber-500' : ''}`} />
                          </button>
                        </TableCell>
                        {visibleCols.includes('actions') && (
                          <TableCell>
                            <Checkbox
                              checked={isInCompare(auction.id)}
                              onCheckedChange={() => toggleCompare(auction.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Compare ${auction.make} ${auction.modelGroup}`}
                            />
                          </TableCell>
                        )}
                        {visibleCols.includes('lot') && (
                          <TableCell className="font-mono text-xs">
                            {auction.lotNumber}
                          </TableCell>
                        )}
                        {visibleCols.includes('vehicle') && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{auction.make ?? '—'} {auction.modelGroup || auction.modelDetail || ''}</span>
                              <span className="text-xs text-muted-foreground">{auction.year ?? '—'}{auction.vin ? ` · ${auction.vin.slice(0, 11)}` : ''}</span>
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.includes('location') && (
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {getLocationLabel(auction)}
                          </TableCell>
                        )}
                        {visibleCols.includes('saleDate') && (
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {formatSaleDateTime(auction)}
                          </TableCell>
                        )}
                        {visibleCols.includes('odometer') && (
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {formatOdometer(auction.odometer)}
                          </TableCell>
                        )}
                        {visibleCols.includes('damage') && (
                          <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[140px] truncate">
                            {auction.damageDescription ?? '—'}
                          </TableCell>
                        )}
                        {visibleCols.includes('value') && (
                          <TableCell className="hidden md:table-cell font-medium text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(auction.estimatedRetailValue)}
                          </TableCell>
                        )}
                        {visibleCols.includes('status') && (
                          <TableCell className="hidden sm:table-cell">
                            {getStatusBadge(auction.saleStatus)}
                          </TableCell>
                        )}
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing{' '}
                    {(pagination.page - 1) * pagination.pageSize + 1}–
                    {Math.min(
                      pagination.page * pagination.pageSize,
                      pagination.total
                    )}{' '}
                    of {pagination.total.toLocaleString()} results
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={!pagination.hasPrevious}
                      onClick={() => searchAuctions(page - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="px-3 text-xs font-medium">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={!pagination.hasNext}
                      onClick={() => searchAuctions(page + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <VehicleDetailSheet
        vehicle={selectedVehicle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

// ─── Autocomplete Sub-Components ─────────────────────────────────────────────

function AcCategory({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function AcItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
