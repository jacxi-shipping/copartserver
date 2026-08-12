import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildPagination, parsePagination } from '@/lib/query-builder'

export async function GET(request: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    const id = Number(auctionId)
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: { code: 'INVALID_AUCTION_ID', message: 'A numeric auction ID is required' } }, { status: 400 })

    const auction = await db.auction.findUnique({
      where: { id },
      select: { id: true, saleKey: true, yardNumber: true, yardName: true, saleDate: true, saleTime: true, timeZone: true },
    })
    if (!auction) return NextResponse.json({ success: false, error: { code: 'AUCTION_NOT_FOUND', message: 'Auction was not found' } }, { status: 404 })

    const { page, pageSize, skip } = parsePagination(request.nextUrl.searchParams)
    const where = { auctionId: id }
    const [lots, total] = await Promise.all([
      db.lot.findMany({ where, orderBy: [{ gridRow: 'asc' }, { lotNumber: 'asc' }], skip, take: pageSize }),
      db.lot.count({ where }),
    ])
    return NextResponse.json({ success: true, data: { auction, lots }, pagination: buildPagination(page, pageSize, total) })
  } catch (error) {
    console.error('Auction detail API error:', error)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load auction lots' } }, { status: 500 })
  }
}