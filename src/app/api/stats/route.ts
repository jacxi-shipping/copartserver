import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTodayStr } from '@/lib/query-builder'

export async function GET() {
  try {
    const todayStr = getTodayStr()

    const [totalAuctions, upcomingAuctions, todayAuctions, unscheduledAuctions] = await Promise.all([
      db.auction.count(),
      db.auction.count({
        where: {
          AND: [
            { saleDate: { not: null } },
            { saleDate: { not: '' } },
            { saleDate: { not: '0' } },
            { saleDate: { gte: todayStr } },
          ],
        },
      }),
      db.auction.count({
        where: { saleDate: todayStr },
      }),
      db.auction.count({
        where: {
          OR: [
            { saleDate: null },
            { saleDate: '' },
            { saleDate: '0' },
          ],
        },
      }),
    ])

    const [uniqueMakes, uniqueStates, uniqueYards, lastImport, lastUpdate] = await Promise.all([
      db.auction.groupBy({ by: ['make'] }).then(groups => groups.length),
      db.auction.groupBy({ by: ['locationState'] }).then(groups => groups.length),
      db.auction.groupBy({ by: ['yardName'] }).then(groups => groups.length),
      db.importJob.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      db.auction.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalAuctions,
        upcomingAuctions,
        todayAuctions,
        uniqueMakes,
        uniqueStates,
        uniqueYards,
        lastImport: lastImport?.createdAt?.toISOString() || null,
        lastUpdate: lastUpdate?.updatedAt?.toISOString() || null,
        pastAuctions: totalAuctions - upcomingAuctions - unscheduledAuctions,
        unscheduledAuctions,
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 }
    )
  }
}
