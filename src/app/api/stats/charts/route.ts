import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

async function safeGroupBy(
  field: string,
  options: {
    orderBy?: { [key: string]: 'asc' | 'desc' }
    take?: number
    where?: Prisma.LotWhereInput
  } = {}
) {
  return db.lot.groupBy({
    by: [field] as Prisma.LotScalarFieldEnum[],
    _count: { [field]: true } as Record<string, true>,
    orderBy: (options.orderBy ?? { _count: { [field]: 'desc' } }) as Prisma.LotOrderByWithAggregationInput,
    take: options.take,
    where: options.where ?? undefined,
  } as any)
}

function formatGroupResult(
  results: Array<{ _count?: Record<string, number | undefined> | true; [key: string]: unknown }>,
  field: string
): { name: string; count: number }[] {
  return results
    .filter((r) => r[field] !== null && r[field] !== '')
    .map((r) => ({
      name: String(r[field]),
      count: typeof r._count === 'object' && r._count !== null ? r._count[field] ?? 0 : 0,
    }))
}

export async function GET() {
  try {
    const [makes, states, bodyStyles, years, fuelTypes, titleTypes, damageTypes, statusDistribution, vehicleTypes, driveTypes] =
      await Promise.all([
        // Top 10 makes
        safeGroupBy('make', { take: 10 }),
        // Top 10 states
        safeGroupBy('locationState', { take: 10 }),
        // All body styles
        safeGroupBy('bodyStyle'),
        // Year distribution (top 10)
        safeGroupBy('year', { take: 10 }),
        // Top 6 fuel types
        safeGroupBy('fuelType', { take: 6 }),
        // All title types
        safeGroupBy('saleTitleType'),
        // Top 8 damage types
        safeGroupBy('damageDescription', { take: 8 }),
        // All sale statuses
        safeGroupBy('saleStatus'),
        // Vehicle types
        safeGroupBy('vehicleType'),
        // Top 5 drive types
        safeGroupBy('drive', { take: 5 }),
      ])

    return NextResponse.json({
      success: true,
      data: {
        makes: formatGroupResult(makes, 'make').map((item) => ({
          name: item.name,
          count: item.count,
        })),
        states: formatGroupResult(states, 'locationState').map((item) => ({
          name: item.name,
          count: item.count,
        })),
        bodyStyles: formatGroupResult(bodyStyles, 'bodyStyle'),
        years: formatGroupResult(years, 'year')
          .map((item) => ({
            name: item.name,
            count: item.count,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        fuelTypes: formatGroupResult(fuelTypes, 'fuelType'),
        titleTypes: formatGroupResult(titleTypes, 'saleTitleType'),
        damageTypes: formatGroupResult(damageTypes, 'damageDescription'),
        statusDistribution: formatGroupResult(statusDistribution, 'saleStatus'),
        vehicleTypes: formatGroupResult(vehicleTypes, 'vehicleType'),
        driveTypes: formatGroupResult(driveTypes, 'drive'),
      },
    })
  } catch (error) {
    console.error('Charts API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chart data' } },
      { status: 500 }
    )
  }
}
