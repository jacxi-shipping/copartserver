import { Prisma } from '@prisma/client'
import { buildTextSearchWhere, buildUpcomingSaleDateWhere } from '@/lib/search-helpers'

export function getTodayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type SortField =
  | 'saleDate_asc' | 'saleDate_desc'
  | 'year_asc' | 'year_desc'
  | 'price_asc' | 'price_desc'
  | 'odometer_asc' | 'odometer_desc'
  | 'lotNumber_asc' | 'lotNumber_desc'
  | 'updated_desc'

const SORT_MAP: Record<SortField, { field: string; dir: 'asc' | 'desc' }> = {
  saleDate_asc: { field: 'saleDate', dir: 'asc' },
  saleDate_desc: { field: 'saleDate', dir: 'desc' },
  year_asc: { field: 'year', dir: 'asc' },
  year_desc: { field: 'year', dir: 'desc' },
  price_asc: { field: 'estimatedRetailValue', dir: 'asc' },
  price_desc: { field: 'estimatedRetailValue', dir: 'desc' },
  odometer_asc: { field: 'odometer', dir: 'asc' },
  odometer_desc: { field: 'odometer', dir: 'desc' },
  lotNumber_asc: { field: 'lotNumber', dir: 'asc' },
  lotNumber_desc: { field: 'lotNumber', dir: 'desc' },
  updated_desc: { field: 'updatedAt', dir: 'desc' },
}

export function buildOrderBy(sort: string): Prisma.AuctionOrderByWithRelationInput {
  const key = (sort || 'saleDate_asc') as SortField
  const mapping = SORT_MAP[key] || SORT_MAP.saleDate_asc
  return { [mapping.field]: mapping.dir }
}

export interface PaginationResult {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export function buildPagination(page: number, pageSize: number, total: number): PaginationResult {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  }
}

