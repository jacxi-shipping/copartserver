import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_IDS', message: 'Query parameter ?ids=1,2,3 is required' } },
        { status: 400 }
      )
    }

    const ids = idsParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_IDS', message: 'No valid IDs provided' } },
        { status: 400 }
      )
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_IDS', message: 'Maximum 50 IDs per request' } },
        { status: 400 }
      )
    }

    const auctions = await db.lot.findMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ success: true, data: auctions })
  } catch (error) {
    console.error('Batch auctions API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch auctions' } },
      { status: 500 }
    )
  }
}
