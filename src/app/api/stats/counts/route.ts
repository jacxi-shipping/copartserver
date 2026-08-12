import { NextResponse } from 'next/server'

import { getSidebarCounts } from '@/lib/stats'

export async function GET() {
  try {
    const counts = await getSidebarCounts()

    return NextResponse.json({
      success: true,
      data: counts,
    })
  } catch (error) {
    console.error('Failed to fetch counts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch counts' },
      { status: 500 }
    )
  }
}