export function parsePagination(searchParams: URLSearchParams) {
  let page = parseInt(searchParams.get('page') || '1', 10)
  if (isNaN(page) || page < 1) page = 1
  let pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
  if (isNaN(pageSize) || pageSize < 1) pageSize = 50
  if (pageSize > 500) pageSize = 500
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export interface FilterOptions {
  upcomingOnly?: boolean
  includePast?: boolean
  includeUnscheduled?: boolean
  today?: boolean
  saleDateFrom?: string
  saleDateTo?: string
}

export function buildAuctionFilters(searchParams: URLSearchParams): {
  where: Prisma.AuctionWhereInput
  sort: string
} {
  const and: Prisma.AuctionWhereInput[] = []
  const todayStr = getTodayStr()

  // Search query
  const q = searchParams.get('q')?.trim()
  if (q) {
    and.push(buildTextSearchWhere(q))
  }

  // Date-based filters
  const todayParam = searchParams.get('today')
  const upcomingOnlyParam = searchParams.get('upcomingOnly')
  const includePastParam = searchParams.get('includePast')
  const includeUnscheduledParam = searchParams.get('includeUnscheduled')
  const saleDateFrom = searchParams.get('saleDateFrom')
  const saleDateTo = searchParams.get('saleDateTo')

  const isUpcomingOnly = upcomingOnlyParam === null ? true : upcomingOnlyParam === 'true'
  const isIncludePast = includePastParam === 'true'
  const isIncludeUnscheduled = includeUnscheduledParam === 'true'
  const isToday = todayParam === 'true'

  if (isToday) {
    and.push({ saleDate: todayStr })
  } else if (saleDateFrom || saleDateTo) {
    const dateFilter: Prisma.AuctionWhereInput = {}
    if (saleDateFrom) dateFilter.gte = saleDateFrom
    if (saleDateTo) dateFilter.lte = saleDateTo
    and.push({ saleDate: dateFilter })
  } else if (isUpcomingOnly) {
    if (!isIncludeUnscheduled) {
      and.push(buildUpcomingSaleDateWhere(todayStr, false))
    } else {
      and.push(buildUpcomingSaleDateWhere(todayStr, true))
    }
  } else {
    // Not upcomingOnly - show past too
    if (!isIncludeUnscheduled) {
      and.push({
        AND: [
          { saleDate: { not: null } },
          { saleDate: { not: '' } },
          { saleDate: { not: '0' } },
        ],
      })
      if (!isIncludePast) {
        and.push({ saleDate: { gte: todayStr } })
      }
    }
  }

  // Specific field filters
  const stringFields = [
    'make', 'modelGroup', 'modelDetail', 'trim', 'vehicleType', 'bodyStyle',
    'color', 'damage', 'secondaryDamage', 'saleTitleState', 'saleTitleType',
    'hasKeys', 'lotConditionCode', 'engine', 'drive', 'transmission',
    'fuelType', 'runsDrives', 'saleStatus', 'locationCity', 'locationState',
    'locationZip', 'yardName', 'sellerName', 'saleLight', 'autograde',
    'makeOfferEligible',
  ]

  const dbFieldMap: Record<string, string> = {
    damage: 'damageDescription',
    makeOfferEligible: 'makeOfferEligible',
  }

  for (const field of stringFields) {
    const value = searchParams.get(field)
    if (value) {
      const dbField = dbFieldMap[field] || field
      // handle comma-separated values
      if (value.includes(',')) {
        const values = value.split(',').map((v) => v.trim()).filter(Boolean)
        if (values.length > 0) {
          if (field === 'makeOfferEligible') {
            and.push({ makeOfferEligible: value === 'true' })
          } else if (field === 'hasKeys') {
            and.push({ hasKeys: value === 'true' || value === 'YES' || value === 'Y' })
          } else {
            and.push({ [dbField]: { in: values } })
          }
        }
      } else {
        if (field === 'makeOfferEligible') {
          and.push({ makeOfferEligible: value === 'true' })
        } else if (field === 'hasKeys') {
          and.push({ hasKeys: value === 'true' || value === 'YES' || value === 'Y' })
        } else {
          and.push({ [dbField]: value })
        }
      }
    }
  }

  // Numeric range filters
  const numericRangeFields = [
    { min: 'yearMin', max: 'yearMax', dbField: 'year', type: 'int' as const },
    { min: 'odometerMin', max: 'odometerMax', dbField: 'odometer', type: 'float' as const },
    { min: 'estimatedRetailValueMin', max: 'estimatedRetailValueMax', dbField: 'estimatedRetailValue', type: 'float' as const },
    { min: 'repairCostMin', max: 'repairCostMax', dbField: 'repairCost', type: 'float' as const },
    { min: 'buyItNowMin', max: 'buyItNowMax', dbField: 'buyItNowPrice', type: 'float' as const },
  ]

  for (const { min, max, dbField, type } of numericRangeFields) {
    const minVal = searchParams.get(min)
    const maxVal = searchParams.get(max)
    const condition: Prisma.AuctionWhereInput = {}
    if (minVal) {
      const parsed = type === 'int' ? parseInt(minVal, 10) : parseFloat(minVal)
      if (!isNaN(parsed)) condition.gte = parsed
    }
    if (maxVal) {
      const parsed = type === 'int' ? parseInt(maxVal, 10) : parseFloat(maxVal)
      if (!isNaN(parsed)) condition.lte = parsed
    }
    if (minVal || maxVal) {
      and.push({ [dbField]: condition })
    }
  }

  // yardNumber (int exact match)
  const yardNumber = searchParams.get('yardNumber')
  if (yardNumber) {
    const parsed = parseInt(yardNumber, 10)
    if (!isNaN(parsed)) {
      and.push({ yardNumber: parsed })
    }
  }

  // cylinders (int exact match)
  const cylinders = searchParams.get('cylinders')
  if (cylinders) {
    const parsed = parseInt(cylinders, 10)
    if (!isNaN(parsed)) {
      and.push({ cylinders: parsed })
    }
  }

  const year = searchParams.get('year')
  if (year) {
    const parsed = parseInt(year, 10)
    if (!isNaN(parsed)) {
      and.push({ year: parsed })
    }
  }

  const where: Prisma.AuctionWhereInput = and.length > 0 ? { AND: and } : {}
  const sort = searchParams.get('sort') || 'saleDate_asc'

  return { where, sort }
}
