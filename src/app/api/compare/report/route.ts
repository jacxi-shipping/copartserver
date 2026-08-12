import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const COLUMNS = [
  ['lotNumber', 'Lot Number'], ['gridRow', 'Lane/Grid'], ['year', 'Year'], ['make', 'Make'], ['modelGroup', 'Model'], ['vin', 'VIN'],
  ['yardName', 'Auction Name'], ['yardNumber', 'Yard Number'], ['saleDate', 'Sale Date'], ['saleTime', 'Sale Time'], ['timeZone', 'Time Zone'],
  ['estimatedRetailValue', 'Est. Retail Value'], ['highBid', 'High Bid'], ['buyItNowPrice', 'Buy It Now'], ['repairCost', 'Repair Cost'],
  ['odometer', 'Odometer'], ['damageDescription', 'Damage'], ['saleStatus', 'Sale Status'], ['saleTitleType', 'Title Type'], ['runsDrives', 'Runs/Drives'], ['hasKeys', 'Has Keys'],
] as const

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('ids') ?? '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0)
  if (ids.length < 2 || ids.length > 3) return NextResponse.json({ success: false, error: { code: 'INVALID_COMPARE_IDS', message: 'Select two or three lots to create a report' } }, { status: 400 })

  const lots = await db.lot.findMany({
    where: { id: { in: ids } },
    include: { auction: { select: { yardName: true, yardNumber: true, saleDate: true, saleTime: true, timeZone: true } } },
  })
  const orderedLots = ids.map((id) => lots.find((lot) => lot.id === id)).filter(Boolean)
  if (orderedLots.length !== ids.length) return NextResponse.json({ success: false, error: { code: 'LOT_NOT_FOUND', message: 'One or more selected lots no longer exist' } }, { status: 404 })

  const data = orderedLots.map((lot) => ({ ...lot, ...lot!.auction, auction: undefined }))
  if (request.nextUrl.searchParams.get('format') === 'json') {
    return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename=lot-comparison.json' } })
  }
  const csv = [COLUMNS.map(([, label]) => label).join(','), ...data.map((lot) => COLUMNS.map(([key]) => escapeCsv(lot[key as keyof typeof lot])).join(','))].join('\n')
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=lot-comparison.csv' } })
}