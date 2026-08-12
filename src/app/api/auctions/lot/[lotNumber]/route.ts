import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotNumber: string }> }
) {
  try {
    const { lotNumber } = await params
    const numericLot = parseInt(lotNumber, 10)
    if (isNaN(numericLot)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LOT', message: 'Invalid lot number' } },
        { status: 400 }
      )
    }

    const auction = await db.lot.findUnique({
      where: { lotNumber: numericLot },
    })

    if (!auction) {
      return NextResponse.json(
        { success: false, error: { code: 'LOT_NOT_FOUND', message: `Auction lot ${lotNumber} was not found` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: auction })
  } catch (error) {
    console.error('Auction by lot API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch auction' } },
      { status: 500 }
    )
  }
}
