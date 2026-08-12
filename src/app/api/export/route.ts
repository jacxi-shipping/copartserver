import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildAuctionFilters } from '@/lib/query-builder'

const CSV_COLUMNS = [
  { key: 'lotNumber', label: 'Lot Number' },
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'modelGroup', label: 'Model' },
  { key: 'vin', label: 'VIN' },
  { key: 'saleDate', label: 'Sale Date' },
  { key: 'saleTime', label: 'Sale Time' },
  { key: 'timeZone', label: 'Time Zone' },
  { key: 'saleStatus', label: 'Status' },
  { key: 'bodyStyle', label: 'Body Style' },
  { key: 'color', label: 'Color' },
  { key: 'damageDescription', label: 'Damage' },
  { key: 'locationCity', label: 'Location City' },
  { key: 'locationState', label: 'Location State' },
  { key: 'odometer', label: 'Odometer' },
  { key: 'estimatedRetailValue', label: 'Est. Retail Value' },
  { key: 'repairCost', label: 'Repair Cost' },
  { key: 'highBid', label: 'High Bid' },
  { key: 'engine', label: 'Engine' },
  { key: 'drive', label: 'Drive' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'fuelType', label: 'Fuel Type' },
  { key: 'cylinders', label: 'Cylinders' },
  { key: 'runsDrives', label: 'Runs/Drives' },
  { key: 'hasKeys', label: 'Has Keys' },
  { key: 'saleTitleState', label: 'Title State' },
  { key: 'saleTitleType', label: 'Title Type' },
] as const

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Support bulk export by IDs (comma-separated)
    const idsParam = searchParams.get('ids')
    const { where: filterWhere, sort } = buildAuctionFilters(searchParams)
    let where = filterWhere
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter((n) => !isNaN(n))
      if (ids.length > 0) {
        where = { id: { in: ids } }
      }
    }

    // Fetch all matching auctions for export (no pagination)
    const auctions = await db.lot.findMany({
      where,
      orderBy: (() => {
        const [field, dir] = (sort || 'saleDate_asc').split('_')
        const direction = dir === 'desc' ? 'desc' : 'asc'
        // Map field names to DB fields
        const fieldMap: Record<string, string> = {
          saleDate: 'saleDate',
          year: 'year',
          price: 'estimatedRetailValue',
          odometer: 'odometer',
          lotNumber: 'lotNumber',
          updated: 'updatedAt',
        }
        const dbField = fieldMap[field] || field
        return { [dbField]: direction }
      })(),
      take: 5000, // Safety limit for export
    })

    const format = searchParams.get('format') || 'csv'

    if (format === 'json') {
      const json = JSON.stringify(auctions, null, 2)
      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename=lots_export.json',
        },
      })
    }

    // Build CSV
    const header = CSV_COLUMNS.map((col) => col.label).join(',')
    const rows = auctions.map((auction) =>
      CSV_COLUMNS.map((col) => {
        const val = auction[col.key as keyof typeof auction]
        if (val === null || val === undefined) return ''
        return escapeCSV(val)
      }).join(',')
    )

    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=lots_export.csv',
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export lots' } },
      { status: 500 }
    )
  }
}
