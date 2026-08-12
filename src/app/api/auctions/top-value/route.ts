import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const vehicles = await db.lot.findMany({
      where: {
        estimatedRetailValue: { not: null, gt: 0 },
      },
      orderBy: { estimatedRetailValue: 'desc' },
      take: 6,
      select: {
        id: true,
        lotNumber: true,
        year: true,
        make: true,
        modelGroup: true,
        modelDetail: true,
        bodyStyle: true,
        color: true,
        locationCity: true,
        locationState: true,
        saleDate: true,
        estimatedRetailValue: true,
        highBid: true,
        buyItNowPrice: true,
        odometer: true,
        damageDescription: true,
        saleStatus: true,
        fuelType: true,
        imageUrl: true,
        imageThumbnail: true,
      },
    })

    return NextResponse.json({ success: true, data: vehicles })
  } catch (error) {
    console.error('Top value API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch top vehicles' } },
      { status: 500 }
    )
  }
}
