import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'

import { summarizeMarketOverview } from '../../src/lib/analytics-helpers.ts'
import {
  getImportChunkMetaPath,
  getImportChunkPath,
  getImportPreviewPath,
  getImportStoragePaths,
  getImportUploadPath,
  isCsvFilename,
  isValidUploadId,
} from '../../src/lib/import-storage.ts'
import { getDbField, getMissingRequiredFields } from '../../src/lib/import-schema.ts'
import { buildTextSearchWhere, buildUpcomingSaleDateWhere } from '../../src/lib/search-helpers.ts'

test('import storage paths default to workspace data directory', () => {
  const paths = getImportStoragePaths('')

  assert.equal(paths.dataDir, path.join(process.cwd(), 'data'))
  assert.equal(paths.chunksDir, path.join(process.cwd(), 'data', 'chunks'))
  assert.equal(getImportUploadPath('job_1', ''), path.join(process.cwd(), 'data', 'job_1_upload.csv'))
  assert.equal(getImportPreviewPath('preview.csv', ''), path.join(process.cwd(), 'data', 'preview.csv'))
})

test('import storage paths honor explicit base directory', () => {
  const paths = getImportStoragePaths('D:/custom-data')

  assert.equal(paths.dataDir, path.resolve('D:/custom-data'))
  assert.equal(getImportChunkPath('upload_1', 2, 'D:/custom-data'), path.join(path.resolve('D:/custom-data'), 'chunks', 'upload_1_2.part'))
  assert.equal(getImportChunkMetaPath('upload_1', 'D:/custom-data'), path.join(path.resolve('D:/custom-data'), 'chunks', 'upload_1.meta.json'))
})

test('upload ids and filenames are validated conservatively', () => {
  assert.equal(isValidUploadId('upload_123-abc'), true)
  assert.equal(isValidUploadId('../escape'), false)
  assert.equal(isValidUploadId('bad space'), false)

  assert.equal(isCsvFilename('lots.csv'), true)
  assert.equal(isCsvFilename('LOTS.CSV'), true)
  assert.equal(isCsvFilename('lots.txt'), false)
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