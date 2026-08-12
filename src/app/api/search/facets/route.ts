import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTodayStr } from '@/lib/query-builder'
import { buildTextSearchWhere } from '@/lib/search-helpers'

type FacetItem = { value: string | number | null; count: number }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim()
    const todayStr = getTodayStr()

    // Base filter: upcoming auctions only — use AND to avoid duplicate object keys
    const baseFilter: Prisma.LotWhereInput = {
      AND: [
        { saleDate: { not: null } },
        { saleDate: { not: '' } },
        { saleDate: { not: '0' } },
        { saleDate: { gte: todayStr } },
      ],
    }

    // If there's a search query, add it to the filter
    const where: Prisma.LotWhereInput = q
      ? {
          AND: [
            baseFilter,
            buildTextSearchWhere(q),
          ],
        }
      : baseFilter

    // Use a simple base for range aggregates (no date filter, so we get full range)
    const rangeFilter: Prisma.LotWhereInput = {}

    const [
      makesResult,
      modelsResult,
      statesResult,
      yearsResult,
      damageResult,
      titleTypesResult,
      fuelTypesResult,
      transmissionsResult,
      drivesResult,
      bodyStylesResult,
      yearRangeResult,
      odometerRangeResult,
    ] = await Promise.all([
      db.lot.groupBy({
        where: { ...where, make: { not: null } },
        by: ['make'],
        _count: { make: true },
        orderBy: { _count: { make: 'desc' } },
        take: 50,
      }),
      db.lot.groupBy({
        where: { ...where, modelGroup: { not: null } },
        by: ['modelGroup'],
        _count: { modelGroup: true },
        orderBy: { _count: { modelGroup: 'desc' } },
        take: 50,
      }),
      db.lot.groupBy({
        where: { ...where, locationState: { not: null } },
        by: ['locationState'],
        _count: { locationState: true },
        orderBy: { _count: { locationState: 'desc' } },
      }),
      (db.lot.groupBy as any)({
        where: { ...where, year: { not: null } },
        by: ['year'],
        _count: { year: true },
        orderBy: { year: 'desc' } as any,
      }) as unknown as Promise<Array<{ year: number | null; _count: { year: number } }>>,
      db.lot.groupBy({
        where: { ...where, damageDescription: { not: null } },
        by: ['damageDescription'],
        _count: { damageDescription: true },
        orderBy: { _count: { damageDescription: 'desc' } },
        take: 20,
      }),
      db.lot.groupBy({
        where: { ...where, saleTitleType: { not: null } },
        by: ['saleTitleType'],
        _count: { saleTitleType: true },
        orderBy: { _count: { saleTitleType: 'desc' } },
      }),
      db.lot.groupBy({
        where: { ...where, fuelType: { not: null } },
        by: ['fuelType'],
        _count: { fuelType: true },
        orderBy: { _count: { fuelType: 'desc' } },
      }),
      db.lot.groupBy({
        where: { ...where, transmission: { not: null } },
        by: ['transmission'],
        _count: { transmission: true },
        orderBy: { _count: { transmission: 'desc' } },
      }),
      db.lot.groupBy({
        where: { ...where, drive: { not: null } },
        by: ['drive'],
        _count: { drive: true },
        orderBy: { _count: { drive: 'desc' } },
      }),
      db.lot.groupBy({
        where: { ...where, bodyStyle: { not: null } },
        by: ['bodyStyle'],
        _count: { bodyStyle: true },
        orderBy: { _count: { bodyStyle: 'desc' } },
        take: 30,
      }),
      db.lot.aggregate({
        where: { ...rangeFilter, year: { not: null } },
        _min: { year: true },
        _max: { year: true },
      }),
      db.lot.aggregate({
        where: { ...rangeFilter, odometer: { not: null } },
        _min: { odometer: true },
        _max: { odometer: true },
      }),
    ])

    const makes = makesResult as Array<{ make: string | null; _count: { make: number } }>
    const models = modelsResult as Array<{ modelGroup: string | null; _count: { modelGroup: number } }>
    const states = statesResult as Array<{ locationState: string | null; _count: { locationState: number } }>
    const years = yearsResult as Array<{ year: number | null; _count: { year: number } }>
    const damage = damageResult as Array<{ damageDescription: string | null; _count: { damageDescription: number } }>
    const titleTypes = titleTypesResult as Array<{ saleTitleType: string | null; _count: { saleTitleType: number } }>
    const fuelTypes = fuelTypesResult as Array<{ fuelType: string | null; _count: { fuelType: number } }>
    const transmissions = transmissionsResult as Array<{ transmission: string | null; _count: { transmission: number } }>
    const drives = drivesResult as Array<{ drive: string | null; _count: { drive: number } }>
    const bodyStyles = bodyStylesResult as Array<{ bodyStyle: string | null; _count: { bodyStyle: number } }>

    return NextResponse.json({
      success: true,
      data: {
        makes: makes.map((r): FacetItem => ({ value: r.make, count: r._count.make })),
        models: models.map((r): FacetItem => ({ value: r.modelGroup, count: r._count.modelGroup })),
        states: states.map((r): FacetItem => ({ value: r.locationState, count: r._count.locationState })),
        years: years.map((r): FacetItem => ({ value: r.year, count: r._count.year })),
        damage: damage.map((r): FacetItem => ({ value: r.damageDescription, count: r._count.damageDescription })),
        titleTypes: titleTypes.map((r): FacetItem => ({ value: r.saleTitleType, count: r._count.saleTitleType })),
        fuelTypes: fuelTypes.map((r): FacetItem => ({ value: r.fuelType, count: r._count.fuelType })),
        transmissions: transmissions.map((r): FacetItem => ({ value: r.transmission, count: r._count.transmission })),
        drives: drives.map((r): FacetItem => ({ value: r.drive, count: r._count.drive })),
        bodyStyles: bodyStyles.map((r): FacetItem => ({ value: r.bodyStyle, count: r._count.bodyStyle })),
        yearRange: {
          min: yearRangeResult._min.year,
          max: yearRangeResult._max.year,
        },
        odometerRange: {
          min: odometerRangeResult._min.odometer,
          max: odometerRangeResult._max.odometer,
        },
      },
    })
  } catch (error) {
    console.error('Search facets API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch facets' } },
      { status: 500 }
    )
  }
}
