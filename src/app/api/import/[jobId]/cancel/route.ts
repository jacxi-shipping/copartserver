import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const cancelled = await db.importJob.updateMany({
    where: { id: jobId, status: 'queued' },
    data: { status: 'cancelled', completedAt: new Date(), errorMessage: 'Cancelled before the worker started processing.' },
  })
  if (cancelled.count === 1) return NextResponse.json({ success: true })

  const job = await db.importJob.findUnique({ where: { id: jobId }, select: { id: true, status: true } })
  if (!job) return NextResponse.json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Import job was not found' } }, { status: 404 })
  return NextResponse.json({ success: false, error: { code: 'JOB_NOT_CANCELLABLE', message: `Cannot cancel a ${job.status} import job` } }, { status: 409 })
}