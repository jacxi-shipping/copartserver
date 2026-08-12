import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = await db.importJob.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Import job was not found' } }, { status: 404 })
  if (job.status !== 'failed') return NextResponse.json({ success: false, error: { code: 'JOB_NOT_RETRYABLE', message: 'Only failed import jobs can be retried' } }, { status: 409 })
  if (!job.storageUrl || !job.storageKey) return NextResponse.json({ success: false, error: { code: 'SOURCE_UNAVAILABLE', message: 'The original CSV is no longer available' } }, { status: 409 })

  const retried = await db.importJob.update({
    where: { id: jobId },
    data: {
      status: 'queued', startedAt: null, completedAt: null, totalRows: 0, processedRows: 0,
      insertedRows: 0, updatedRows: 0, skippedRows: 0, failedRows: 0, errorMessage: null,
    },
  })
  return NextResponse.json({ success: true, data: retried })
}