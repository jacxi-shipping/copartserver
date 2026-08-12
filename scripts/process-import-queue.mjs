import fs from 'fs'
import os from 'os'
import path from 'path'

import Papa from 'papaparse'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const POLL_INTERVAL_MS = Math.max(Number.parseInt(process.env.IMPORT_WORKER_POLL_INTERVAL_MS ?? '5000', 10) || 5000, 1000)
const RUN_ONCE = process.env.IMPORT_WORKER_ONCE === 'true'
const UPSERT_BATCH_SIZE = 500
const AUCTION_UPSERT_COLUMNS = [
  'sourceId',
  'yardNumber',
  'yardName',
  'saleDate',
  'dayOfWeek',
  'saleTime',
  'timeZone',
  'itemNumber',
  'lotNumber',
  'vehicleType',
  'year',
  'make',
  'modelGroup',
  'modelDetail',
  'bodyStyle',
  'color',
  'damageDescription',
  'secondaryDamage',
  'saleTitleState',
  'saleTitleType',
  'hasKeys',
  'lotConditionCode',
  'vin',
  'odometer',
  'odometerBrand',
  'estimatedRetailValue',
  'repairCost',
  'engine',
  'drive',
  'transmission',
  'fuelType',
  'cylinders',
  'runsDrives',
  'saleStatus',
  'highBid',
  'specialNote',
  'locationCity',
  'locationState',
  'locationZip',
  'locationCountry',
  'currencyCode',
  'imageThumbnail',
  'createDatetime',
  'gridRow',
  'makeOfferEligible',
  'buyItNowPrice',
  'imageUrl',
  'trim',
  'lastUpdatedTime',
  'rentals',
  'wholesale',
  'sellerName',
  'offsiteAddress1',
  'offsiteState',
  'offsiteCity',
  'offsiteZip',
  'saleLight',
  'autograde',
  'announcements',
  'searchText',
  'sourceFile',
  'sourceImportJobId',
  'rawData',
  'extraData',
]

const BULK_INSERT_COLUMNS_SQL = `${AUCTION_UPSERT_COLUMNS.map((column) => `"${column}"`).join(', ')}, "createdAt", "updatedAt"`
const BULK_SELECT_COLUMNS_SQL = `${AUCTION_UPSERT_COLUMNS.map((column) => `source."${column}"`).join(', ')}, NOW(), NOW()`
const BULK_UPDATE_COLUMNS_SQL = [
  ...AUCTION_UPSERT_COLUMNS.filter((column) => column !== 'lotNumber').map((column) => `"${column}" = EXCLUDED."${column}"`),
  '"updatedAt" = NOW()',
].join(', ')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseSaleDate(value) {
  if (!value || value.trim() === '' || value.trim() === '0') return null
  const cleaned = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
  }
  const mdyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch) {
    const month = mdyMatch[1].padStart(2, '0')
    const day = mdyMatch[2].padStart(2, '0')
    return `${mdyMatch[3]}-${month}-${day}`
  }
  return null
}

