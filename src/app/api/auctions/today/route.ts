import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTodayStr, parsePagination, buildPagination, buildOrderBy, buildAuctionFilters } from '@/lib/query-builder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const todayStr = getTodayStr()
    const onlyUpcoming = searchParams.get('onlyUpcoming') !== 'false'

    const { where: baseWhere, sort } = buildAuctionFilters(searchParams)

    const todayFilter: import('@prisma/client').Prisma.LotWhereInput = {
      saleDate: todayStr,
    }

    const where = {
      AND: [baseWhere, todayFilter],
    }

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
    console.error('Today auctions API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch today auctions' } },
      { status: 500 }
    )
  }
}
