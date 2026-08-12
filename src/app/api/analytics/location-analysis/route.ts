import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Top 15 states by lot count
    const stateGroups = await db.lot.groupBy({
      by: ['locationState'],
      _count: { locationState: true },
      _avg: {
        estimatedRetailValue: true,
        highBid: true,
      },
      where: {
        AND: [
          { locationState: { not: null } },
          { locationState: { not: '' } },
        ],
      },
      orderBy: { _count: { locationState: 'desc' } },
      take: 15,
    })

    // For each state, find the top make
    const statesWithData = await Promise.all(
      stateGroups
        .filter((g) => g.locationState !== null)
        .map(async (g) => {
          const topMake = await db.lot.groupBy({
            by: ['make'],
            _count: { make: true },
            where: {
              locationState: g.locationState as string,
              AND: [
                { make: { not: null } },
                { make: { not: '' } },
              ],
            },
            orderBy: { _count: { make: 'desc' } },
            take: 1,
          })
          // Total value for this state
          const totalVal = await db.lot.aggregate({
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
    const cityGroups = await db.lot.groupBy({
      by: ['locationCity'],
      _count: { locationCity: true },
      where: {
        AND: [
          { locationCity: { not: null } },
          { locationCity: { not: '' } },
        ],
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

    // Top 15 yards by lot count with operational and value metrics.
    const yardGroups = await db.lot.groupBy({
      by: ['yardName', 'yardNumber'],
      _count: { yardName: true },
      _sum: { estimatedRetailValue: true, highBid: true, repairCost: true },
      where: {
        AND: [
          { yardName: { not: null } },
          { yardName: { not: '' } },
        ],
      },
      orderBy: { _count: { yardName: 'desc' } },
      take: 15,
    })

    const auctionCounts = await db.auction.groupBy({ by: ['yardNumber'], _count: { id: true } })
    const auctionsByYard = new Map(auctionCounts.map((item) => [item.yardNumber, item._count.id]))
    const yards = yardGroups.filter((group) => group.yardName !== null).map((group) => ({
      yard: group.yardName as string,
      yardNumber: group.yardNumber,
      count: group._count.yardName,
      auctionCount: auctionsByYard.get(group.yardNumber) ?? 0,
      totalRetailValue: group._sum.estimatedRetailValue ?? 0,
      totalHighBid: group._sum.highBid ?? 0,
      totalRepairCost: group._sum.repairCost ?? 0,
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
