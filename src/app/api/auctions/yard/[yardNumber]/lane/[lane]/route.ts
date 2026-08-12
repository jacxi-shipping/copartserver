import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { compareLaneGrid } from '@/lib/auction-helpers'
import { getTodayStr } from '@/lib/query-builder'

export async function GET(request: NextRequest, { params }: { params: Promise<{ yardNumber: string; lane: string }> }) {
  try {
    const { yardNumber, lane } = await params
    const yard = Number(yardNumber)
    const gridRow = lane.trim()
    if (!Number.isInteger(yard) || yard < 1 || !gridRow) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_YARD_OR_LANE', message: 'A numeric yard number and lane are required' } }, { status: 400 })
    }

    const saleDate = request.nextUrl.searchParams.get('saleDate')
    const includePast = request.nextUrl.searchParams.get('includePast') === 'true'
    const where: Prisma.AuctionWhereInput = {
      yardNumber: yard,
      lots: { some: { gridRow: { equals: gridRow, mode: 'insensitive' } } },
      ...(saleDate ? { saleDate } : includePast ? {} : { saleDate: { gte: getTodayStr() } }),
    }
    const auctions = await db.auction.findMany({
      where,
      include: { lots: true },
      orderBy: [{ saleDate: 'asc' }, { saleTime: 'asc' }],
    })
    const data = auctions.map((auction) => ({
      ...auction,
      lots: [...auction.lots].sort((first, second) => compareLaneGrid(first.gridRow, second.gridRow) || first.lotNumber - second.lotNumber),
    }))
    return NextResponse.json({
      success: true,
      query: { yardNumber: yard, lane: gridRow, saleDate: saleDate ?? null, includePast },
      count: data.length,
      data,
    })
  } catch (error) {
    console.error('Yard lane auction API error:', error)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load auction lane data' } }, { status: 500 })
  }
}