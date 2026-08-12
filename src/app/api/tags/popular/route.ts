import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const popular = await db.lotTag.groupBy({
      by: ['tag', 'color'],
      _count: { tag: true },
      orderBy: { _count: { tag: 'desc' } },
      take: 20,
    })

    const data = popular.map((item) => ({
      tag: item.tag,
      color: item.color,
      count: item._count.tag,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Popular tags API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch popular tags' } },
      { status: 500 }
    )
  }
}
