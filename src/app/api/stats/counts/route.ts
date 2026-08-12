import { NextResponse } from 'next/server'

const COPART_API_URL = process.env.COPART_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function GET() {
  try {
    const [statsResponse, importsResponse] = await Promise.all([
      fetch(`${COPART_API_URL}/stats`, { cache: 'no-store' }),
      fetch(`${COPART_API_URL}/import?page=1&page_size=1`, { cache: 'no-store' }),
    ])
    if (!statsResponse.ok || !importsResponse.ok) throw new Error('FastAPI counts request failed')
    const [{ data: stats }, { pagination }] = await Promise.all([statsResponse.json(), importsResponse.json()])

    return NextResponse.json({
      success: true,
      data: {
        total: stats.total_auctions,
        upcoming: stats.upcoming_auctions,
        today: stats.today_auctions,
        imports: pagination.total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch counts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch counts' },
      { status: 500 }
    )
  }
}
