import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const [total, upcoming, todayCount, imports] = await Promise.all([
      db.auction.count(),
      db.auction.count({
        where: { saleDate: { gt: today } },
      }),
      db.auction.count({
        where: { saleDate: today },
      }),
      db.importJob.count(),
    ])

    return NextResponse.json({
      success: true,
      data: { total, upcoming, today: todayCount, imports },
    })
  } catch (error) {
    console.error('Failed to fetch counts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch counts' },
      { status: 500 }
    )
  }
}
