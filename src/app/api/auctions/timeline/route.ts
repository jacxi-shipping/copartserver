import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Get all auctions with saleDate >= today
    const auctions = await db.lot.findMany({
      where: {
        saleDate: { gte: todayStr },
      },
      select: {
        saleDate: true,
        dayOfWeek: true,
        estimatedRetailValue: true,
        make: true,
      },
      orderBy: { saleDate: 'asc' },
    })

    // Group by saleDate
    const grouped = new Map<string, { count: number; totalValue: number; makes: Map<string, number> }>()

    for (const a of auctions) {
      if (!a.saleDate) continue
      const key = a.saleDate
      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, totalValue: 0, makes: new Map() })
      }
      const group = grouped.get(key)!
      group.count++
      group.totalValue += a.estimatedRetailValue ?? 0
      if (a.make) {
        group.makes.set(a.make, (group.makes.get(a.make) ?? 0) + 1)
      }
    }

    // Build response
    const data = Array.from(grouped.entries())
      .map(([date, info]) => {
        // Find top make
        let topMake: string | null = null
        let topCount = 0
        for (const [make, count] of info.makes) {
          if (count > topCount) {
            topCount = count
            topMake = make
          }
        }
        return {
          date,
          dayOfWeek: (() => {
            // Get day of week from the date string
            const parts = date.split('-').map(Number)
            if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
              const d = new Date(parts[0], parts[1] - 1, parts[2])
              const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
              return days[d.getDay()]
            }
            return '—'
          })(),
          count: info.count,
          totalValue: Math.round(info.totalValue),
          topMake,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Timeline API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch timeline data' }, { status: 500 })
  }
}