function parseSaleTime(value) {
  if (!value || value.trim() === '') return null
  const cleaned = value.trim()
  if (/^\d{3,4}$/.test(cleaned)) {
    const padded = cleaned.padStart(4, '0')
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`
  }
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return cleaned
  return null
}

function parseBoolean(value) {
  if (!value || value.trim() === '') return null
  const cleaned = value.trim().toUpperCase()
  if (['YES', 'Y', 'TRUE', '1'].includes(cleaned)) return true
  if (['NO', 'N', 'FALSE', '0'].includes(cleaned)) return false
  return null
}

function inventoryImageUrl(lotNumber, locationCountry) {
  const country = String(locationCountry ?? '').trim().toLowerCase()
  const countryCode = country === 'canada' || country === 'ca' ? 'ca' : 'us'
  return `https://inventoryv2.copart.io/v1/lotImages/${lotNumber}?country=${countryCode}&brand=cprt`
}

function normalizeImageUrl(value, lotNumber, locationCountry) {
  const source = value?.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$2').trim()
  if (!source) return lotNumber ? inventoryImageUrl(lotNumber, locationCountry) : null

  const absoluteUrl = /^https?:\/\//i.test(source) ? source : `https://${source}`
  if (/inventoryv2\.copart\.io\/v1\/lotImages/i.test(absoluteUrl)) return absoluteUrl
  if (lotNumber && /(?:^|\.)copart\.com\//i.test(absoluteUrl)) {
    return inventoryImageUrl(lotNumber, locationCountry)
  }
  return absoluteUrl
}

function parseNumeric(value) {
  if (!value || value.trim() === '') return null
  const cleaned = value.replace(/[$,]/g, '').trim()
  const parsed = parseFloat(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

function parseIntValue(value) {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.trim(), 10)
  return Number.isNaN(parsed) ? null : parsed
}

const COLUMN_MAP = {
  Id: 'sourceId',
  'Yard Number': 'yardNumber',
  'Yard Name': 'yardName',
  'Sale Date M/D/CY': 'saleDate',
  'Day of Week': 'dayOfWeek',
  'Sale time (HHMM)': 'saleTime',
  'Time Zone': 'timeZone',
  'Item Number': 'itemNumber',
  'Lot number': 'lotNumber',
  'Vehicle Type': 'vehicleType',
  Year: 'year',
  Make: 'make',
  'Model Group': 'modelGroup',
  'Model Detail': 'modelDetail',
  'Body Style': 'bodyStyle',
  Color: 'color',
  'Damage Description': 'damageDescription',
  'Secondary Damage': 'secondaryDamage',
  'Sale Title State': 'saleTitleState',
  'Sale Title Type': 'saleTitleType',
  'Has Keys': 'hasKeys',
  'Lot Condition Code': 'lotConditionCode',
  VIN: 'vin',
  Odometer: 'odometer',
  'Odometer Brand': 'odometerBrand',
  'Estimated Retail Value': 'estimatedRetailValue',
  'Repair cost': 'repairCost',
  Engine: 'engine',
  Drive: 'drive',
  Transmission: 'transmission',
  'Fuel Type': 'fuelType',
  Cylinders: 'cylinders',
  'Runs/Drives': 'runsDrives',
  'Sale Status': 'saleStatus',
  'High Bid =non-vix,Sealed=Vix': 'highBid',
  'Special Note': 'specialNote',
  'Location city': 'locationCity',
  'Location state': 'locationState',
  'Location ZIP': 'locationZip',
  'Location country': 'locationCountry',
  'Currency Code': 'currencyCode',
  'Image Thumbnail': 'imageThumbnail',
  'Create Date/Time': 'createDatetime',
  'Grid/Row': 'gridRow',
  'Make-an-Offer Eligible': 'makeOfferEligible',
  'Buy-It-Now Price': 'buyItNowPrice',
  'Image URL': 'imageUrl',
  Trim: 'trim',
  'Last Updated Time': 'lastUpdatedTime',
  Rentals: 'rentals',
  Wholesale: 'wholesale',
  'Seller Name': 'sellerName',
  OffsiteAddress1: 'offsiteAddress1',
  'Offsite Address1': 'offsiteAddress1',
  'Offsite State': 'offsiteState',
  'Offsite City': 'offsiteCity',
  'Offsite Zip': 'offsiteZip',
  'Sale Light': 'saleLight',
  AutoGrade: 'autograde',
  Announcements: 'announcements',
}

function normalizeHeader(header) {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function getDbField(header) {
  if (COLUMN_MAP[header]) return COLUMN_MAP[header]
  const normalized = normalizeHeader(header)
  for (const [csvHeader, dbField] of Object.entries(COLUMN_MAP)) {
    if (normalizeHeader(csvHeader) === normalized) return dbField
  }
  return null
}

function buildHeaderMap(headers) {
  const map = new Map()
  for (const header of headers) {
    const normalized = normalizeHeader(header)
    if (!map.has(normalized)) {
      map.set(normalized, header)
    }
  }
  return map
}

function buildSearchText(row) {
  const searchableFields = [
    'make', 'modelGroup', 'modelDetail', 'trim', 'bodyStyle', 'vehicleType',
    'color', 'damageDescription', 'secondaryDamage', 'engine', 'drive',
    'transmission', 'fuelType', 'runsDrives', 'saleStatus', 'locationCity',
    'locationState', 'yardName', 'sellerName', 'vin',
  ]
  const parts = []
  for (const field of searchableFields) {
    const val = row[field]
    if (val && typeof val === 'string' && val.trim()) {
      parts.push(val.trim().toLowerCase())
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function mapRow(rawRow, headerMap, jobId, filePath) {
  const mappedRow = {}
  const rawJson = JSON.stringify(rawRow)

  for (const [, originalHeader] of headerMap.entries()) {
    const dbField = getDbField(originalHeader)
    if (!dbField) continue
    const value = rawRow[originalHeader]
    if (value === undefined || value === null || value === '') continue

    switch (dbField) {
      case 'saleDate':
        mappedRow.saleDate = parseSaleDate(value)
        break
      case 'saleTime':
        mappedRow.saleTime = parseSaleTime(value)
        break
      case 'hasKeys':
      case 'makeOfferEligible':
      case 'rentals':
      case 'wholesale':
        mappedRow[dbField] = parseBoolean(value)
        break
      case 'lotNumber':
      case 'year':
      case 'yardNumber':
      case 'cylinders':
        mappedRow[dbField] = parseIntValue(value)
        break
      case 'odometer':
      case 'estimatedRetailValue':
      case 'repairCost':
      case 'highBid':
      case 'buyItNowPrice':
        mappedRow[dbField] = parseNumeric(value)
        break
      case 'lastUpdatedTime':
      case 'createDatetime': {
        const dateValue = new Date(value)
        if (!Number.isNaN(dateValue.getTime())) mappedRow[dbField] = dateValue
        break
      }
      default:
        mappedRow[dbField] = value.trim() || null
    }
  }

  const lotNumber = mappedRow.lotNumber
  if (!lotNumber) return null

  mappedRow.imageUrl = normalizeImageUrl(rawRow[headerMap.get('image_url') ?? ''], lotNumber, mappedRow.locationCountry)
  mappedRow.imageThumbnail = normalizeImageUrl(rawRow[headerMap.get('image_thumbnail') ?? ''], lotNumber, mappedRow.locationCountry)

  mappedRow.searchText = buildSearchText(mappedRow)
  mappedRow.sourceFile = path.basename(filePath)
  mappedRow.sourceImportJobId = jobId
  mappedRow.rawData = rawJson

  return mappedRow
}

function shouldReplaceIncomingRow(currentRow, nextRow) {
  const currentTime = currentRow.lastUpdatedTime ?? null
  const nextTime = nextRow.lastUpdatedTime ?? null

  return Boolean(nextTime && (!currentTime || nextTime > currentTime))
}

function deduplicateRows(rows) {
  const newestByLot = new Map()
  let skippedRows = 0

  for (const row of rows) {
    const lotNumber = row.lotNumber
    const existing = newestByLot.get(lotNumber)

    if (!existing) {
      newestByLot.set(lotNumber, row)
      continue
    }

    if (shouldReplaceIncomingRow(existing, row)) {
      newestByLot.set(lotNumber, row)
    }

    skippedRows++
  }

  return {
    rows: [...newestByLot.values()],
    skippedRows,
  }
}

function auctionData(mappedRow) {
  const { yardNumber, yardName, saleDate, saleTime, timeZone, lotNumber } = mappedRow
  const saleKey = saleDate
    ? `${yardNumber ?? 'unknown'}:${saleDate}:${saleTime ?? 'unknown'}:${timeZone ?? 'unknown'}`
    : `unscheduled:${yardNumber ?? 'unknown'}:${timeZone ?? 'unknown'}`

  return { saleKey, yardNumber: yardNumber ?? null, yardName: yardName ?? null, saleDate: saleDate ?? null, saleTime: saleTime ?? null, timeZone: timeZone ?? null }
}

function shouldWriteLot(existingLastUpdatedTime, incomingLastUpdatedTime) {
  if (!incomingLastUpdatedTime) return false
  return !existingLastUpdatedTime || incomingLastUpdatedTime > existingLastUpdatedTime
}

async function applyRowMutation(client, mappedRow, result) {
  const lotNumber = mappedRow.lotNumber
  const parent = auctionData(mappedRow)
  const auction = await client.auction.upsert({
    where: { saleKey: parent.saleKey },
    create: parent,
    update: parent,
  })
  const existing = await client.lot.findUnique({
    where: { lotNumber },
    select: { lotNumber: true, lastUpdatedTime: true },
  })

  const incomingTime = mappedRow.lastUpdatedTime ?? null
  const lotData = { ...mappedRow, auctionId: auction.id }

  if (existing) {
    if (shouldWriteLot(existing.lastUpdatedTime, incomingTime)) {
      await client.lot.update({ where: { lotNumber }, data: lotData })
      result.updatedRows++
    } else {
      result.skippedRows++
    }
  } else {
    await client.lot.create({ data: lotData })
    result.insertedRows++
  }

  result.processedRows++
}

async function bulkUpsertRows(rows, result) {
  for (let start = 0; start < rows.length; start += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(start, start + UPSERT_BATCH_SIZE)
    const batchResult = { processedRows: 0, insertedRows: 0, updatedRows: 0, skippedRows: 0 }
    await db.$transaction(async (tx) => {
      for (const row of batch) await applyRowMutation(tx, row, batchResult)
    })
    result.processedRows += batchResult.processedRows
    result.insertedRows += batchResult.insertedRows
    result.updatedRows += batchResult.updatedRows
    result.skippedRows += batchResult.skippedRows
  }
}

async function flushBatch(rows, result, onProgress) {
  if (rows.length === 0) return
  const { rows: deduplicatedRows, skippedRows: duplicateSkips } = deduplicateRows(rows)
  result.skippedRows += duplicateSkips

  try {
    await bulkUpsertRows(deduplicatedRows, result)
  } catch (batchErr) {
    const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr)
    console.error(`Bulk upsert failed for ${deduplicatedRows.length} rows (${errMsg}), falling back to individual row processing...`)

    for (const mappedRow of deduplicatedRows) {
      try {
        await applyRowMutation(db, mappedRow, result)
      } catch (rowErr) {
        result.failedRows++
        const rowErrMsg = rowErr instanceof Error ? rowErr.message : String(rowErr)
        console.error(`Row lotNumber=${mappedRow.lotNumber} failed: ${rowErrMsg}`)
      }
    }
  }

  if (onProgress) {
    await onProgress({
      processedRows: result.processedRows,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      skippedRows: result.skippedRows,
      failedRows: result.failedRows,
    })
  }
}

async function processCSV(filePath, jobId, onProgress) {
  const result = {
    totalRows: 0,
    processedRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    failedRows: 0,
    errorMessage: undefined,
  }

  try {
    const csvText = fs.readFileSync(filePath, 'utf-8')
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    const fatalErrors = parsed.errors.filter((error) => error.type !== 'FieldMismatch')

    if (fatalErrors.length > 0) {
      result.errorMessage = fatalErrors[0]?.message || 'Parse error'
      return result
    }

    const headerMap = buildHeaderMap(parsed.meta.fields ?? [])
    let currentBatch = []

    for (const rawRow of parsed.data) {
      result.totalRows++
      try {
        const mapped = mapRow(rawRow, headerMap, jobId, filePath)
        if (mapped) currentBatch.push(mapped)
        else result.skippedRows++
      } catch {
        result.failedRows++
      }

      if (currentBatch.length >= 100) {
        await flushBatch(currentBatch, result, onProgress)
        currentBatch = []
      }
    }

    if (currentBatch.length > 0) {
      await flushBatch(currentBatch, result, onProgress)
    }

    return result
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : 'Parse error'
    return result
  }
}

async function downloadToTempFile(url, jobId) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download uploaded CSV: ${response.status}`)
  }

  const tempPath = path.join(os.tmpdir(), `${jobId}.csv`)
  const fileBuffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(tempPath, fileBuffer)
  return tempPath
}

async function processJob(jobId) {
  const job = await db.importJob.findUnique({ where: { id: jobId } })

  if (!job) throw new Error(`Import job ${jobId} not found`)
  if (!job.storageUrl) throw new Error(`Import job ${jobId} has no storageUrl`)

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: job.startedAt ?? new Date(),
      errorMessage: null,
    },
  })

  const tempPath = await downloadToTempFile(job.storageUrl, job.id)

  try {
    const result = await processCSV(tempPath, job.id, async (progress) => {
      await db.importJob.update({
        where: { id: job.id },
        data: {
          processedRows: progress.processedRows,
          insertedRows: progress.insertedRows,
          updatedRows: progress.updatedRows,
          skippedRows: progress.skippedRows,
          failedRows: progress.failedRows,
        },
      })
    })

    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: result.errorMessage ? 'failed' : 'completed',
        completedAt: new Date(),
        totalRows: result.totalRows,
        processedRows: result.processedRows,
        insertedRows: result.insertedRows,
        updatedRows: result.updatedRows,
        skippedRows: result.skippedRows,
        failedRows: result.failedRows,
        errorMessage: result.errorMessage ?? null,
      },
    })
  } catch (error) {
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      },
    })
    throw error
  } finally {
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // ignore temp cleanup failures
    }
  }
}

async function claimNextJob() {
  const [job] = await db.importJob.findMany({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  if (!job) return null

  const claim = await db.importJob.updateMany({
    where: { id: job.id, status: 'queued' },
    data: {
      status: 'processing',
      startedAt: job.startedAt ?? new Date(),
      errorMessage: null,
      completedAt: null,
    },
  })

  if (claim.count === 0) {
    return null
  }

  return job
}

async function main() {
  console.log(RUN_ONCE ? 'Import worker processing one queued job' : `Import worker polling every ${POLL_INTERVAL_MS}ms`)

  while (true) {
    try {
      const job = await claimNextJob()

      if (!job) {
        if (RUN_ONCE) return
        console.log('No queued import jobs found; waiting for work')
        await sleep(POLL_INTERVAL_MS)
        continue
      }

      console.log(`Processing import job ${job.id} (${job.filename})`)
      await processJob(job.id)
      console.log(`Finished import job ${job.id}`)
      if (RUN_ONCE) return
    } catch (error) {
      console.error('Import worker loop error:', error)
      await sleep(POLL_INTERVAL_MS)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })