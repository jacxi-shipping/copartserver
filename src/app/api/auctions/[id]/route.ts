import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numericId = parseInt(id, 10)
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Invalid auction ID' } },
        { status: 400 }
      )
    }

    const auction = await db.auction.findUnique({
      where: { id: numericId },
    })

    if (!auction) {
      return NextResponse.json(
        { success: false, error: { code: 'AUCTION_NOT_FOUND', message: `Auction with ID ${id} was not found` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: auction })
  } catch (error) {
    console.error('Auction by ID API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch auction' } },
      { status: 500 }
    )
  }
}
