import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTodayStr } from '@/lib/query-builder'

function validSaleDateWhere(): Prisma.LotWhereInput {
  return {
    AND: [
      { saleDate: { not: null } },
      { saleDate: { not: '' } },
      { saleDate: { not: '0' } },
    ],
  }
}

export interface DashboardStatsResult {
  totalAuctions: number
  upcomingAuctions: number
  todayAuctions: number
  uniqueMakes: number
  uniqueStates: number
  uniqueYards: number
  lastImport: string | null
  lastUpdate: string | null
  pastAuctions: number
  unscheduledAuctions: number
}

export interface SidebarCountsResult {
  total: number
  upcoming: number
  today: number
  imports: number
}

export async function getDashboardStats(): Promise<DashboardStatsResult> {
  const todayStr = getTodayStr()

  const [
    totalAuctions,
    upcomingAuctions,
    todayAuctions,
    pastAuctions,
    unscheduledAuctions,
    importCount,
    lastImportJob,
    auctionAggregates,
    makes,
    states,
    yards,
  ] = await Promise.all([
    db.lot.count(),
    db.lot.count({
      where: {
        AND: [validSaleDateWhere(), { saleDate: { gte: todayStr } }],
      },
    }),
    db.lot.count({ where: { saleDate: todayStr } }),
    db.lot.count({
      where: {
        AND: [validSaleDateWhere(), { saleDate: { lt: todayStr } }],
      },
    }),
    db.lot.count({
      where: {
        OR: [{ saleDate: null }, { saleDate: '' }, { saleDate: '0' }],
      },
    }),
    db.importJob.count(),
    db.importJob.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true, createdAt: true },
    }),
    db.lot.aggregate({
      _max: { updatedAt: true, lastUpdatedTime: true },
    }),
    db.lot.groupBy({
      by: ['make'],
      where: { make: { not: null } },
    }),
    db.lot.groupBy({
      by: ['locationState'],
      where: { locationState: { not: null } },
    }),
    db.lot.groupBy({
      by: ['yardNumber'],
      where: { yardNumber: { not: null } },
    }),
  ])

  const uniqueMakes = makes.filter((item) => (item.make ?? '').trim() !== '').length
  const uniqueStates = states.filter((item) => (item.locationState ?? '').trim() !== '').length
  const uniqueYards = yards.length

  return {
    totalAuctions,
    upcomingAuctions,
    todayAuctions,
    uniqueMakes,
    uniqueStates,
    uniqueYards,
    lastImport: lastImportJob?.completedAt?.toISOString() ?? lastImportJob?.createdAt.toISOString() ?? null,
    lastUpdate: auctionAggregates._max.lastUpdatedTime?.toISOString() ?? auctionAggregates._max.updatedAt?.toISOString() ?? null,
    pastAuctions,
    unscheduledAuctions,
  }
}

export async function getSidebarCounts(): Promise<SidebarCountsResult> {
  const todayStr = getTodayStr()

  const [total, upcoming, today, imports] = await Promise.all([
    db.lot.count(),
    db.lot.count({
      where: {
        AND: [validSaleDateWhere(), { saleDate: { gte: todayStr } }],
      },
    }),
    db.lot.count({ where: { saleDate: todayStr } }),
    db.importJob.count(),
  ])

  return { total, upcoming, today, imports }
}