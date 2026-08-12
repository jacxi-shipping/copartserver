import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTodayStr, parsePagination, buildPagination, buildOrderBy } from '@/lib/query-builder'
import { buildTextSearchWhere, buildUpcomingSaleDateWhere } from '@/lib/search-helpers'

const MAX_ALL_RESULTS = 5_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')
    const upcomingOnly = searchParams.get('upcomingOnly') !== 'false'
    const includeUnscheduled = searchParams.get('includeUnscheduled') === 'true'
    const allResults = searchParams.get('all') === 'true'

    const { page, pageSize, skip } = parsePagination(searchParams)
    const todayStr = getTodayStr()

    const and: Prisma.LotWhereInput[] = []

    if (q?.trim()) {
      and.push(buildTextSearchWhere(q))
    }

    if (upcomingOnly) {
      and.push(buildUpcomingSaleDateWhere(todayStr, includeUnscheduled))
    }

    const where: Prisma.LotWhereInput = and.length > 0 ? { AND: and } : {}
    const sort = searchParams.get('sort') || 'saleDate_asc'
    const orderBy = buildOrderBy(sort)

    const lotsPromise = allResults
      ? db.lot.findMany({ where, orderBy, take: MAX_ALL_RESULTS })
      : db.lot.findMany({ where, orderBy, skip, take: pageSize })
    const [lots, total] = await Promise.all([lotsPromise, db.lot.count({ where })])

    return NextResponse.json({
      success: true,
      pagination: allResults
        ? { page: 1, pageSize: lots.length, total, totalPages: 1, hasNext: total > lots.length, hasPrevious: false, truncated: total > lots.length }
        : buildPagination(page, pageSize, total),
      data: lots,
    })
  } catch (error) {
    console.error('Search GET API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      query,
      make,
      makes,
      yearMin,
      yearMax,
      states,
      priceMin,
      priceMax,
      odometerMin,
      odometerMax,
      upcomingOnly = true,
      includeUnscheduled = false,
      page: bodyPage = 1,
      pageSize: bodyPageSize = 50,
      sort = 'saleDate_asc',
    } = body

    let page = parseInt(String(bodyPage), 10)
    if (isNaN(page) || page < 1) page = 1
    let pageSize = parseInt(String(bodyPageSize), 10)
    if (isNaN(pageSize) || pageSize < 1) pageSize = 50
    if (pageSize > 500) pageSize = 500
    const skip = (page - 1) * pageSize
    const todayStr = getTodayStr()

    const and: Prisma.LotWhereInput[] = []

    if (query?.trim()) {
      and.push(buildTextSearchWhere(query))
    }

    // Single make filter (legacy) or multi-make filter
    if (Array.isArray(makes) && makes.length > 0) {
      and.push({ make: { in: makes } })
    } else if (make?.trim()) {
      and.push({ make: { contains: make } })
    }

    // Year range filter
    if (yearMin || yearMax) {
      const yearFilter: Prisma.IntNullableFilter<'Lot'> = {}
      if (yearMin) {
        const parsed = parseInt(String(yearMin), 10)
        if (!isNaN(parsed)) yearFilter.gte = parsed
      }
      if (yearMax) {
        const parsed = parseInt(String(yearMax), 10)
        if (!isNaN(parsed)) yearFilter.lte = parsed
      }
      if (yearMin || yearMax) and.push({ year: yearFilter })
    }

    // State filter
    if (Array.isArray(states) && states.length > 0) {
      and.push({ locationState: { in: states } })
    }

    // Price range filter
    if (priceMin != null || priceMax != null) {
      const priceFilter: Prisma.FloatNullableFilter<'Lot'> = {}
      if (priceMin != null) {
        const parsed = parseFloat(String(priceMin))
        if (!isNaN(parsed)) priceFilter.gte = parsed
      }
      if (priceMax != null) {
        const parsed = parseFloat(String(priceMax))
        if (!isNaN(parsed)) priceFilter.lte = parsed
      }
      if (priceFilter.gte != null || priceFilter.lte != null) {
        and.push({ estimatedRetailValue: priceFilter })
      }
    }

    // Odometer range filter
    if (odometerMin != null || odometerMax != null) {
      const odometerFilter: Prisma.FloatNullableFilter<'Lot'> = {}
      if (odometerMin != null) {
        const parsed = parseFloat(String(odometerMin))
        if (!isNaN(parsed)) odometerFilter.gte = parsed
      }
      if (odometerMax != null) {
        const parsed = parseFloat(String(odometerMax))
        if (!isNaN(parsed)) odometerFilter.lte = parsed
      }
      if (odometerFilter.gte != null || odometerFilter.lte != null) {
        and.push({ odometer: odometerFilter })
      }
    }

    if (upcomingOnly) {
      and.push(buildUpcomingSaleDateWhere(todayStr, includeUnscheduled))
    }

    const where: Prisma.LotWhereInput = and.length > 0 ? { AND: and } : {}
    const orderBy = buildOrderBy(sort)

    const [auctions, total] = await Promise.all([
      db.lot.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      db.lot.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      pagination: buildPagination(page, pageSize, total),
      data: auctions,
    })
  } catch (error) {
    console.error('Search POST API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } },
      { status: 500 }
    )
  }
}
