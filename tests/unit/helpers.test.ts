import test from 'node:test'
import assert from 'node:assert/strict'

import { summarizeMarketOverview } from '../../src/lib/analytics-helpers.ts'
import { isCsvFilename } from '../../src/lib/import-validation.ts'
import { getDbField, getMissingRequiredFields } from '../../src/lib/import-schema.ts'
import { buildTextSearchWhere, buildUpcomingSaleDateWhere } from '../../src/lib/search-helpers.ts'
import { formatSaleTime } from '../../src/lib/format.ts'

test('CSV filenames are validated conservatively', () => {
  assert.equal(isCsvFilename('lots.csv'), true)
  assert.equal(isCsvFilename('LOTS.CSV'), true)
  assert.equal(isCsvFilename('lots.txt'), false)
})

test('sale times support normalized and compact CSV forms', () => {
  assert.equal(formatSaleTime('11:00'), '11:00 AM')
  assert.equal(formatSaleTime('1200'), '12:00 PM')
})

test('import schema resolves mapped fields and required headers by db field name', () => {
  assert.equal(getDbField('Sale Date M/D/CY'), 'saleDate')
  assert.equal(getDbField('Location state'), 'locationState')
  assert.equal(getDbField('Unknown Header'), null)

  const missing = getMissingRequiredFields([
    'Lot number',
    'Sale Date M/D/CY',
    'Sale time (HHMM)',
    'Time Zone',
    'Year',
    'Make',
    'Model Group',
    'Model Detail',
    'VIN',
    'Sale Status',
    'Location state',
  ])

  assert.deepEqual(missing, [])

  assert.deepEqual(getMissingRequiredFields(['Lot number']), [])
})

test('search helpers build stable where clauses', () => {
  assert.deepEqual(buildTextSearchWhere('toyota'), {
    OR: [
      { make: { contains: 'toyota' } },
      { modelGroup: { contains: 'toyota' } },
      { modelDetail: { contains: 'toyota' } },
      { trim: { contains: 'toyota' } },
      { bodyStyle: { contains: 'toyota' } },
      { vehicleType: { contains: 'toyota' } },
      { color: { contains: 'toyota' } },
      { damageDescription: { contains: 'toyota' } },
      { secondaryDamage: { contains: 'toyota' } },
      { engine: { contains: 'toyota' } },
      { drive: { contains: 'toyota' } },
      { transmission: { contains: 'toyota' } },
      { fuelType: { contains: 'toyota' } },
      { runsDrives: { contains: 'toyota' } },
      { saleStatus: { contains: 'toyota' } },
      { locationCity: { contains: 'toyota' } },
      { locationState: { contains: 'toyota' } },
      { yardName: { contains: 'toyota' } },
      { sellerName: { contains: 'toyota' } },
      { vin: { contains: 'toyota' } },
    ],
  })

  assert.deepEqual(buildUpcomingSaleDateWhere('2026-08-12', false), {
    AND: [
      { saleDate: { not: null } },
      { saleDate: { not: '' } },
      { saleDate: { not: '0' } },
      { saleDate: { gte: '2026-08-12' } },
    ],
  })
})

test('analytics helper summarizes distributions and averages', () => {
  const summary = summarizeMarketOverview(
    [
      { estimatedRetailValue: 4000, highBid: 2000, repairCost: 500, damageDescription: 'Front End' },
      { estimatedRetailValue: 7500, highBid: 3000, repairCost: 1000, damageDescription: 'Rear End' },
      { estimatedRetailValue: null, highBid: null, repairCost: null, damageDescription: null },
      { estimatedRetailValue: 125000, highBid: 60000, repairCost: 4500, damageDescription: 'Front End' },
    ],
    [
      { damageDescription: 'Front End', _count: { damageDescription: 2 } },
      { damageDescription: 'Rear End', _count: { damageDescription: 1 } },
      { damageDescription: '', _count: { damageDescription: 4 } },
    ]
  )

  assert.equal(summary.totalLots, 4)
  assert.equal(summary.priceDistribution[0].count, 2)
  assert.equal(summary.priceDistribution[5].count, 1)
  assert.equal(summary.avgRetailValue, (4000 + 7500 + 125000) / 3)
  assert.equal(summary.avgHighBid, (2000 + 3000 + 60000) / 3)
  assert.equal(summary.avgRepairCost, (500 + 1000 + 4500) / 3)
  assert.equal(summary.totalEstimatedValue, 136500)
  assert.equal(summary.damageTypeDistribution.length, 2)
})