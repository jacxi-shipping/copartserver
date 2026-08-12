import fs from 'fs'
import os from 'os'
import path from 'path'

import { db } from '../src/lib/db'
import { processCSV } from '../src/lib/csv-processor'

async function downloadToTempFile(url: string, jobId: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download uploaded CSV: ${response.status}`)
  }

  const tempPath = path.join(os.tmpdir(), `${jobId}.csv`)
  const fileBuffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(tempPath, fileBuffer)
  return tempPath
}

async function processJob(jobId: string) {
  const job = await db.importJob.findUnique({ where: { id: jobId } })

  if (!job) {
    throw new Error(`Import job ${jobId} not found`)
  }

  const storageUrl = job.storageUrl

  if (!storageUrl) {
    throw new Error(`Import job ${jobId} has no storageUrl`) 
  }

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: job.startedAt ?? new Date(),
      errorMessage: null,
    },
  })

  const tempPath = await downloadToTempFile(storageUrl, job.id)

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

async function main() {
  const [job] = await db.importJob.findMany({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
    take: 1,
  })

  if (!job) {
    console.log('No queued import jobs found')
    return
  }

  console.log(`Processing import job ${job.id} (${job.filename})`)
  await processJob(job.id)
  console.log(`Finished import job ${job.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })