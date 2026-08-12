import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Top 15 states by lot count
    const stateGroups = await db.auction.groupBy({
      by: ['locationState'],
      _count: { locationState: true },
      _avg: {
        estimatedRetailValue: true,
        highBid: true,
      },
      where: {
        locationState: { not: null, not: '' },
      },
      orderBy: { _count: { locationState: 'desc' } },
      take: 15,
    })

    // For each state, find the top make
    const statesWithData = await Promise.all(
      stateGroups
        .filter((g) => g.locationState !== null)
        .map(async (g) => {
          const topMake = await db.auction.groupBy({
            by: ['make'],
            _count: { make: true },
            where: {
              locationState: g.locationState as string,
              make: { not: null, not: '' },
            },
            orderBy: { _count: { make: 'desc' } },
            take: 1,
          })
          // Total value for this state
          const totalVal = await db.auction.aggregate({
            _sum: { estimatedRetailValue: true },
            where: { locationState: g.locationState as string },
          })
          return {
            state: g.locationState as string,
            count: g._count.locationState,
            avgRetailValue: g._avg.estimatedRetailValue ?? 0,
            avgHighBid: g._avg.highBid ?? 0,
            topMake: topMake.length > 0 && topMake[0].make ? (topMake[0].make as string) : 'N/A',
            totalValue: totalVal._sum.estimatedRetailValue ?? 0,
          }
        })
    )

    // Top 10 cities by lot count
    const cityGroups = await db.auction.groupBy({
      by: ['locationCity'],
      _count: { locationCity: true },
      where: {
        locationCity: { not: null, not: '' },
      },
      orderBy: { _count: { locationCity: 'desc' } },
      take: 10,
    })

    const cities = cityGroups
      .filter((g) => g.locationCity !== null)
      .map((g) => ({
        city: g.locationCity as string,
        count: g._count.locationCity,
      }))

    // Top 15 yards by count
    const yardGroups = await db.auction.groupBy({
      by: ['yardName'],
      _count: { yardName: true },
      where: {
        yardName: { not: null, not: '' },
      },
      orderBy: { _count: { yardName: 'desc' } },
      take: 15,
    })

    const yards = yardGroups
      .filter((g) => g.yardName !== null)
      .map((g) => ({
        yard: g.yardName as string,
        count: g._count.yardName,
      }))

    return NextResponse.json({
      success: true,
      data: {
        states: statesWithData,
        cities,
        yards,
      },
    })
  } catch (error) {
    console.error('Location Analysis API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch location analysis' } },
      { status: 500 }
    )
  }
}
