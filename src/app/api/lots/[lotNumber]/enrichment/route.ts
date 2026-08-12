import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateTitleRisk } from '@/lib/risk-helpers'

export async function GET(_request: Request, { params }: { params: Promise<{ lotNumber: string }> }) {
  const { lotNumber } = await params
  if (!/^\d+$/.test(lotNumber)) return NextResponse.json({ success: false, error: { code: 'INVALID_LOT_NUMBER', message: 'A numeric lot number is required' } }, { status: 400 })

  const lot = await db.lot.findUnique({ where: { lotNumber: Number(lotNumber) }, select: { vin: true, make: true, modelGroup: true, year: true, saleTitleType: true, saleTitleState: true, damageDescription: true, secondaryDamage: true, hasKeys: true } })
  if (!lot) return NextResponse.json({ success: false, error: { code: 'LOT_NOT_FOUND', message: 'Lot was not found' } }, { status: 404 })

  const risk = calculateTitleRisk(lot)
  if (!lot.vin || lot.vin.length !== 17) return NextResponse.json({ success: true, data: { vin: null, recalls: [], titleRisk: risk } })

  try {
    const [decodeResponse, recallResponse] = await Promise.all([
      fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${lot.vin}?format=json`, { next: { revalidate: 86400 } }),
      lot.make && lot.modelGroup && lot.year ? fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(lot.make)}&model=${encodeURIComponent(lot.modelGroup)}&modelYear=${lot.year}`, { next: { revalidate: 86400 } }) : Promise.resolve(null),
    ])
    const decoded = decodeResponse.ok ? await decodeResponse.json() : null
    const recalls = recallResponse?.ok ? await recallResponse.json() : null
    const vehicle = decoded?.Results?.[0]
    return NextResponse.json({ success: true, data: {
      vin: vehicle ? { make: vehicle.Make || null, model: vehicle.Model || null, modelYear: vehicle.ModelYear || null, bodyClass: vehicle.BodyClass || null, driveType: vehicle.DriveType || null, engine: vehicle.DisplacementL ? `${vehicle.DisplacementL}L` : null, errorCode: vehicle.ErrorCode || null } : null,
      recalls: (recalls?.results ?? []).slice(0, 10).map((recall: { Component?: string; Summary?: string; NHTSACampaignNumber?: string }) => ({ campaign: recall.NHTSACampaignNumber ?? null, component: recall.Component ?? null, summary: recall.Summary ?? null })),
      titleRisk: risk,
    } })
  } catch {
    return NextResponse.json({ success: true, data: { vin: null, recalls: [], titleRisk: risk } })
  }
}