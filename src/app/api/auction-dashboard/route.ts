import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { buildPagination, parsePagination } from '@/lib/query-builder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const query = searchParams.get('q')?.trim()
    const saleDate = searchParams.get('saleDate')?.trim()
    const state = searchParams.get('state')?.trim().toUpperCase()
    const numericYard = query && /^\d+$/.test(query) ? Number(query) : undefined
    const where: Prisma.AuctionWhereInput = {
      ...(saleDate ? { saleDate } : {}),
      ...(state ? { lots: { some: { locationState: state } } } : {}),
      ...(query ? { OR: [{ yardName: { contains: query, mode: 'insensitive' } }, ...(numericYard === undefined ? [] : [{ yardNumber: numericYard }])] } : {}),
    }

    const [auctions, total] = await Promise.all([
      db.auction.findMany({
        where,
        select: {
          id: true, saleKey: true, yardNumber: true, yardName: true,
          saleDate: true, saleTime: true, timeZone: true,
          _count: { select: { lots: true } },
          lots: { take: 1, select: { locationState: true } },
        },
        orderBy: [{ saleDate: 'asc' }, { saleTime: 'asc' }, { yardNumber: 'asc' }],
        skip,
        take: pageSize,
      }),
      db.auction.count({ where }),
    ])

    const metrics = await db.lot.groupBy({
      by: ['auctionId'],
      where: { auctionId: { in: auctions.map((auction) => auction.id) } },
      _sum: { estimatedRetailValue: true, highBid: true },
    })
    const metricsByAuction = new Map(metrics.map((metric) => [metric.auctionId, metric]))
    const data = auctions.map(({ lots, ...auction }) => {
      const metric = metricsByAuction.get(auction.id)
      return {
        ...auction,
        locationState: lots[0]?.locationState ?? null,
        estimatedRetailValue: metric?._sum.estimatedRetailValue ?? null,
        highBid: metric?._sum.highBid ?? null,
      }
    })

    return NextResponse.json({ success: true, pagination: buildPagination(page, pageSize, total), data })
  } catch (error) {
    console.error('Auction dashboard API error:', error)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load auctions' } }, { status: 500 })
  }
}