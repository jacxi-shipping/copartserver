import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTodayStr, parsePagination, buildPagination, buildOrderBy, buildAuctionFilters } from '@/lib/query-builder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const todayStr = getTodayStr()

    const { where: baseWhere, sort } = buildAuctionFilters(searchParams)
    const upcomingDateFilter: Prisma.LotWhereInput = {
      AND: [
        { saleDate: { not: null } },
        { saleDate: { not: '' } },
        { saleDate: { not: '0' } },
        { saleDate: { gte: todayStr } },
      ],
    }

    const where = {
      AND: [baseWhere, upcomingDateFilter],
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
    console.error('Upcoming auctions API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch upcoming auctions' } },
      { status: 500 }
    )
  }
}
