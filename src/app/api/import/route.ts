import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processCSV } from '@/lib/csv-processor'
import { getImportStoragePaths, getImportUploadPath, isCsvFilename } from '@/lib/import-storage'
import fs from 'fs'
import busboy from 'busboy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    let page = parseInt(searchParams.get('page') || '1', 10)
    if (isNaN(page) || page < 1) page = 1
    let pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    if (isNaN(pageSize) || pageSize < 1) pageSize = 20
    if (pageSize > 100) pageSize = 100
    const skip = (page - 1) * pageSize

    const [jobs, total] = await Promise.all([
      db.importJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.importJob.count(),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      success: true,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
      data: jobs,
    })
  } catch (error) {
    console.error('Import jobs list API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch import jobs' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Stream file to disk using busboy (no full-body buffering) ──
    const { dataDir } = getImportStoragePaths()
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Create import job record first
    const job = await db.importJob.create({
      data: {
        filename: 'uploading...',
        fileSize: 0,
        status: 'processing',
        startedAt: new Date(),
      },
    })

    const savedFilePath = getImportUploadPath(job.id)
    const actualFilename: { value: string } = { value: 'upload.csv' }
    const totalBytes: { value: number } = { value: 0 }

    // Pipe the Web ReadableStream through busboy for streaming multipart parse
    await new Promise<void>((resolve, reject) => {
      const headers = Object.fromEntries(request.headers.entries())
      const bb = busboy({ headers, limits: { fileSize: 500 * 1024 * 1024 } }) // 500MB max

      bb.on('file', (_fieldname, file, info) => {
        actualFilename.value = info.filename
        const writeStream = fs.createWriteStream(savedFilePath)

        file.on('data', (chunk: Buffer) => {
          totalBytes.value += chunk.length
        })

        file.pipe(writeStream)

        writeStream.on('error', reject)
        writeStream.on('finish', () => resolve())
      })

      bb.on('error', reject)

      // Convert Web ReadableStream → Node.js Readable and pipe into busboy
      if (!request.body) {
        reject(new Error('No request body'))
        return
      }

      // Write raw bytes into busboy
      const reader = request.body.getReader()

      function pump(): void {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              bb.end()
              return
            }
            bb.write(Buffer.from(value), (err) => {
              if (err) reject(err)
              else pump()
            })
          })
          .catch(reject)
      }

      pump()
    })

    // Validate it was a CSV
    if (!isCsvFilename(actualFilename.value)) {
      fs.unlinkSync(savedFilePath)
      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: 'Only CSV files are supported' },
      })
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV files are supported' } },
        { status: 400 },
      )
    }

    // Update job with real filename and size
    await db.importJob.update({
      where: { id: job.id },
      data: { filename: actualFilename.value, fileSize: totalBytes.value },
    })

    // Process CSV from disk (already streaming-friendly)
    try {
      const result = await processCSV(savedFilePath, job.id)

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
          errorMessage: result.errorMessage,
        },
      })

      // Clean up the CSV file after processing
      try { fs.unlinkSync(savedFilePath) } catch { /* ignore */ }

      return NextResponse.json({
        success: true,
        data: { jobId: job.id, ...result },
      })
    } catch (processError) {
      const errorMsg = processError instanceof Error ? processError.message : 'Processing failed'
      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: errorMsg },
      })
      try { fs.unlinkSync(savedFilePath) } catch { /* ignore */ }

      return NextResponse.json(
        { success: false, error: { code: 'PROCESSING_ERROR', message: errorMsg } },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('Import POST API error:', error)
    const msg = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 },
    )
  }
}
