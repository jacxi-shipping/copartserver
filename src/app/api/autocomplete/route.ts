import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTodayStr } from '@/lib/query-builder'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() || ''
    const todayStr = getTodayStr()

    const upcomingFilter: Prisma.AuctionWhereInput = {
      AND: [
        { saleDate: { not: null } },
        { saleDate: { not: '' } },
        { saleDate: { not: '0' } },
        { saleDate: { gte: todayStr } },
      ],
    }

    const buildWhere = (field: string | null): Prisma.AuctionWhereInput => {
      const conditions: Prisma.AuctionWhereInput[] = [upcomingFilter]
      if (field) {
        conditions.push({ [field]: { contains: q } } as any)
      }
      return conditions.length === 1 ? upcomingFilter : { AND: conditions }
    }

    const [makes, models, yards, cities, states] = await Promise.all([
      db.auction.findMany({
        where: buildWhere('make'),
        select: { make: true },
        distinct: ['make'],
        take: 10,
        orderBy: { make: 'asc' },
      }).then(r => r.map(item => item.make).filter(Boolean)),

      db.auction.findMany({
        where: buildWhere('modelGroup'),
        select: { modelGroup: true },
        distinct: ['modelGroup'],
        take: 10,
        orderBy: { modelGroup: 'asc' },
      }).then(r => r.map(item => item.modelGroup).filter(Boolean)),

      db.auction.findMany({
        where: buildWhere('yardName'),
        select: { yardName: true },
        distinct: ['yardName'],
        take: 10,
        orderBy: { yardName: 'asc' },
      }).then(r => r.map(item => item.yardName).filter(Boolean)),

      db.auction.findMany({
        where: buildWhere('locationCity'),
        select: { locationCity: true },
        distinct: ['locationCity'],
        take: 10,
        orderBy: { locationCity: 'asc' },
      }).then(r => r.map(item => item.locationCity).filter(Boolean)),

      db.auction.findMany({
        where: buildWhere('locationState'),
        select: { locationState: true },
        distinct: ['locationState'],
        take: 10,
        orderBy: { locationState: 'asc' },
      }).then(r => r.map(item => item.locationState).filter(Boolean)),
    ])

    return NextResponse.json({
      success: true,
      data: { makes, models, yards, cities, states },
    })
  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Autocomplete failed' } },
      { status: 500 }
    )
  }
}
