import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  try {
    const { vin } = await params

    if (!vin || vin.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_VIN', message: 'VIN is required' } },
        { status: 400 }
      )
    }

    const auction = await db.auction.findFirst({
      where: { vin: vin.toUpperCase() },
    })

    if (!auction) {
      return NextResponse.json(
        { success: false, error: { code: 'AUCTION_NOT_FOUND', message: `Auction with VIN ${vin} was not found` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: auction })
  } catch (error) {
    console.error('Auction by VIN API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch auction' } },
      { status: 500 }
    )
  }
}
