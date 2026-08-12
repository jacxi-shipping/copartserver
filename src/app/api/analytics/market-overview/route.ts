import { NextResponse } from 'next/server'
import { summarizeMarketOverview } from '@/lib/analytics-helpers'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      allAuctions,
      damageGroups,
    ] = await Promise.all([
      db.auction.findMany({
        select: {
          estimatedRetailValue: true,
          highBid: true,
          repairCost: true,
          damageDescription: true,
        },
      }),
      db.auction.groupBy({
        by: ['damageDescription'],
        _count: { damageDescription: true },
        orderBy: { _count: { damageDescription: 'desc' } },
        take: 10,
        where: {
          damageDescription: { not: null, not: '' },
        },
      }),
    ])

    const marketOverview = summarizeMarketOverview(allAuctions, damageGroups)

    return NextResponse.json({
      success: true,
      data: marketOverview,
    })
  } catch (error) {
    console.error('Market Overview API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch market overview' } },
      { status: 500 }
    )
  }
}
