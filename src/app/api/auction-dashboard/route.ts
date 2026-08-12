import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { buildPagination, parsePagination } from '@/lib/query-builder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const { page, pageSize, skip } = parsePagination(searchParams)
    const query = searchParams.get('q')?.trim()
    const saleDate = searchParams.get('saleDate')?.trim()
    const numericYard = query && /^\d+$/.test(query) ? Number(query) : undefined
    const where: Prisma.AuctionWhereInput = {
      ...(saleDate ? { saleDate } : {}),
      ...(query ? { OR: [{ yardName: { contains: query, mode: 'insensitive' } }, ...(numericYard === undefined ? [] : [{ yardNumber: numericYard }])] } : {}),
    }

    const [auctions, total] = await Promise.all([
      db.auction.findMany({
        where,
        select: {
          id: true, saleKey: true, yardNumber: true, yardName: true,
          saleDate: true, saleTime: true, timeZone: true,
          _count: { select: { lots: true } },
        },
        orderBy: [{ saleDate: 'asc' }, { saleTime: 'asc' }, { yardNumber: 'asc' }],
        skip,
        take: pageSize,
      }),
      db.auction.count({ where }),
    ])

    return NextResponse.json({ success: true, pagination: buildPagination(page, pageSize, total), data: auctions })
  } catch (error) {
    console.error('Auction dashboard API error:', error)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load auctions' } }, { status: 500 })
  }
}