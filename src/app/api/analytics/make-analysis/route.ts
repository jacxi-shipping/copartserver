import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get top 15 makes by count with aggregate data
    const makeGroups = await db.auction.groupBy({
      by: ['make'],
      _count: { make: true },
      _avg: {
        estimatedRetailValue: true,
        highBid: true,
        odometer: true,
        repairCost: true,
        year: true,
      },
      where: {
        make: { not: null, not: '' },
      },
      orderBy: { _count: { make: 'desc' } },
      take: 15,
    })

    const makes = makeGroups
      .filter((g) => g.make !== null)
      .map((g) => ({
        make: g.make as string,
        count: g._count.make,
        avgRetailValue: g._avg.estimatedRetailValue ?? 0,
        avgHighBid: g._avg.highBid ?? 0,
        avgOdometer: g._avg.odometer ?? 0,
        avgRepairCost: g._avg.repairCost ?? 0,
        avgYear: Math.round(g._avg.year ?? 0),
      }))

    // Overall market averages
    const overall = await db.auction.aggregate({
      _avg: {
        estimatedRetailValue: true,
        highBid: true,
        odometer: true,
        repairCost: true,
        year: true,
      },
    })

    const overallAvg = {
      avgRetailValue: overall._avg.estimatedRetailValue ?? 0,
      avgHighBid: overall._avg.highBid ?? 0,
      avgOdometer: overall._avg.odometer ?? 0,
      avgRepairCost: overall._avg.repairCost ?? 0,
      avgYear: Math.round(overall._avg.year ?? 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        makes,
        overall: overallAvg,
      },
    })
  } catch (error) {
    console.error('Make Analysis API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch make analysis' } },
      { status: 500 }
    )
  }
}
