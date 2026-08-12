import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const make = searchParams.get('make')
    const bodyStyle = searchParams.get('bodyStyle')
    const excludeId = searchParams.get('excludeId')
    const limit = parseInt(searchParams.get('limit') ?? '4', 10)

    if (!make && !bodyStyle) {
      return NextResponse.json(
        { success: false, error: 'At least make or bodyStyle is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}

    if (make) {
      where.make = make
    }
    if (bodyStyle) {
      where.bodyStyle = bodyStyle
    }
    if (excludeId) {
      where.id = { not: parseInt(excludeId, 10) }
    }

    const vehicles = await db.auction.findMany({
      where,
      select: {
        id: true,
        lotNumber: true,
        year: true,
        make: true,
        modelGroup: true,
        modelDetail: true,
        bodyStyle: true,
        color: true,
        locationCity: true,
        locationState: true,
        estimatedRetailValue: true,
        saleDate: true,
        imageUrl: true,
        damageDescription: true,
      },
      orderBy: { estimatedRetailValue: 'desc' },
      take: Math.min(limit, 8),
    })

    return NextResponse.json({ success: true, data: vehicles })
  } catch (error) {
    console.error('Similar vehicles API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch similar vehicles' },
      { status: 500 }
    )
  }
}
