import { NextResponse } from 'next/server'

const COPART_API_URL = process.env.COPART_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function GET() {
  try {
    const response = await fetch(`${COPART_API_URL}/stats`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`FastAPI stats request failed: ${response.status}`)
    const payload = await response.json()
    const stats = payload.data

    return NextResponse.json({
      success: true,
      data: {
        totalAuctions: stats.total_auctions,
        upcomingAuctions: stats.upcoming_auctions,
        todayAuctions: stats.today_auctions,
        uniqueMakes: stats.unique_makes,
        uniqueStates: stats.unique_states,
        uniqueYards: stats.unique_yards,
        lastImport: stats.last_import,
        lastUpdate: stats.last_update,
        pastAuctions: stats.past_auctions,
        unscheduledAuctions: stats.unscheduled_auctions,
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 }
    )
  }
}
