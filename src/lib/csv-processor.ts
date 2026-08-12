import Papa from 'papaparse'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { buildHeaderMap, getDbField, getMissingRequiredFields } from '@/lib/import-schema'

function parseSaleDate(value: string | undefined | null): string | null {
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

function parseSaleTime(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.trim()
  if (/^\d{3,4}$/.test(cleaned)) {
    const padded = cleaned.padStart(4, '0')
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`
  }
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return cleaned
  return null
}

function parseBoolean(value: string | undefined | null): boolean | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.trim().toUpperCase()
  if (['YES', 'Y', 'TRUE', '1'].includes(cleaned)) return true
  if (['NO', 'N', 'FALSE', '0'].includes(cleaned)) return false
  return null
}

function inventoryImageUrl(lotNumber: number, locationCountry: unknown): string {
  const country = String(locationCountry ?? '').trim().toLowerCase()
  const countryCode = country === 'canada' || country === 'ca' ? 'ca' : 'us'
  return `https://inventoryv2.copart.io/v1/lotImages/${lotNumber}?country=${countryCode}&brand=cprt`
}

function normalizeImageUrl(value: string | undefined | null, lotNumber: number | null, locationCountry: unknown): string | null {
  const source = value?.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$2').trim()
  if (!source) return lotNumber ? inventoryImageUrl(lotNumber, locationCountry) : null

  const absoluteUrl = /^https?:\/\//i.test(source) ? source : `https://${source}`
  if (/inventoryv2\.copart\.io\/v1\/lotImages/i.test(absoluteUrl)) return absoluteUrl
  if (lotNumber && /(?:^|\.)copart\.com\//i.test(absoluteUrl)) {
    return inventoryImageUrl(lotNumber, locationCountry)
  }
  return absoluteUrl
}

function parseNumeric(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.replace(/[$,]/g, '').trim()
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

function parseIntValue(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.trim()
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

function buildSearchText(row: Record<string, unknown>): string {
  const searchableFields = [
    'make', 'modelGroup', 'modelDetail', 'trim', 'bodyStyle', 'vehicleType',
    'color', 'damageDescription', 'secondaryDamage', 'engine', 'drive',
    'transmission', 'fuelType', 'runsDrives', 'saleStatus', 'locationCity',
    'locationState', 'yardName', 'sellerName', 'vin',
  ]
  const parts: string[] = []
  for (const field of searchableFields) {
    const val = row[field]
    if (val && typeof val === 'string' && val.trim()) {
      parts.push(val.trim().toLowerCase())
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export interface ProcessResult {
  totalRows: number
  processedRows: number
  insertedRows: number
  updatedRows: number
  skippedRows: number
  failedRows: number
  errorMessage?: string
}

export interface PreviewResult {
  detectedColumns: string[]
  missingColumns: string[]
  unknownColumns: string[]
  sampleRows: Record<string, string | null>[]
  estimatedRowCount: number
  dateRange: { min: string | null; max: string | null }
  makeCount: number
  stateCount: number
  unscheduledCount: number
  validationErrors: string[]
}

/**
 * Map a raw CSV row to a DB-ready record.
 * Returns null if the row should be skipped (no lot number).
 */
function mapRow(rawRow: Record<string, string>, headerMap: Map<string, string>, jobId: string, filePath: string): Record<string, unknown> | null {
  const mappedRow: Record<string, unknown> = {}
  const rawJson = JSON.stringify(rawRow)

  for (const [_norm, originalHeader] of headerMap.entries()) {
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
        const d = new Date(value)
        if (!isNaN(d.getTime())) {
          mappedRow[dbField] = d
        }
        break
      }
      default:
        mappedRow[dbField] = value.trim() || null
    }
  }

  const lotNumber = mappedRow.lotNumber as number | undefined
  if (!lotNumber) return null

  mappedRow.imageUrl = normalizeImageUrl(rawRow[headerMap.get('image_url') ?? ''], lotNumber, mappedRow.locationCountry)
  mappedRow.imageThumbnail = normalizeImageUrl(rawRow[headerMap.get('image_thumbnail') ?? ''], lotNumber, mappedRow.locationCountry)

  mappedRow.searchText = buildSearchText(mappedRow)
  mappedRow.sourceFile = path.basename(filePath)
  mappedRow.sourceImportJobId = jobId
  mappedRow.rawData = rawJson

  return mappedRow
}

function auctionData(mappedRow: Record<string, unknown>): Prisma.AuctionUncheckedCreateInput {
  const yardNumber = mappedRow.yardNumber as number | null | undefined
  const saleDate = mappedRow.saleDate as string | null | undefined
  const saleTime = mappedRow.saleTime as string | null | undefined
  const timeZone = mappedRow.timeZone as string | null | undefined
  const lotNumber = mappedRow.lotNumber as number
  const saleKey = saleDate
    ? `${yardNumber ?? 'unknown'}:${saleDate}:${saleTime ?? 'unknown'}:${timeZone ?? 'unknown'}`
    : `unscheduled:${yardNumber ?? 'unknown'}:${timeZone ?? 'unknown'}`

  return {
    saleKey,
    yardNumber: yardNumber ?? null,
    yardName: mappedRow.yardName as string | null | undefined,
    saleDate: saleDate ?? null,
    saleTime: saleTime ?? null,
    timeZone: timeZone ?? null,
  }
}

const BATCH_SIZE = 25

function deduplicateRows(rows: Record<string, unknown>[]): { rows: Record<string, unknown>[]; skipped: number } {
  const rowsByLot = new Map<number, Record<string, unknown>>()
  let skipped = 0

  for (const row of rows) {
    const lotNumber = row.lotNumber as number
    const existing = rowsByLot.get(lotNumber)
    if (!existing) {
      rowsByLot.set(lotNumber, row)
      continue
    }

    const existingUpdated = existing.lastUpdatedTime as Date | null | undefined
    const incomingUpdated = row.lastUpdatedTime as Date | null | undefined
    if (incomingUpdated && (!existingUpdated || incomingUpdated > existingUpdated)) rowsByLot.set(lotNumber, row)
    skipped++
  }

  return { rows: [...rowsByLot.values()], skipped }
}

function shouldUpdateLot(existingUpdated: Date | null, incomingUpdated: Date | null | undefined): boolean {
  return Boolean(incomingUpdated && (!existingUpdated || incomingUpdated > existingUpdated))
}

/**
 * Write a batch of mapped rows to the database using a transaction.
 */
async function flushBatch(
  rows: Record<string, unknown>[],
  result: ProcessResult,
  onProgress?: (result: Partial<ProcessResult>) => void
): Promise<void> {
  if (rows.length === 0) return
  const deduplicated = deduplicateRows(rows)
  rows = deduplicated.rows
  result.skippedRows += deduplicated.skipped

  try {
    await db.$transaction(async (tx) => {
      for (const mappedRow of rows) {
        const lotNumber = mappedRow.lotNumber as number
        const parentData = auctionData(mappedRow)
        const auction = await tx.auction.upsert({
          where: { saleKey: parentData.saleKey },
          create: parentData,
          update: parentData,
        })
        const createData = { ...mappedRow, auctionId: auction.id } as Prisma.LotUncheckedCreateInput
        const updateData = { ...mappedRow, auctionId: auction.id } as Prisma.LotUncheckedUpdateInput

        const existing = await tx.lot.findUnique({
          where: { lotNumber },
          select: { lotNumber: true, lastUpdatedTime: true },
        })

        const incomingTime = mappedRow.lastUpdatedTime as Date | null | undefined

        if (existing) {
          const shouldUpdate = shouldUpdateLot(existing.lastUpdatedTime, incomingTime)

          if (shouldUpdate) {
              await tx.lot.update({ where: { lotNumber }, data: updateData })
            result.updatedRows++
          } else {
            result.skippedRows++
          }
        } else {
          await tx.lot.create({ data: createData })
          result.insertedRows++
        }
        result.processedRows++
      }
    }, { maxWait: 10_000, timeout: 300_000 })
  } catch (batchErr) {
    const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr)
    console.error(`Batch of ${rows.length} failed (${errMsg}), falling back to individual row processing...`)
    // Fallback: process rows one by one to avoid losing all rows due to one bad row
    for (const mappedRow of rows) {
      try {
        const lotNumber = mappedRow.lotNumber as number
        const parentData = auctionData(mappedRow)
        const auction = await db.auction.upsert({
          where: { saleKey: parentData.saleKey },
          create: parentData,
          update: parentData,
        })
        const createData = { ...mappedRow, auctionId: auction.id } as Prisma.LotUncheckedCreateInput
        const updateData = { ...mappedRow, auctionId: auction.id } as Prisma.LotUncheckedUpdateInput
        const existing = await db.lot.findUnique({
          where: { lotNumber },
          select: { lotNumber: true, lastUpdatedTime: true },
        })
        const incomingTime = mappedRow.lastUpdatedTime as Date | null | undefined
        if (existing) {
          const shouldUpdate = shouldUpdateLot(existing.lastUpdatedTime, incomingTime)
          if (shouldUpdate) {
              await db.lot.update({ where: { lotNumber }, data: updateData })
            result.updatedRows++
          } else {
            result.skippedRows++
          }
        } else {
          await db.lot.create({ data: createData })
          result.insertedRows++
        }
        result.processedRows++
      } catch (rowErr) {
        result.failedRows++
        const rowErrMsg = rowErr instanceof Error ? rowErr.message : String(rowErr)
        console.error(`Row lotNumber=${mappedRow.lotNumber} failed: ${rowErrMsg}`)
      }
    }
  }

  if (onProgress) {
    onProgress({
      processedRows: result.processedRows,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      skippedRows: result.skippedRows,
      failedRows: result.failedRows,
    })
  }
}

/**
 * Process a CSV file using streaming — constant memory regardless of file size.
 * PapaParse reads from a file stream, rows are collected into batches,
 * and each batch is flushed to the DB sequentially.
 */
export async function processCSV(
  filePath: string,
  jobId: string,
  onProgress?: (result: Partial<ProcessResult>) => void
): Promise<ProcessResult> {
  const result: ProcessResult = {
    totalRows: 0,
    processedRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    failedRows: 0,
  }

  let headerMap: Map<string, string> | null = null
  let currentBatch: Record<string, unknown>[] = []

  return new Promise<ProcessResult>((resolve) => {
    Papa.parse(fs.createReadStream(filePath, { encoding: 'utf-8' }), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      chunkSize: BATCH_SIZE, // Flush DB every 100 rows — keeps memory flat
      chunk: (results, parser) => {
        // Pause parsing while we process this chunk
        parser.pause()

        if (!headerMap && results.meta.fields) {
          headerMap = buildHeaderMap(results.meta.fields)
        }
        if (!headerMap) {
          parser.resume()
          return
        }

        // Collect rows synchronously
        const rows = results.data as Record<string, string>[]
        for (const rawRow of rows) {
          result.totalRows++
          try {
            const mapped = mapRow(rawRow, headerMap, jobId, filePath)
            if (mapped) {
              currentBatch.push(mapped)
            } else {
              result.skippedRows++
            }
          } catch {
            result.failedRows++
          }
        }

        // Flush to DB, then resume parsing
        const toFlush = currentBatch
        currentBatch = []
        flushBatch(toFlush, result, onProgress)
          .then(() => parser.resume())
          .catch((err) => {
            result.errorMessage = err?.message || 'Batch flush error'
            parser.resume()
          })
      },
      complete: () => {
        // Flush any remaining rows
        if (currentBatch.length > 0) {
          const remaining = currentBatch
          currentBatch = []
          flushBatch(remaining, result, onProgress)
            .then(() => resolve(result))
            .catch((err) => {
              result.errorMessage = err?.message || 'Final flush error'
              resolve(result)
            })
        } else {
          resolve(result)
        }
      },
      error: (err) => {
        result.errorMessage = err?.message || 'Parse error'
        resolve(result)
      },
    })
  })
}

export function analyzeCSV(fileContent: string): PreviewResult {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
    preview: 1000,
  })

  const rows = parsed.data as Record<string, string>[]
  const headers = parsed.meta.fields || []
  const missingColumns = getMissingRequiredFields(headers)

  const detectedColumns = headers
  const unknownColumns: string[] = []

  for (const header of headers) {
    if (!getDbField(header)) {
      unknownColumns.push(header)
    }
  }

  const sampleRows = rows.slice(0, 5).map(row => {
    const mapped: Record<string, string | null> = {}
    for (const header of headers) {
      const dbField = getDbField(header)
      if (dbField) {
        mapped[dbField] = row[header] || null
      } else {
        mapped[header] = row[header] || null
      }
    }
    return mapped
  })

  const makes = new Set<string>()
  const states = new Set<string>()
  let dateMin: string | null = null
  let dateMax: string | null = null
  let unscheduledCount = 0
  const validationErrors: string[] = []

  for (const row of rows) {
    for (const header of headers) {
      const dbField = getDbField(header)
      if (dbField === 'make' && row[header]?.trim()) {
        makes.add(row[header].trim().toUpperCase())
      }
      if (dbField === 'locationState' && row[header]?.trim()) {
        states.add(row[header].trim().toUpperCase())
      }
      if (dbField === 'saleDate') {
        const p = parseSaleDate(row[header])
        if (!p) {
          unscheduledCount++
        } else {
          if (!dateMin || p < dateMin) dateMin = p
          if (!dateMax || p > dateMax) dateMax = p
        }
      }
    }
  }

  return {
    detectedColumns,
    missingColumns,
    unknownColumns,
    sampleRows,
    estimatedRowCount: rows.length,
    dateRange: { min: dateMin, max: dateMax },
    makeCount: makes.size,
    stateCount: states.size,
    unscheduledCount,
    validationErrors,
  }
}
