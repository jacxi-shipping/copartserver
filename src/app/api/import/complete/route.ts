import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import {
  getImportChunkMetaPath,
  getImportChunkPath,
  getImportStoragePaths,
  getImportUploadPath,
  isCsvFilename,
  isValidUploadId,
} from '@/lib/import-storage'
import { processCSV } from '@/lib/csv-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { uploadId } = await request.json()

    if (!uploadId || !isValidUploadId(uploadId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'Invalid upload ID' } },
        { status: 400 },
      )
    }

    const { dataDir, chunksDir: chunkDir } = getImportStoragePaths()
    const metaPath = getImportChunkMetaPath(uploadId)

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Upload session not found. Please re-upload.' } },
        { status: 404 },
      )
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    const { filename, totalChunks } = meta

    // Verify all chunks exist
    const missingChunks: number[] = []
    for (let i = 0; i < totalChunks; i++) {
      if (!fs.existsSync(getImportChunkPath(uploadId, i))) {
        missingChunks.push(i)
      }
    }

    if (missingChunks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INCOMPLETE',
            message: `Missing ${missingChunks.length} chunk(s). Please retry the upload.`,
            missingChunks,
          },
        },
        { status: 400 },
      )
    }

    // Validate CSV extension
    if (!isCsvFilename(filename)) {
      cleanupChunks(uploadId)
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV files are supported' } },
        { status: 400 },
      )
    }

    // Assemble chunks into final CSV file
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    // Create import job record
    const job = await db.importJob.create({
      data: {
        filename,
        fileSize: 0,
        status: 'processing',
        startedAt: new Date(),
      },
    })

    const assembledPath = getImportUploadPath(job.id)
    const writeStream = fs.createWriteStream(assembledPath)

    let totalSize = 0
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = getImportChunkPath(uploadId, i)
      const chunkData = fs.readFileSync(chunkPath)
      writeStream.write(chunkData)
      totalSize += chunkData.length
    }
    writeStream.end()

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // Update job with file size
    await db.importJob.update({
      where: { id: job.id },
      data: { filename, fileSize: totalSize },
    })

    // Clean up chunks immediately (file is assembled)
    cleanupChunks(uploadId)

    // ── Return immediately — processing runs in background ──
    // The frontend will poll GET /api/import/[jobId] for status.
    processBackground(job.id, assembledPath).catch((err) => {
      console.error('Background processing error:', err)
    })

    return NextResponse.json({
      success: true,
      data: { jobId: job.id, status: 'processing', message: 'Processing started. Poll /api/import/[jobId] for progress.' },
    })
  } catch (error) {
    console.error('Import complete API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Assembly failed' } },
      { status: 500 },
    )
  }
}

/**
 * Process the assembled CSV in the background (fire-and-forget).
 * Updates the import job record as it progresses.
 */
async function processBackground(jobId: string, filePath: string) {
  try {
    const result = await processCSV(filePath, jobId)

    await db.importJob.update({
      where: { id: jobId },
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
  } catch (processError) {
    const errorMsg = processError instanceof Error ? processError.message : 'Processing failed'
    await db.importJob.update({
      where: { id: jobId },
      data: { status: 'failed', completedAt: new Date(), errorMessage: errorMsg },
    })
  } finally {
    // Always clean up the assembled file
    try { fs.unlinkSync(filePath) } catch { /* ignore */ }
  }
}

function cleanupChunks(uploadId: string) {
  const { chunksDir: chunkDir } = getImportStoragePaths()
  try {
    const files = fs.readdirSync(chunkDir)
    for (const f of files) {
      if (f.startsWith(`${uploadId}_`) || f === `${uploadId}.meta.json`) {
        fs.unlinkSync(path.join(chunkDir, f))
      }
    }
  } catch { /* ignore */ }
}
