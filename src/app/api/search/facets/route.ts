import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getTodayStr } from '@/lib/query-builder'
import { buildTextSearchWhere } from '@/lib/search-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim()
    const todayStr = getTodayStr()

    // Base filter: upcoming auctions only — use AND to avoid duplicate object keys
    const baseFilter: Prisma.AuctionWhereInput = {
      AND: [
        { saleDate: { not: null } },
        { saleDate: { not: '' } },
        { saleDate: { not: '0' } },
        { saleDate: { gte: todayStr } },
      ],
    }

    // If there's a search query, add it to the filter
    const where = q
      ? {
          AND: [
            baseFilter,
            buildTextSearchWhere(q),
          ],
        }
      : baseFilter

    // Use a simple base for range aggregates (no date filter, so we get full range)
    const rangeFilter: Prisma.AuctionWhereInput = {}

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
      db.auction.groupBy({
        where: { ...where, make: { not: null } },
        by: ['make'],
        _count: { make: true },
        orderBy: { _count: { make: 'desc' } },
        take: 50,
      }),
      db.auction.groupBy({
        where: { ...where, modelGroup: { not: null } },
        by: ['modelGroup'],
        _count: { modelGroup: true },
        orderBy: { _count: { modelGroup: 'desc' } },
        take: 50,
      }),
      db.auction.groupBy({
        where: { ...where, locationState: { not: null } },
        by: ['locationState'],
        _count: { locationState: true },
        orderBy: { _count: { locationState: 'desc' } },
      }),
      db.auction.groupBy({
        where: { ...where, year: { not: null } },
        by: ['year'],
        _count: { year: true },
        orderBy: { year: 'desc' } as any,
      }),
      db.auction.groupBy({
        where: { ...where, damageDescription: { not: null } },
        by: ['damageDescription'],
        _count: { damageDescription: true },
        orderBy: { _count: { damageDescription: 'desc' } },
        take: 20,
      }),
      db.auction.groupBy({
        where: { ...where, saleTitleType: { not: null } },
        by: ['saleTitleType'],
        _count: { saleTitleType: true },
        orderBy: { _count: { saleTitleType: 'desc' } },
      }),
      db.auction.groupBy({
        where: { ...where, fuelType: { not: null } },
        by: ['fuelType'],
        _count: { fuelType: true },
        orderBy: { _count: { fuelType: 'desc' } },
      }),
      db.auction.groupBy({
        where: { ...where, transmission: { not: null } },
        by: ['transmission'],
        _count: { transmission: true },
        orderBy: { _count: { transmission: 'desc' } },
      }),
      db.auction.groupBy({
        where: { ...where, drive: { not: null } },
        by: ['drive'],
        _count: { drive: true },
        orderBy: { _count: { drive: 'desc' } },
      }),
      db.auction.groupBy({
        where: { ...where, bodyStyle: { not: null } },
        by: ['bodyStyle'],
        _count: { bodyStyle: true },
        orderBy: { _count: { bodyStyle: 'desc' } },
        take: 30,
      }),
      db.auction.aggregate({
        where: { ...rangeFilter, year: { not: null } },
        _min: { year: true },
        _max: { year: true },
      }),
      db.auction.aggregate({
        where: { ...rangeFilter, odometer: { not: null } },
        _min: { odometer: true },
        _max: { odometer: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        makes: makesResult.map(r => ({ value: r.make, count: r._count.make })),
        models: modelsResult.map(r => ({ value: r.modelGroup, count: r._count.modelGroup })),
        states: statesResult.map(r => ({ value: r.locationState, count: r._count.locationState })),
        years: yearsResult.map(r => ({ value: r.year, count: r._count.year })),
        damage: damageResult.map(r => ({ value: r.damageDescription, count: r._count.damageDescription })),
        titleTypes: titleTypesResult.map(r => ({ value: r.saleTitleType, count: r._count.saleTitleType })),
        fuelTypes: fuelTypesResult.map(r => ({ value: r.fuelType, count: r._count.fuelType })),
        transmissions: transmissionsResult.map(r => ({ value: r.transmission, count: r._count.transmission })),
        drives: drivesResult.map(r => ({ value: r.drive, count: r._count.drive })),
        bodyStyles: bodyStylesResult.map(r => ({ value: r.bodyStyle, count: r._count.bodyStyle })),
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
