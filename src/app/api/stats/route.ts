import { NextResponse } from 'next/server'

import { getDashboardStats } from '@/lib/stats'

export async function GET() {
  try {
    const stats = await getDashboardStats()

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 }
    )
  }
}
