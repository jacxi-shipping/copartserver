import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parsePagination, buildPagination, buildOrderBy, buildAuctionFilters } from '@/lib/query-builder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const { where, sort } = buildAuctionFilters(searchParams)
    const orderBy = buildOrderBy(sort)

    const [auctions, total] = await Promise.all([
      db.auction.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      db.auction.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      pagination: buildPagination(page, pageSize, total),
      data: auctions,
    })
  } catch (error) {
    console.error('Auctions API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch auctions' } },
      { status: 500 }
    )
  }
}
